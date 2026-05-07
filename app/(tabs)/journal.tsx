// ============================================================================
// JOURNAL PAGE - Narrative intelligence layer (shift-change briefing)
// Sections: Status dot, Stats strip, Timeline, Heads up, Patterns, Reflection
// ============================================================================

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { navigate } from '../../lib/navigate';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Animated,
  Easing,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, BorderRadius, Spacing } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import {
  buildCareBrief,
  CareBrief,
} from '../../utils/careSummaryBuilder';
import { logError } from '../../utils/devLog';
import { useCareTasks } from '../../hooks/useCareTasks';
import { useEnabledBuckets } from '../../hooks/useCarePlanConfig';
import { getTodayDateString } from '../../services/carePlanGenerator';
import { logAuditEvent, AuditEventType, AuditSeverity } from '../../utils/auditLog';
import { useDataListener } from '../../lib/events';
import { EVENT } from '../../lib/eventNames';
import { isBiometricEnabled, shouldLockSession, requireAuthentication, updateLastActivity, getAutoLockTimeout } from '../../utils/biometricAuth';
import { getNotesLogs, NotesLog } from '../../utils/centralStorage';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/ScreenHeader';
import { getMedicalInfo, MedicalInfo } from '../../utils/medicalInfo';
import { safeGetItem } from '../../utils/safeStorage';
import { usePatient } from '../../contexts/PatientContext';
import { useActivePatientNameRaw } from '../../hooks/useActivePatientName';
import { StorageKeys } from '../../utils/storageKeys';
import { getMedications } from '../../utils/medicationStorage';
import { journalSubtitle } from '../../utils/journalSubtitle';
import { hasSampleData } from '../../utils/sampleDataManager';
import { ReportData } from '../../utils/pdfExport';
import { DateTabStrip } from '../../components/journal/DateTabStrip';
import { JournalNotesCard } from '../../components/journal/JournalNotesCard';
import { ManageSampleDataSheet } from '../../components/sample/ManageSampleDataSheet';
import { HandoffCard } from '../../components/journal/HandoffCard';
import { HandoffSheet } from '../../components/journal/HandoffSheet';
import { NarrativeView } from '../../components/journal/NarrativeView';
import { getReflection, saveReflection, StoredReflection } from '../../storage/reflectionStorage';
import { getDailyOutcomes } from '../../utils/dailyOutcomes';
import type { DailyOutcomes } from '../../utils/text/types';
import { isDayComplete, markDayComplete } from '../../utils/dayComplete';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function JournalTab() {
  const { colors } = useTheme();
  const { activePatient } = usePatient();
  const patientNameRaw = useActivePatientNameRaw();
  const insets = useSafeAreaInsets();
  const s = useMemo(() => createStyles(colors), [colors]);
  const [brief, setBrief] = useState<CareBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [todayNotes, setTodayNotes] = useState<NotesLog[]>([]);
  const { state: careTasksState } = useCareTasks(getTodayDateString());
  const { enabledBuckets } = useEnabledBuckets();
  const [medicalInfo, setMedicalInfo] = useState<MedicalInfo | null>(null);
  const [patientName, setPatientName] = useState('');
  const [patientGender, setPatientGender] = useState<string | null>(null);
  const [patientAge, setPatientAge] = useState<string | null>(null);
  const [activeMedCount, setActiveMedCount] = useState(0);
  const [isSampleMode, setIsSampleMode] = useState(false);
  const [manageSampleOpen, setManageSampleOpen] = useState(false);
  const [showDailyPreview, setShowDailyPreview] = useState(false);
  const [showClinicalPreview, setShowClinicalPreview] = useState(false);
  const [dailyReport, setDailyReport] = useState<{ reportData: ReportData; previewLines: string[] } | null>(null);
  const [clinicalReport, setClinicalReport] = useState<{ reportData: ReportData; previewLines: string[] } | null>(null);
  const [exporting, setExporting] = useState(false);

  // ── Handoff redesign state (Phases 3, 6, 7, 10, 12) ──
  const [outcomes, setOutcomes] = useState<DailyOutcomes>({
    logged: { count: 0 },
    missed: { count: 0, names: [] },
    pending: { count: 0, names: [] },
  });
  const [dayCompleteFlag, setDayCompleteFlag] = useState(false);
  const [handoffSheetVisible, setHandoffSheetVisible] = useState(false);
  const handoffPulse = useRef(new Animated.Value(1)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const handoffCardLayoutY = useRef<number | null>(null);
  const params = useLocalSearchParams<{ scrollTo?: string }>();

  // ── Phase 7 state ──
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());
  // Legacy MonthCalendar mode + calendar-icon toggle were retired in v6.7.
  // The Jump button on DateTabStrip handles non-recent date access now.
  // journalEvents removed — DetailedEventLog no longer rendered
  const [reflection, setReflection] = useState<StoredReflection | null>(null);
  const [reflectionDirty, setReflectionDirty] = useState(false);

  // Load reflection when date changes
  useEffect(() => {
    getReflection(selectedDate).then(setReflection);
  }, [selectedDate]);

  // Load outcomes + day-complete flag for the selected date.
  useEffect(() => {
    getDailyOutcomes(selectedDate).then(setOutcomes).catch(() => {});
    isDayComplete(selectedDate).then(setDayCompleteFlag).catch(() => {});
  }, [selectedDate]);

  // scrollTo='handoff' from End of Shift card → scroll + one-time pulse.
  useEffect(() => {
    if (params?.scrollTo !== 'handoff') return;
    const t = setTimeout(() => {
      const y = handoffCardLayoutY.current;
      if (y != null) {
        scrollViewRef.current?.scrollTo({ y: Math.max(0, y - 80), animated: true });
      }
      handoffPulse.setValue(1);
      Animated.sequence([
        Animated.timing(handoffPulse, { toValue: 1.02, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(handoffPulse, { toValue: 1.0, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]).start();
    }, 200);
    return () => clearTimeout(t);
  }, [params?.scrollTo]);

  const handleDateSelect = useCallback((date: string) => {
    if (reflectionDirty) {
      Alert.alert(
        'Unsaved reflection',
        'You have an unsaved reflection. Save it before switching days?',
        [
          { text: 'Discard', style: 'destructive', onPress: () => { setReflectionDirty(false); setSelectedDate(date); } },
          { text: 'Go back', style: 'cancel' },
        ]
      );
      return;
    }
    setSelectedDate(date);
  }, [reflectionDirty]);

  const handleSaveReflection = useCallback(async (text: string) => {
    // Notes are now handoff-oriented; no rotated prompt is associated.
    const saved = await saveReflection(selectedDate, text, '');
    setReflection(saved);
  }, [selectedDate]);

  // Format subtitle date
  const subtitleDate = useMemo(() => {
    const d = new Date(selectedDate + 'T12:00:00');
    return selectedDate === getTodayDateString()
      ? 'Today'
      : d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  }, [selectedDate]);

  // Time-aware "[Name]'s day…" copy. On today the journalSubtitle helper
  // produces the live form; for past dates it switches to the static
  // "[Name]'s day · Tue, Apr 8" recap. `isViewingPast` is the inverse and
  // also gates the HandoffCard + JournalNotesCard read-only mode below.
  const isViewingToday = selectedDate === getTodayDateString();
  const isViewingPast = !isViewingToday;
  const pastDateObj = useMemo(
    () => (isViewingPast ? new Date(`${selectedDate}T12:00:00`) : undefined),
    [isViewingPast, selectedDate],
  );
  const lastEventAt = useMemo(() => {
    if (!isViewingToday || todayNotes.length === 0) return undefined;
    let max = 0;
    for (const n of todayNotes) {
      const t = new Date(n.timestamp).getTime();
      if (!isNaN(t) && t > max) max = t;
    }
    return max > 0 ? new Date(max) : undefined;
  }, [isViewingToday, todayNotes]);
  const headerSubtitle = useMemo(() => {
    return journalSubtitle({
      name: patientName,
      lastEventAt: isViewingToday ? lastEventAt : undefined,
      pastDate: pastDateObj,
    });
  }, [isViewingToday, patientName, lastEventAt, pastDateObj]);

  const loadReport = useCallback(async () => {
    try {
      setError(null);
      // Phase 7: pass the journal's selected date so navigating to past
      // dates loads that day's brief instead of always re-loading today.
      const data = await buildCareBrief(selectedDate);
      setBrief(data);

      try {
        const allNotes = await getNotesLogs();
        // Anchor the selected date at noon to dodge DST edges so the
        // toDateString() filter matches the calendar day the user picked.
        const targetKey = new Date(`${selectedDate}T12:00:00`).toDateString();
        const filtered = allNotes.filter(
          (n) => new Date(n.timestamp).toDateString() === targetKey
        );
        setTodayNotes(filtered);
      } catch (err) {
        logError('JournalTab.loadNotes', err);
        setTodayNotes([]);
      }

      // Phase 5.11 — insights loading removed; the card that consumed it
      // is now on the Insights tab. The Insights tab loads its own data.

      // Load patient context for patient card + share. Phase 5.13.1.c —
      // patient name now flows from PatientContext via the canonical hook;
      // the AsyncStorage read + 3-source merge is gone. The empty-string
      // not-set sentinel that drives `showPatientCard` continues to apply.
      try {
        const [mi, ageVal, genderVal, meds] = await Promise.all([
          getMedicalInfo(),
          safeGetItem<string | null>(StorageKeys.PATIENT_AGE ?? '@embermate_patient_age', null),
          safeGetItem<string | null>(StorageKeys.PATIENT_GENDER, null),
          getMedications(),
        ]);
        setMedicalInfo(mi);
        setPatientName(patientNameRaw ?? '');
        setPatientAge(ageVal);
        setPatientGender(genderVal);
        setActiveMedCount(meds?.length ?? 0);
      } catch (err) {
        logError('JournalTab.loadPatientContext', err);
        // Non-critical — patient card just won't show
      }

    } catch (err) {
      logError('JournalTab.loadReport', err);
      setError('Unable to load today\u2019s care summary. Pull down to retry.');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, activePatient]);

  useEffect(() => {
    loadReport();
    logAuditEvent(AuditEventType.CARE_BRIEF_VIEWED, 'Care Brief viewed', AuditSeverity.INFO);
  }, [loadReport]);

  const reloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastLoadDoneRef = useRef(0);
  useDataListener(useCallback((category) => {
    if (![
      EVENT.DAILY_INSTANCES, EVENT.CARE_PLAN_ITEMS, EVENT.LOGS, EVENT.VITALS,
      EVENT.WATER, EVENT.SYMPTOMS, EVENT.MOOD, EVENT.WELLNESS, EVENT.MEDICATION,
      EVENT.NOTES, EVENT.CARE_PLAN, EVENT.CARE_PLAN_CONFIG, EVENT.SAMPLE_DATA_CLEARED,
      EVENT.APPOINTMENTS,
    ].includes(category as any)) return;
    // Suppress config events that are self-generated by ensureDailyInstances sync
    if (['carePlanItems', 'carePlanConfig'].includes(category) && Date.now() - lastLoadDoneRef.current < 2000) return;
    if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
    reloadTimerRef.current = setTimeout(() => { loadReport().finally(() => { lastLoadDoneRef.current = Date.now(); }); }, 500);
    if (category === EVENT.SAMPLE_DATA_CLEARED) {
      setIsSampleMode(false);
    }
  }, [loadReport]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadReport();
    setRefreshing(false);
  }, [loadReport]);

  // Auth gate
  useFocusEffect(
    useCallback(() => {
      const checkAuth = async () => {
        try {
          const enabled = await isBiometricEnabled();
          if (enabled) {
            const timeout = await getAutoLockTimeout();
            const stale = await shouldLockSession(timeout);
            setAuthRequired(stale);
          } else {
            setAuthRequired(false);
          }
        } catch (error) {
          logError('JournalTab.checkAuth', error);
          setAuthRequired(false);
        }
      };
      checkAuth();
      hasSampleData().then(setIsSampleMode);
    }, [])
  );

  const handleAuthenticate = async () => {
    const success = await requireAuthentication();
    if (success) {
      await updateLastActivity();
      setAuthRequired(false);
    }
  };

  // ============================================================================
  // RENDER — AUTH GATE
  // ============================================================================

  if (authRequired) {
    return (
      <View style={s.container}>
        <View style={s.authGateContainer}>
          <Text style={s.authGateIcon}>{'\uD83D\uDD12'}</Text>
          <Text style={s.authGateTitle}>Care Brief Protected</Text>
          <Text style={s.authGateSubtitle}>
            Authenticate to view sensitive health information
          </Text>
          <TouchableOpacity
            style={s.authGateButton}
            onPress={handleAuthenticate}
            accessibilityLabel="Authenticate to view Care Brief"
            accessibilityRole="button"
          >
            <Text style={s.authGateButtonText}>Authenticate</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  // Phase 1A — day status (first read on the Journal page).
  // MUST live above the loading/error early returns so the hook order
  // stays stable across renders. Inlines its counter logic for the same
  // reason: the medsDone/etc consts below this point are computed AFTER
  // the early returns and can't be referenced here.
  const dayStatus = useMemo(() => {
    if (!brief) {
      return { color: colors.textWarmMuted, label: 'No data yet', detail: 'Start logging on the Now tab' };
    }
    const md = brief.medications.filter(m => m.status === 'completed' || m.status === 'skipped').length;
    const mt = brief.medications.length;
    const mm = brief.medications.filter(m => m.status === 'missed').length;
    const eaD = brief.meals.meals.filter(m => m.status === 'completed' || m.status === 'skipped').length;
    const eaT = brief.meals.total;
    const wD = brief.wellnessChecks.done;
    const wT = brief.wellnessChecks.total;

    const totalItems = mt + eaT + wT;
    const doneItems = md + eaD + wD;

    if (totalItems === 0) {
      return { color: colors.textWarmMuted, label: 'No data yet', detail: 'Start logging on the Now tab' };
    }
    if (doneItems === totalItems) {
      return { color: colors.accent, label: 'Good day', detail: 'All items completed' };
    }
    if (mm > 0) {
      return { color: colors.amberBright, label: 'Needs attention', detail: `${mm} med${mm > 1 ? 's' : ''} missed` };
    }
    if (doneItems > 0) {
      return { color: colors.amberBright, label: 'Incomplete day', detail: `${doneItems} of ${totalItems} items done` };
    }
    return { color: colors.textWarmMuted, label: 'Day starting', detail: `${totalItems} items scheduled` };
  }, [brief, colors]);

  if (loading && !brief) {
    return (
      <View style={s.container}>
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text style={s.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (error && !brief) {
    return (
      <View style={s.container}>
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <ScrollView
            style={s.scrollView}
            contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 70 }]}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
            }
          >
            <ScreenHeader title="Journal" subtitle={`${dayName}, ${dateStr}`} purpose="Record thoughts and observations." />
            <View style={s.errorContainer}>
              <Text style={s.errorIcon}>{'\u26A0\uFE0F'}</Text>
              <Text style={s.errorText}>{error}</Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================
  const medsDone = brief?.medications.filter(m => m.status === 'completed' || m.status === 'skipped').length ?? 0;
  const medsTotal = brief?.medications.length ?? 0;
  const allMedsDone = medsDone === medsTotal && medsTotal > 0;
  const medsMissed = brief?.medications.filter(m => m.status === 'missed').length ?? 0;

  const mealsDone = brief?.meals.meals.filter(m => m.status === 'completed' || m.status === 'skipped').length ?? 0;
  const mealsTotal = brief?.meals.total ?? 0;
  const mealsMissed = brief?.meals.meals.filter(m => m.status === 'missed').length ?? 0;

  const hasVitals = brief?.vitals.recorded ?? false;
  const wellnessDone = brief?.wellnessChecks.done ?? 0;
  const wellnessTotal = brief?.wellnessChecks.total ?? 0;
  const hasMorning = brief?.mood.morningWellness != null;
  const hasEvening = brief?.mood.eveningWellness != null;

  const waterGlasses = brief?.hydration.glasses ?? 0;

  // Appointment
  const daysUntilAppt = brief?.nextAppointment
    ? Math.max(0, Math.ceil((new Date(brief.nextAppointment.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;
  const showAppointment = brief?.nextAppointment && daysUntilAppt != null && daysUntilAppt <= 7;

  // UX-restructure (Commit 6) — feed-forward banner. Visible when an
  // appointment is within 14 days. Connects daily logging to the
  // clinical visit-prep report on Insights.
  const FEED_LOOKAHEAD_DAYS = 14;
  const showFeedBanner =
    isViewingToday &&
    brief?.nextAppointment &&
    daysUntilAppt != null &&
    daysUntilAppt <= FEED_LOOKAHEAD_DAYS;

  // ============================================================================
  // BRIEFING NARRATIVE
  // ============================================================================
  function getBriefingText(): string {
    if (!brief) return '';
    if (brief.handoffNarrative && brief.handoffNarrative.trim().length > 0) {
      return brief.handoffNarrative;
    }
    if (brief.statusNarrative && brief.statusNarrative.trim().length > 0) {
      return brief.statusNarrative;
    }
    return buildHandoffSummary(brief, medsDone, medsTotal, allMedsDone, hasVitals);
  }


  // ============================================================================
  // SHARE / REPORT HANDLERS
  // ============================================================================
  // Phase 9: Share opens HandoffSheet (today, next-caregiver audience).
  // Bottom HandoffCard's "Share summary" button keeps using this fast-path.
  function handleShareDaily() {
    if (loading) {
      Alert.alert('Loading', 'Please wait while the journal loads.');
      return;
    }
    setHandoffSheetVisible(true);
  }

  function handleDoneForToday() {
    markDayComplete(selectedDate).then(() => {
      setDayCompleteFlag(true);
    });
  }


  // ============================================================================
  // PATIENT CONTEXT
  // ============================================================================
  const activeDiagnoses = (medicalInfo?.diagnoses ?? []).filter(d => d.status === 'active');
  const allergies = medicalInfo?.allergies ?? [];
  // Patient name is used in the header purpose line — no standalone
  // patient card is rendered.

  // ============================================================================
  // RENDER — MAIN
  // ============================================================================
  return (
    <View style={s.container}>

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView
          ref={scrollViewRef}
          style={s.scrollView}
          contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 70 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
          }
        >
          {/* ─── HEADER ─── */}
          <View style={s.headerRow}>
            <View style={s.headerLeft}>
              <Text style={s.headerTitle}>Journal</Text>
              <Text style={s.headerDate}>{dayName}, {dateStr}</Text>
              <Text style={s.headerPurpose}>{headerSubtitle}</Text>
            </View>
            {/* Header actions removed — Share is now exclusively on the
                bottom HandoffCard. Visit Prep is reachable from Insights. */}
          </View>

          {/* ─── SAMPLE DATA INDICATOR — tap to open the manage sheet ─── */}
          {isSampleMode && (
            <TouchableOpacity
              style={s.sampleIndicator}
              onPress={() => setManageSampleOpen(true)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Example data — set up your loved one to get started"
              accessibilityHint="Opens the example data sheet to set up your real profile or remove the example."
            >
              <Text style={s.sampleIndicatorText}>
                {'\u{1F4CA}'} Example data — set up your loved one to get started
              </Text>
              <Text style={s.sampleIndicatorChevron}>{'›'}</Text>
            </TouchableOpacity>
          )}


          {/* UX-restructure (Commit 6) — feed-forward banner. Connects
              daily logging on Journal to the clinical visit-prep report
              on Insights when an appointment is within 14 days. */}
          {showFeedBanner && brief?.nextAppointment && (
            <TouchableOpacity
              style={s.feedBanner}
              onPress={() => navigate('/(tabs)/understand')}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`Your entries are building ${patientName}'s visit prep for ${brief.nextAppointment.provider}, ${daysUntilAppt} days away`}
            >
              <Text style={s.feedBannerIcon}>{'🩺'}</Text>
              <Text style={s.feedBannerText} numberOfLines={2}>
                {`Your entries are building ${patientName}'s visit prep for ${brief.nextAppointment.provider} · ${daysUntilAppt} day${daysUntilAppt === 1 ? '' : 's'}`}
              </Text>
              <Text style={s.feedBannerArrow}>{'›'}</Text>
            </TouchableOpacity>
          )}

          {/* ═══ DATE TAB STRIP (left fade + Jump popover replace MonthCalendar) ═══ */}
          <DateTabStrip
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
          />

          {/* Past-day mode: prose recap + notable moments + saved notes,
              built from local events. Today still uses the live outcomes
              + notes + handoff layout below. */}
          {isViewingPast ? (
            <NarrativeView dateKey={selectedDate} />
          ) : (
            <>
              {/* Phase 5.12.a — leading dashboard card removed. Journal
                  no longer duplicates Now; completion counts demote to a
                  quiet footer line at the bottom of the page. */}

              {/* ═══ TODAY'S NOTES (single-card layout, internal eyebrow + footer) ═══ */}
              <View style={{ marginTop: 12 }}>
                <JournalNotesCard
                  date={selectedDate}
                  savedText={reflection?.text}
                  savedAt={reflection?.savedAt}
                  onSave={handleSaveReflection}
                  onDirtyChange={setReflectionDirty}
                  readOnly={isViewingPast}
                />
              </View>
            </>
          )}

          {/* Phase 5.11 — "This week" pattern card relocated to Insights.
              Now and Journal are today-focused; longitudinal stats live
              on the Insights tab. */}

          {/* ═══ HANDOFF CARD (Phase 6) — hidden on past dates ═══ */}
          {!isViewingPast && (
          <View
            onLayout={(e) => { handoffCardLayoutY.current = e.nativeEvent.layout.y; }}
          >
            <HandoffCard
              hasNotes={!!reflection?.text?.trim()}
              hasMissed={outcomes.missed.count > 0}
              hasPending={outcomes.pending.count > 0}
              hasLogged={outcomes.logged.count > 0}
              dayComplete={dayCompleteFlag}
              onShare={() => setHandoffSheetVisible(true)}
              onDoneForToday={handleDoneForToday}
              pulse={handoffPulse}
            />
          </View>
          )}

          {/* Phase 5.12.a — quiet completion footer line (replaces the
              missed-tasks dashboard). Ambient, not a section header. */}
          {!isViewingPast && (() => {
            const total = outcomes.logged.count + outcomes.missed.count + outcomes.pending.count;
            if (total === 0) return null;
            const pending = outcomes.pending.count;
            return (
              <Text style={s.completionFooter}>
                {`${outcomes.logged.count} of ${total} logged${pending > 0 ? ` · ${pending} still to do` : ''}`}
              </Text>
            );
          })()}

          {/* ─── FOOTER ─── */}
          <Text style={s.timestamp}>Not a medical record</Text>

        </ScrollView>
      </SafeAreaView>

      <HandoffSheet
        visible={handoffSheetVisible}
        onClose={() => setHandoffSheetVisible(false)}
        patientName={patientName}
        date={new Date()}
        dateKey={getTodayDateString()}
      />

      <ManageSampleDataSheet
        visible={manageSampleOpen}
        onClose={() => setManageSampleOpen(false)}
        activePatientName={patientName}
      />
    </View>
  );
}

// ============================================================================
// HELPER
// ============================================================================

function buildHandoffSummary(
  brief: CareBrief,
  medsDone: number,
  medsTotal: number,
  allMedsDone: boolean,
  hasVitals: boolean,
): string {
  if (brief.handoffNarrative && brief.handoffNarrative.trim().length > 0) {
    return brief.handoffNarrative;
  }
  const parts: string[] = [];
  if (medsTotal > 0) {
    if (allMedsDone) {
      parts.push(`All ${medsTotal} medications taken.`);
    } else {
      const pending = medsTotal - medsDone;
      parts.push(`${pending} medication${pending === 1 ? '' : 's'} still pending.`);
    }
  }
  if (!hasVitals && brief.vitals.scheduled) {
    parts.push('Vitals not yet recorded.');
  }
  if (brief.wellnessChecks.total > 0 && brief.wellnessChecks.done === 0) {
    parts.push('Wellness check pending.');
  } else if (brief.wellnessChecks.total > 0 && brief.wellnessChecks.done < brief.wellnessChecks.total) {
    const remaining = brief.wellnessChecks.total - brief.wellnessChecks.done;
    parts.push(`${remaining} wellness check${remaining > 1 ? 's' : ''} still pending.`);
  }
  if (brief.nextAppointment) {
    const dateStr = new Date(brief.nextAppointment.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    parts.push(`Next: ${brief.nextAppointment.provider} on ${dateStr}.`);
  }
  return parts.join(' ') || 'No pending items.';
}

// ============================================================================
// STYLES
// ============================================================================

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  scrollView: {
    flex: 1,
  },
  // Phase 3 page rhythm — every tab's outermost ScrollView lands at
  // paddingTop: 24 / paddingHorizontal: 14.
  scrollContent: {
    paddingHorizontal: 14, // allow: tap-target padding (Apple HIG ≥44pt)
    paddingTop: 24, // allow: tap-target padding (Apple HIG ≥44pt)
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: c.textSecondary,
    fontSize: 16,
    marginTop: 10,
  },
  errorContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  errorIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
    color: c.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Auth Gate
  authGateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  authGateIcon: { fontSize: 48, marginBottom: Spacing.md },
  authGateTitle: { fontSize: 20, fontWeight: '600', color: c.textPrimary, marginBottom: 8 },
  authGateSubtitle: { fontSize: 14, color: c.textSecondary, textAlign: 'center', marginBottom: Spacing.lg, lineHeight: 20 },
  authGateButton: { backgroundColor: c.accent, paddingHorizontal: 32, paddingVertical: 14, borderRadius: BorderRadius.lg }, // allow: tap-target padding (Apple HIG ≥44pt)
  authGateButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },

  // ─── SAMPLE DATA INDICATOR ───
  // UX-restructure (Commit 6) — feed-forward banner. Lavender tint
  // signals the clinical lane (visit prep on Insights).
  feedBanner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    backgroundColor: c.caregiverAccentBg,
    borderWidth: 0.5,
    borderColor: c.caregiverAccentStrong,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  feedBannerIcon: {
    fontSize: 14,
  },
  feedBannerText: {
    flex: 1,
    fontSize: 12,
    color: c.caregiverAccent,
    fontWeight: '500' as const,
    lineHeight: 16,
  },
  feedBannerArrow: {
    fontSize: 16,
    color: c.caregiverAccent,
  },
  sampleIndicator: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: c.accentLight,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  sampleIndicatorText: {
    fontSize: 12,
    fontWeight: '500',
    color: c.caregiverAccentText,
    flex: 1,
  },
  sampleIndicatorChevron: {
    fontSize: 16,
    color: c.caregiverAccentText,
    marginLeft: 8,
  },

  // ─── HEADER ───
  headerRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    paddingTop: 56,
    paddingBottom: 24, // allow: tap-target padding (Apple HIG ≥44pt)
    borderBottomWidth: 0.5,
    borderBottomColor: c.glassHover,
  },
  headerLeft: {
    flex: 1,
    paddingRight: 12,
  },
  // Phase 3.6.3 — H1 fontSize 32 → 22 with weight 500 + letterSpacing
  // -0.3 to match Now's compressed greeting (Phase 3.6.2). Visual
  // consistency across all four tabs.
  headerTitle: {
    fontSize: 22,
    fontWeight: '500' as const,
    color: c.textPrimary,
    letterSpacing: -0.3,
  },
  headerDate: {
    fontSize: 13,
    color: c.textMuted,
    marginTop: 4,
  },
  headerPurpose: {
    fontSize: 13,
    color: c.textSecondary,
    marginTop: 8,
    lineHeight: 20,
  },
  headerActions: {
    flexDirection: 'row' as const,
    gap: 8,
    marginTop: 6,
  },
  headerPill: {
    backgroundColor: c.accentFaint,
    borderWidth: 1,
    borderColor: c.accentBorder,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  headerPillText: {
    fontSize: 12,
    color: c.accent,
    fontWeight: '500' as const,
  },
  headerPillReport: {
    backgroundColor: c.caregiverAccentFaint,
    borderWidth: 1,
    borderColor: c.caregiverAccentBorder,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  headerPillReportText: {
    fontSize: 12,
    color: c.caregiverAccent,
    fontWeight: '500' as const,
  },
  // ─── Day status block (Phase 1B) ───
  statusBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: c.textWarmPrimary,
  },
  statusDetail: {
    fontSize: 12,
    color: c.textWarmMuted,
    marginTop: 2,
  },

  // Phase 5.12.a — quiet completion line ("9 of 12 logged · 1 still to do").
  // Demoted from the leading dashboard card; ambient footer copy only.
  completionFooter: {
    fontSize: 10,
    color: c.textTertiary,
    textAlign: 'center',
    marginTop: Spacing.md,
    lineHeight: 14,
  },

  // ─── TIMESTAMP ───
  timestamp: {
    fontSize: 10,
    color: c.textTertiary,
    textAlign: 'center',
    marginTop: Spacing.md,
    lineHeight: 16,
    fontStyle: 'italic',
  },
});
