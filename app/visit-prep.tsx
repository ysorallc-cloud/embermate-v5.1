// ============================================================================
// VISIT PREP — Configuration screen for generating a care summary PDF
//
// F7 C7 (2026-06-12) — 4-state redesign deferred to v1.1 per the
// pre-launch audit-first rule. Audit findings preserved here so the
// next pass starts with full context.
//
// Audit findings (no new services allowed pre-launch):
//   • State 3 (flagged-items sheet) — the existing buildRedFlags
//     helper in services/redFlags.ts produces a RedFlag[] with shape
//     { severity: 'critical'|'attention', text: string }. Wiring
//     it to a State 3 sheet requires exposing the input pipeline
//     (adherence + vitals + notesInRange + symptomChanges +
//     sleepDelta + refusedByMed) that today lives inside
//     services/visitPrepPdf.ts and is constructed there before
//     PDF rendering. Refactoring that pipeline to expose a
//     buildable preview is new service work.
//   • State 2 (single-list data migration) — replacing the three
//     string[3] arrays in CaregiverNotesBlock + the
//     visitPrepCaregiverNotesRepo with a single string[] keyed at
//     '@embermate_visit_prep_items' is a load-bearing data-model
//     migration that cascades through ~10 test suites
//     (visitPrepPdfCaregiverFillable16_2.test.ts asserts the
//     Triple shape; PDF generator + preview also consume the
//     existing fields). Deferred to a dedicated v1.1 commit so
//     the migration ships with full coverage.
//   • State 1 (sparse-data coral card) — requires a daysOfData
//     fetch at page mount that the screen does not currently do.
//     Adding the fetch is straightforward but ships better
//     alongside States 2-3 as part of the unified redesign.
//   • State 4 (PDF preview card) — the existing
//     generateAndShareVisitPrep path already produces a sharable
//     PDF. The F7 preview-card UX layer ships better as part of
//     the unified redesign.
//
// F7 token-level changes already in place via the broader caregiver
// Accent → dusty migration (the Phase 33b Scope 2 lavender eyebrow
// on this screen automatically reads in dusty blue post-token-remap
// commit deb3e595).
// ============================================================================

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { navigate, navigateBack } from '../lib/navigate';
import { getAppointment } from '../utils/appointmentStorage';
import { Colors, Spacing, BorderRadius } from '../theme/theme-tokens';
import { useTheme } from '../contexts/ThemeContext';
import { usePatient } from '../contexts/PatientContext';
import { SubScreenHeader } from '../components/SubScreenHeader';
import { SectionEyebrow } from '../components/SectionEyebrow';
import type { VisitPrepConfig } from '../services/visitPrepPdf';
import { getTodayDateString } from '../services/carePlanGenerator';
import { logError } from '../utils/devLog';
import { hapticSuccess } from '../utils/hapticFeedback';
import { safeGetItem, safeSetItem } from '../utils/safeStorage';
import {
  requireProfileFields,
  type ProfileField,
} from '../utils/requireProfileFields';
import { ProfilePromptSheet } from '../components/ProfilePromptSheet';
import { CaregiverNotesBlock } from '../components/visitPrep/CaregiverNotesBlock';

// ============================================================================
// CONSTANTS
// ============================================================================

type RangeOption = '7' | '14' | '30' | 'custom';

const RANGE_OPTIONS: { key: RangeOption; label: string }[] = [
  { key: '7', label: '7 days' },
  { key: '14', label: '14 days' },
  { key: '30', label: '30 days' },
];

const QUESTIONS_STORAGE_KEY = '@embermate_visit_prep_questions';

// ============================================================================
// COMPONENT
// ============================================================================

export default function VisitPrepScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { activePatient } = usePatient();
  const patientName = activePatient?.name && activePatient.name !== 'Patient'
    ? activePatient.name
    : 'your loved one';

  // Phase 5.10.b — appointment / now / insights context query params
  // surface a "Preparing for {Provider} on {Date}" line at the top of
  // the config screen.
  const params = useLocalSearchParams<{
    context?: string; apptId?: string; days?: string;
  }>();
  const [contextLine, setContextLine] = useState<string | null>(null);

  // State
  const [range, setRange] = useState<RangeOption>('14');
  const [includeMeds, setIncludeMeds] = useState(true);
  const [includeVitals, setIncludeVitals] = useState(true);
  const [includeWellness, setIncludeWellness] = useState(true);
  const [includeJournal, setIncludeJournal] = useState(true);
  const [includeQuestions, setIncludeQuestions] = useState(true);
  // Phase 5.10.d — toggles for the two new clinical sections (5.10.a).
  const [includeRedFlags, setIncludeRedFlags] = useState(true);
  const [includeHydrationNutrition, setIncludeHydrationNutrition] = useState(true);
  const [questions, setQuestions] = useState('');
  const [generating, setGenerating] = useState(false);

  // Resolve the apptId param into the contextual line.
  React.useEffect(() => {
    let cancelled = false;
    if (params.apptId) {
      getAppointment(params.apptId).then((appt) => {
        if (cancelled || !appt) return;
        const d = new Date(appt.date);
        const label = d.toLocaleDateString('en-US', {
          weekday: 'short', month: 'short', day: 'numeric',
        });
        // Phase 33b Scope 2 — value drops the "Preparing for " prefix;
        // JSX renders the prefix as a small lavender eyebrow + the
        // provider/date as cream body per the canon eyebrow-vs-chrome split.
        setContextLine(`${appt.provider} on ${label}`);
      });
    }
    if (params.days === '7' || params.days === '14' || params.days === '30') {
      setRange(params.days as RangeOption);
    }
    return () => { cancelled = true; };
  }, [params.apptId, params.days]);

  // Phase 5.8.c — profile-prompt gate.
  const [profileMissing, setProfileMissing] = useState<ProfileField[]>([]);
  const [profilePromptVisible, setProfilePromptVisible] = useState(false);
  const [resolvedCaregiverName, setResolvedCaregiverName] = useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    requireProfileFields().then((res) => {
      if (cancelled) return;
      setResolvedCaregiverName(res.caregiverName);
    });
    return () => { cancelled = true; };
  }, []);

  // Load persisted questions on mount
  React.useEffect(() => {
    safeGetItem<string>(QUESTIONS_STORAGE_KEY, '').then(saved => {
      if (saved) setQuestions(saved);
    });
  }, []);

  // Persist questions on change
  const handleQuestionsChange = useCallback((text: string) => {
    setQuestions(text);
    safeSetItem(QUESTIONS_STORAGE_KEY, text);
  }, []);

  // Phase 5.9.d — primary button now navigates to /visit-prep-preview
  // instead of generating directly. The preview screen owns the only
  // call to generateAndShareVisitPrep.
  const PENDING_CONFIG_KEY = 'pending_visit_prep_config';
  const handleGenerate = useCallback(async () => {
    if (generating) return;

    // Phase 5.8.c — gate on profile completeness.
    const profileCheck = await requireProfileFields();
    if (profileCheck.missing.length > 0) {
      setProfileMissing(profileCheck.missing);
      setProfilePromptVisible(true);
      return;
    }
    const caregiverName = profileCheck.caregiverName ?? '';

    setGenerating(true);
    try {
      const today = getTodayDateString();
      const days = parseInt(range, 10) || 14;
      const start = new Date();
      start.setDate(start.getDate() - days);
      const startStr = start.toISOString().split('T')[0];

      const config: VisitPrepConfig = {
        dateRange: { start: startStr, end: today },
        includeMeds,
        includeVitals,
        includeWellness,
        includeJournal,
        includeQuestions,
        includeRedFlags,
        includeHydrationNutrition,
        questions,
        patientName,
        caregiverName,
        // Phase 16.2 — thread apptId so the PDF assembler can fetch
        // the caregiver-fillable block's saved values. Absent →
        // assembler skips the caregiver-notes read entirely.
        appointmentId: params.apptId,
      };

      // Stash the assembled config so the preview screen can pick it up
      // on mount. AsyncStorage is the ergonomic fit — the config has 10+
      // fields plus arbitrary-length questions text.
      await safeSetItem(PENDING_CONFIG_KEY, config);
      navigate('/visit-prep-preview');
    } catch (err) {
      logError('VisitPrepScreen.handleGenerate', err);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setGenerating(false);
    }
  }, [generating, range, includeMeds, includeVitals, includeWellness, includeJournal, includeQuestions, includeRedFlags, includeHydrationNutrition, questions, patientName]);

  const handleProfileSaved = useCallback(async () => {
    const res = await requireProfileFields();
    setResolvedCaregiverName(res.caregiverName);
    setProfileMissing(res.missing);
    if (res.missing.length === 0) {
      setProfilePromptVisible(false);
      // Profile newly complete — proceed with the deferred preview navigation.
      void handleGenerate();
    }
  }, [handleGenerate]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={[colors.backgroundGradientStart, colors.backgroundGradientEnd]} style={styles.gradient}>
        <SubScreenHeader
          title="Visit Prep"
          subtitle="Bring this to the next appointment."
        />

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }} keyboardVerticalOffset={90}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Visit Prep restyle (S6) — the "Preparing" eyebrow de-purples to
              neutral (the lavender was the pre-redesign You-lane tint; Visit
              Prep's register is neutral context + blue handoff on questions).
              Small eyebrow + cream body — canon eyebrow-as-garnish. */}
          {contextLine && (
            <View
              style={styles.contextBlock}
              accessible
              accessibilityLabel={`Preparing for ${contextLine}`}
            >
              <SectionEyebrow text="Preparing" />
              <Text style={styles.contextBody}>{contextLine}</Text>
            </View>
          )}

          <Text style={styles.context}>
            Generate a care summary to bring to {patientName}'s next appointment.
          </Text>

          {/* Date Range */}
          <Text style={styles.sectionLabel}>Date range</Text>
          <View style={styles.rangeRow}>
            {RANGE_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.key}
                style={[styles.rangePill, range === opt.key && styles.rangePillActive]}
                onPress={() => setRange(opt.key)}
                accessibilityLabel={`${opt.label} range`}
                accessibilityRole="button"
                accessibilityState={{ selected: range === opt.key }}
              >
                <Text style={[styles.rangePillText, range === opt.key && styles.rangePillTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Phase 5.10.d — Toggle labels and order match the PDF's
              section names exactly. Renamed: Vitals & trends → Vitals;
              Mood & wellness → Sleep, Energy & Mood; Journal highlights
              → Caregiver notes; Questions for the doctor → Questions for
              this visit. New: Red Flags & Alerts and Hydration & Nutrition
              (both default ON). Section is rendered in BOTH preview and
              PDF; toggling off removes the section from both surfaces. */}
          <View style={styles.sectionEyebrowWrap}>
            <SectionEyebrow text="Include in report" />
          </View>
          <View style={styles.toggleCard}>
            {[
              { label: 'Red Flags & Alerts', value: includeRedFlags, setter: setIncludeRedFlags },
              { label: 'Medication adherence', value: includeMeds, setter: setIncludeMeds },
              { label: 'Vitals', value: includeVitals, setter: setIncludeVitals },
              { label: 'Hydration & Nutrition', value: includeHydrationNutrition, setter: setIncludeHydrationNutrition },
              { label: 'Sleep, Energy & Mood', value: includeWellness, setter: setIncludeWellness },
              { label: 'Caregiver notes', value: includeJournal, setter: setIncludeJournal },
              { label: 'Questions for this visit', value: includeQuestions, setter: setIncludeQuestions },
            ].map((toggle, i) => (
              <View key={toggle.label} style={[styles.toggleRow, i > 0 && styles.toggleRowBorder]}>
                <Text style={styles.toggleLabel}>{toggle.label}</Text>
                <Switch
                  value={toggle.value}
                  onValueChange={toggle.setter}
                  trackColor={{ false: colors.glassActive, true: colors.accentLight }}
                  thumbColor={toggle.value ? colors.accent : colors.switchThumbOff}
                  accessibilityLabel={`${toggle.label}, ${toggle.value ? 'included' : 'excluded'}`}
                />
              </View>
            ))}
          </View>

          {/* Phase 16.2 — caregiver-fillable Visit Prep prompts. Only
              surfaced when an appointmentId is in scope (from the
              query param); the block persists per-appointment and
              reads/writes only its own repo (no log-driven pre-fill).
              The block sits at the "before you go" preparation step,
              between the include toggles and the
              questions-for-the-doctor handoff. */}
          {params.apptId && (
            <CaregiverNotesBlock appointmentId={params.apptId} />
          )}

          {/* Questions for the doctor — running list managed via the
              dedicated entry surface (patient-questions). The free-text box
              below is kept for last-minute additions specific to this visit. */}
          {includeQuestions && (
            <>
              <View style={styles.sectionEyebrowWrap}>
                <SectionEyebrow text="Questions for the doctor" tint="blue" />
              </View>
              <TouchableOpacity
                style={styles.questionsLink}
                onPress={() => navigate('/patient-questions')}
                accessibilityRole="button"
                accessibilityLabel="Manage running list of questions for the doctor"
              >
                <Text style={styles.questionsLinkText}>
                  {'Open running list →'}
                </Text>
              </TouchableOpacity>
              <Text style={[styles.sectionLabel, { marginTop: 8 }]}>Anything else for this visit?</Text>
              <TextInput
                style={styles.questionsInput}
                placeholder="One question per line..."
                placeholderTextColor={colors.textWarmDim}
                multiline
                value={questions}
                onChangeText={handleQuestionsChange}
                textAlignVertical="top"
                accessibilityLabel="Additional questions for this visit"
              />
            </>
          )}

          {/* Phase 5.9.d — "Preview" navigates to the in-app preview screen.
              The PDF is generated only from there. */}
          <TouchableOpacity
            style={[styles.generateButton, generating && styles.generateButtonDisabled]}
            onPress={handleGenerate}
            disabled={generating}
            activeOpacity={0.7}
            accessibilityLabel={generating ? 'Opening preview' : 'Preview Visit Prep'}
            accessibilityRole="button"
          >
            {generating ? (
              <ActivityIndicator size="small" color="#0a0c0a" />
            ) : (
              <Text style={styles.generateButtonText}>Preview</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            Not a medical record. Generated from data on this device only.
          </Text>

          <View style={{ height: 40 }} />
        </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>

      <ProfilePromptSheet
        visible={profilePromptVisible}
        onClose={() => setProfilePromptVisible(false)}
        onSaved={handleProfileSaved}
        missing={profileMissing}
      />
    </SafeAreaView>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  gradient: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: 20 },
  // Phase 33b Scope 2 — Surface 4: contextHighlight chrome retired.
  // Replaced with contextBlock (eyebrow wrapper) + contextBody (cream
  // serif body) per canon eyebrow-as-garnish pattern.
  contextBlock: {
    marginBottom: 12,
    gap: 4,
  },
  contextBody: {
    fontSize: 14,
    color: c.textPrimary,
    lineHeight: 20,
  },
  context: {
    fontSize: 13,
    color: c.textWarmMuted,
    lineHeight: 19,
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: c.textWarmMuted,
    letterSpacing: 0.3,
    marginBottom: 8,
    marginTop: 16,
  },
  // Visit Prep restyle (S6) — spacing wrapper so the register SectionEyebrows
  // (Include = neutral, Questions = blue handoff) keep the section rhythm the
  // plain sectionLabel carried.
  sectionEyebrowWrap: {
    marginTop: 16,
    marginBottom: 8,
  },
  rangeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  rangePill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: c.warmSurface,
    borderWidth: 1,
    borderColor: c.warmSurfaceBorder,
  },
  rangePillActive: {
    backgroundColor: c.accentLight,
    borderColor: c.accentBorder,
  },
  rangePillText: {
    fontSize: 13,
    fontWeight: '500',
    color: c.textWarmMuted,
  },
  rangePillTextActive: {
    color: c.accent,
  },
  toggleCard: {
    backgroundColor: c.warmSurface,
    borderWidth: 1,
    borderColor: c.warmSurfaceBorder,
    borderRadius: 12,
    marginBottom: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  toggleRowBorder: {
    borderTopWidth: 0.5,
    borderTopColor: c.warmSurfaceBorder,
  },
  toggleLabel: {
    fontSize: 14,
    color: c.textWarmPrimary,
  },
  questionsInput: {
    backgroundColor: c.warmSurface,
    borderWidth: 1,
    borderColor: c.warmSurfaceBorder,
    borderRadius: 10,
    padding: 12,
    minHeight: 80,
    fontSize: 13,
    color: c.textWarmPrimary,
    marginBottom: 8,
  },
  questionsLink: {
    backgroundColor: c.warmSurface,
    borderWidth: 1,
    borderColor: c.warmSurfaceBorder,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 4,
  },
  questionsLinkText: {
    fontSize: 13,
    fontWeight: '500',
    color: c.accent,
  },
  generateButton: {
    backgroundColor: c.accent,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  generateButtonDisabled: {
    opacity: 0.6,
  },
  generateButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0a0c0a',
  },
  disclaimer: {
    fontSize: 10,
    color: c.textWarmDim,
    textAlign: 'center',
    marginTop: 12,
  },
});
