// ============================================================================
// NOW PAGE - Progress Rings + Bottom Encouragement
// "What's happening right now?" — Quick status and timeline
// ============================================================================

import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { navigate } from '../../lib/navigate';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../../theme/theme-tokens';
import { getMedications, Medication } from '../../utils/medicationStorage';
import { getUpcomingAppointments, Appointment } from '../../utils/appointmentStorage';
import { getDailyTracking } from '../../utils/dailyTrackingStorage';
import {
  getTodayVitalsLog,
  getTodayMealsLog,
} from '../../utils/centralStorage';
import { recordVisit } from '../../utils/lastVisitTracker';

// Prompt Components
import {
  OrientationPrompt,
  RegulationPrompt,
  ClosurePrompt,
  OnboardingPrompt,
  NotificationPrompt,
  BaselineConfirmPrompt,
} from '../../components/prompts';

// Aurora Components
import { AuroraBackground } from '../../components/aurora/AuroraBackground';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PatientSwitcherModal } from '../../components/now/PatientSwitcherModal';
import { usePatient } from '../../contexts/PatientContext';
import { WelcomeBackBanner } from '../../components/common/WelcomeBackBanner';
import { SampleDataBanner } from '../../components/common/SampleDataBanner';

// CarePlan System
import { useCarePlan } from '../../hooks/useCarePlan';
import { useCareTasks } from '../../hooks/useCareTasks';
import { useAppointments } from '../../hooks/useAppointments';
import { useCarePlanConfig } from '../../hooks/useCarePlanConfig';
import { useTodayScope } from '../../hooks/useTodayScope';
import { useCoffeeMoment } from '../../hooks/useCoffeeMoment';
import { CoffeeMomentMinimal } from '../../components/CoffeeMomentMinimal';
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
  isOverdue,
  getRouteForInstanceType,
  OVERDUE_GRACE_MINUTES,
} from '../../utils/nowHelpers';
// Extracted hooks
import { useNowPrompts } from '../../hooks/useNowPrompts';
import { useNowInsights } from '../../hooks/useNowInsights';

// Extracted components
import { ProgressRings } from '../../components/now/ProgressRings';
import { ScreenHeader } from '../../components/ScreenHeader';
import { TimelineSection } from '../../components/now/TimelineSection';
import { RoutineSheet } from '../../components/now/RoutineSheet';
import { UpNextCard } from '../../components/now/UpNextCard';
import type { TimeWindow } from '../../utils/nowHelpers';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

// Banners
import {
  NoMedicationsBanner,
  NoCarePlanBanner,
  DataIntegrityBanner,
} from '../../components/common/ConsistencyBanner';
import { logError } from '../../utils/devLog';
import { useDataListener, emitDataUpdate } from '../../lib/events';
import { GettingStartedChecklist } from '../../components/guidance';

export default function NowScreen() {


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
  const { suppressedItems } = useTodayScope(today);

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
  const [patientName, setPatientName] = useState('Patient');
  const [showPatientSwitcher, setShowPatientSwitcher] = useState(false);
  const { activePatient, patients } = usePatient();
  const waterGoal = 8;

  const handleWaterUpdate = useCallback(async (newGlasses: number) => {
    try {
      setWaterGlasses(newGlasses);
      const { updateTodayWaterLog } = await import('../../utils/centralStorage');
      await updateTodayWaterLog(newGlasses);
      emitDataUpdate('water');
    } catch (error) {
      logError('now.handleWaterUpdate', error);
    }
  }, []);

  // ============================================================================
  // SINGLE SOURCE OF TRUTH: Compute stats from useCareTasks hook
  // ============================================================================
  const todayStats = useMemo((): TodayStats => {
    if (careTasksState && careTasksState.tasks.length > 0 && careTasksState.date === today) {
      const getTypeStats = (itemType: string): StatData => {
        const typeTasks = careTasksState.tasks.filter(t => t.type === itemType);
        const completed = typeTasks.filter(t => t.status === 'completed').length;
        return { completed, total: typeTasks.length };
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
  }, [careTasksState, legacyStats, today, waterGlasses, waterGoal]);

  // Extracted hooks
  const prompts = useNowPrompts(todayStats, dailyTracking);
  const { aiInsight, careInsight } = useNowInsights(
    todayStats, instancesState, today, medications, appointments, dailyTracking
  );

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

  // Coffee Moment - gentle nudge when task load is high
  const overdueCount = todayTimeline.overdue.length;
  const hasLateMedication = todayTimeline.overdue.some(
    (i: any) => i.itemType === 'medication'
  );
  const coffeeMoment = useCoffeeMoment(overdueCount, hasLateMedication);

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
    emitDataUpdate('dailyInstances');
  }, [completeInstance]);

  // Batch confirm meds — uses completeInstance from useCareTasks
  const handleBatchMedConfirm = useCallback(async (instanceIds: string[]) => {
    for (const id of instanceIds) {
      await completeInstance(id, 'taken');
    }
    emitDataUpdate('dailyInstances');
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
      prompts.checkNotificationPrompt();
      recordVisit();
    }, [today, refreshCareTasks, refreshCarePlan])
  );

  // Live sync: reload data when any storage module emits an update
  useDataListener(useCallback((category: string) => {
    if (['medications', 'medicationLog', 'vitals', 'vitalsLog', 'wellness',
         'mealsLog', 'waterLog', 'dailyTracking', 'appointments',
         'dailyInstances', 'carePlanItems', 'sampleDataCleared'].includes(category)) {
      loadData();
      // Also refresh care tasks so timeline + stats update immediately
      refreshCareTasks();
    }
  }, [refreshCareTasks]));

  const loadData = async () => {
    try {
      // Load patient name — prefer PatientContext, fall back to AsyncStorage for migration
      if (activePatient && activePatient.name !== 'Patient') {
        setPatientName(activePatient.name);
      } else {
        const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
        const name = await AsyncStorage.getItem('@embermate_patient_name');
        if (name && name !== 'Patient') {
          setPatientName(name);
          // Migration: sync legacy name to patient registry
          try {
            const { updatePatient } = await import('../../storage/patientRegistry');
            await updatePatient(activePatient?.id || 'default', { name });
          } catch {}
        } else {
          setPatientName(activePatient?.name || 'Patient');
        }
      }

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
      const { getMedicationLogs } = await import('../../utils/medicationStorage');
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
        const { getTodayWaterLog } = await import('../../utils/centralStorage');
        const waterLog = await getTodayWaterLog();
        setWaterGlasses(waterLog?.glasses ?? 0);
      } catch {
        setWaterGlasses(0);
      }

      // Legacy stats fallback — only used when no regimen instances exist
      const legacyStatsUpdate: TodayStats = {
        meds: { completed: takenMeds, total: totalMeds },
        vitals: { completed: vitalsLogged, total: 4 },
        meals: { completed: mealsLogged, total: 4 },
      };
      setLegacyStats(legacyStatsUpdate);

      await prompts.computePrompts(legacyStatsUpdate, null);

      // Load baselines
      await prompts.loadBaselines();
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
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.accent}
          />
        }
      >
        {/* Header: greeting + date left, patient chip right */}
        <ScreenHeader
          title={getGreeting()}
          subtitle={new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          rightAction={
            <TouchableOpacity
              onPress={() => setShowPatientSwitcher(true)}
              style={styles.patientChip}
              accessibilityLabel={`Patient: ${patientName}. Tap to switch.`}
              accessibilityRole="button"
            >
              <View style={styles.patientAvatar}>
                <Text style={styles.patientAvatarText}>
                  {patientName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.patientChipName}>{patientName}</Text>
              {patients.length > 1 && (
                <Text style={{ fontSize: 10, color: Colors.textMuted }}>{'\u25BC'}</Text>
              )}
            </TouchableOpacity>
          }
        />
        <PatientSwitcherModal
          visible={showPatientSwitcher}
          onClose={() => setShowPatientSwitcher(false)}
        />

        {/* Hidden Items Banner */}
        {suppressedItems.length > 0 && (
          <TouchableOpacity
            style={styles.hiddenBanner}
            onPress={() => navigate('/today-scope')}
            activeOpacity={0.7}
            accessibilityLabel={`${suppressedItems.length} item${suppressedItems.length === 1 ? '' : 's'} hidden via Adjust Today. Tap to manage.`}
            accessibilityRole="button"
          >
            <Text style={styles.hiddenBannerText}>
              {suppressedItems.length} item{suppressedItems.length === 1 ? '' : 's'} hidden via Adjust Today
            </Text>
            <Text style={styles.hiddenBannerAction}>Manage →</Text>
          </TouchableOpacity>
        )}

        {/* Coffee Moment Banner */}
        {coffeeMoment.showBanner && (
          <View style={styles.coffeeBanner}>
            <Text style={styles.coffeeBannerIcon}>☕</Text>
            <View style={styles.coffeeBannerContent}>
              <Text style={styles.coffeeBannerText}>
                You have a few overdue items. Take 60 seconds before continuing.
              </Text>
              <View style={styles.coffeeBannerActions}>
                <TouchableOpacity
                  style={styles.coffeeResetButton}
                  onPress={coffeeMoment.startReset}
                  activeOpacity={0.7}
                  accessibilityLabel="Start 1-minute breathing reset"
                  accessibilityRole="button"
                >
                  <Text style={styles.coffeeResetText}>Start 1-Minute Reset</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={coffeeMoment.dismissBanner}
                  activeOpacity={0.7}
                  accessibilityLabel="Dismiss coffee moment"
                  accessibilityRole="button"
                >
                  <Text style={styles.coffeeDismissText}>Dismiss</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Coffee Moment Modal */}
        <CoffeeMomentMinimal
          visible={coffeeMoment.showModal}
          onClose={coffeeMoment.closeModal}
          microcopy="Pause for a minute"
          duration={60}
        />

        {/* Onboarding Prompt */}
        {prompts.showOnboarding && (
          <OnboardingPrompt
            onShowMeWhatMatters={prompts.handleShowMeWhatMatters}
            onExploreOnMyOwn={prompts.handleExploreOnMyOwn}
          />
        )}

        {/* Closure Prompt */}
        {prompts.showClosure && !prompts.showOnboarding && (
          <View style={styles.closureContainer}>
            <ClosurePrompt message={prompts.closureMessage} />
          </View>
        )}

        {/* Orientation Prompt */}
        {prompts.orientationPrompt && !prompts.showClosure && !prompts.showOnboarding && (
          <View style={styles.orientationContainer}>
            <OrientationPrompt
              message={prompts.orientationPrompt.message}
              pendingCount={prompts.orientationPrompt.pendingCount}
            />
          </View>
        )}

        <View style={styles.content}>
          {/* Regulation Prompt */}
          {prompts.regulationPrompt && !prompts.showOnboarding && (
            <RegulationPrompt
              message={prompts.regulationPrompt.message}
              onDismiss={prompts.handleDismissRegulation}
            />
          )}

          {/* Welcome Banner */}
          {prompts.showWelcomeBanner && (
            <WelcomeBackBanner onDismiss={prompts.handleDismissBanner} />
          )}

          {/* Sample Data Banner */}
          <SampleDataBanner compact />

          {/* Getting Started Checklist */}
          {!prompts.showOnboarding && <GettingStartedChecklist />}

          {/* Notification Prompt */}
          {prompts.showNotificationPrompt && !prompts.showOnboarding && (
            <NotificationPrompt
              onEnable={prompts.handleEnableNotifications}
              onNotNow={prompts.handleNotNowNotifications}
            />
          )}

          {/* Baseline Confirmation Prompt */}
          {prompts.baselineToConfirm && !prompts.showOnboarding && (
            <BaselineConfirmPrompt
              category={prompts.baselineToConfirm.category}
              baseline={prompts.baselineToConfirm.baseline}
              onYes={prompts.handleBaselineYes}
              onNotReally={prompts.handleBaselineNotReally}
              onDismiss={prompts.handleBaselineDismiss}
            />
          )}

          {/* Baseline Status Messages */}
          {prompts.todayVsBaseline.length > 0 && !prompts.showOnboarding && (
            <View style={styles.baselineStatusContainer}>
              {prompts.todayVsBaseline.map(comparison => {
                const message = prompts.getBaselineStatusMessage(comparison);
                if (!message) return null;
                return (
                  <View key={comparison.category} style={[
                    styles.baselineStatus,
                    comparison.matchesBaseline && styles.baselineStatusMatch,
                    comparison.belowBaseline && styles.baselineStatusBelow,
                  ]}>
                    <Text style={styles.baselineStatusMain}>{message.main}</Text>
                    {message.sub && (
                      <Text style={styles.baselineStatusSub}>{message.sub}</Text>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* Data Integrity Warning */}
          {integrityWarnings && integrityWarnings.length > 0 && (
            <DataIntegrityBanner
              issueCount={integrityWarnings.length}
              onFix={() => navigate('/care-plan')}
            />
          )}

          {/* Empty State: No Medications */}
          {medications.length === 0 && !prompts.showOnboarding && (
            <NoMedicationsBanner />
          )}

          {/* Empty State: No Care Plan */}
          {!hasAnyCarePlan && !prompts.showOnboarding && !carePlanConfigLoading && (
            <NoCarePlanBanner onSetup={() => navigate('/care-plan')} />
          )}

          {/* 1. UP NEXT — highest priority item */}
          {todayTimeline.nextUp && !selectedCategory && (
            <UpNextCard
              instance={todayTimeline.nextUp}
              onLogNow={handleTimelineItemPress}
              onSkip={handleSkipInstance}
            />
          )}

          {/* 2. CARE PLAN PROGRESS — linear tiles */}
          <View accessibilityLiveRegion="polite" accessibilityRole="summary">
            <ProgressRings
              todayStats={todayStats}
              enabledBuckets={enabledBuckets}
              nextUp={todayTimeline?.nextUp}
              instances={instancesState?.instances || []}
              selectedCategory={selectedCategory}
              onRingPress={handleRingPress}
              onManagePress={() => navigate('/care-plan')}
              patientName={patientName}
            />
          </View>

          {/* 3. TIMELINE DETAILS */}
          <TimelineSection
            allPending={allPending}
            completed={todayTimeline.completed}
            hasRegimenInstances={!!hasRegimenInstances}
            selectedCategory={selectedCategory}
            onClearCategory={handleClearCategory}
            onItemPress={handleTimelineItemPress}
            onBatchMedConfirm={handleBatchMedConfirm}
            todayStats={todayStats}
            enabledBuckets={enabledBuckets}
            waterGlasses={waterGlasses}
            waterGoal={waterGoal}
            onWaterUpdate={handleWaterUpdate}
            onStartRoutine={setActiveRoutineWindow}
          />

          {/* Empty states */}
          {!hasRegimenInstances && !hasBucketCarePlan && !carePlan && (
            <View style={styles.emptyTimeline}>
              <Text style={styles.emptyTimelineText}>No Care Plan set up yet</Text>
              <Text style={styles.emptyTimelineSubtext}>Add medications or items to see your timeline</Text>
            </View>
          )}

          {!hasRegimenInstances && (hasBucketCarePlan || carePlan) && (
            <View style={styles.emptyTimeline}>
              <Text style={styles.emptyTimelineText}>No items scheduled for today</Text>
              <Text style={styles.emptyTimelineSubtext}>Check your Care Plan settings</Text>
            </View>
          )}

          {hasRegimenInstances &&
            allPending.length === 0 &&
            todayTimeline.completed.length === 0 && (
            <View style={styles.emptyTimeline}>
              <Text style={styles.emptyTimelineText}>No items scheduled for today</Text>
            </View>
          )}

          {hasRegimenInstances &&
            allPending.length === 0 &&
            todayTimeline.completed.length > 0 && (() => {
              const hasMissed = todayTimeline.completed.some(i => i.status === 'missed');
              if (hasMissed) {
                return (
                  <Text
                    style={styles.encouragementText}
                    accessible={true}
                    accessibilityRole="text"
                  >
                    You're doing a great job. Every bit of care matters.
                  </Text>
                );
              }
              return (
                <View
                  style={styles.allDoneMessage}
                  accessible={true}
                  accessibilityRole="text"
                  accessibilityLabel="All caught up! All care plan items are complete for today."
                  accessibilityLiveRegion="polite"
                >
                  <Text style={styles.allDoneEmoji}>🎉</Text>
                  <Text style={styles.allDoneText}>All caught up!</Text>
                </View>
              );
            })()}

          {/* Encouraging footer with care insight */}
          <View style={styles.footerSection}>
            <Text style={styles.footerMessage}>
              {careInsight
                ? careInsight.message
                : allPending.length === 0 && todayTimeline.completed.length > 0
                ? 'You showed up today, and that matters.'
                : allPending.length <= 2 && allPending.length > 0
                ? 'Almost there. You\'re doing more than you think.'
                : 'Caregiving is hard. You\'re not behind \u2014 you\'re showing up.'}
            </Text>
            <TouchableOpacity
              onPress={coffeeMoment.startReset}
              style={styles.footerCoffeeLink}
              activeOpacity={0.7}
              accessibilityLabel="Take a 1-minute breathing pause"
              accessibilityRole="button"
            >
              <Text style={styles.footerCoffeeLinkText}>
                {'\u2615'}  Take a 1-minute pause
              </Text>
            </TouchableOpacity>
          </View>

        </View>

        {/* Bottom spacing for tab bar */}
        <View style={{ height: 100 }} />
      </ScrollView>
      </SafeAreaView>

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
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  closureContainer: {
    paddingHorizontal: 20,
    marginTop: -4,
  },
  orientationContainer: {
    paddingHorizontal: 20,
    marginTop: -4,
    marginBottom: 4,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },

  // Patient chip (header uses ScreenHeader)
  patientChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 184, 166, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.28)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
  },
  patientAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  patientAvatarText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  patientChipName: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  hiddenBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginBottom: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: Colors.glass,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  hiddenBannerText: {
    fontSize: 13,
    color: Colors.textHalf,
  },
  hiddenBannerAction: {
    fontSize: 13,
    color: Colors.accent,
    fontWeight: '500',
  },
  coffeeBanner: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 8,
    padding: 14,
    backgroundColor: Colors.purpleFaint,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.purpleBorder,
  },
  coffeeBannerIcon: {
    fontSize: 24,
    marginRight: 12,
    marginTop: 2,
  },
  coffeeBannerContent: {
    flex: 1,
  },
  coffeeBannerText: {
    fontSize: 13,
    color: Colors.textBright,
    lineHeight: 19,
    marginBottom: 10,
  },
  coffeeBannerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  coffeeResetButton: {
    backgroundColor: Colors.purple,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  coffeeResetText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  coffeeDismissText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  baselineStatusContainer: {
    marginBottom: 16,
    gap: 6,
  },
  baselineStatus: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: Colors.glass,
  },
  baselineStatusMatch: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.greenGlow,
  },
  baselineStatusBelow: {
    borderLeftWidth: 3,
    borderLeftColor: 'rgba(251, 191, 36, 0.4)',
  },
  baselineStatusMain: {
    fontSize: 13,
    color: Colors.textBright,
    lineHeight: 18,
  },
  baselineStatusSub: {
    fontSize: 12,
    color: Colors.textHalf,
    marginTop: 2,
  },
  emptyTimeline: {
    backgroundColor: Colors.glass,
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyTimelineText: {
    fontSize: 14,
    color: Colors.textHalf,
  },
  emptyTimelineSubtext: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.35)',
    marginTop: 4,
  },
  allDoneMessage: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 8,
  },
  allDoneEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  allDoneText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.green,
  },
  encouragementText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginVertical: 16,
    paddingHorizontal: 20,
  },
  footerSection: {
    alignItems: 'center',
    paddingVertical: 24,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  footerMessage: {
    fontSize: 14,
    fontStyle: 'italic',
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 24,
  },
  footerCoffeeLink: {
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  footerCoffeeLinkText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
});
