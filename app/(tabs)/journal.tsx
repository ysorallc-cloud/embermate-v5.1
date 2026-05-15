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
  TextInput,
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
import { TodayNotableMoments } from '../../components/journal/TodayNotableMoments';
import { TodayStillPending } from '../../components/journal/TodayStillPending';
import { ManageSampleDataSheet } from '../../components/sample/ManageSampleDataSheet';
import { HandoffSheet } from '../../components/journal/HandoffSheet';
// Phase 27.X — NarrativeView fully retired to intentional orphan. Past-day
// view now renders the same SOAP layout as today (with past-specific
// reframes for Section 1 prompt + Section 4 eyebrow/gating). The
// component file remains on disk for Phase 20 dead-code sweep, following
// the NarrativeSnapshot retirement pattern (Phase 27 F7).
import { NarrativeSnapshot } from '../../components/journal/NarrativeSnapshot';
// Phase 11.8.4 — WhatChangedToday / EventsTimeline / ForNextCaregiver
// imports retired from the today path. The components themselves stay
// in the codebase (they have their own component-level tests) and may
// surface again in past-day rendering or future surfaces. Today Tiers
// 1-3 (Recap / Notable Moments / Still Pending) cover their roles.
import { JournalEmptyDay } from '../../components/journal/JournalEmptyDay';
import { JournalDisclaimer } from '../../components/journal/JournalDisclaimer';
// Phase 22.1 — handoff-document framing.
import { JournalIdentityStrip } from '../../components/journal/JournalIdentityStrip';
import { GestaltSummary } from '../../components/journal/GestaltSummary';
import { JournalSection } from '../../components/journal/JournalSection';
import { MedicationsNarrative } from '../../components/journal/MedicationsNarrative';
import { VitalsNarrative } from '../../components/journal/VitalsNarrative';
import { MoodWellnessNarrative } from '../../components/journal/MoodWellnessNarrative';
import { MealsNarrative } from '../../components/journal/MealsNarrative';
// Phase 22.2 — uniform SectionEyebrow + section-color encoding.
import { SectionEyebrow } from '../../components/SectionEyebrow';
import { getCaregiverProfile } from '../../storage/caregiverProfileRepo';
import {
  getUpcomingAppointments,
  type Appointment,
} from '../../utils/appointmentStorage';
import {
  withinUpcomingWindow,
  daysUntilAppointment,
} from '../../utils/appointmentLookahead';
import { useDayEvents } from '../../hooks/useDayEvents';
import { getReflection, saveReflection, StoredReflection } from '../../storage/reflectionStorage';
import { getHandoffTone } from '../../storage/handoffToneRepo';
import { buildShapeOfDay } from '../../utils/buildShapeOfDay';
import { getDailyOutcomes } from '../../utils/dailyOutcomes';
import type { DailyOutcomes } from '../../utils/text/types';
import { isDayComplete, markDayComplete } from '../../utils/dayComplete';
import { shouldRenderJournalEmptyDay } from '../../utils/journalEmptyDayCheck';

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
  // Phase 27 F6 — ref on JournalNotesCard's internal TextInput so
  // Section 1's empty-state prompt can focus the textarea on tap
  // (audit D7: single input, two surface tap targets).
  const notesInputRef = useRef<TextInput | null>(null);
  // Phase 27 F6 — fired by TodayStillPending's onLoaded callback so the
  // STILL PENDING sub-eyebrow inside Section 4 only renders when there
  // are pending items to anchor it.
  const [stillPendingCount, setStillPendingCount] = useState(0);

  // Phase 5.12.b — mood line is the page's emotional anchor. Resolved
  // in priority: (1) caregiver-authored handoff tone for the day,
  // (2) factual narrative summary, (3) "No record from this day."
  const [handoffTone, setHandoffTone] = useState<string | null>(null);
  const [narrativeSummary, setNarrativeSummary] = useState<string | null>(null);
  // Phase 22.1 — identity strip + notes-prompt threading. Loaded
  // once on mount; the values rarely change within a session.
  const [caregiverName, setCaregiverName] = useState<string | null>(null);
  const [upcomingAppointment, setUpcomingAppointment] = useState<Appointment | null>(null);

  // Phase 22.1 — caregiver profile load.
  useEffect(() => {
    let cancelled = false;
    getCaregiverProfile().then((profile) => {
      if (cancelled) return;
      setCaregiverName(profile?.name ?? null);
    }).catch(() => {
      if (!cancelled) setCaregiverName(null);
    });
    return () => { cancelled = true; };
  }, []);

  // Phase 22.1 — upcoming-appointment lookup via appointmentLookahead.
  // Single source of truth shared with the BUILDING TOWARD banner and
  // the notes prompt provider name (Watch For #2). Refreshes on focus
  // so a freshly-added appointment surfaces without a manual reload.
  const refreshUpcomingAppointment = useCallback(() => {
    getUpcomingAppointments().then((upcoming) => {
      const next = upcoming.find((a) => withinUpcomingWindow(a.date)) ?? null;
      setUpcomingAppointment(next);
    }).catch((err) => {
      logError('JournalTab.loadUpcomingAppointment', err);
      setUpcomingAppointment(null);
    });
  }, []);
  useEffect(() => {
    refreshUpcomingAppointment();
  }, [refreshUpcomingAppointment]);

  // Phase 5.12.e — timeline + cross-section flag linkage. The hooks share
  // the dateKey effect and re-fetch when the user changes day.
  const { events: dayEvents } = useDayEvents(selectedDate);

  // Phase 5.12.h — when the user taps "+ Add a note" from the empty-day
  // composition, flip into populated mode so JournalNotesCard mounts and
  // accepts input. Once they save, the reflection state populates and the
  // empty-day branch naturally falls out of the conditional.
  const [addNoteMode, setAddNoteMode] = useState(false);

  // Load reflection when date changes
  useEffect(() => {
    getReflection(selectedDate).then(setReflection);
  }, [selectedDate]);

  // Load tone + factual narrative summary for the mood line.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const tone = await getHandoffTone(selectedDate);
        if (cancelled) return;
        setHandoffTone(tone);
        // Phase 27.5b F3 — buildDayNarrative({ factualOnly: true })
        // produced count-only roll-up sentences ("5/5 medications
        // logged. 1 wellness check recorded.") for the Section 1
        // gestalt line. Replaced with buildShapeOfDay which produces
        // observational prose describing what's done, pending, and
        // standing out — same data shape, same fallback semantics.
        // The builder is its own module (D5 — preserves factualOnly
        // for any other consumer of the old path; audit found zero
        // production consumers post-Phase-27.X, so the legacy path
        // is on track for the Phase 20 dead-code sweep).
        if (tone && tone.trim().length > 0) {
          setNarrativeSummary(null);
        } else {
          const shape = await buildShapeOfDay(selectedDate);
          if (cancelled) return;
          setNarrativeSummary(shape.hasData ? shape.summary : null);
        }
      } catch (err) {
        logError('JournalTab.loadMoodLine', err);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedDate]);

  // Resolution: tone → narrative summary → empty-day fallback.
  const moodLine: string =
    (handoffTone && handoffTone.trim().length > 0)
      ? handoffTone.trim()
      : (narrativeSummary && narrativeSummary.trim().length > 0)
      ? narrativeSummary.trim()
      : 'No record from this day.';

  // Phase 11.7.1 — outcomes refresh callback. Used by:
  //   1. The mount + selectedDate-change useEffect below (existing path).
  //   2. The event-driven useDataListener that re-fetches when sample-
  //      data init or any logging surface writes to a pipeline that
  //      changes outcomes. Pre-fix the listener at line ~316 only
  //      called loadReport, which doesn't touch outcomes — leaving
  //      the empty-day check at line ~632 reading stale state.
  const refreshOutcomes = useCallback(() => {
    getDailyOutcomes(selectedDate).then(setOutcomes).catch(() => {});
  }, [selectedDate]);

  // Load outcomes + day-complete flag for the selected date.
  useEffect(() => {
    refreshOutcomes();
    isDayComplete(selectedDate).then(setDayCompleteFlag).catch(() => {});
  }, [selectedDate, refreshOutcomes]);

  // Event-driven outcomes refresh — same multi-pipeline filter pattern
  // as Phase 11.3's support.tsx witness refresh. The categories listed
  // are the pipelines that change the instance-pipeline view feeding
  // outcomes (DAILY_INSTANCES + LOGS for logs/instance writes;
  // MEDICATION + WELLNESS for category-specific emits;
  // SAMPLE_DATA_CLEARED for the reset flow).
  useDataListener(useCallback((category) => {
    if (
      category === EVENT.DAILY_INSTANCES
      || category === EVENT.LOGS
      || category === EVENT.MEDICATION
      || category === EVENT.WELLNESS
      || category === EVENT.SAMPLE_DATA_CLEARED
    ) {
      refreshOutcomes();
    }
  }, [refreshOutcomes]));

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
  // Phase 22.1 — both the BUILDING TOWARD banner and the notes prompt
  // provider name now source from `upcomingAppointment` (via
  // utils/appointmentLookahead). brief.nextAppointment stays in the
  // brief shape for other consumers but is no longer the canonical
  // source for these two surfaces.
  const daysUntilAppt = upcomingAppointment
    ? daysUntilAppointment(upcomingAppointment.date)
    : null;
  const upcomingProviderName = upcomingAppointment?.provider?.trim() || null;

  // BUILDING TOWARD feed-forward banner. Visible when an appointment
  // is within the canonical 14-day upcoming window (the
  // appointmentLookahead constant; same window Insights uses). Banner
  // is moved to the bottom of the page in 22.1 — see the post-Notes
  // render block.
  const showFeedBanner = isViewingToday && upcomingAppointment !== null;

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
          {/* Phase 22.1 — handoff-document framing. Title-only header;
              date + mood collapse into the identity strip + gestalt
              block below. The old sample-mode inline banner was
              retired here (ManageSampleDataSheet is still reachable
              from Settings). */}
          <View style={s.headerRow}>
            <View style={s.headerLeft}>
              <Text style={s.headerTitle}>Journal</Text>
            </View>
          </View>

          <JournalIdentityStrip
            date={`${dayName}, ${dateStr}`}
            patientName={patientName}
            caregiverName={caregiverName}
          />

          {/* Phase 27.X — standalone above-DateTabStrip GestaltSummary
              fully retired. Past-day gestalt now renders inside Section 1
              (Subjective) of the SOAP layout below, same as today. */}

          {/* ═══ DATE TAB STRIP (left fade + Jump popover replace MonthCalendar) ═══ */}
          <DateTabStrip
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
          />

          {/* Phase 5.12.h — empty-day composition. When today has no
              events, no notes, and no tone, render the restorative
              hero + nearby-days continuity + add-note affordance
              instead of the populated structure with empty sections.
              Past days keep NarrativeView (which has its own empty
              handling). */}
          {(() => {
            if (addNoteMode) return false;
            return shouldRenderJournalEmptyDay({
              isViewingPast,
              hasEvents: !!(dayEvents && dayEvents.length > 0),
              hasNotes: (reflection?.text?.trim().length ?? 0) > 0,
              hasTone: !!handoffTone && handoffTone.trim().length > 0,
              hasCompletedInstances: outcomes.logged.count > 0,
            });
          })() && (
            <JournalEmptyDay
              dateKey={selectedDate}
              onAddNote={() => setAddNoteMode(true)}
              onSelectDay={handleDateSelect}
            />
          )}

          {/* Phase 27.X — SOAP layout runs for both today and past-day
              views. Past-specific reframes apply at the section level
              (Section 1 prompt gated to today; Section 4 eyebrow + STILL
              PENDING + gating reframed). The pre-27.X NarrativeView
              branch is retired; the component file lives on as an
              intentional orphan. */}
          {(() => {
            // Hide the populated structure on empty-day mode unless the
            // user opted into addNoteMode (which mounts JournalNotesCard).
            const isEmpty = shouldRenderJournalEmptyDay({
              isViewingPast,
              hasEvents: !!(dayEvents && dayEvents.length > 0),
              hasNotes: (reflection?.text?.trim().length ?? 0) > 0,
              hasTone: !!handoffTone && handoffTone.trim().length > 0,
              hasCompletedInstances: outcomes.logged.count > 0,
            });
            if (isEmpty && !addNoteMode) return null;
            const hasGestalt = (moodLine ?? '').trim().length > 0;
            const hasNotes = (reflection?.text?.trim().length ?? 0) > 0;
            const subjectiveEmpty = !hasGestalt && !hasNotes;
            return (
              <>
              {/* Phase 27 F3 / 27.X — Section 1 (Subjective).
                  Lavender card carrying the witness-voice gestalt. The
                  bare-mode GestaltSummary skips its standalone chrome
                  because JournalSection owns the card shape. The
                  empty-state tap-to-focus prompt is today-only per
                  Phase 27.X D1 — past days are read-only; the prompt's
                  forward-handoff voice doesn't fit a closed day. Past
                  with no gestalt falls back to GestaltSummary's
                  "No record from this day." (the same tuned phrasing
                  NarrativeView used). */}
              <JournalSection eyebrow="How today went" tint="caregiverAccent">
                {!isViewingPast && subjectiveEmpty ? (
                  <TouchableOpacity
                    onPress={() => notesInputRef.current?.focus()}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Add a note to describe today"
                  >
                    <Text style={s.section1EmptyPrompt}>
                      How would you describe today?
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <GestaltSummary summary={moodLine} bare />
                )}
              </JournalSection>

              {/* Phase 27 F4 — Section 2 (Objective).
                  Neutral-chrome card listing what was logged today as
                  label/prose rows. Data source is the same `brief`
                  state journal.tsx already populates via
                  buildCareBrief(selectedDate) — single fetch, D5
                  confirmed. Each row is independently gated; a row
                  only renders when its slice has data. Section 2 as
                  a whole is gated on brief !== null so no blank chrome
                  flashes during the initial load. */}
              {brief && (
                <JournalSection eyebrow="What was logged" tint="neutral">
                  {brief.medications.length > 0 && (
                    <View style={s.objectiveRow}>
                      <Text style={s.objectiveLabel}>Medications</Text>
                      <View style={s.objectiveValue}>
                        <MedicationsNarrative medications={brief.medications} bare />
                      </View>
                    </View>
                  )}
                  {(brief.vitals.scheduled || brief.vitals.recorded) && (
                    <View style={s.objectiveRow}>
                      <Text style={s.objectiveLabel}>Vitals</Text>
                      <View style={s.objectiveValue}>
                        <VitalsNarrative vitals={brief.vitals} bare />
                      </View>
                    </View>
                  )}
                  {(brief.mood.entries.length > 0 || brief.mood.morningWellness || brief.mood.eveningWellness) && (
                    <View style={s.objectiveRow}>
                      <Text style={s.objectiveLabel}>Wellness</Text>
                      <View style={s.objectiveValue}>
                        <MoodWellnessNarrative mood={brief.mood} bare />
                      </View>
                    </View>
                  )}
                  {brief.meals.total > 0 && (
                    <View style={s.objectiveRow}>
                      <Text style={s.objectiveLabel}>Meals</Text>
                      <View style={s.objectiveValue}>
                        <MealsNarrative meals={brief.meals} bare />
                      </View>
                    </View>
                  )}
                  {brief.hydration.logged && (
                    <View style={s.objectiveRow}>
                      <Text style={s.objectiveLabel}>Hydration</Text>
                      <Text style={s.objectiveInlineValue}>
                        {brief.hydration.glasses != null
                          ? `${brief.hydration.glasses} glass${brief.hydration.glasses === 1 ? '' : 'es'} logged today.`
                          : 'Hydration logged today.'}
                      </Text>
                    </View>
                  )}
                  {brief.sleep.logged && (
                    <View style={s.objectiveRow}>
                      <Text style={s.objectiveLabel}>Sleep</Text>
                      <Text style={s.objectiveInlineValue}>
                        {brief.sleep.hours != null
                          ? `${brief.sleep.hours} hour${brief.sleep.hours === 1 ? '' : 's'}${brief.sleep.quality != null ? ` · quality ${brief.sleep.quality}/5` : ''}.`
                          : 'Sleep logged today.'}
                      </Text>
                    </View>
                  )}
                </JournalSection>
              )}

              {/* Phase 27 F5 — Section 3 (Assessment).
                  TodayNotableMoments owns the JournalSection amber
                  chrome ("Worth flagging") when wrapInSection is set.
                  Returns null when no moments — the entire section
                  card collapses, no empty assessment chrome appears. */}
              <TodayNotableMoments dateKey={selectedDate} wrapInSection />

              {/* Phase 27 F6 / 27.X — Section 4 (Plan / Notes).
                  Lavender bookend, paired with Section 1.
                    • Today: eyebrow "For the next caregiver", with
                      STILL PENDING + NOTES sub-blocks.
                    • Past:  eyebrow "Notes from that day", NOTES sub-
                      block only (no forward-handoff voice retroactively;
                      no past-tense STILL PENDING formatter — D2 chose
                      to drop the sub-block rather than build a new
                      past-day formatter).
                  D3.1 — past days with no saved reflection skip Section
                  4 entirely so no hollow chrome renders. Gate is inline
                  for legibility: today always renders Section 4; past
                  renders only when reflection notes exist. */}
              {(!isViewingPast || hasNotes) && (
                <JournalSection
                  eyebrow={isViewingPast ? 'Notes from that day' : 'For the next caregiver'}
                  tint="caregiverAccent"
                >
                  {!isViewingPast && stillPendingCount > 0 && (
                    <Text style={s.section4SubEyebrow}>STILL PENDING</Text>
                  )}
                  {!isViewingPast && (
                    <TodayStillPending
                      dateKey={selectedDate}
                      bare
                      onLoaded={setStillPendingCount}
                    />
                  )}
                  {/* Phase 27.5b F5 — inner "NOTES" sub-eyebrow retired.
                      The TextInput below now carries visible input chrome
                      (rgba bg + border + radius) and placeholder-as-prompt
                      copy, so the writing affordance is discoverable on its
                      own without a separate label. STILL PENDING sub-eyebrow
                      above stays — it labels the distinct list (TodayStill
                      Pending) above the notes block. */}
                  <JournalNotesCard
                    inputRef={notesInputRef}
                    bare
                    date={selectedDate}
                    savedText={reflection?.text}
                    savedAt={reflection?.savedAt}
                    onSave={handleSaveReflection}
                    onDirtyChange={setReflectionDirty}
                    readOnly={isViewingPast}
                    caregiverName={caregiverName}
                    providerName={upcomingProviderName}
                  />
                </JournalSection>
              )}
              </>
            );
          })()}

          {/* Phase 22.1 — BUILDING TOWARD feed-forward banner moved
              from the top of the scroll to here (between Notes and the
              disclaimer footer), matching the handoff-document order:
              identity → gestalt → day picker → narrative → notable →
              pending → notes → BUILDING TOWARD → footer. Source:
              utils/appointmentLookahead (same as the notes prompt).
              Phase 22.2 — eyebrow + hairline divider added at page
              level (banner has no internal eyebrow container).
              Lavender tint matches the visit-prep semantic used by
              the banner's existing accent color. Gated by
              showFeedBanner so no orphan eyebrow/divider above empty
              space. */}
          {showFeedBanner && upcomingAppointment && (
            <>
              <View style={s.sectionDivider} />
              <SectionEyebrow text="Building toward" tint="caregiverAccent" />
              <TouchableOpacity
                style={s.feedBanner}
                onPress={() => navigate('/(tabs)/understand')}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={`Your entries are building ${patientName}'s visit prep for ${upcomingAppointment.provider}, ${daysUntilAppt} days away`}
              >
                <Text style={s.feedBannerIcon}>{'\u{1FA7A}'}</Text>
                <Text style={s.feedBannerText} numberOfLines={2}>
                  {`Your entries are building ${patientName}'s visit prep for ${upcomingAppointment.provider} · ${daysUntilAppt} day${daysUntilAppt === 1 ? '' : 's'}`}
                </Text>
                <Text style={s.feedBannerArrow}>{'›'}</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Phase 5.11 — "This week" pattern card relocated to Insights.
              Now and Journal are today-focused; longitudinal stats live
              on the Insights tab. */}

          {/* Phase 5.12.g — HandoffCard removed. The sticky "Share
              handoff" CTA below is the page's only primary action;
              competing share affordances were retired here. The
              "Done for today" affordance from HandoffCard is dropped
              with this commit and may resurface as a Now-tab feature. */}

          {/* Phase 22.1 — standalone completion footer line collapsed
              into the compressed JournalDisclaimer below (its line 1
              now reads "{n} of {m} logged today"). Persistent on every
              state; quiet legal hygiene; not dismissable. */}
          {(() => {
            const total = !isViewingPast
              ? outcomes.logged.count + outcomes.missed.count + outcomes.pending.count
              : 0;
            return (
              <JournalDisclaimer
                loggedCount={total > 0 ? outcomes.logged.count : undefined}
                totalCount={total > 0 ? total : undefined}
              />
            );
          })()}

        </ScrollView>
      </SafeAreaView>

      {/* Phase 5.12.g — sticky "Share handoff" CTA. The page's only
          primary action. Hidden on past days (handoff is today-only)
          and on empty days (no events, no notes, no tone — nothing to
          share). Opens the canonical HandoffSheet directly; the
          earlier chooser-style export surface was retired in the v6
          UX restructure. */}
      {(() => {
        const isViewingToday = !isViewingPast;
        const hasShareableContent =
          (dayEvents && dayEvents.length > 0) ||
          (reflection?.text?.trim().length ?? 0) > 0 ||
          (handoffTone && handoffTone.trim().length > 0);
        if (!isViewingToday || !hasShareableContent) return null;
        return (
          <TouchableOpacity
            testID="journal-share-cta"
            style={[s.shareCta, { marginBottom: insets.bottom }]}
            onPress={() => setHandoffSheetVisible(true)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Share handoff for today"
          >
            <Text style={s.shareCtaText}>{'Share handoff →'}</Text>
          </TouchableOpacity>
        );
      })()}

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
        entrySource="banner"
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
  // Phase 27 F3 — Section 1 (Subjective) empty-state prompt. Renders
  // when there is neither a gestalt summary nor any caregiver notes
  // yet. F3 ships this as static text; F6 will swap it for a tap-to-
  // focus affordance once JournalNotesCard moves into Section 4 with
  // a ref (D7 — single input, two surface tap targets).
  section1EmptyPrompt: {
    fontSize: 13,
    lineHeight: 19,
    color: c.textSecondary,
    fontStyle: 'italic' as const,
  },
  // Phase 27 F4 — Section 2 (Objective) row layout. Label column is
  // Georgia-serif at fixed 80pt width; value column flexes. Rows stack
  // vertically with a small gap so the eye can scan top-to-bottom.
  objectiveRow: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    paddingVertical: 4, // allow: row breathing room (Apple HIG)
  },
  objectiveLabel: {
    fontFamily: 'Georgia',
    fontSize: 12,
    color: c.textTertiary,
    width: 80,
    paddingRight: 8, // allow: column gap (Apple HIG)
    paddingTop: 1,
    // Phase 27 Tuning 2 — explicit top-align. The row container's
    // alignItems: 'flex-start' is the right intent, but RN's Text
    // nodes can pick up implicit baseline behavior that defeats it
    // inside a row when the value column wraps tall (e.g. 5 lines of
    // medications). alignSelf overrides that — label anchors to the
    // first line of the value column rather than drifting to the
    // visual center of the row.
    alignSelf: 'flex-start' as const,
  },
  objectiveValue: {
    flex: 1,
  },
  objectiveInlineValue: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: c.textSecondary,
  },
  // Phase 27 F6 — Section 4 sub-eyebrows. 8pt size matches the global
  // SectionEyebrow typography; amber at 0.7 alpha is the spec'd weight
  // for "STILL PENDING" so the sub-block reads as a quieter signal
  // than the parent JournalSection eyebrow ("For the next caregiver").
  // NOTES sub-eyebrow uses the neutral textTertiary so the human-voice
  // notes content owns the visual weight (consistent with Phase 22.2's
  // notes-tint decision).
  section4SubEyebrow: {
    fontSize: 8,
    fontWeight: '500' as const,
    letterSpacing: 0.5,
    color: 'rgba(229, 176, 74, 0.7)',
    marginBottom: 4,
  },
  // Phase 27.5b F5 — section4SubEyebrowNotes style retired with the
  // inner "NOTES" sub-eyebrow. The notes block now relies on the
  // TextInput's own input chrome (rgba bg + border + radius) for
  // discoverability rather than a separate label.
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

  // Phase 22.2 — hairline divider for the page-level BUILDING TOWARD
  // section (the banner has no internal eyebrow container). Matches
  // the 15.12 Insights divider visual.
  sectionDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginVertical: Spacing.md,
    marginHorizontal: -16,
  },

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
  // Phase 22.1 — sampleIndicator styles retired with the inline
  // "Example data — set up your loved one" banner. Sheet entry
  // still reachable from Settings.

  // ─── HEADER ───
  headerRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    paddingTop: 32,
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
  // Phase 22.1 — headerDate / headerMood styles retired. The date
  // moved into JournalIdentityStrip and the mood line into
  // GestaltSummary, both with their own typography.
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

  // Phase 5.12.g — sticky "Share handoff →" CTA. Anchored absolute over
  // the scroll content so it stays put while events scroll underneath.
  // Sage filled per the spec (single primary action on the page).
  shareCta: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 14, // allow: anchored sticky-CTA inset (Phase 5.12.g)
    backgroundColor: c.accent,
    borderRadius: 11,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -8 },
    elevation: 6,
  },
  shareCtaText: {
    fontSize: 11.5,
    fontWeight: '600' as const,
    color: '#1a1f1a',
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
