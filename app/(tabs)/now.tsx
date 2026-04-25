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
import { Colors } from '../../theme/theme-tokens';
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
import { AuroraBackground } from '../../components/aurora/AuroraBackground';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePatient } from '../../contexts/PatientContext';
// CarePlan System
import { useCarePlan } from '../../hooks/useCarePlan';
import { useCareTasks } from '../../hooks/useCareTasks';
import { useAppointments } from '../../hooks/useAppointments';
import { useCarePlanConfig } from '../../hooks/useCarePlanConfig';
import { useTodayScope } from '../../hooks/useTodayScope';
import { getTodayDateString } from '../../services/carePlanGenerator';
import { BucketType } from '../../types/carePlanConfig';

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
  isOverdue,
  getRouteForInstanceType,
  groupByTimeWindow,
  getCurrentTimeWindow,
  TIME_WINDOW_HOURS,
  OVERDUE_GRACE_MINUTES,
  formatNextScheduledTime,
} from '../../utils/nowHelpers';
// Extracted hooks
import { useNowPrompts } from '../../hooks/useNowPrompts';
// useNowInsights removed — replaced by StatRings

// Extracted components
import { RoutineSheet } from '../../components/now/RoutineSheet';
import { NowHeader } from '../../components/now/NowHeader';
import { NowTimeline } from '../../components/now/NowTimeline';
import { NowFooter } from '../../components/now/NowFooter';
import { StatRings } from '../../components/now/StatRings';


// Banners (removed: NoMedicationsBanner, NoCarePlanBanner, DataIntegrityBanner)
import { logError } from '../../utils/devLog';
import { hapticSuccess } from '../../utils/hapticFeedback';
import { updateDailyInstanceStatus, DEFAULT_PATIENT_ID } from '../../storage/carePlanRepo';
import { useDataListener, emitDataUpdate } from '../../lib/events';
import { EVENT } from '../../lib/eventNames';
import { buildCareBrief, CareBrief } from '../../utils/careSummaryBuilder';
import { hasSampleData } from '../../utils/sampleDataManager';


// ============================================================================
// INLINE COMPONENT — Quick Pulse Status Block
// ============================================================================

function buildOverdueCallouts(
  todayStats: TodayStats,
  instances: any[],
): { text: string; color: string }[] {
  const callouts: { text: string; color: string }[] = [];
  const categories = [
    { key: 'meds' as keyof TodayStats, itemType: 'medication', label: 'Meds', color: Colors.red },
    { key: 'vitals' as keyof TodayStats, itemType: 'vitals', label: 'Vitals', color: Colors.red },
    { key: 'wellness' as keyof TodayStats, itemType: 'wellness', label: 'Check-ins', color: Colors.red },
    { key: 'meals' as keyof TodayStats, itemType: 'nutrition', label: 'Meals', color: Colors.amberBright },
  ];
  for (const cat of categories) {
    // Read directly from instances — todayStats can lag or be empty for
    // sources that don't populate legacy counters (regimen instances only).
    const overdueInstances = instances.filter(
      (i: any) => i.itemType === cat.itemType &&
           (i.status === 'pending' || !i.status) &&
           isOverdue(i.scheduledTime)
    );
    if (overdueInstances.length === 0) continue;

    if (cat.itemType === 'medication') {
      const names = [...new Set(overdueInstances.map((i: any) => i.itemName))].join(', ');
      callouts.push({ text: `Meds overdue — ${names}`, color: Colors.red });
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
  const { hasCarePlan: hasBucketCarePlan, loading: carePlanConfigLoading, enabledBuckets } = useCarePlanConfig();

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
  // Phase 1C/D — undo toast for inline quick-confirm actions
  const [undoItem, setUndoItem] = useState<{ id: string; name: string } | null>(null);

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
  const [patientName, setPatientName] = useState('your loved one');
  const [patientGender, setPatientGender] = useState<string | null>(null);

  // Vitals guidance state (Task 4.1)
  const [vitalsExceedances, setVitalsExceedances] = useState<any[]>([]);
  const [vitalsRecentReadings, setVitalsRecentReadings] = useState<any[]>([]);
  const [vitalsGuidanceDismissed, setVitalsGuidanceDismissed] = useState(false);

  // Timeline collapse state — default expanded so users see their schedule
  // Default collapsed: caregiver sees the schedule overview (window banners)
  // first, then taps Start / a window to expand its items.
  const [timelineCollapsed, setTimelineCollapsed] = useState(true);

  // Handoff / Patterns / Before Bed (mirrored from Journal)
  const [brief, setBrief] = useState<CareBrief | null>(null);

  // Sample data mode
  const [isSampleMode, setIsSampleMode] = useState(false);

  // Appointment prep state (Task 4.5)
  const [upcomingPrepAppointment, setUpcomingPrepAppointment] = useState<any>(null);
  const [showPatientSwitcher, setShowPatientSwitcher] = useState(false);
  const { activePatient, patients } = usePatient();
  const waterGoal = 8;

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
      .filter(w => isOverdue(w.instance.scheduledTime))
      .map(w => w.instance);

    const upcoming = pendingWithScores
      .filter(w => !isOverdue(w.instance.scheduledTime))
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
    // Wellness: route to morning or evening screen based on instance windowLabel
    if (instance.itemType === 'wellness') {
      const wellnessRoute = instance.windowLabel === 'evening'
        ? '/log-evening-wellness'
        : '/log-morning-wellness'; // morning and midday both use morning wellness screen
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
      for (const id of instanceIds) {
        await completeInstance(id, 'taken');
      }
      emitDataUpdate(EVENT.DAILY_INSTANCES);
      void hapticSuccess();
    } catch (err) {
      logError('handleBatchWindowComplete', err);
    }
  }, [completeInstance]);

  // Phase 1C — inline one-tap confirm for routine items.
  // Completes a medication (or other quick-confirmable item) without
  // navigating, fires success haptics, and surfaces an undo toast.
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleQuickConfirm = useCallback(async (instance: any) => {
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

      setUndoItem({ id: instance.id, name: instance.itemName });
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      undoTimerRef.current = setTimeout(() => setUndoItem(null), 5000);
    } catch (err) {
      logError('handleQuickConfirm', err);
      Alert.alert('Error', 'Could not confirm. Try again.');
    }
  }, [completeInstance]);

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
      hasSampleData().then(setIsSampleMode);
    }, [today, refreshCareTasks, refreshCarePlan])
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
      if (category === EVENT.SAMPLE_DATA_CLEARED) {
        setIsSampleMode(false);
      }
    }
  }, [refreshCareTasks]));

  const loadData = async () => {
    try {
      // Load patient name — prefer PatientContext, fall back to AsyncStorage for migration
      if (activePatient && activePatient.name !== 'Patient') {
        setPatientName(activePatient.name);
      } else {
        const name = await safeGetItem<string | null>(StorageKeys.PATIENT_NAME, null);
        if (name && name !== 'Patient') {
          setPatientName(name);
          // Migration: sync legacy name to patient registry
          try {
            await updatePatient(activePatient?.id || 'default', { name });
          } catch (err) {
            logError('NowScreen.migratePatientName', err);
          }
        } else {
          // activePatient.name is the literal 'Patient' here (the legacy
          // default that callers above already filter out). Show the
          // friendlier user-facing fallback instead.
          const candidate = activePatient?.name;
          setPatientName(candidate && candidate !== 'Patient' ? candidate : 'your loved one');
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

      // Check for appointment within 14 days (Task 4.5)
      try {
        const prepAppt = appts.find(a => {
          const daysUntil = Math.ceil((new Date(a.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          return daysUntil >= 0 && daysUntil <= 14;
        });
        setUpcomingPrepAppointment(prepAppt || null);
      } catch (err) {
        logError('NowScreen.loadPrepAppointment', err);
        setUpcomingPrepAppointment(null);
      }

      // Load care brief for handoff/patterns/before-bed
      buildCareBrief().then(data => setBrief(data)).catch(() => {});

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
      <AuroraBackground variant="now" />

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
          onSampleCleared={() => { setIsSampleMode(false); loadData(); refreshCareTasks(); }}
          suppressedItems={suppressedItems}
          onRestoreSuppressed={restoreAllSuppressed}
          showOnboarding={showOnboarding}
          onboardingHandlers={handlers}
          stats={todayStats}
          nextScheduledTime={nextScheduledTime}
        />

        <View style={styles.content}>

          {/* ═══ PROGRESS RINGS ═══ */}
          <StatRings stats={todayStats} />

          {/* ═══ ZONE 2: TODAY'S SCHEDULE ═══ */}
          <NowTimeline
            timelineCollapsed={timelineCollapsed}
            onToggleCollapse={() => setTimelineCollapsed(prev => !prev)}
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
            onStartRoutine={setActiveRoutineWindow}
            todayStats={todayStats}
            enabledBuckets={enabledBuckets}
            waterGlasses={waterGlasses}
            waterGoal={waterGoal}
            onWaterUpdate={handleWaterUpdate}
          />

          {/* ═══ ZONE 3: UPCOMING THIS WEEK ═══ */}
          {upcomingPrepAppointment && (
            <>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeaderTitle}>Upcoming This Week</Text>
              </View>
              <View style={styles.sectionCard}>
                <TouchableOpacity
                  style={styles.appointmentPrepCard}
                  onPress={() => navigate(`/provider-prep?appointmentId=${upcomingPrepAppointment.id}`)}
                  activeOpacity={0.7}
                  accessibilityLabel="Prepare for upcoming appointment"
                  accessibilityRole="button"
                >
                  <Text style={styles.appointmentPrepIcon}>{'\uD83E\uDE7A'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.appointmentPrepTitle}>
                      {upcomingPrepAppointment.provider || 'Appointment'} — Visit Prep
                    </Text>
                    <Text style={styles.appointmentPrepSubtitle}>
                      {Math.ceil((new Date(upcomingPrepAppointment.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days away
                    </Text>
                  </View>
                  <Text style={styles.appointmentPrepArrow}>{'\u203A'}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* ═══ FOOTER ═══ */}
          <NowFooter
            completedCount={todayTimeline.completed.length}
            allPendingCount={allPending.length}
            hasRegimenInstances={!!hasRegimenInstances}
            hasMissed={todayTimeline.completed.some(i => i.status === 'missed')}
            brief={brief}
          />

        </View>

        {/* Bottom spacing for tab bar */}
        <View style={{ height: 83 }} />
      </ScrollView>
      </SafeAreaView>

      {/* Phase 1D — undo toast for inline quick-confirm */}
      {undoItem && (
        <View style={styles.undoToast}>
          <Text style={styles.undoToastText}>{undoItem.name} confirmed</Text>
          <TouchableOpacity
            onPress={async () => {
              const item = undoItem;
              if (!item) return;
              try {
                // Best-effort revert: flip the instance back to 'pending' and
                // clear its logId. The completion log entry is left dangling
                // (no UI references it once the instance no longer points at
                // it) — acceptable for the undo window.
                await updateDailyInstanceStatus(
                  DEFAULT_PATIENT_ID,
                  today,
                  item.id,
                  'pending'
                );
                emitDataUpdate(EVENT.DAILY_INSTANCES);
              } catch (err) {
                logError('handleQuickConfirm.undo', err);
              } finally {
                if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
                setUndoItem(null);
              }
            }}
            accessibilityLabel="Undo confirmation"
            accessibilityRole="button"
          >
            <Text style={styles.undoToastAction}>Undo</Text>
          </TouchableOpacity>
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
    </View>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  scrollView: { flex: 1 },
  scrollContent: { paddingTop: 16 },
  content: { paddingHorizontal: 22, paddingTop: 0 },

  // Undo toast (floats above tab bar)
  undoToast: {
    position: 'absolute', bottom: 100, left: 16, right: 16,
    backgroundColor: c.warmSurfaceAlert, borderWidth: 1, borderColor: c.warmSurfaceAlertBorder,
    borderRadius: 10, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  undoToastText: { fontSize: 13, color: c.textAlertPrimary },
  undoToastAction: { fontSize: 13, fontWeight: '600', color: c.textAlertLabel },

  // Section header (used by Upcoming This Week)
  sectionHeaderRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 8, paddingBottom: 10,
  },
  sectionHeaderTitle: {
    fontSize: 9, fontWeight: '600', letterSpacing: 2, color: c.textTertiary, textTransform: 'uppercase',
  },

  // Section card (used by Upcoming This Week)
  sectionCard: {
    backgroundColor: c.glass, borderWidth: 1, borderColor: c.glassBorder,
    borderRadius: 16, padding: 16, marginBottom: 12,
  },

  // Appointment prep
  appointmentPrepCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: c.warmSurface,
    borderRadius: 10, borderWidth: 1, borderColor: c.warmSurfaceBorder,
    padding: 12, marginBottom: 4, gap: 12,
  },
  appointmentPrepIcon: { fontSize: 20 },
  appointmentPrepTitle: { fontSize: 14, fontWeight: '600', color: c.textBright },
  appointmentPrepSubtitle: { fontSize: 12, color: c.textMuted, marginTop: 2 },
  appointmentPrepArrow: { fontSize: 20, color: c.textMuted },
});
