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
} from 'react-native';
import { useRouter } from 'expo-router';
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
import { ScreenHeader } from '../../components/ScreenHeader';
import { WelcomeBackBanner } from '../../components/common/WelcomeBackBanner';
import { SampleDataBanner } from '../../components/common/SampleDataBanner';

// CarePlan System
import { useCarePlan } from '../../hooks/useCarePlan';
import { useDailyCareInstances } from '../../hooks/useDailyCareInstances';
import { useCareTasks } from '../../hooks/useCareTasks';
import { useAppointments } from '../../hooks/useAppointments';
import { useCarePlanConfig } from '../../hooks/useCarePlanConfig';
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
  getCurrentTimeWindow,
  getTimeWindow,
  OVERDUE_GRACE_MINUTES,
} from '../../utils/nowHelpers';
// Extracted hooks
import { useNowPrompts } from '../../hooks/useNowPrompts';
import { useNowInsights } from '../../hooks/useNowInsights';

// Extracted components
import { NextUpCard } from '../../components/now/NextUpCard';
import { ProgressRings } from '../../components/now/ProgressRings';
import { CareInsightCard } from '../../components/now/CareInsightCard';
import { TimelineSection } from '../../components/now/TimelineSection';

// Banners
import {
  NoMedicationsBanner,
  NoCarePlanBanner,
  DataIntegrityBanner,
} from '../../components/common/ConsistencyBanner';

export default function NowScreen() {
  const router = useRouter();

  // Track today's date
  const [today, setToday] = useState(() => getTodayDateString());

  // Daily Care Instances hook
  const {
    state: instancesState,
    loading: instancesLoading,
    completeInstance,
    refresh: refreshInstances,
  } = useDailyCareInstances(today);

  // useCareTasks - Single source of truth for task stats
  const { state: careTasksState } = useCareTasks(today);

  // CarePlan hook
  const { dayState, carePlan, overrides, snoozeItem, setItemOverride, integrityWarnings, refresh: refreshCarePlan } = useCarePlan(today);

  // Appointments hook
  const { todayAppointments, complete: completeAppointment } = useAppointments();

  // Bucket-based Care Plan Config hook
  const { hasCarePlan: hasBucketCarePlan, loading: carePlanConfigLoading, enabledBuckets } = useCarePlanConfig();

  // Determine which system to use
  const hasRegimenInstances = instancesState && instancesState.instances.length > 0;
  const hasAnyCarePlan = carePlan || hasBucketCarePlan || hasRegimenInstances;

  const [medications, setMedications] = useState<Medication[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [dailyTracking, setDailyTracking] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  // ScrollView ref for scroll-to behavior
  const scrollViewRef = useRef<ScrollView>(null);
  const timeGroupPositions = useRef<Record<TimeWindow, number>>({
    morning: 0,
    afternoon: 0,
    evening: 0,
    night: 0,
  });

  // Time group expansion state
  const [expandedTimeGroups, setExpandedTimeGroups] = useState<Record<TimeWindow, boolean>>(() => {
    const currentWindow = getCurrentTimeWindow();
    return {
      morning: currentWindow === 'morning',
      afternoon: currentWindow === 'afternoon',
      evening: currentWindow === 'evening',
      night: currentWindow === 'night',
    };
  });

  // Legacy stats state - fallback when no regimen instances
  const [legacyStats, setLegacyStats] = useState<TodayStats>({
    meds: { completed: 0, total: 0 },
    vitals: { completed: 0, total: 4 },
    meals: { completed: 0, total: 3 },
  });

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

      const stats: TodayStats = {
        meds: getTypeStats('medication'),
        vitals: getTypeStats('vitals'),
        meals: getTypeStats('nutrition'),
        water: getTypeStats('hydration'),
        sleep: getTypeStats('sleep'),
        activity: getTypeStats('activity'),
        wellness: getTypeStats('wellness'),
      };

      const hasAnyInstanceData = stats.meds.total > 0 || stats.vitals.total > 0 ||
                                  stats.meals.total > 0;
      if (hasAnyInstanceData) {
        return stats;
      }
    }
    return legacyStats;
  }, [careTasksState, legacyStats, today]);

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
      i => i.status === 'completed' || i.status === 'skipped'
    ).sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

    const nextUp = pendingWithScores[0]?.instance || null;

    return { overdue, upcoming, completed, nextUp };
  }, [instancesState?.instances, instancesState?.date, today]);

  // Merge overdue + upcoming into single allPending array for TimelineSection
  const allPending = useMemo(() => {
    return [...todayTimeline.overdue, ...todayTimeline.upcoming];
  }, [todayTimeline.overdue, todayTimeline.upcoming]);

  // Current block data for NextUpCard
  const currentBlockData = useMemo(() => {
    const currentWindow = getCurrentTimeWindow();
    const pendingInBlock = allPending.filter(i => getTimeWindow(i.scheduledTime) === currentWindow);
    const completedInBlock = todayTimeline.completed.filter(i => getTimeWindow(i.scheduledTime) === currentWindow);
    const windowItems = [...pendingInBlock, ...completedInBlock];
    const nextPendingInBlock = pendingInBlock[0] || null;
    return { currentWindow, windowItems, nextPendingInBlock };
  }, [allPending, todayTimeline.completed]);

  // Scroll helpers
  const scrollToTimeGroup = useCallback((window: TimeWindow) => {
    // Ensure the target group is expanded
    setExpandedTimeGroups(prev => ({ ...prev, [window]: true }));
    // Scroll after a short delay to allow layout
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        y: timeGroupPositions.current[window] || 0,
        animated: true,
      });
    }, 100);
  }, []);

  // Handler for timeline item tap
  const handleTimelineItemPress = useCallback((instance: any) => {
    if (instance.itemType === 'medication') {
      router.push({
        pathname: '/log-medication-plan-item',
        params: {
          medicationId: instance.carePlanItemId,
          instanceId: instance.id,
          scheduledTime: instance.scheduledTime,
          itemName: instance.itemName,
          itemDosage: instance.itemDosage || '',
          itemInstructions: instance.instructions || '',
        },
      } as any);
      return;
    }
    const route = getRouteForInstanceType(instance.itemType);
    router.push(route as any);
  }, [router]);

  // ============================================================================
  // DATA LOADING
  // ============================================================================
  useFocusEffect(
    useCallback(() => {
      const currentDate = getTodayDateString();
      if (currentDate !== today) {
        setToday(currentDate);
      }

      refreshInstances();
      refreshCarePlan();
      loadData();
      prompts.checkNotificationPrompt();
      recordVisit();
    }, [today, refreshInstances, refreshCarePlan])
  );

  const loadData = async () => {
    try {
      const meds = await getMedications();
      const activeMeds = meds.filter((m) => m.active);
      setMedications(activeMeds);

      const appts = await getUpcomingAppointments();
      setAppointments(appts);

      const todayDate = new Date().toISOString().split('T')[0];
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

      const takenMeds = activeMeds.filter(m => m.taken).length;
      const totalMeds = activeMeds.length;

      const mealsLog = await getTodayMealsLog();
      const mealsLogged = mealsLog?.meals?.length || 0;

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
      console.error('Error loading Now data:', error);
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
      <AuroraBackground variant="today" />

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
        <ScreenHeader
          title="Now"
          subtitle={prompts.showClosure ? undefined : "What needs attention today"}
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

          {/* 1. CURRENT BLOCK CARD */}
          <NextUpCard
            currentWindow={currentBlockData.currentWindow}
            windowItems={currentBlockData.windowItems}
            nextPendingItem={currentBlockData.nextPendingInBlock}
            hasRegimenInstances={!!hasRegimenInstances}
            completedCount={todayTimeline.completed.length}
            onViewTasks={scrollToTimeGroup}
          />

          {/* Data Integrity Warning */}
          {integrityWarnings && integrityWarnings.length > 0 && (
            <DataIntegrityBanner
              issueCount={integrityWarnings.length}
              onFix={() => router.push('/care-plan' as any)}
            />
          )}

          {/* Empty State: No Medications */}
          {medications.length === 0 && !prompts.showOnboarding && (
            <NoMedicationsBanner />
          )}

          {/* Empty State: No Care Plan */}
          {!hasAnyCarePlan && !prompts.showOnboarding && !carePlanConfigLoading && (
            <NoCarePlanBanner onSetup={() => router.push('/care-plan' as any)} />
          )}

          {/* 2. CARE PLAN PROGRESS */}
          <View accessibilityLiveRegion="polite" accessibilityRole="summary">
            <ProgressRings
              todayStats={todayStats}
              enabledBuckets={enabledBuckets}
              nextUp={todayTimeline?.nextUp}
              instances={instancesState?.instances || []}
            />
          </View>

          {/* 3. CARE INSIGHT */}
          <CareInsightCard
            careInsight={careInsight}
            hasNextUp={!!todayTimeline?.nextUp}
          />

          {/* 4. TIMELINE DETAILS */}
          <TimelineSection
            allPending={allPending}
            completed={todayTimeline.completed}
            hasRegimenInstances={!!hasRegimenInstances}
            expandedTimeGroups={expandedTimeGroups}
            onToggleTimeGroup={(window) => setExpandedTimeGroups(prev => ({
              ...prev,
              [window]: !prev[window]
            }))}
            onItemPress={handleTimelineItemPress}
            timeGroupRefs={{
              morning: (node: any) => { if (node) node.measureInWindow((_x: number, y: number) => { timeGroupPositions.current.morning = y; }); },
              afternoon: (node: any) => { if (node) node.measureInWindow((_x: number, y: number) => { timeGroupPositions.current.afternoon = y; }); },
              evening: (node: any) => { if (node) node.measureInWindow((_x: number, y: number) => { timeGroupPositions.current.evening = y; }); },
              night: (node: any) => { if (node) node.measureInWindow((_x: number, y: number) => { timeGroupPositions.current.night = y; }); },
            }}
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
            todayTimeline.completed.length > 0 && (
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
          )}

        </View>

        {/* Bottom spacing for tab bar */}
        <View style={{ height: 100 }} />
      </ScrollView>
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
  baselineStatusContainer: {
    marginBottom: 16,
    gap: 6,
  },
  baselineStatus: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  baselineStatusMatch: {
    borderLeftWidth: 3,
    borderLeftColor: 'rgba(16, 185, 129, 0.4)',
  },
  baselineStatusBelow: {
    borderLeftWidth: 3,
    borderLeftColor: 'rgba(251, 191, 36, 0.4)',
  },
  baselineStatusMain: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 18,
  },
  baselineStatusSub: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 2,
  },
  emptyTimeline: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyTimelineText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
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
    color: '#10B981',
  },
});
