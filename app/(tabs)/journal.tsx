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
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Colors, BorderRadius, Spacing, Fonts } from '../../theme/theme-tokens';
import {
  CARD_PADDING_H,
  CARD_PADDING_V,
  CardBorder,
  SECTION_GAP,
  TITLE_CLEARANCE,
  TypeScale,
} from '../../theme/spacing';
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
import { ObservationsFromLogging } from '../../components/journal/ObservationsFromLogging';
import { ManageSampleDataSheet } from '../../components/sample/ManageSampleDataSheet';
// Phase 31 F3 (2026-05-21) — HandoffSheet retired. The Journal page
// already shows all the data; the separate handoff modal was redundant.
// Share now fires directly from the Share CTA via generateAndShareHandoff
// (PDF + OS share sheet). Body text comes from the canonical handoff
// builder. The legacy in-app Copy/SMS actions retire — the OS share
// sheet offers those equivalents natively when the PDF is shared.
import { generateAndShareHandoff } from '../../services/handoffPdf';
// Phase 31 — single-day handoff bundler. Replaces the today-hardcoded
// buildHandoffReport / curated template path so the shared PDF reads
// from the same date-keyed feeders the screen renders (no drift) and
// honors selectedDate when sharing from a past day.
import { buildHandoffDay } from '../../utils/handoffDayBuilder';
import { formatTime } from '../../utils/text/primitives';
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
// Phase 27 F1 — SOAP sections render with the new left-rule chrome via
// SoapSectionFrame (SOAP-only; does NOT cascade into other JournalSection
// consumers like Insights — Q-27.6 lock). JournalSection import retained
// because non-SOAP surfaces on this screen (BUILDING TOWARD banner area,
// past-day fallbacks routed through GestaltSummary, etc.) still consume
// the original primitive. See SoapSectionFrame.tsx header for full scope
// rules.
import { JournalSection } from '../../components/journal/JournalSection';
import { SoapSectionFrame } from '../../components/journal/SoapSectionFrame';
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
// Phase 31 F2 (2026-05-21) — Section 4 notes path routes through the
// consolidated utility. getConsolidatedNotes merges reflectionStorage
// + legacy handoffToneRepo on first load (per the brief's mid-day-
// legacy both-stores case); after first save, the authoritative flag
// flips and the legacy store is no longer consulted for that date.
// saveConsolidatedNotes writes to reflectionStorage only — the legacy
// tone store is never written to and never deleted (R5 hard lock).
// The pre-F2 direct getReflection/saveReflection imports retire from
// this file in F2; the StoredReflection type still surfaces because
// saveConsolidatedNotes returns it.
import { getConsolidatedNotes, saveConsolidatedNotes, type ConsolidatedNotes } from '../../utils/consolidatedNotes';
import type { StoredReflection } from '../../storage/reflectionStorage';
// Phase 31 F3 (2026-05-21) — direct getHandoffTone import retired
// from this file. The tone store is still read indirectly via
// utils/consolidatedNotes (legacy merge on first load). The Section 1
// gestalt's tone-as-override branch retires alongside HandoffSheet —
// gestalt now reads the shape-of-day prose only (no tone override).
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
  // Phase 31 F2 fix — the sticky Share CTA + scroll padding need to
  // clear the absolute-positioned bottom tab bar (height: 80 in
  // app/(tabs)/_layout.tsx). Pre-fix used `bottom: 14 +
  // marginBottom: insets.bottom`, which sat behind the tab bar and
  // got clipped. useBottomTabBarHeight returns the actual rendered
  // height (includes safe-area insets on notched devices), so
  // adding it to the CTA's bottom offset reliably keeps the CTA
  // visible above the tab bar across all device sizes.
  const tabBarHeight = useBottomTabBarHeight();
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
  // Phase 31 F3 — handoffSheetVisible state retired alongside the
  // HandoffSheet modal. Share CTA now fires generateAndShareHandoff
  // directly; no modal-open state to track.
  const handoffPulse = useRef(new Animated.Value(1)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const handoffCardLayoutY = useRef<number | null>(null);
  const params = useLocalSearchParams<{ scrollTo?: string }>();

  // ── Phase 7 state ──
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());
  // Legacy MonthCalendar mode + calendar-icon toggle were retired in v6.7.
  // The Jump button on DateTabStrip handles non-recent date access now.
  // journalEvents removed — DetailedEventLog no longer rendered
  // Phase 31 F2 — `reflection` state now holds ConsolidatedNotes shape
  // (merge of reflectionStorage + legacy handoffToneRepo per the
  // authoritative-flag rules in utils/consolidatedNotes). Same `.text`
  // and `.savedAt` field surface that JournalNotesCard + the
  // hasNotes checks downstream already read, so the type swap is
  // shape-compatible — no consumer-side changes required.
  const [reflection, setReflection] = useState<ConsolidatedNotes | null>(null);
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
  // Phase 31 F3 — handoffTone state retired. Pre-F3 this held the
  // legacy tone-input value and drove the Section 1 gestalt override.
  // Phase 31 F1's consolidatedNotes utility now folds any legacy tone
  // into the notes-input value at read time, and the gestalt no longer
  // overrides — it always reads the shape-of-day prose. No surface
  // writes the legacy tone store going forward.
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
  // Phase 35 Slice 3-C followup (Bug B) — addNoteMode RETIRED.
  // Pre-fix this state was set true by JournalEmptyDay's onAddNote
  // callback, which unmounted the empty-day frame and mounted the
  // SOAP layout. The note input the caregiver expected mounted in
  // Section 4 far below the visible viewport with no autofocus.
  // The relocation made the input vanish from the user's POV —
  // option (b) lock moves the input INLINE within JournalEmptyDay,
  // so this state has no purpose. The empty-state transition is
  // now data-driven (reflection.text non-empty → isEmpty flips →
  // SOAP mounts naturally on the same render cycle the save
  // completes). No click-driven layout shift.

  // Load consolidated notes when date changes. Phase 31 F2 — routes
  // through getConsolidatedNotes so the merge + authoritative-flag
  // rules govern what Section 4 shows. Direct getReflection import is
  // retired from this surface.
  useEffect(() => {
    getConsolidatedNotes(selectedDate).then(setReflection);
  }, [selectedDate]);

  // Phase 27 closeout — gestalt refresh on log events. Pre-closeout
  // the moodLine load lived inline inside a [selectedDate]-deps
  // useEffect with no event subscription, so logging vitals/meds/
  // wellness/etc. would update Section 2 (via loadReport on the L427
  // listener) but leave Section 1's gestalt sentence frozen on its
  // pre-log value until the user navigated to a different date.
  // Device-confirmed bug: "Vitals reading not yet recorded" in
  // Section 1 while Section 2 showed BP 158/95 logged the same day.
  // Diagnosis: stale-closure refresh bug, not a data-source bug.
  //
  // Fix shape mirrors the refreshOutcomes pattern (~L265): extract
  // the load into a useCallback so both the initial-mount useEffect
  // AND a useDataListener can invoke it. The listener subscribes to
  // the FULL event set that can change a day's shape — every bucket,
  // not just vitals — because the same stale-summary class affects
  // every bucket (log a med → "X meds still scheduled" stays stale;
  // log a wellness check → wellness clause stays stale; etc.).
  //
  // Pinned by journalGestaltRefreshOnLog27.test.ts Contracts A.1–A.3.
  const refreshMoodLine = useCallback(async () => {
    try {
      // Phase 31 F3 — pre-F3 read the legacy tone first and let it
      // override the shape-of-day prose. With HandoffSheet retired
      // and tone-as-override gone, the gestalt always reads the
      // shape-of-day output. Phase 27.5b F3's narrative is the canon
      // voice for Section 1: observational prose describing what's
      // done, pending, and standing out.
      const shape = await buildShapeOfDay(selectedDate);
      setNarrativeSummary(shape.hasData ? shape.summary : null);
    } catch (err) {
      logError('JournalTab.refreshMoodLine', err);
    }
  }, [selectedDate]);

  useEffect(() => {
    refreshMoodLine();
  }, [refreshMoodLine]);

  // Event-driven refresh — fires whenever a log lands. The 6-event set
  // covers every signal that can change buildShapeOfDay's output for
  // the current day:
  //   • DAILY_INSTANCES — instance status pending → completed flips
  //   • LOGS            — generic log write
  //   • VITALS          — vitals log
  //   • MEDICATION      — medication log
  //   • WELLNESS        — wellness check log
  //   • MOOD            — mood log
  // Without this listener, refreshMoodLine only runs once on mount
  // via the [selectedDate]-deps useEffect above and stays stale for
  // the rest of the session on that date.
  useDataListener(useCallback((category) => {
    if (
      category === EVENT.DAILY_INSTANCES
      || category === EVENT.LOGS
      || category === EVENT.VITALS
      || category === EVENT.MEDICATION
      || category === EVENT.WELLNESS
      || category === EVENT.MOOD
    ) {
      refreshMoodLine();
    }
  }, [refreshMoodLine]));

  // Phase 31 F3 — moodLine resolution simplified. Pre-F3 the legacy
  // handoffTone overrode the shape-of-day prose when present. With
  // HandoffSheet retired and the tone-as-override branch gone, the
  // gestalt sentence is always the shape-of-day output (or the
  // empty-day fallback). Legacy tone content is preserved by being
  // folded into Section 4's notes input via consolidatedNotes — it
  // surfaces there, not in the gestalt line.
  const moodLine: string =
    narrativeSummary && narrativeSummary.trim().length > 0
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
    // Phase 31 F2 — routes through saveConsolidatedNotes which (a)
    // writes to reflectionStorage and (b) sets the per-date
    // authoritative flag so subsequent loads skip the legacy tone
    // merge. The returned StoredReflection's { text, savedAt } shape
    // matches ConsolidatedNotes, so the state update is direct.
    const saved: StoredReflection | null = await saveConsolidatedNotes(selectedDate, text);
    if (saved) {
      setReflection({ text: saved.text, savedAt: saved.savedAt });
    }
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

  // Wave-1 dead-code deletion: the `dayStatus` useMemo (a duplicate
  // adherence/day-status computation) was orphaned — its rendered consumer
  // (the statusBlock/statusDot/statusLabel callout) was removed in Phase 2,
  // leaving the producer computing a value nothing read. Removed so it
  // can't be mistaken for a live adherence source during data convergence.
  // (Pinned by __tests__/screens/journalNoNeedsAttentionCallout.test.tsx.)

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
  // Phase 31 F3 (2026-05-21) — Share fires the PDF + OS-share path
  // directly. Pre-F3 opened HandoffSheet (a 638-line preview modal that
  // wrapped this exact call). The Journal page already shows all the
  // data; the intermediate modal was redundant. The OS share sheet
  // (triggered by generateAndShareHandoff) offers Copy / Messages /
  // Mail / Save natively — no need for in-app duplicate actions.
  // Phase 31 F3 fix — must be a regular function declaration, NOT a
  // useCallback hook. The journal.tsx component has loading-state and
  // error-state early-returns above (L634, L645) that bail before
  // hitting this region. A useCallback here would fire in the
  // loaded-state render but not in the loading-state render, causing
  // a "Rendered more hooks than during the previous render" violation.
  // Stable identity isn't needed here (no memoized child consumes it),
  // so a plain function suffices.
  async function handleShareDaily() {
    if (loading) {
      Alert.alert('Loading', 'Please wait while the journal loads.');
      return;
    }
    try {
      // Phase 31 — gather the selected day's bundle (same date-keyed
      // feeders the screen renders from). dateLabel derives from
      // selectedDate so past-day shares show the day being shared;
      // timeLabel stays generation-time so the recipient sees when the
      // PDF was produced. generateAndShareHandoff fires the OS share
      // sheet directly — no in-app preview (F3's "page IS the preview"
      // stance; iOS Share's own Preview shows the actual rendered PDF).
      const payload = await buildHandoffDay(selectedDate);
      // Phase 35 Slice 3-C PART 2 — empty-day silent-return retired.
      // Pre-fix this branch returned with zero user feedback, leaving
      // the caregiver unable to tell whether the tap registered or
      // the day genuinely had nothing to share. Same trust class as
      // the notes-into-the-void bug (input without persistence). Now
      // surfaces a caregiver-facing Alert.
      //
      // Slice 3-C followup — the truth gate widened. Walk surfaced:
      // empty-but-profiled today produced a non-null payload (the
      // null branch only fires when buildCareBrief returns falsy /
      // no patient profile), and Share generated a 22 KB PDF
      // showing scheduled meds all labeled "Status: Pending" + a
      // "Vitals — Scheduled, not yet recorded" line. Recipient
      // could mis-read as "the caregiver hasn't given meds today."
      // The flag payload.hasLoggedContent (P2 PDF-content predicate,
      // computed in buildHandoffDay) gates against this misleading-
      // PDF class. Same Alert wording — one caregiver-facing message,
      // two triggers (no profile OR no logged content).
      if (!payload || !payload.hasLoggedContent) {
        Alert.alert(
          'Nothing to share for this day yet',
          'Log a medication, vital, or note on the Now tab, then come back to share.',
        );
        return;
      }
      const selectedDateObj = new Date(`${selectedDate}T12:00:00`);
      const shareOk = await generateAndShareHandoff({
        payload,
        dateLabel: selectedDateObj.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        }),
        timeLabel: formatTime(new Date()),
      });
      // Phase 35 Slice 3-C PART 2 — generateAndShareHandoff's boolean
      // return was previously discarded. Its OWN try/catch swallows
      // inner throws (Print / FileSystem / Sharing) and returns false,
      // and Sharing.isAvailableAsync() false also returns true with no
      // share sheet shown. Both failure modes surfaced as a silent dud
      // button. Now: check the boolean, surface friendly Alert on
      // failure. The error itself was already logged inside
      // generateAndShareHandoff's catch.
      if (!shareOk) {
        Alert.alert(
          "Couldn't share",
          'Something went wrong preparing the handoff PDF. Please try again.',
        );
      }
    } catch (err) {
      // Phase 35 Slice 3-C PART 2 — outer catch fires when
      // buildHandoffDay re-throws (e.g., ProfileMissingError, which
      // its handler intentionally propagates). Pre-fix this branch
      // logged silently. Now: still log for debugging, AND surface
      // a friendly Alert. Raw error message NOT surfaced — the
      // caregiver shouldn't see stack-trace shrapnel.
      logError('JournalTab.handleShareDaily', err);
      Alert.alert(
        "Couldn't share",
        'Something went wrong preparing the handoff. Please try again.',
      );
    }
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
            {/* Phase 35 Slice 3-C — upper-right Share action. Banked in
                Phase 33 (memory: project_phase_33_audit.md "RELOCATE
                to the upper-right corner as a compact header action ...
                SAGE-OUTLINE") but never built; lands here. Fires the
                same handleShareDaily handler — works for today AND
                past days because handleShareDaily threads selectedDate
                through buildHandoffDay. The previously sticky bottom
                green CTA retired in this same commit (two CTAs for one
                action is clutter; the loud one was off-brand). */}
            <TouchableOpacity
              testID="journal-share-header-action"
              style={s.shareHeaderAction}
              onPress={handleShareDaily}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Share handoff"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={s.shareHeaderActionLabel}>Share</Text>
            </TouchableOpacity>
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
          {/* F7 — 28px after date chips (TITLE_CLEARANCE). */}
          <View style={{ height: TITLE_CLEARANCE }} />

          {/* Phase 5.12.h — empty-day composition. When today has no
              events, no notes, and no tone, render the restorative
              hero + nearby-days continuity + add-note affordance
              instead of the populated structure with empty sections.
              Past days keep NarrativeView (which has its own empty
              handling). */}
          {(() => {
            return shouldRenderJournalEmptyDay({
              isViewingPast,
              hasEvents: !!(dayEvents && dayEvents.length > 0),
              hasNotes: (reflection?.text?.trim().length ?? 0) > 0,
              // Phase 31 F3 — tone retired alongside HandoffSheet; the
              // empty-day predicate no longer factors handoffTone. Any
              // legacy tone content is folded into the notes value via
              // consolidatedNotes, so it surfaces through hasNotes.
              hasTone: false,
              hasCompletedInstances: outcomes.logged.count > 0,
            });
          })() && (
            <JournalEmptyDay
              dateKey={selectedDate}
              onSave={handleSaveReflection}
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
            // Phase 35 Slice 3-C followup (Bug B) — empty-state branch
            // is now purely data-driven. Pre-fix this gate was
            // `isEmpty && !addNoteMode` — the addNoteMode flag let the
            // populated SOAP layout mount over the empty-day frame on
            // tap, which was the mount/unmount race the walk surfaced.
            // Post-fix: when the user types + saves into JournalEmptyDay's
            // inline input, reflection.text becomes non-empty, isEmpty
            // re-evaluates to false, and the populated SOAP layout
            // (with the just-saved note in Section 4) mounts on the
            // same render cycle the JournalEmptyDay unmounts. One
            // clean data-driven transition.
            const isEmpty = shouldRenderJournalEmptyDay({
              isViewingPast,
              hasEvents: !!(dayEvents && dayEvents.length > 0),
              hasNotes: (reflection?.text?.trim().length ?? 0) > 0,
              // Phase 31 F3 — tone retired alongside HandoffSheet; the
              // empty-day predicate no longer factors handoffTone. Any
              // legacy tone content is folded into the notes value via
              // consolidatedNotes, so it surfaces through hasNotes.
              hasTone: false,
              hasCompletedInstances: outcomes.logged.count > 0,
            });
            if (isEmpty) return null;
            const hasGestalt = (moodLine ?? '').trim().length > 0;
            const hasNotes = (reflection?.text?.trim().length ?? 0) > 0;
            const subjectiveEmpty = !hasGestalt && !hasNotes;
            return (
              <>
              {/* UX-3 pre-launch — section order reshuffled per the
                  pre-launch device walk:
                    1. Worth flagging   (was Section 3, amber)
                    2. How today went   (was Section 1, caregiverAccent)
                    3. What was logged  (was Section 2, neutral)
                    4. For the next caregiver (Section 4, unchanged)
                  Worth flagging leads with the urgency-bearing surface
                  so flags are visible without scrolling past gestalt /
                  bucket fields. TodayNotableMoments still null-renders
                  when no moments exist, so the lead position collapses
                  cleanly on quiet days. */}

              {/* Section 3 → Position 1 — "Worth flagging" (amber).
                  TodayNotableMoments owns the SoapSectionFrame amber
                  chrome when wrapInSection is set. Returns null when
                  no moments — the entire section card collapses, no
                  empty assessment chrome appears. */}
              <TodayNotableMoments dateKey={selectedDate} wrapInSection />

              {/* F7 Position 2 — narrative prose. The "How today went"
                  eyebrow + lavender chrome are RETIRED per F7 spec. The
                  gestalt now renders as italic serif 14px directly,
                  flat against the page — the prose IS the section, no
                  surrounding card or label. Empty-state today-only
                  prompt is preserved (tap-to-focus into the Section 4
                  notes input). */}
              <View style={{ height: SECTION_GAP }} />
              <View style={s.journalNarrativeBlock}>
                {!isViewingPast && subjectiveEmpty ? (
                  <TouchableOpacity
                    onPress={() => notesInputRef.current?.focus()}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Add a note to describe today"
                  >
                    <Text style={s.journalNarrativePrompt}>
                      How would you describe today?
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <GestaltSummary summary={moodLine} bare />
                )}
              </View>

              {/* Section 2 → Position 3 — "What was logged" (neutral).
                  Hybrid gutter layout per Q-27.2c: bucket header above,
                  name|time sub-rows beneath. Pre-filter logic in this
                  IIFE drives the per-bucket gates (pending dedup —
                  pending content surfaces only in Section 4's STILL
                  PENDING list) and the section-level all-pending empty
                  state (Q-27.9 — warm "Nothing logged yet today" line
                  rather than a collapsed blank section). loggedOnly
                  prop on each narrative does the in-component pending
                  suppression for the rendered rows. UX-3 contract: the
                  section is FULLY VISIBLE — no collapse, no truncation;
                  every populated bucket renders its narrative in full.
                  Gated on brief !== null so no chrome flashes during
                  the initial load. */}
              {brief && (() => {
                const loggedMeds = brief.medications.filter(m => m.status !== 'pending');
                const hasMedsLogged = loggedMeds.length > 0;
                const hasVitalsLogged = brief.vitals.recorded;
                const hasWellnessLogged =
                  brief.mood.entries.length > 0
                  || brief.mood.morningWellness != null
                  || brief.mood.eveningWellness != null;
                const hasMealsLogged = brief.meals.meals.some(m => m.status === 'completed');
                const hasHydrationLogged = brief.hydration.logged;
                const hasSleepLogged = brief.sleep.logged;
                const hasAnyLogged =
                  hasMedsLogged
                  || hasVitalsLogged
                  || hasWellnessLogged
                  || hasMealsLogged
                  || hasHydrationLogged
                  || hasSleepLogged;
                return (
                  <>
                  <View style={{ height: SECTION_GAP }} />
                  <SoapSectionFrame eyebrow="What was logged" tint="neutral">
                    {!hasAnyLogged && (
                      <Text style={s.section2Empty}>Nothing logged yet today.</Text>
                    )}
                    {hasMedsLogged && (
                      <View style={s.bucketGroup}>
                        <Text style={s.bucketHeader}>Medications</Text>
                        <MedicationsNarrative medications={brief.medications} bare loggedOnly />
                      </View>
                    )}
                    {hasVitalsLogged && (
                      <View style={s.bucketGroup}>
                        <Text style={s.bucketHeader}>Vitals</Text>
                        <VitalsNarrative vitals={brief.vitals} bare loggedOnly />
                      </View>
                    )}
                    {hasWellnessLogged && (
                      <View style={s.bucketGroup}>
                        <Text style={s.bucketHeader}>Wellness</Text>
                        <MoodWellnessNarrative mood={brief.mood} bare />
                      </View>
                    )}
                    {hasMealsLogged && (
                      <View style={s.bucketGroup}>
                        <Text style={s.bucketHeader}>Meals</Text>
                        <MealsNarrative meals={brief.meals} bare loggedOnly />
                      </View>
                    )}
                    {hasHydrationLogged && (
                      <View style={s.bucketGroup}>
                        <Text style={s.bucketHeader}>Hydration</Text>
                        <Text style={s.bucketInlineValue}>
                          {brief.hydration.glasses != null
                            ? `${brief.hydration.glasses} glass${brief.hydration.glasses === 1 ? '' : 'es'} logged today.`
                            : 'Hydration logged today.'}
                        </Text>
                      </View>
                    )}
                    {hasSleepLogged && (
                      <View style={s.bucketGroup}>
                        <Text style={s.bucketHeader}>Sleep</Text>
                        <Text style={s.bucketInlineValue}>
                          {brief.sleep.hours != null
                            ? `${brief.sleep.hours} hour${brief.sleep.hours === 1 ? '' : 's'}${brief.sleep.quality != null ? ` · quality ${brief.sleep.quality}/5` : ''}.`
                            : 'Sleep logged today.'}
                        </Text>
                      </View>
                    )}
                  </SoapSectionFrame>
                  </>
                );
              })()}

              {/* UX-3 pre-launch — TodayNotableMoments (Section 3)
                  moved to Position 1 above. The lead-position reshuffle
                  surfaces the flag list before the gestalt + bucket
                  fields without rebuilding the existing section. */}

              {/* Section 4 → Position 4 — "For the next caregiver" (unchanged).
                  Lavender bookend, paired with Section 1.
                    • Today: eyebrow "For the next caregiver", with
                      STILL PENDING + NOTES sub-blocks.
                    • Past:  eyebrow "Notes from that day", NOTES sub-
                      block only (no forward-handoff voice retroactively;
                      no past-tense STILL PENDING formatter — D2 chose
                      to drop the sub-block rather than build a new
                      past-day formatter).

                  Phase 31 F2 (2026-05-21) — D3.1 "skip past Section 4
                  when no saved reflection" RETIRED. Rationale: the
                  consolidated notes path merges legacy handoffTone into
                  the displayed value, and the user must be able to SEE
                  any migrated/legacy content on the day it belongs to.
                  Hiding Section 4 when empty means migrated content is
                  data-preserved-but-unreachable on past days — the
                  caregiver perceives notes loss. Phase 31's
                  visibility-over-hollow-chrome priority wins.

                  Empty-state copy: JournalNotesCard's readOnly
                  placeholder ("Notes from this day") handles the truly-
                  empty past-day case without needing additional empty-
                  state copy at this layer. Always rendering the
                  SoapSectionFrame on past days surfaces ANY content
                  that exists in either store. */}
              {/* Device-walk fix (2026-06-13) — the pre-fix pending-task
                  sub-eyebrow + the pending-list mount both retired from
                  Section 4. The section is the caregiver's free-text
                  handoff note ("Anything to pass along?"), not a task
                  tracker; scheduled-item state belongs in the timeline
                  + Care Plan, not duplicated here. */}
              <View style={{ height: SECTION_GAP }} />
              <View style={s.section4DustyCard}>
                <Text style={s.section4DustyEyebrow}>
                  {(isViewingPast ? 'Notes from that day' : 'For the next caregiver').toUpperCase()}
                </Text>
                {/* Phase 35 Slice 3-A — OBSERVATIONS FROM LOGGING sub-section.
                    Reads LogEntry rows for the selected date, filters to those
                    with non-empty notes, renders chronologically. Hidden when
                    no qualifying rows exist (Q-3A.9). Renders identically on
                    past days (Q-3A.10 — read-only). The Section 4 frame
                    above already subscribes to EVENT.LOGS via the parent's
                    useDataListener (Q-3A.11), so saves elsewhere refresh
                    this surface through the date prop. */}
                <ObservationsFromLogging date={selectedDate} />
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
                  savedAt={reflection?.savedAt ?? undefined}
                  onSave={handleSaveReflection}
                  onDirtyChange={setReflectionDirty}
                  readOnly={isViewingPast}
                  caregiverName={caregiverName}
                  providerName={upcomingProviderName}
                />
              </View>
              </>
            );
          })()}

          {/* Phase 27 F4 — merged footer (Q-27.3: single eyebrow block).
              Pre-F4 the page bottom was two structurally separate units:
              the BUILDING TOWARD banner (lavender-tinted touchable with
              hairline divider + dedicated eyebrow + emoji + arrow) and
              the JournalDisclaimer (centered logged-count + privacy
              line). F4 collapses them into one quiet footer block under
              a single "FOR THE RECORD" eyebrow. Lavender no-fill canon
              compliant: the building-toward affordance becomes a quiet
              text link with a sage chevron — no banner chrome.

              Gating:
                • Building-toward line — conditional on showFeedBanner
                  AND upcomingAppointment; absent on past days, on days
                  without an upcoming visit, and when dismissed.
                • Logged-count line — conditional on isViewingToday AND
                  outcomes.total > 0 (drives JournalDisclaimer's stats
                  line). Past days omit it.
                • Disclaimer copy line — always present.

              The eyebrow renders always so the footer reads as a
              distinct page-level region even on past-day-empty + no-
              upcoming-visit (when only the disclaimer line is below). */}
          <View style={s.footer}>
            <SectionEyebrow text="For the record" />
            {showFeedBanner && upcomingAppointment && (
              <TouchableOpacity
                style={s.footerLink}
                onPress={() => navigate('/(tabs)/understand')}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Your entries are building ${patientName}'s visit prep for ${upcomingAppointment.provider}, ${daysUntilAppt} days away`}
              >
                <Text style={s.footerLinkText}>
                  {`Building toward ${patientName}'s visit prep for ${upcomingAppointment.provider} · ${daysUntilAppt} day${daysUntilAppt === 1 ? '' : 's'}`}
                </Text>
                <Text style={s.footerLinkArrow}>{'›'}</Text>
              </TouchableOpacity>
            )}
            {(() => {
              const total = !isViewingPast
                ? outcomes.logged.count + outcomes.missed.count + outcomes.pending.count
                : 0;
              return (
                <JournalDisclaimer
                  loggedCount={total > 0 ? outcomes.logged.count : undefined}
                  totalCount={total > 0 ? total : undefined}
                  inline
                />
              );
            })()}
          </View>

        </ScrollView>
      </SafeAreaView>

      {/* Phase 5.12.g — sticky "Share handoff" CTA. The page's only
          primary action. Hidden on past days (handoff is today-only)
          and on empty days (no events, no notes — nothing to share).
          Phase 31 F3 (2026-05-21) — onPress fires handleShareDaily
          directly (PDF + OS share sheet). Pre-F3 opened HandoffSheet,
          a 638-line preview modal. The Journal page already shows all
          the data; the modal was redundant. */}
      {/* Phase 35 Slice 3-C — the bottom green sticky Share Handoff
          CTA retired. The same handleShareDaily handler is now wired
          to the upper-right sage-outline header action above (in the
          headerRow). Two CTAs for one action was clutter; the loud
          bottom one was the off-brand surface. Hide-not-delete:
          handleShareDaily stays defined (wired to the header action);
          the shareCta / shareCtaText style blocks stay in
          createStyles as dead-code-sweep targets per the user-locked
          retention rule. */}

      {/* Phase 31 F3 — HandoffSheet render retired. The Share CTA above
          fires handleShareDaily directly; no in-app modal sits between
          the user and the share action. */}

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
  // F7 — narrative prose block (was Section 1 "How today went" pre-F7).
  // No card, no eyebrow; the gestalt prose IS the section.
  journalNarrativeBlock: {
    paddingVertical: CARD_PADDING_V,
  },
  journalNarrativePrompt: {
    fontFamily: Fonts.serifItalic,
    fontSize: 14, // F7 spec: 14px narrative prose
    lineHeight: 22,
    color: c.textSecondary,
    fontStyle: 'italic' as const,
  },
  // F7 — Section 4 dusty-bordered input card. Replaces the prior
  // SoapSectionFrame caregiverAccent left-rule chrome with a fully
  // bordered card carrying a micro eyebrow.
  section4DustyCard: {
    borderWidth: 1,
    borderColor: CardBorder.dusty,
    borderRadius: 12,
    paddingVertical: CARD_PADDING_V,
    paddingHorizontal: CARD_PADDING_H,
  },
  section4DustyEyebrow: {
    ...TypeScale.micro,
    color: '#6b8cae', // dusty
    marginBottom: 14, // allow: eyebrow rhythm to body
  },
  // Phase 27 F3 — Section 1 (Subjective) empty-state prompt. Retired
  // alongside the F7 narrative reshuffle; the F7 journalNarrativePrompt
  // style above replaces it. Pinned here as a transitional alias so any
  // out-of-tree consumer still resolves until a follow-up sweep removes
  // it entirely.
  section1EmptyPrompt: {
    fontSize: 13,
    lineHeight: 19,
    color: c.textSecondary,
    fontStyle: 'italic' as const,
  },
  // Phase 27 F2 — Section 2 (Objective) hybrid gutter layout (Q-27.2c).
  // Pre-F2 the layout was horizontal: 80pt label column + flex-1 value
  // column. F2 restructures to vertical: serif bucket header on its own
  // line above the name|time sub-rows beneath. Scans top-to-bottom
  // cleanly on busy days and keeps the bucket-group rhythm without the
  // narrow label-column boxing the prose. objectiveRow/Label/Value/
  // InlineValue retired with this commit — replaced by bucketGroup +
  // bucketHeader + bucketInlineValue below.
  bucketGroup: {
    marginBottom: Spacing.sm, // gap between bucket groups
  },
  bucketHeader: {
    // F7 spec: bucket sub-labels (MEDICATIONS / VITALS / etc.) render
    // in micro type — 9px letter-spacing 1.8 weight 700, uppercase.
    ...TypeScale.micro,
    color: c.textTertiary,
    textTransform: 'uppercase' as const,
    marginBottom: 6, // allow: eyebrow rhythm to sub-rows
  },
  bucketInlineValue: {
    fontSize: 13,
    lineHeight: 20,
    color: c.textSecondary,
  },
  // Section 2 empty-state copy (Q-27.9). Renders when nothing is logged
  // yet today (all bucket gates resolve false after pending dedup).
  // Witness-voice italic line matches Section 1's empty-state register.
  section2Empty: {
    fontSize: 13,
    lineHeight: 19,
    color: c.textSecondary,
    fontStyle: 'italic' as const,
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
  authGateButtonText: { fontSize: 16, fontWeight: '600', color: '#0a0c0a' },

  // Phase 27 F4 — merged footer (Q-27.3 single-eyebrow-block lock).
  // Replaces the pre-F4 BUILDING TOWARD banner + standalone centered
  // JournalDisclaimer with a single quiet footer region beneath one
  // SectionEyebrow ("FOR THE RECORD"). The lavender-tinted banner
  // chrome retires entirely (lavender no-fill canon compliant); the
  // building-toward affordance becomes a quiet text link with a sage
  // chevron, and the disclaimer flows inline beneath it.
  //
  // Retired with F4: sectionDivider / feedBanner / feedBannerIcon /
  // feedBannerText / feedBannerArrow. They were only consumed by the
  // pre-F4 BUILDING TOWARD section, now collapsed into this block.
  footer: {
    marginTop: Spacing.md, // separates footer from the last SOAP section above
    paddingHorizontal: 14, // allow: page-rhythm horizontal inset
    paddingBottom: Spacing.md,
  },
  footerLink: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    paddingVertical: 4,
    marginBottom: Spacing.sm,
  },
  footerLinkText: {
    flex: 1,
    fontSize: 12,
    color: c.textPrimary,
    fontWeight: '500' as const,
    lineHeight: 16,
  },
  footerLinkArrow: {
    fontSize: 16,
    color: c.accent,
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
  // Phase 33 F4.1 (2026-05-18) — F4 audit-drift correction. F4
  // migrated ScreenHeader to 32pt Source Serif 4 weight 400 + −0.8
  // tracking but missed that Journal's main render path bypasses
  // ScreenHeader (Phase 22.1 handoff-document framing retired the
  // ScreenHeader wrapper in favor of this inline title-only block;
  // F4's `grep <ScreenHeader` consumer audit caught only the
  // error-fallback branch at line 558). This commit aligns the inline
  // typography to F4's spec without restoring ScreenHeader wrapping —
  // preserves Phase 22.1 intent (no subtitle/purpose; date stays in
  // JournalIdentityStrip, mood stays in GestaltSummary).
  headerTitle: {
    fontFamily: Fonts.serif,
    fontSize: 32,
    fontWeight: '400' as const,
    color: c.textPrimary,
    letterSpacing: -0.8,
  },
  // Phase 35 Slice 3-C — upper-right Share action. Sage-outline per
  // the banked Phase 33 brand spec (sage border + sage text +
  // transparent fill — explicitly NOT the saturated-green background
  // of the retired sticky bottom CTA). Right-edge tap target sized
  // for HIG ≥44pt via paddingHorizontal/Vertical + hitSlop on the
  // TouchableOpacity. marginTop matches the header's serif title
  // baseline so the action reads as a peer of the title, not a
  // floating chip.
  // F7 spec: 1px solid sage, color sage, 11px, padding 5px 14px, radius 18px.
  // hitSlop on the TouchableOpacity carries tap-target compliance.
  shareHeaderAction: {
    paddingHorizontal: 14, // allow: F7 share button horizontal pad
    paddingVertical: 5, // allow: F7 share button vertical pad
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.accent,
    backgroundColor: 'transparent',
    marginTop: 8,
  },
  shareHeaderActionLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: c.accent,
    letterSpacing: 0.3,
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
