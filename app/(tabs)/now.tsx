// ============================================================================
// NOW PAGE - Progress Rings + Bottom Encouragement
// "What's happening right now?" — Quick status and timeline
// ============================================================================

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { navigate } from '../../lib/navigate';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { getMedications, Medication } from '../../utils/medicationStorage';
import { getUpcomingAppointments, Appointment } from '../../utils/appointmentStorage';
import { getDailyTracking } from '../../utils/dailyTrackingStorage';
import {
  getTodayVitalsLog,
  getTodayMealsLog,
  updateTodayWaterLog,
  getTodayWaterLog,
} from '../../utils/centralStorage';
import { safeGetItem } from '../../utils/safeStorage';
import { StorageKeys } from '../../utils/storageKeys';
import { getMedicationLogs } from '../../utils/medicationStorage';
import { updatePatient } from '../../storage/patientRegistry';
import { checkTodayVitalsExceedances } from '../../utils/vitalsGuidance';
import { getVitalsByType } from '../../utils/vitalsStorage';
import { recordVisit } from '../../utils/lastVisitTracker';

// Aurora Components
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePatient } from '../../contexts/PatientContext';
// CarePlan System
import { useCarePlan } from '../../hooks/useCarePlan';
import { useCareTasks } from '../../hooks/useCareTasks';
import { computeNowFocus } from '../../utils/nowFocus';
import { getStartingTomorrow } from '../../utils/startingTomorrow';
import { StartingTomorrowPreview } from '../../components/now/StartingTomorrowPreview';
import { useAppointments } from '../../hooks/useAppointments';
import { useCarePlanConfig } from '../../hooks/useCarePlanConfig';
import { useTodayScope } from '../../hooks/useTodayScope';
import { getTodayDateString } from '../../services/carePlanGenerator';
import { getConsolidatedNotes } from '../../utils/consolidatedNotes';
import { BUCKET_META, BucketType, MVP_HIDDEN_BUCKETS, type CarePlanConfig, type MedsBucketConfig } from '../../types/carePlanConfig';
import { CARE_PLAN_TEMPLATES } from '../../constants/carePlanTemplates';

// Urgency System
import {
  isClinicalCritical,
  UPCOMING_WINDOW_MINUTES,
} from '../../utils/urgency';

// Extracted utilities
import {
  type TodayStats,
  type StatData,
  type TimeWindow,
  getRouteForInstanceType,
  getRouteForWellnessInstance,
  needsCaptureBeforeComplete,
  groupByTimeWindow,
  getCurrentTimeWindow,
  TIME_WINDOW_HOURS,
  OVERDUE_GRACE_MINUTES,
  formatNextScheduledTime,
} from '../../utils/nowHelpers';
import { getCareItemStatus } from '../../utils/careItemStatus';
// Extracted hooks
import { useNowPrompts } from '../../hooks/useNowPrompts';
// useNowInsights removed — replaced by StatRings

// Extracted components
import { RoutineSheet } from '../../components/now/RoutineSheet';
// QuickLogFAB + QuickLogSheet retired 2026-06-13 — ad-hoc logging is
// the "Log something else →" link under HealthZoneNow → /quick-log-more.
// Component files preserved on disk (dormant).
import { NowHeader } from '../../components/now/NowHeader';
import { NowTimeline } from '../../components/now/NowTimeline';
import { AddMedicationsPrompt } from '../../components/now/AddMedicationsPrompt';
import { ScheduleFocus } from '../../components/now/ScheduleFocus';
import { NowFooter } from '../../components/now/NowFooter';
import { UpcomingAppointmentCard } from '../../components/now/UpcomingAppointmentCard';
import { StatRings } from '../../components/now/StatRings';
import { MorningMedsBanner } from '../../components/now/MorningMedsBanner';
// F7 — Now zone restructure components.
import { HealthZoneNow } from '../../components/now/HealthZoneNow';
import { ReflectionZoneNow } from '../../components/now/ReflectionZoneNow';
import { SECTION_GAP, TITLE_CLEARANCE } from '../../theme/spacing';
// Phase 15.4 — HydrationTodayRow retired. Hydration is the 5th
// StatRings ring; the water-ring tap routes to /log-water (see
// StatRings.tsx). Inline +1 cup is filed for v1.1.


// Banners (removed: NoMedicationsBanner, NoCarePlanBanner, DataIntegrityBanner)
import { logError } from '../../utils/devLog';
import { hapticSuccess } from '../../utils/hapticFeedback';
import { undoInstanceCompletion, resurrectLogEntry, logInstanceCompletion, DEFAULT_PATIENT_ID } from '../../storage/carePlanRepo';
import { addCup, getDayTotal as getHydrationDayTotal } from '../../storage/hydrationRepo';
import {
  upsertDailyReflection,
  deleteDailyReflection,
  getYesterdayReflection,
} from '../../storage/dailyReflectionRepo';
import { getYesterdayVitals } from '../../utils/getYesterdayVitals';
import { LogToast } from '../../components/now/LogToast';
import { getUserTenure, type TenurePhase } from '../../services/userTenure';
import { detectAnomalies } from '../../services/anomalyDetector';
import { useDataListener, emitDataUpdate } from '../../lib/events';
import { EVENT } from '../../lib/eventNames';
// Phase 15.6 — buildCareBrief + CareBrief import retired here.
// They fed the Today's Journal preview tile in NowFooter, which has
// been removed; `brief` state + setBrief call below also dropped.
import { hasSampleData } from '../../utils/sampleDataManager';
import { useSampleMode } from '../../hooks/useSampleMode';
import { SampleModeBanner } from '../../components/sample/SampleModeBanner';
import { ManageSampleDataSheet } from '../../components/sample/ManageSampleDataSheet';
import { FirstTimeWelcomeCard } from '../../components/now/FirstTimeWelcomeCard';
import { ProfileNamePrompt } from '../../components/now/ProfileNamePrompt';
import { getCaregiverProfile } from '../../storage/caregiverProfileRepo';


// ============================================================================
// INLINE COMPONENT — Quick Pulse Status Block
// ============================================================================

function buildOverdueCallouts(
  todayStats: TodayStats,
  instances: any[],
): { text: string; color: string }[] {
  const callouts: { text: string; color: string }[] = [];
  const categories = [
    { key: 'meds' as keyof TodayStats, itemType: 'medication', label: 'Meds', color: Colors.coral },
    { key: 'vitals' as keyof TodayStats, itemType: 'vitals', label: 'Vitals', color: Colors.coral },
    { key: 'wellness' as keyof TodayStats, itemType: 'wellness', label: 'Check-ins', color: Colors.coral },
    { key: 'meals' as keyof TodayStats, itemType: 'nutrition', label: 'Meals', color: Colors.amberBright },
  ];
  for (const cat of categories) {
    // Read directly from instances — todayStats can lag or be empty for
    // sources that don't populate legacy counters (regimen instances only).
    const overdueInstances = instances.filter(
      (i: any) => i.itemType === cat.itemType &&
           (i.status === 'pending' || !i.status) &&
           getCareItemStatus(i) === 'overdue'
    );
    if (overdueInstances.length === 0) continue;

    if (cat.itemType === 'medication') {
      const names = [...new Set(overdueInstances.map((i: any) => i.itemName))].join(', ');
      callouts.push({ text: `Meds overdue — ${names}`, color: Colors.coral });
    } else {
      const stat = todayStats[cat.key];
      const total = stat?.total ?? overdueInstances.length;
      const completed = stat?.completed ?? 0;
      callouts.push({ text: `${cat.label} overdue — ${completed} of ${total} done`, color: cat.color });
    }
  }
  return callouts;
}

export default function NowScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Track today's date
  const [today, setToday] = useState(() => getTodayDateString());
  // Jul 2 brief item 6 — true when a handoff note is saved for today (drives
  // the End-of-shift card's note-exists indicator). Loaded in loadData.
  const [hasHandoffNote, setHasHandoffNote] = useState(false);

  // Single source of truth: useCareTasks wraps useDailyCareInstances
  const {
    state: careTasksState,
    instanceState: instancesState,
    loading: instancesLoading,
    completeInstance,
    refresh: refreshCareTasks,
  } = useCareTasks(today);

  // CarePlan hook
  const { dayState, carePlan, overrides, snoozeItem, setItemOverride, integrityWarnings, refresh: refreshCarePlan } = useCarePlan(today);

  // Appointments hook
  const { todayAppointments, complete: completeAppointment } = useAppointments();

  // Bucket-based Care Plan Config hook
  const { hasCarePlan: hasBucketCarePlan, loading: carePlanConfigLoading, enabledBuckets, config: carePlanConfig } = useCarePlanConfig();

  // Today Scope - track hidden items count
  const { suppressedItems, resetToDefaults: restoreAllSuppressed } = useTodayScope(today);

  // Determine which system to use
  const hasRegimenInstances = instancesState && instancesState.instances.length > 0;
  const hasAnyCarePlan = carePlan || hasBucketCarePlan || hasRegimenInstances;

  const [medications, setMedications] = useState<Medication[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [dailyTracking, setDailyTracking] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  // ScrollView ref for scroll-to behavior
  const scrollViewRef = useRef<ScrollView>(null);

  // Category filter state (tappable rings)
  const [selectedCategory, setSelectedCategory] = useState<BucketType | null>(null);
  const [activeRoutineWindow, setActiveRoutineWindow] = useState<TimeWindow | null>(null);

  // Phase B (2026-06-13) — Reflection panel visibility gate. ReflectionZoneNow
  // internally returns null pre-17:00; the panel wrap around it must gate
  // too so we don't render an empty bordered rectangle. Dupe of the gate
  // already living inside the component; minute-refresh keeps the panel
  // surfacing on the 17:00 clock-roll without a tab switch.
  const [isReflectionEvening, setIsReflectionEvening] = useState(
    () => new Date().getHours() >= 17,
  );
  useEffect(() => {
    const id = setInterval(() => {
      setIsReflectionEvening(new Date().getHours() >= 17);
    }, 60_000);
    return () => clearInterval(id);
  }, []);
  // Phase 35 Slice 3-D — Phase-1D parallel undoToast retired.
  // handleQuickConfirm now routes through the unified LogToast pattern
  // below + the canonical undoInstanceCompletion (which soft-deletes
  // the LogEntry per the hide-not-delete standing rule).
  // v6.7 — LogToast (Add / Undo) state for the trailing-edge inline checkbox.
  const [logToast, setLogToast] = useState<{
    instanceId: string;
    message: string;
    anomalyPrompt?: string;
    onAdd: () => void;
    onUndo: () => Promise<void>;
    /** Phase 35 Slice 3-D — Redo mode override. When set, the LogToast
     *  primary action button text + accessibilityLabel reflect this
     *  label (typically 'Redo' for the post-undo toast). The onUndo
     *  callback is wired to resurrectLogEntry in that mode. */
    undoLabel?: string;
    /** Phase 35 Slice 3-D — when true the Add affordance is hidden
     *  unconditionally (Redo mode has no fresh log to add details to). */
    hideAdd?: boolean;
  } | null>(null);
  const logToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // v6.7 — tenure phase drives the toast scaffolding (new / experienced /
  // seasoned). Load once on mount; it's stable across the screen lifetime.
  const [tenurePhase, setTenurePhase] = useState<TenurePhase>('new');
  useEffect(() => {
    getUserTenure().then((t) => setTenurePhase(t.phase)).catch(() => {});
  }, []);

  const handleRingPress = useCallback((bucket: BucketType) => {
    setSelectedCategory(prev => prev === bucket ? null : bucket);
  }, []);

  const handleClearCategory = useCallback(() => {
    setSelectedCategory(null);
  }, []);

  // Legacy stats state - fallback when no regimen instances
  const [legacyStats, setLegacyStats] = useState<TodayStats>({
    meds: { completed: 0, total: 0 },
    vitals: { completed: 0, total: 4 },
    meals: { completed: 0, total: 3 },
  });

  // Water stats from direct storage (not care plan instances, since water is counted in glasses not task completions)
  const [waterGlasses, setWaterGlasses] = useState(0);
  const [patientGender, setPatientGender] = useState<string | null>(null);

  // Vitals guidance state (Task 4.1)
  const [vitalsExceedances, setVitalsExceedances] = useState<any[]>([]);
  const [vitalsRecentReadings, setVitalsRecentReadings] = useState<any[]>([]);
  const [vitalsGuidanceDismissed, setVitalsGuidanceDismissed] = useState(false);

  // Timeline collapse state — default expanded so users see their schedule
  // Default collapsed: caregiver sees the schedule overview (window banners)
  // first, then taps Start / a window to expand its items.
  // UX-2 pre-launch — timeline opens by default. Completed time windows
  // still auto-collapse inside the expanded view (TimelineSection
  // collapsedWindows initializer), so "done items stay compressed"
  // without keeping the whole schedule shut.
  // Part 2 re-tone — the default schedule view is the calm ScheduleFocus
  // (START HERE hero + folded line). scheduleExpanded flips to the full
  // timeline when the caregiver taps the folded line; the timeline header's
  // collapse returns to focus.
  const [scheduleExpanded, setScheduleExpanded] = useState(false);

  // Part 3 disclosure — Reflection + End of shift collapse to a single header
  // row by default; per-section expand state persists for the session only
  // (React state, not storage). Schedule + Today's Health stay always-open.
  const [reflectionExpanded, setReflectionExpanded] = useState(false);
  const [endOfShiftExpanded, setEndOfShiftExpanded] = useState(false);

  // Phase 15.6 — `brief` state + setter retired. The Today's Journal
  // preview tile in NowFooter consumed it; the tile has been removed
  // (the bottom tab bar already reaches the Journal tab).

  // Sample data mode — single source of truth lives in the hook (subscribes
  // to SAMPLE_DATA_CLEARED + PATIENT events so the banner flips immediately
  // when ManageSampleDataSheet runs the setup or remove flow).
  const { isSampleMode, refresh: refreshSampleMode } = useSampleMode();
  const [manageSampleSheet, setManageSampleSheet] = useState<{
    open: boolean;
    focus?: 'setup' | 'remove';
  }>({ open: false });

  // Phase 15.7 — appointment prep state retired. UpcomingAppointmentCard
  // (rendered just below the timeline section) is now the sole
  // upcoming-appointment surface on Now. Its lookahead was bumped
  // 7 → 14 to preserve the more inclusive window the inline block had.
  const [showPatientSwitcher, setShowPatientSwitcher] = useState(false);
  const { activePatient, patients } = usePatient();

  // Derive patientName inline (matches journal.tsx and understand.tsx). A
  // prior version stored it in local state seeded with the fallback string
  // and only overwrote it via loadData on focus — but the focus effect's
  // deps array omitted activePatient, so a late PatientContext hydration
  // left the pill stuck on the fallback. Inline derivation re-evaluates
  // every render and tracks the context cleanly.
  const patientName =
    activePatient?.name && activePatient.name !== 'Patient'
      ? activePatient.name
      : 'your loved one';

  // Phase 5.13.e — caregiver name for the first-time welcome card.
  // Loaded once on mount; the card itself reads the first-real-mode flag
  // and decides whether to render.
  const [caregiverName, setCaregiverName] = useState('');
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const profile = await getCaregiverProfile();
        if (!cancelled && profile?.name) setCaregiverName(profile.name);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  // v6.7 — water goal pulled from CarePlanConfig.water.dailyGoalGlasses
  // when the bucket is configured; falls back to the legacy default of 8.
  // Phase 5.13.3 — buckets live at the top level of CarePlanConfig
  // (see types/carePlanConfig.ts:351–376); the legacy .buckets.water
  // nest never existed and silently produced fallback values.
  const waterGoal = carePlanConfig?.water?.dailyGoalGlasses ?? 8;
  // Phase 34 F4 — water is a v1-hidden bucket. Even if an existing
  // user has water.enabled=true in stored config, the water ring is
  // suppressed in v1 (gated on MVP_HIDDEN_BUCKETS — the single source
  // of truth). config.water.enabled is preserved (hide-not-delete);
  // v1.1 unhide re-surfaces the ring automatically.
  const isWaterBucketEnabled =
    carePlanConfig?.water?.enabled === true && !MVP_HIDDEN_BUCKETS.includes('water');

  // Phase 5.13.2 — summary surfaced on the first-time welcome card. Reads
  // appliedTemplateId (stamped in applyCarePlanTemplate), bucket-enabled
  // flags, and meds.medications for the count.
  const welcomeSummary = useMemo(() => {
    const cfg = carePlanConfig as CarePlanConfig | null;
    const templateId = cfg?.appliedTemplateId;
    const template = templateId
      ? CARE_PLAN_TEMPLATES.find((t) => t.id === templateId)
      : undefined;
    const labels = (enabledBuckets ?? []).map((b) => BUCKET_META[b]?.name).filter(Boolean);
    const medCount = (cfg?.meds as MedsBucketConfig | undefined)?.medications?.length ?? 0;
    return {
      appliedTemplateName: template?.name,
      enabledBucketLabels: labels,
      medicationCount: medCount,
      // Phase 5.13.4 — drives CTA branching on the welcome card.
      medsBucketEnabled: cfg?.meds?.enabled === true,
    };
  }, [carePlanConfig, enabledBuckets]);

  const handleWaterUpdate = useCallback(async (newGlasses: number) => {
    try {
      setWaterGlasses(newGlasses);
      await updateTodayWaterLog(newGlasses);
      emitDataUpdate(EVENT.WATER);
    } catch (error) {
      logError('now.handleWaterUpdate', error);
    }
  }, []);

  // ============================================================================
  // SINGLE SOURCE OF TRUTH: Compute stats from useCareTasks hook
  // ============================================================================
  const todayStats = useMemo((): TodayStats => {
    // Derive directly from instancesState (the freshest source) instead of
    // careTasksState which can lag behind after completions.
    if (instancesState && instancesState.instances.length > 0 && instancesState.date === today) {
      const getTypeStats = (itemType: string): StatData => {
        const typeInstances = instancesState.instances.filter(i => i.itemType === itemType);
        const completed = typeInstances.filter(i => i.status === 'completed' || i.status === 'skipped').length;
        return { completed, total: typeInstances.length };
      };

      const customStats = getTypeStats('custom');
      const stats: TodayStats = {
        meds: getTypeStats('medication'),
        vitals: getTypeStats('vitals'),
        meals: getTypeStats('nutrition'),
        water: { completed: waterGlasses, total: waterGoal },
        sleep: getTypeStats('sleep'),
        activity: getTypeStats('activity'),
        wellness: getTypeStats('wellness'),
        custom: customStats.total > 0 ? customStats : undefined,
      };

      const hasAnyInstanceData = stats.meds.total > 0 || stats.vitals.total > 0 ||
                                  stats.meals.total > 0 || (stats.custom?.total ?? 0) > 0;
      if (hasAnyInstanceData) {
        return stats;
      }
    }
    return legacyStats;
  }, [instancesState, legacyStats, today, waterGlasses, waterGoal]);

  // Extracted hooks
  const { showOnboarding, briefing, handlers, getBaselineStatusMessage, computePrompts: computePromptsHook, checkNotificationPrompt: checkNotifPrompt, loadBaselines } = useNowPrompts(todayStats, dailyTracking);
  // useNowInsights + InsightBanner removed — StatRings replaces them

  // ============================================================================
  // TODAY TIMELINE - Built from DailyCareInstances
  // ============================================================================
  const todayTimeline = useMemo(() => {
    if (!instancesState?.instances) {
      return { overdue: [], upcoming: [], completed: [], nextUp: null };
    }

    if (instancesState.date !== today) {
      return { overdue: [], upcoming: [], completed: [], nextUp: null };
    }

    const allInstances = instancesState.instances;
    const now = new Date();

    const getPriorityScore = (instance: any): number => {
      const scheduled = new Date(instance.scheduledTime);
      if (isNaN(scheduled.getTime())) return 999;

      const diffMs = now.getTime() - scheduled.getTime();
      const minutesLate = Math.floor(diffMs / (1000 * 60));
      const isLate = minutesLate > OVERDUE_GRACE_MINUTES;
      const isDueSoon = !isLate && minutesLate > -UPCOMING_WINDOW_MINUTES;

      const isClinical = isClinicalCritical(instance.itemType);
      const isNeutral = instance.itemType === 'vitals';

      if (isClinical && isLate) return 100 - minutesLate;
      if (isClinical && isDueSoon) return 200 - minutesLate;
      if (isNeutral && isLate) return 300 - minutesLate;
      if (!isClinical && !isNeutral && isLate) return 400 - minutesLate;
      if (!isClinical && isDueSoon) return 500 - minutesLate;
      return 600 + Math.abs(minutesLate);
    };

    const withScores = allInstances.map(instance => {
      if (instance.status !== 'pending') {
        return { instance, priorityScore: 999 };
      }
      return { instance, priorityScore: getPriorityScore(instance) };
    });

    const pendingWithScores = withScores
      .filter(w => w.instance.status === 'pending')
      .sort((a, b) => a.priorityScore - b.priorityScore);

    const overdue = pendingWithScores
      .filter(w => getCareItemStatus(w.instance) === 'overdue')
      .map(w => w.instance);

    const upcoming = pendingWithScores
      .filter(w => getCareItemStatus(w.instance) !== 'overdue')
      .map(w => w.instance);

    const completed = allInstances.filter(
      i => i.status === 'completed' || i.status === 'skipped' || i.status === 'missed'
    ).sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

    const nextUp = pendingWithScores[0]?.instance || null;

    return { overdue, upcoming, completed, nextUp };
  }, [instancesState?.instances, instancesState?.date, today]);

  // Merge overdue + upcoming into single allPending array for TimelineSection
  const allPending = useMemo(() => {
    return [...todayTimeline.overdue, ...todayTimeline.upcoming];
  }, [todayTimeline.overdue, todayTimeline.upcoming]);

  // Shared Now-tab state model — the ONE next action, dayState, and open/upcoming
  // counts. The reflection-honesty gate (dayState) and the schedule re-tone read
  // from this single source so neither can contradict the schedule.
  const nowFocus = useMemo(
    () => computeNowFocus(
      (instancesState?.date === today ? instancesState?.instances : undefined) ?? [],
      new Date(),
    ),
    [instancesState?.instances, instancesState?.date, today],
  );

  // Born-past refinement — a MED or VITALS item the caregiver added AFTER its
  // time today gets no instance today (the generator skips the passed slot so it
  // never reads overdue/missed). Surface it as a neutral "first dose/reading
  // tomorrow" line so it confirms it saved instead of vanishing. Derived at the
  // read layer (no phantom instance), so it never touches dayState / the START
  // HERE pointer. (Wellness/meals render-anyway → never previewed here.)
  const startingTomorrow = useMemo(
    () => getStartingTomorrow(
      carePlanConfig,
      (instancesState?.date === today ? instancesState?.instances : undefined) ?? [],
      new Date(),
    ),
    [carePlanConfig, instancesState?.instances, instancesState?.date, today],
  );

  // Structured outcomes for the End of Shift body composer (Phase 3c of the
  // template-driven content automation work). Names default to empty arrays
  // because the timeline doesn't surface display labels here — the composer
  // copy still works in count-only form ("2 missed doses").
  const todayOutcomes = useMemo(() => {
    const completedItems = todayTimeline.completed.filter(i => i.status === 'completed');
    const missedItems = todayTimeline.completed.filter(i => i.status === 'missed');
    return {
      logged: { count: completedItems.length },
      missed: {
        count: missedItems.length,
        names: missedItems.map(i => i.itemName).filter(Boolean) as string[],
      },
      pending: {
        count: allPending.length,
        names: allPending.map(i => i.itemName).filter(Boolean) as string[],
      },
    };
  }, [todayTimeline.completed, allPending]);

  // Earliest pending instance whose scheduledTime is still ahead of `now`,
  // formatted for the contextual greeting subtitle ("Mom's first meds are at
  // 8:30 AM."). Falls back to null when nothing is upcoming.
  const nextScheduledTime = useMemo(() => {
    const upcomingChronological = todayTimeline.upcoming
      .slice()
      .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
    const next = upcomingChronological[0];
    return next ? formatNextScheduledTime(next.scheduledTime) : null;
  }, [todayTimeline.upcoming]);

  // Window summary for collapsed timeline view
  const windowSummary = useMemo(() => {
    if (!instancesState?.instances || instancesState.date !== today) return [];
    const allInstances = instancesState.instances;
    const grouped = groupByTimeWindow(allInstances);
    const currentWindow = getCurrentTimeWindow();
    const windows: TimeWindow[] = ['morning', 'afternoon', 'evening', 'night'];

    return windows
      .filter(w => grouped[w].length > 0)
      .map(w => {
        const items = grouped[w];
        const completed = items.filter(i => i.status === 'completed' || i.status === 'skipped').length;
        const pending = items.filter(i => i.status === 'pending').length;
        const total = items.length;
        const allDone = completed === total;
        const isCurrent = w === currentWindow;
        return {
          window: w,
          label: TIME_WINDOW_HOURS[w].label,
          total,
          completed,
          pending,
          allDone,
          isCurrent,
        };
      });
  }, [instancesState?.instances, instancesState?.date, today]);

  // Coffee Moment - gentle nudge when task load is high
  const overdueCount = todayTimeline.overdue.length;
  const hasLateMedication = todayTimeline.overdue.some(
    (i: any) => i.itemType === 'medication'
  );

  // Handler for timeline item tap
  const handleTimelineItemPress = useCallback((instance: any) => {
    if (instance.itemType === 'medication') {
      navigate({
        pathname: '/log-medication-plan-item',
        params: {
          medicationId: instance.carePlanItemId,
          instanceId: instance.id,
          scheduledTime: instance.scheduledTime,
          itemName: instance.itemName,
          itemDosage: instance.itemDosage || '',
          itemInstructions: instance.instructions || '',
        },
      });
      return;
    }
    // Pain: route to dedicated pain tracking screen
    if (instance.itemName?.toLowerCase().includes('pain')) {
      navigate({
        pathname: '/log-pain',
        params: {
          instanceId: instance.id,
          carePlanItemId: instance.carePlanItemId || '',
          itemName: instance.itemName || '',
        },
      });
      return;
    }
    // Wellness: morning + afternoon land on the silent-vitals capture
    // (the v6.7 reframe — single-screen sleep/mood/energy). Evening
    // keeps its dedicated wizard for now since it captures a broader
    // set of fields. (Phase 34 F1 — comment harmonized with the
    // unified time-model vocabulary; routing logic unchanged.)
    if (instance.itemType === 'wellness') {
      const wellnessRoute = getRouteForWellnessInstance(instance);
      navigate({
        pathname: wellnessRoute,
        params: {
          instanceId: instance.id,
          carePlanItemId: instance.carePlanItemId || '',
          itemName: instance.itemName || '',
        },
      });
      return;
    }
    const route = getRouteForInstanceType(instance.itemType);
    navigate({
      pathname: route,
      params: {
        instanceId: instance.id,
        carePlanItemId: instance.carePlanItemId || '',
        itemName: instance.itemName || '',
      },
    });
  }, []);

  // Skip an instance from UpNextCard
  const handleSkipInstance = useCallback(async (instanceId: string) => {
    await completeInstance(instanceId, 'skipped');
    emitDataUpdate(EVENT.DAILY_INSTANCES);
  }, [completeInstance]);

  // Batch confirm meds — uses completeInstance from useCareTasks
  const handleBatchMedConfirm = useCallback(async (instanceIds: string[]) => {
    for (const id of instanceIds) {
      await completeInstance(id, 'taken');
    }
    emitDataUpdate(EVENT.DAILY_INSTANCES);
  }, [completeInstance]);

  // Phase 2B — batch-complete every pending item in a routine window
  const handleBatchWindowComplete = useCallback(async (instanceIds: string[]) => {
    try {
      // Same integrity rule as quick-confirm — a value-bearing item (vitals /
      // wellness) must NEVER be blind-completed by a batch "Complete all"; it
      // carries data that only its capture screen can record. RoutineSheet
      // already excludes them from the batch ids, but this guard is the safety
      // net so no future caller can re-open the trap.
      const byId = new Map((instancesState?.instances ?? []).map((i) => [i.id, i]));
      for (const id of instanceIds) {
        const inst = byId.get(id);
        if (inst && needsCaptureBeforeComplete(inst.itemType)) continue;
        await completeInstance(id, 'taken');
      }
      emitDataUpdate(EVENT.DAILY_INSTANCES);
      void hapticSuccess();
    } catch (err) {
      logError('handleBatchWindowComplete', err);
    }
  }, [completeInstance, instancesState?.instances]);

  // Phase 1C — inline one-tap confirm for routine items.
  // Completes a medication (or other quick-confirmable item) without
  // navigating, fires success haptics, and surfaces an undo toast.
  //
  // Phase 35 Slice 3-D — unified through the LogToast pattern. The
  // canonical undoInstanceCompletion (storage/carePlanRepo.ts)
  // soft-deletes the LogEntry, clears instance.logId, and reverts
  // instance.status — three atomic effects via one fn. All four
  // trigger paths in this file (handleQuickLog, handleQuickSkip,
  // handleQuickConfirm, plus the new long-press affordance landing
  // in commit 3/3) route through the same canonical fn.
  //
  // dismissLogToast is the small helper shared by every setLogToast
  // call site (Add, Undo, post-window auto-dismiss). Defined here so
  // handleQuickConfirm can reference it in its useCallback deps
  // (handleQuickLog / handleQuickSkip below also use it).
  const dismissLogToast = useCallback(() => {
    if (logToastTimerRef.current) {
      clearTimeout(logToastTimerRef.current);
      logToastTimerRef.current = null;
    }
    setLogToast(null);
  }, []);

  const handleQuickConfirm = useCallback(async (instance: any) => {
    // FIX B — a value-bearing item (vitals reading; wellness sleep/mood/energy)
    // must NOT be blind-completed by quick-confirm (START HERE card + timeline
    // check-circle) — that records empty/false data. Route to its capture screen
    // instead (same destination the timeline row uses; completion fires only on a
    // real save there). Binary items (meds/meals/etc.) still complete in place.
    if (needsCaptureBeforeComplete(instance.itemType)) {
      handleTimelineItemPress(instance);
      return;
    }
    try {
      const confirmedAt = new Date().toISOString();
      if (instance.itemType === 'medication') {
        await completeInstance(instance.id, 'taken', {
          confirmedAt,
          source: 'quick_confirm',
        });
      } else if (instance.itemType === 'nutrition') {
        await completeInstance(instance.id, 'completed', {
          confirmedAt,
          source: 'quick_confirm',
          mealType: instance.itemName?.toLowerCase() || 'meal',
        });
      } else {
        await completeInstance(instance.id, 'completed', {
          confirmedAt,
          source: 'quick_confirm',
        });
      }
      emitDataUpdate(EVENT.DAILY_INSTANCES);
      void hapticSuccess();

      setLogToast({
        instanceId: instance.id,
        message: `${instance.itemName} confirmed`,
        onAdd: () => {
          dismissLogToast();
          handleTimelineItemPress(instance);
        },
        onUndo: async () => {
          try {
            await undoInstanceCompletion(DEFAULT_PATIENT_ID, today, instance.id);
            emitDataUpdate(EVENT.DAILY_INSTANCES);
          } catch (err) {
            logError('handleQuickConfirm.undo', err);
          } finally {
            dismissLogToast();
          }
        },
      });
      if (logToastTimerRef.current) clearTimeout(logToastTimerRef.current);
      logToastTimerRef.current = setTimeout(() => setLogToast(null), 5000);
    } catch (err) {
      logError('handleQuickConfirm', err);
      Alert.alert('Error', 'Could not confirm. Try again.');
    }
  }, [completeInstance, today, dismissLogToast, handleTimelineItemPress]);

  // Phase 35 Slice 3-D commit 3 — long-press done-row → immediate undo.
  // The done-row's short-tap is reserved for the View Note affordance
  // (Slice 3-A); the long-press fires this handler. Mirrors the
  // pending-row long-press skip gesture for symmetry. The 5s "Undid
  // {item}" toast surfaces a Redo action backed by resurrectLogEntry
  // — within the window the original LogEntry id + notes + timestamp
  // are recoverable; after the window closes, re-confirming creates
  // a fresh log (rt-5 pin in the integration round-trip).
  const handleUndoCompleted = useCallback(async (instance: any) => {
    const originalLogId: string | undefined = instance.logId;
    const itemName: string = instance.itemName ?? 'Item';
    try {
      await undoInstanceCompletion(DEFAULT_PATIENT_ID, today, instance.id);
      emitDataUpdate(EVENT.DAILY_INSTANCES);
      void hapticSuccess();

      setLogToast({
        instanceId: instance.id,
        message: `${itemName} undone`,
        undoLabel: 'Redo',
        hideAdd: true,
        onAdd: () => {
          // Add affordance is hidden in Redo mode; the field exists to
          // satisfy the LogToast prop shape but should never fire.
          dismissLogToast();
        },
        onUndo: async () => {
          if (!originalLogId) {
            dismissLogToast();
            return;
          }
          try {
            await resurrectLogEntry(DEFAULT_PATIENT_ID, today, originalLogId);
            emitDataUpdate(EVENT.DAILY_INSTANCES);
          } catch (err) {
            logError('handleUndoCompleted.redo', err);
          } finally {
            dismissLogToast();
          }
        },
      });
      if (logToastTimerRef.current) clearTimeout(logToastTimerRef.current);
      logToastTimerRef.current = setTimeout(() => setLogToast(null), 5000);
    } catch (err) {
      logError('handleUndoCompleted', err);
      Alert.alert('Error', 'Could not undo. Try again.');
    }
  }, [today, dismissLogToast]);

  // ============================================================================
  // v6.7 — Inline trailing-edge checkbox handlers (Now timeline).
  // These power the new InlineCheckbox + LogToast pattern: tap to log, tap
  // checkbox again (during the toast window) to undo, long-press for the
  // skip-reason menu. Hydration uses a separate `+` button via handleAddCup.
  // (dismissLogToast lives above handleQuickConfirm so all four trigger
  // paths can share it; see the comment block there.)
  // ============================================================================

  const handleQuickLog = useCallback(async (instance: any) => {
    try {
      // Pre-fill vitals with yesterday's values so the row commits without an
      // empty payload (the row is meant to be a one-tap shortcut). Other
      // types log without payload and can be edited via the Add button.
      let data: any = undefined;
      if (instance.itemType === 'vitals') {
        const yest = await getYesterdayVitals(instance.itemName?.toLowerCase());
        if (yest) {
          // Map a single VitalReading onto the vitals log payload — the
          // engine keys results by vital type, so we drop yest.type into
          // the matching field. Falls back to .value when type is unknown.
          const numeric = yest.value;
          const payload: Record<string, any> = { type: 'vitals' };
          if (yest.type) payload[yest.type] = numeric;
          data = payload;
        }
      }

      const outcome: 'taken' | 'completed' = instance.itemType === 'medication' ? 'taken' : 'completed';
      await logInstanceCompletion(
        DEFAULT_PATIENT_ID,
        today,
        instance.id,
        outcome,
        data,
        { source: 'now' },
      );
      emitDataUpdate(EVENT.DAILY_INSTANCES);
      void hapticSuccess();

      // v6.7 — anomaly detection feeds the toast prompt so caregiver-actionable
      // signals (vital outliers, missed-med streaks) override the generic
      // tenure scaffolding.
      let anomalyPrompt: string | undefined;
      try {
        const trigger =
          instance.itemType === 'vitals' && data?.[Object.keys(data).find((k) => k !== 'type') || '']
            ? {
                kind: 'vital_recorded' as const,
                vitalType: Object.keys(data).find((k) => k !== 'type') || '',
                vitalValue: data[Object.keys(data).find((k) => k !== 'type') || ''],
              }
            : instance.itemType === 'medication'
              ? { kind: 'medication_taken' as const }
              : null;
        if (trigger) {
          const anomalies = await detectAnomalies(DEFAULT_PATIENT_ID, trigger);
          if (anomalies.length > 0) anomalyPrompt = anomalies[0].suggestedQuestion;
        }
      } catch (err) {
        logError('handleQuickLog.anomaly', err);
      }

      setLogToast({
        instanceId: instance.id,
        message: `${instance.itemName} logged`,
        anomalyPrompt,
        onAdd: () => {
          dismissLogToast();
          handleTimelineItemPress(instance);
        },
        onUndo: async () => {
          try {
            await undoInstanceCompletion(DEFAULT_PATIENT_ID, today, instance.id);
            emitDataUpdate(EVENT.DAILY_INSTANCES);
          } catch (err) {
            logError('handleQuickLog.undo', err);
          } finally {
            dismissLogToast();
          }
        },
      });
      if (logToastTimerRef.current) clearTimeout(logToastTimerRef.current);
      logToastTimerRef.current = setTimeout(() => setLogToast(null), 5000);
    } catch (err) {
      logError('handleQuickLog', err);
      Alert.alert('Error', 'Could not log. Try again.');
    }
  }, [today, dismissLogToast]);

  const handleQuickSkip = useCallback(async (instance: any, reason: 'refused' | 'too-soon' | 'other') => {
    try {
      await logInstanceCompletion(
        DEFAULT_PATIENT_ID,
        today,
        instance.id,
        'skipped',
        undefined,
        { source: 'now', skipReason: reason },
      );
      emitDataUpdate(EVENT.DAILY_INSTANCES);

      setLogToast({
        instanceId: instance.id,
        message: `${instance.itemName} skipped`,
        onAdd: () => {
          dismissLogToast();
          handleTimelineItemPress(instance);
        },
        onUndo: async () => {
          try {
            await undoInstanceCompletion(DEFAULT_PATIENT_ID, today, instance.id);
            emitDataUpdate(EVENT.DAILY_INSTANCES);
          } catch (err) {
            logError('handleQuickSkip.undo', err);
          } finally {
            dismissLogToast();
          }
        },
      });
      if (logToastTimerRef.current) clearTimeout(logToastTimerRef.current);
      logToastTimerRef.current = setTimeout(() => setLogToast(null), 5000);
    } catch (err) {
      logError('handleQuickSkip', err);
    }
  }, [today, dismissLogToast]);

  // v6.7 Phase 7 — standalone HYDRATION TODAY row at the top of the Now tab.
  // Single tap adds one cup; long-press picks +1 / +2 / +4. Dual-writes to
  // hydrationRepo (event store) and updateTodayWaterLog (legacy single-day
  // log) so StatRings + the water Mode A panel stay in sync without any
  // additional refactor.
  // Phase 15.4 — handleHydrationRowAdd / handleHydrationRowPress
  // removed with the standalone HydrationTodayRow. Their only consumer
  // was the row; the water-ring tap on StatRings now owns the
  // navigate('/log-water') affordance, and the inline +1 cup is
  // filed for v1.1. handleAddCup below stays — NowTimeline still
  // threads it for inline +1 on water-tracking schedule rows.

  const handleAddCup = useCallback(async (_instance: any) => {
    try {
      await addCup(activePatient?.id || DEFAULT_PATIENT_ID, 1);
      emitDataUpdate(EVENT.WATER);
      void hapticSuccess();
      const total = await getHydrationDayTotal(
        activePatient?.id || DEFAULT_PATIENT_ID,
        today,
      );
      setLogToast({
        instanceId: 'hydration',
        message: `${total} cup${total === 1 ? '' : 's'} logged today`,
        onAdd: () => {
          dismissLogToast();
          navigate('/quick-log-more');
        },
        onUndo: async () => {
          // Hydration undo is event-stream-aware: the addCup helper appends
          // an immutable event, so true undo lives in the dedicated water
          // counter (Mode A). Toast undo just dismisses — no double-write.
          dismissLogToast();
        },
      });
      if (logToastTimerRef.current) clearTimeout(logToastTimerRef.current);
      logToastTimerRef.current = setTimeout(() => setLogToast(null), 5000);
    } catch (err) {
      logError('handleAddCup', err);
    }
  }, [activePatient, today, dismissLogToast]);

  const handleWellnessTap = useCallback(async (instance: any) => {
    const patientId = activePatient?.id || DEFAULT_PATIENT_ID;
    const goToCapture = () => {
      navigate({
        pathname: '/silent-vitals',
        params: {
          instanceId: instance?.id ?? '',
          itemName: instance?.itemName ?? '',
        },
      });
    };
    try {
      // First-time path: no prior reflection ever → open capture directly so
      // the caregiver doesn't get a stale auto-fill that doesn't reflect
      // them. The screen back-fills from yesterday on its own when present.
      const yest = await getYesterdayReflection(patientId);
      if (!yest) {
        goToCapture();
        return;
      }
      // Default-log path — auto-fill today with yesterday's values, then
      // surface the Edit/Undo toast so the caregiver can adjust if needed.
      await upsertDailyReflection(patientId, today, {
        sleepQuality: yest.sleepQuality,
        mood: yest.mood,
        energyLevel: yest.energyLevel,
        source: 'auto-fill',
      });
      void hapticSuccess();
      setLogToast({
        instanceId: instance.id,
        message: `Silent vitals saved (same as yesterday)`,
        onAdd: () => {
          dismissLogToast();
          goToCapture();
        },
        onUndo: async () => {
          // Roll today's auto-fill back to whatever existed before the tap —
          // for the first auto-fill of the day, that's "no entry."
          try {
            await deleteDailyReflection(patientId, today);
          } catch (err) {
            logError('handleWellnessTap.undo', err);
          } finally {
            dismissLogToast();
          }
        },
      });
      if (logToastTimerRef.current) clearTimeout(logToastTimerRef.current);
      logToastTimerRef.current = setTimeout(() => setLogToast(null), 5000);
    } catch (err) {
      logError('handleWellnessTap', err);
      goToCapture();
    }
  }, [activePatient, today, dismissLogToast]);

  // ============================================================================
  // DATA LOADING
  // ============================================================================
  useFocusEffect(
    useCallback(() => {
      const currentDate = getTodayDateString();
      if (currentDate !== today) {
        setToday(currentDate);
      }

      refreshCareTasks();
      refreshCarePlan();
      loadData();
      checkNotifPrompt();
      recordVisit();
      refreshSampleMode();
    }, [today, refreshCareTasks, refreshCarePlan, activePatient, refreshSampleMode])
  );

  // Live sync: reload data when any storage module emits an update
  const nowReloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nowLastLoadDone = useRef(0);
  useDataListener(useCallback((category: string) => {
    if (([EVENT.MEDICATION, EVENT.VITALS, EVENT.WATER, EVENT.MOOD, EVENT.WELLNESS,
         EVENT.LOGS, EVENT.CARE_PLAN, EVENT.CARE_PLAN_CONFIG, EVENT.APPOINTMENTS,
         EVENT.DAILY_INSTANCES, EVENT.CARE_PLAN_ITEMS, EVENT.SAMPLE_DATA_CLEARED,
         EVENT.SYMPTOMS, EVENT.NOTES] as string[]).includes(category)) {
      // Suppress config events that are self-generated by ensureDailyInstances sync
      if (['carePlanItems', 'carePlanConfig'].includes(category) && Date.now() - nowLastLoadDone.current < 2000) return;
      if (nowReloadTimer.current) clearTimeout(nowReloadTimer.current);
      nowReloadTimer.current = setTimeout(() => {
        loadData().finally(() => { nowLastLoadDone.current = Date.now(); });
        refreshCareTasks();
      }, 300);
      // SAMPLE_DATA_CLEARED is observed by useSampleMode directly, so we
      // don't need to flip a local flag here — refreshSampleMode picks up
      // the new state on the next render.
    }
  }, [refreshCareTasks]));

  const loadData = async () => {
    try {
      // patientName is derived inline from PatientContext (see above). The
      // only thing left to do here is migrate any legacy AsyncStorage name
      // into the patient registry — once. After that, PatientContext is the
      // single source of truth for the rendered name.
      if (!activePatient || activePatient.name === 'Patient') {
        // allow: one-shot legacy migration — copies any pre-5.13.1 install's
        // AsyncStorage name into the registry so PatientContext picks it up.
        const legacyName = await safeGetItem<string | null>(StorageKeys.PATIENT_NAME, null);
        if (legacyName && legacyName !== 'Patient') {
          try {
            await updatePatient(activePatient?.id || 'default', { name: legacyName });
          } catch (err) {
            logError('NowScreen.migratePatientName', err);
          }
        }
      }

      const gender = await safeGetItem<string | null>(StorageKeys.PATIENT_GENDER, null);
      setPatientGender(gender);

      const meds = await getMedications();
      const activeMeds = meds.filter((m) => m.active);
      setMedications(activeMeds);

      const appts = await getUpcomingAppointments();
      setAppointments(appts);

      const todayDate = getTodayDateString();
      const tracking = await getDailyTracking(todayDate);
      setDailyTracking(tracking);

      // Jul 2 brief item 6 — note-exists flag for the End-of-shift card's
      // handoff-note indicator. Reads the same consolidated store the Journal
      // Section 4 note writes to; refreshes live because the data listener
      // above reloads loadData on EVENT.NOTES.
      const consolidated = await getConsolidatedNotes(todayDate);
      setHasHandoffNote(!!consolidated?.text?.trim());

      // Load vitals to count (legacy fallback)
      const todayVitals = await getTodayVitalsLog();
      let vitalsLogged = 0;
      if (todayVitals) {
        if (todayVitals.systolic) vitalsLogged++;
        if (todayVitals.diastolic) vitalsLogged++;
        if (todayVitals.heartRate) vitalsLogged++;
        if (todayVitals.temperature) vitalsLogged++;
      }

      // Count meds taken TODAY (not the global .taken flag which persists across days)
      const allMedLogs = await getMedicationLogs();
      const todayStr = new Date().toDateString();
      const todayTakenIds = new Set(
        allMedLogs
          .filter(log => log.taken && new Date(log.timestamp).toDateString() === todayStr)
          .map(log => log.medicationId)
      );
      const takenMeds = activeMeds.filter(m => todayTakenIds.has(m.id)).length;
      const totalMeds = activeMeds.length;

      const mealsLog = await getTodayMealsLog();
      const mealsLogged = mealsLog?.meals?.length || 0;

      // Load water intake for today
      try {
        const waterLog = await getTodayWaterLog();
        setWaterGlasses(waterLog?.glasses ?? 0);
      } catch (err) {
        logError('NowScreen.loadWaterLog', err);
        setWaterGlasses(0);
      }

      // Check vitals for threshold exceedances (Task 4.1)
      try {
        const exceedances = await checkTodayVitalsExceedances();
        setVitalsExceedances(exceedances);
        if (exceedances.length > 0) {
          const recent = await getVitalsByType(exceedances[0].type as any);
          setVitalsRecentReadings(recent.slice(0, 5));
        }
      } catch (err) {
        logError('NowScreen.loadVitalsExceedances', err);
        setVitalsExceedances([]);
      }

      // Phase 15.7 — inline 14-day prep filter retired.
      // UpcomingAppointmentCard runs its own lookahead (now 14d) from
      // getUpcomingAppointments() — no parallel filter needed here.

      // Phase 15.6 — buildCareBrief() call retired. Only consumer
      // was the Today's Journal preview tile in NowFooter (removed
      // in 15.6).

      // Legacy stats fallback — only used when no regimen instances exist
      const legacyStatsUpdate: TodayStats = {
        meds: { completed: takenMeds, total: totalMeds },
        vitals: { completed: vitalsLogged, total: 4 },
        meals: { completed: mealsLogged, total: 4 },
      };
      setLegacyStats(legacyStatsUpdate);

      await computePromptsHook(legacyStatsUpdate, null);

      // Load baselines
      await loadBaselines();
    } catch (error) {
      logError('NowScreen.loadData', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <View style={styles.container}>
      {/* v6.7 May 1 sizing pass — per-tab gradient removed. The page
          background is the flat warm Sage near-black (c.background);
          atmosphere comes from typography. */}
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
      >
        <NowHeader
          patientName={patientName}
          patients={patients}
          isSampleMode={isSampleMode}
          showPatientSwitcher={showPatientSwitcher}
          onShowPatientSwitcher={setShowPatientSwitcher}
          suppressedItems={suppressedItems}
          onRestoreSuppressed={restoreAllSuppressed}
          showOnboarding={showOnboarding}
          onboardingHandlers={handlers}
          stats={todayStats}
          nextScheduledTime={nextScheduledTime}
          onManageSample={(focus) => setManageSampleSheet({ open: true, focus })}
        />

        {/* F7 — SampleModeBanner relocated to sit directly beneath the
            NowHeader date row as a single muted whisper line. Previously
            it lived below FirstTimeWelcomeCard + ProfileNamePrompt; the
            F7 spec wants it visible right after the date. The null-
            rendering FirstTimeWelcomeCard + ProfileNamePrompt stay
            below — they conditionally appear when their gates pass. */}
        <SampleModeBanner
          isSampleMode={isSampleMode}
          onPress={() => setManageSampleSheet({ open: true })}
        />

        {/* Phase 5.13.e — first-time welcome card. Renders once after
            wizard completion (5.13.d sets the @embermate_first_real_mode_landed
            flag). The component reads the flag itself; we always mount
            it and let it decide whether to render. */}
        <FirstTimeWelcomeCard
          patientName={patientName}
          caregiverName={caregiverName}
          summary={welcomeSummary}
        />

        {/* Post-onboarding ProfileNamePrompt — recovers the caregiver
            name that the C4 onboarding redesign defers. Appears below
            the welcome card only when the visibility predicate is
            satisfied: ONBOARDING_COMPLETE + CAREGIVER_NAME null +
            ≥1 real logged event (any todayStats completion counts as
            evidence the user has felt the app's value) + dismissed-
            count < 3 + not in sample mode. The component owns the
            full predicate; we just feed it the logged-event signal
            we already compute. */}
        <ProfileNamePrompt
          hasRealLoggedEvent={
            (todayStats.meds?.completed ?? 0) > 0 ||
            (todayStats.vitals?.completed ?? 0) > 0 ||
            (todayStats.meals?.completed ?? 0) > 0 ||
            (todayStats.water?.completed ?? 0) > 0 ||
            (todayStats.sleep?.completed ?? 0) > 0 ||
            (todayStats.activity?.completed ?? 0) > 0
          }
        />

        {/* F7 — TITLE_CLEARANCE between header chrome and first zone. */}
        <View style={{ height: TITLE_CLEARANCE }} />

        <View style={styles.content}>

          {/* ═══ MORNING MEDS BANNER (Phase 15.3) ═══
              Lifted from inside NowTimeline so the "X meds due now ·
              Confirm All" affordance sits above the StatRings rather
              than nested inside the schedule card. The banner self-
              suppresses internally when pendingCount === 0, so we
              can render it unconditionally and let the component
              decide. Medication-filter derivation moved here from
              NowTimeline. */}
          {(() => {
            const pendingMeds = allPending.filter((i: any) => i.itemType === 'medication');
            return (
              <MorningMedsBanner
                pendingCount={pendingMeds.length}
                pendingInstanceIds={pendingMeds.map((i: any) => i.id)}
                onConfirmAll={handleBatchMedConfirm}
              />
            );
          })()}

          {/* Phase 33b extension pre-Lock-3 Item A — StatRings orb row
              hidden for launch. The 7-into-6 cap conflict
              (PRIORITY_ORDER sliced at MAX_TRACKED_DIMENSIONS=6 → the
              7th, Activity, never rendered as an orb even when the
              wizard enabled it) is resolved by removal rather than by
              lifting the cap and re-architecting the row.
              Wizard-designated Now buckets (Meals/Water/Sleep/Activity/
              Wellness + core meds/vitals when their CarePlanItems exist)
              now surface exclusively through NowTimeline below.
              StatRings.tsx + its component tests (StatRingsCapAt6,
              statRingsHairlineGrouping, etc.) are PRESERVED for the
              post-launch restore path. The import + todayStats compute
              also stay — todayStats is consumed by useNowPrompts and by
              the NowTimeline mount. */}

          {/* ═══ F7 ACTION ZONE — schedule (medications-led) ═══
              Phase B (2026-06-13) — NowTimeline now sits inside a
              `zonePanel` wrapper (warm low-lift surface + glassBorder
              hairline + modest radius) so the warm page bg reads as a
              gutter between this and the Health zone below. */}
          <View style={styles.zonePanel}>
          {/* ScheduleFocus (the calm START HERE default) applies only when there
              IS a schedule to focus. With no regimen instances, NowTimeline owns
              the empty/setup state — "caught up" would be a lie when nothing is
              set up. Expanding the folded line also routes to NowTimeline. */}
          {(!hasRegimenInstances || scheduleExpanded) ? (
            <NowTimeline
              timelineCollapsed={false}
              onToggleCollapse={() => setScheduleExpanded(false)}
              windowSummary={windowSummary}
              allPending={allPending}
              completed={todayTimeline.completed}
              hasRegimenInstances={!!hasRegimenInstances}
              hasBucketCarePlan={!!hasBucketCarePlan}
              hasCarePlan={!!carePlan}
              selectedCategory={selectedCategory}
              onClearCategory={handleClearCategory}
              onItemPress={handleTimelineItemPress}
              onBatchMedConfirm={handleBatchMedConfirm}
              onQuickConfirm={handleQuickConfirm}
              onQuickLog={handleQuickLog}
              onQuickSkip={handleQuickSkip}
              onUndoCompleted={handleUndoCompleted}
              onAddCup={handleAddCup}
              onWellnessTap={handleWellnessTap}
              onStartRoutine={setActiveRoutineWindow}
              todayStats={todayStats}
              enabledBuckets={enabledBuckets}
              waterGlasses={waterGlasses}
              waterGoal={waterGoal}
              onWaterUpdate={handleWaterUpdate}
            />
          ) : (
            // Part 2 default — calm START HERE hero + folded line, reading the
            // shared nowFocus state. No stacked orange overdue cards here.
            <ScheduleFocus
              topAction={nowFocus.topAction}
              dayState={nowFocus.dayState}
              openCount={nowFocus.openCount}
              upcomingCount={nowFocus.upcomingCount}
              onCompleteTop={handleQuickConfirm}
              onOpenTop={handleTimelineItemPress}
              onExpand={() => setScheduleExpanded(true)}
              onCarePlan={() => navigate('/care-plan')}
            />
          )}
          </View>

          {/* Empty-meds discoverability — when the caregiver enabled
              medication tracking in onboarding but no meds are entered yet
              (config.meds.enabled && medications.length === 0), the schedule
              shows no meds and reads as broken. This warm affordance links to
              the existing Care Plan med-add flow. Self-gates: null unless
              enabled-but-empty. Changes no data. */}
          <AddMedicationsPrompt
            medsEnabled={welcomeSummary.medsBucketEnabled}
            medicationCount={welcomeSummary.medicationCount}
            patientName={patientName}
          />

          {/* ═══ F7 HEALTH ZONE — Today's Health (review) ═══
              Phase B (2026-06-13) — HealthZoneNow + the "Log something
              else →" catch-all link share one `zonePanel` wrapper so
              the review surface + catch-all read as one zone. */}
          <View style={{ height: SECTION_GAP }} />
          <View style={styles.zonePanel}>
          <HealthZoneNow />

          {/* Ad-hoc logging catch-all (2026-06-13) — retired the QuickLog
              FAB + sheet in favor of one quiet text link to the picker.
              Sits below HealthZoneNow so the "review (Health) + catch-all
              (link)" pair reads as the day's logging surface. /quick-log-more
              hosts Note + Water + anything not routed by HealthZoneNow's
              four fabric rows. */}
          <TouchableOpacity
            onPress={() => navigate('/quick-log-more')}
            accessibilityRole="button"
            accessibilityLabel="Log something else"
            style={styles.logSomethingElseLink}
            hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
          >
            <Text style={styles.logSomethingElseLinkText}>Log something else →</Text>
          </TouchableOpacity>
          </View>

          {/* ═══ F7 REFLECTION ZONE — Reflection (evening only) ═══
              Phase B (2026-06-13) — ReflectionZoneNow sits inside a
              `zonePanel` wrapper, conditionally rendered by the parent
              `isReflectionEvening` gate. The gate dupes the component's
              internal 17:00 check so the panel itself doesn't appear
              as an empty bordered rectangle pre-evening. ReflectionZoneNow
              still owns its own null-return + minute-refresh internally
              (defense in depth). */}
          {isReflectionEvening && (
            <>
              <View style={{ height: SECTION_GAP }} />
              <View style={styles.zonePanel}>
              {/* Reflection honesty — gate the celebratory State A on the whole
                  day being done (nowFocus.dayState), not just evening meds. An
                  active day gets the honest quiet line; it never claims a
                  completion that didn't happen. Part 3 — collapsed to its header
                  row by default (session-persisted expand). */}
              <ReflectionZoneNow
                dayComplete={nowFocus.dayState === 'done'}
                collapsed={!reflectionExpanded}
                onToggleCollapse={() => setReflectionExpanded(v => !v)}
              />
              </View>
            </>
          )}

          <View style={{ height: SECTION_GAP }} />
          {/* Phase 5.10.b — Upcoming appointment surface.
              Phase 15.7 — inline "Upcoming This Week" block retired; the
              card is now the sole upcoming-appointment surface and uses
              a 14-day lookahead. Renders null when no appointment is in
              window. */}
          <UpcomingAppointmentCard />

          {/* ═══ FOOTER ═══ */}
          <NowFooter
            completedCount={todayTimeline.completed.length}
            allPendingCount={allPending.length}
            hasRegimenInstances={!!hasRegimenInstances}
            hasMissed={todayTimeline.completed.some(i => i.status === 'missed')}
            outcomes={todayOutcomes}
            hasHandoffNote={hasHandoffNote}
            endOfShiftCollapsed={!endOfShiftExpanded}
            onToggleEndOfShift={() => setEndOfShiftExpanded(v => !v)}
          />

        </View>

        {/* Bottom spacing for tab bar */}
        <View style={{ height: 83 }} />
      </ScrollView>
      </SafeAreaView>

      {/* v6.7 — LogToast for the trailing-edge inline checkbox + add-cup. */}
      {logToast && (
        <View style={styles.logToastWrap} pointerEvents="box-none">
          <LogToast
            visible
            message={logToast.message}
            tenure={tenurePhase}
            anomalyPrompt={logToast.anomalyPrompt}
            onAdd={logToast.onAdd}
            onUndo={() => { void logToast.onUndo(); }}
            onDismiss={dismissLogToast}
            undoLabel={logToast.undoLabel}
            hideAdd={logToast.hideAdd}
          />
        </View>
      )}


      {/* Routine Sheet — batch logging for a time window */}
      {activeRoutineWindow && (
        <RoutineSheet
          visible={!!activeRoutineWindow}
          window={activeRoutineWindow}
          items={[...allPending, ...todayTimeline.completed].filter(
            i => i.windowLabel === activeRoutineWindow
          )}
          onItemPress={handleTimelineItemPress}
          onDismiss={() => setActiveRoutineWindow(null)}
          onBatchComplete={handleBatchWindowComplete}
        />
      )}

      {/* Sample-mode management — opens from the SampleModeBanner pill,
          from the PatientSwitcherModal bottom action section, and from
          Settings → "Manage example data". Owns the set-up + remove flows. */}
      <ManageSampleDataSheet
        visible={manageSampleSheet.open}
        focusOn={manageSampleSheet.focus}
        activePatientName={patientName}
        entrySource="banner"
        onClose={() => setManageSampleSheet({ open: false })}
      />

    </View>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  scrollView: { flex: 1 },
  // Phase 3 page rhythm — every tab's outermost ScrollView gets the
  // canonical paddingTop: 24 / paddingHorizontal: 14. Below the hero
  // header, the inner `content` view adds zero horizontal padding so
  // cards align flush with the scrollContent edge.
  scrollContent: { paddingTop: 24, paddingHorizontal: 14 }, // allow: tap-target padding (Apple HIG ≥44pt)
  content: { paddingHorizontal: 0, paddingTop: 0 },

  // v6.7 LogToast wrapper — same float anchor as the legacy undo toast.
  logToastWrap: {
    position: 'absolute', bottom: 100, left: 0, right: 0,
  },

  // Phase B (2026-06-13) — Now zone-panel wrapper. Schedule / Health /
  // Reflection each sit inside one of these so the warm bg reads as a
  // gutter between zones. Quiet warm low-lift surface (zonePanel ≈ #221d15,
  // ~3.5 L* over the #1a1612 bg), glassBorder hairline, modest radius +
  // inner padding for breathing room.
  zonePanel: {
    backgroundColor: c.zonePanel,
    borderWidth: 1,
    borderColor: c.glassBorder,
    borderRadius: 14,
    padding: 12,
  },

  // Catch-all "Log something else →" link (2026-06-13). Quiet, low-key —
  // textTertiary, small type, centered. Visual register matches the
  // section-header action chrome ("Care Plan →", etc.) so it reads as a
  // tertiary affordance, not a primary CTA.
  logSomethingElseLink: {
    paddingTop: 12,
    paddingBottom: 4,
    alignItems: 'center',
  },
  logSomethingElseLinkText: {
    fontSize: 12,
    color: c.textTertiary,
    fontWeight: '500',
  },

  // Section header (used by Upcoming This Week)
  // Phase 33 F10 — eyebrow positioning inverted per "eyebrow belongs
  // to what FOLLOWS" convention: more breathing above (separating from
  // preceding content), less below (close to following content). Pre-
  // F10 had paddingTop 8 / paddingBottom 10 — inverted, eyebrow felt
  // stranded against what preceded it.
  sectionHeaderRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 12, paddingBottom: 6,
  },
  sectionHeaderTitle: {
    fontSize: 9, fontWeight: '600', letterSpacing: 2, color: c.textTertiary, textTransform: 'uppercase',
  },

  // Section card (used by Upcoming This Week)
  // Phase 33 F10 — marginBottom 12 → Spacing.s4 (= 16). First
  // deliberate consumer of the s1–s12 numeric scale F2 introduced.
  // Token-routed, hits website canon exactly. Establishes precedent
  // for future spacing migrations to reach for the s-scale rather
  // than literal pixel values.
  sectionCard: {
    backgroundColor: c.glass, borderWidth: 1, borderColor: c.glassBorder,
    borderRadius: 16, padding: 12, marginBottom: Spacing.s4,
  },

  // Phase 15.7 — appointmentPrep* styles retired with the inline block.
});
