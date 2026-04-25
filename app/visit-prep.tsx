// ============================================================================
// VISIT PREP — Configuration screen for generating a care summary PDF
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
import { navigateBack } from '../lib/navigate';
import { Colors, Spacing, BorderRadius } from '../theme/theme-tokens';
import { useTheme } from '../contexts/ThemeContext';
import { usePatient } from '../contexts/PatientContext';
import { SubScreenHeader } from '../components/SubScreenHeader';
import { generateAndShareVisitPrep, VisitPrepConfig } from '../services/visitPrepPdf';
import { getTodayDateString } from '../services/carePlanGenerator';
import { logError } from '../utils/devLog';
import { hapticSuccess } from '../utils/hapticFeedback';
import { safeGetItem, safeSetItem } from '../utils/safeStorage';

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

  // State
  const [range, setRange] = useState<RangeOption>('14');
  const [includeMeds, setIncludeMeds] = useState(true);
  const [includeVitals, setIncludeVitals] = useState(true);
  const [includeWellness, setIncludeWellness] = useState(true);
  const [includeJournal, setIncludeJournal] = useState(true);
  const [includeQuestions, setIncludeQuestions] = useState(true);
  const [questions, setQuestions] = useState('');
  const [generating, setGenerating] = useState(false);

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

  const handleGenerate = useCallback(async () => {
    if (generating) return;
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
        questions,
        patientName,
      };

      const success = await generateAndShareVisitPrep(config);
      if (success) {
        void hapticSuccess();
      } else {
        Alert.alert('Error', 'Could not generate the PDF. Please try again.');
      }
    } catch (err) {
      logError('VisitPrepScreen.handleGenerate', err);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setGenerating(false);
    }
  }, [generating, range, includeMeds, includeVitals, includeWellness, includeJournal, includeQuestions, questions, patientName]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={[colors.backgroundGradientStart, colors.backgroundGradientEnd]} style={styles.gradient}>
        <SubScreenHeader title="Visit Prep" emoji="" />

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }} keyboardVerticalOffset={90}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Context */}
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

          {/* Toggles */}
          <Text style={styles.sectionLabel}>Include in report</Text>
          <View style={styles.toggleCard}>
            {[
              { label: 'Medication adherence', value: includeMeds, setter: setIncludeMeds },
              { label: 'Vitals & trends', value: includeVitals, setter: setIncludeVitals },
              { label: 'Mood & wellness', value: includeWellness, setter: setIncludeWellness },
              { label: 'Journal highlights', value: includeJournal, setter: setIncludeJournal },
              { label: 'Questions for the doctor', value: includeQuestions, setter: setIncludeQuestions },
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

          {/* Questions */}
          {includeQuestions && (
            <>
              <Text style={styles.sectionLabel}>Questions for the visit</Text>
              <TextInput
                style={styles.questionsInput}
                placeholder="What should we ask about? One question per line..."
                placeholderTextColor={colors.textWarmDim}
                multiline
                value={questions}
                onChangeText={handleQuestionsChange}
                textAlignVertical="top"
                accessibilityLabel="Questions for the doctor"
              />
            </>
          )}

          {/* Generate button */}
          <TouchableOpacity
            style={[styles.generateButton, generating && styles.generateButtonDisabled]}
            onPress={handleGenerate}
            disabled={generating}
            activeOpacity={0.7}
            accessibilityLabel={generating ? 'Generating PDF' : 'Generate Visit Prep PDF'}
            accessibilityRole="button"
          >
            {generating ? (
              <ActivityIndicator size="small" color="#0a0c0a" />
            ) : (
              <Text style={styles.generateButtonText}>Generate PDF</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            Not a medical record. Generated from data on this device only.
          </Text>

          <View style={{ height: 40 }} />
        </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
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
  rangeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  rangePill: {
    paddingVertical: 8,
    paddingHorizontal: 16,
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
