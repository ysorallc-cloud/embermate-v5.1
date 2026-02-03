// ============================================================================
// RECORD PAGE - Forgiving Capture Tool
// "What did you come here to log?" - Not a checklist, a helper
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { AuroraBackground } from '../../components/aurora/AuroraBackground';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Colors, Spacing } from '../../theme/theme-tokens';
import { MICROCOPY } from '../../constants/microcopy';
import { getMedications, Medication } from '../../utils/medicationStorage';
import { countUpcomingAppointments } from '../../utils/appointmentStorage';
import {
  getTodayMedicationLog,
  getTodayVitalsLog,
  getTodayMoodLog,
  getTodaySleepLog,
  getTodayMealsLog,
  getTodayWaterLog,
  getTodaySymptomLog,
  getTodayNotesLog,
} from '../../utils/centralStorage';
import { useDataListener } from '../../lib/events';
// Use BOTH the old useCarePlan (for legacy dayState) and new useDailyCareInstances
import { useCarePlan } from '../../hooks/useCarePlan';
import { useDailyCareInstances } from '../../hooks/useDailyCareInstances';
// NEW: Bucket-based Care Plan Config
import { useCarePlanConfig } from '../../hooks/useCarePlanConfig';
import { BucketType } from '../../types/carePlanConfig';
// Use the NEW DailyInstancesPanel when regimen system is active
import { DailyInstancesPanel } from '../../components/careplan/DailyInstancesPanel';
// Keep old CarePlanPanel as fallback
import { CarePlanPanel } from '../../components/careplan/CarePlanPanel';
import {
  NoMedicationsBanner,
  DataIntegrityBanner,
} from '../../components/common/ConsistencyBanner';

interface LogItemData {
  id: string;
  emoji: string;
  question: string;
  hint: string;
  status?: { text: string; done: boolean };
  route: string;
}

export default function RecordTab() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [showMoreItems, setShowMoreItems] = useState(false);

  // NEW: Daily Care Instances hook - uses the regimen-based system
  const {
    state: instancesState,
    loading: instancesLoading,
    completeInstance,
    skipInstance,
  } = useDailyCareInstances();

  // OLD: Care Plan hook - provides dayState with progress (kept for legacy UI)
  const {
    dayState,
    carePlan,
    loading: carePlanLoading,
    setItemOverride,
    clearItemOverride,
    initializeCarePlan,
    integrityWarnings,
  } = useCarePlan();

  // NEW: Bucket-based Care Plan Config hook
  const { hasCarePlan: hasBucketCarePlan, enabledBuckets } = useCarePlanConfig();

  // Determine which system to use:
  // - If instancesState has groups, use the NEW regimen-based system
  // - Otherwise fall back to the OLD routine-based dayState
  const hasRegimenInstances = instancesState && instancesState.groups.length > 0;

  // Data state
  const [medications, setMedications] = useState<Medication[]>([]);
  const [medicationsTaken, setMedicationsTaken] = useState(0);
  const [vitalsCount, setVitalsCount] = useState(0);
  const [moodLogged, setMoodLogged] = useState(false);
  const [sleepLogged, setSleepLogged] = useState(false);
  const [mealsLogged, setMealsLogged] = useState(0);
  const [waterGlasses, setWaterGlasses] = useState(0);
  const [symptomsLogged, setSymptomsLogged] = useState(false);
  const [notesLogged, setNotesLogged] = useState(false);
  const [appointmentsCount, setAppointmentsCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      loadTodayData();
    }, [])
  );

  // Listen for data updates from other parts of the app
  useDataListener(() => {
    loadTodayData();
  });

  // Handle navigation params to auto-expand sections
  useEffect(() => {
    if (params.expandSection) {
      setShowMoreItems(params.expandSection === 'symptoms');
    }
  }, [params.expandSection]);

  const loadTodayData = async () => {
    try {
      setLoading(true);

      const [
        allMeds,
        todayMeds,
        todayVitals,
        todayMood,
        todaySleep,
        todayMeals,
        todayWater,
        todaySymptoms,
        todayNotes,
        upcomingAppointments,
      ] = await Promise.all([
        getMedications(),
        getTodayMedicationLog(),
        getTodayVitalsLog(),
        getTodayMoodLog(),
        getTodaySleepLog(),
        getTodayMealsLog(),
        getTodayWaterLog(),
        getTodaySymptomLog(),
        getTodayNotesLog(),
        countUpcomingAppointments(),
      ]);

      const activeMeds = allMeds.filter(m => m.active !== false);
      setMedications(activeMeds);
      setMedicationsTaken(activeMeds.filter(m => m.taken).length);

      // Count individual vitals
      let vitalsLogged = 0;
      if (todayVitals) {
        if (todayVitals.systolic || todayVitals.diastolic) vitalsLogged++;
        if (todayVitals.heartRate) vitalsLogged++;
        if (todayVitals.temperature) vitalsLogged++;
        if (todayVitals.glucose) vitalsLogged++;
        if (todayVitals.oxygen) vitalsLogged++;
        if (todayVitals.weight) vitalsLogged++;
      }
      setVitalsCount(vitalsLogged);
      setMoodLogged(todayMood?.mood !== null && todayMood?.mood !== undefined);
      setSleepLogged(Boolean(todaySleep?.hours));
      setMealsLogged(todayMeals?.meals?.length || 0);
      setWaterGlasses(todayWater?.glasses || 0);
      setSymptomsLogged(Boolean(todaySymptoms?.symptoms?.length));
      setNotesLogged(Boolean(todayNotes?.content));
      setAppointmentsCount(upcomingAppointments);
    } catch (error) {
      console.error('Error loading Record data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleItemPress = (route: string) => {
    router.push(route as any);
  };

  // GUARDRAIL: Check if CarePlan exists to determine data source
  // Prefer new regimen system over old routine-based system
  const hasCarePlan = hasRegimenInstances || (!!carePlan && !!dayState);

  // Generate medication status text
  const getMedicationStatusText = (): { text: string; done: boolean } | undefined => {
    // GUARDRAIL: NEW regimen system - derive from instancesState
    if (hasRegimenInstances && instancesState) {
      // Count medication instances from the new system
      const medInstances = instancesState.instances.filter(i => i.itemType === 'medication');
      if (medInstances.length === 0) return undefined;
      const completed = medInstances.filter(i => i.status === 'completed').length;
      const done = completed >= medInstances.length;
      return { text: `${completed}/${medInstances.length}`, done };
    }

    // GUARDRAIL: OLD routine system - use dayState.progress
    if (hasCarePlan && dayState) {
      const { completed, expected } = dayState.progress.meds;
      if (expected === 0) return undefined;
      const done = completed >= expected;
      return { text: `${completed}/${expected}`, done };
    }

    // Fallback ONLY when no CarePlan exists
    if (medications.length === 0) return undefined;
    if (medicationsTaken === medications.length) {
      return { text: 'Nothing to do', done: true };
    }
    const remaining = medications.length - medicationsTaken;
    return { text: `${remaining} remaining`, done: false };
  };

  // Helper: Get status from new regimen instances by item type
  const getInstanceStatusByType = (itemType: string): { text: string; done: boolean } | undefined => {
    if (!hasRegimenInstances || !instancesState) return undefined;
    const typeInstances = instancesState.instances.filter(i => i.itemType === itemType);
    if (typeInstances.length === 0) return undefined;
    const completed = typeInstances.filter(i => i.status === 'completed').length;
    const done = completed >= typeInstances.length;
    return { text: `${completed}/${typeInstances.length}`, done };
  };

  // Quick items - 1-tap, low effort
  const quickItems: LogItemData[] = [
    {
      id: 'mood',
      emoji: '😊',
      question: 'How are they feeling?',
      hint: 'Mood & energy',
      status: (() => {
        // GUARDRAIL: NEW regimen system first
        const regimenStatus = getInstanceStatusByType('mood');
        if (regimenStatus) return regimenStatus;

        // OLD routine system
        if (hasCarePlan && dayState) {
          const { completed, expected } = dayState.progress.mood;
          if (expected === 0) return moodLogged ? { text: '✓ Logged', done: true } : undefined;
          return { text: completed >= expected ? '✓ Logged' : 'Tap to log', done: completed >= expected };
        }
        return moodLogged ? { text: '✓ Logged', done: true } : undefined;
      })(),
      route: '/log-mood',
    },
    {
      id: 'water',
      emoji: '💧',
      question: 'Water today?',
      hint: 'Quick count',
      status: (() => {
        // GUARDRAIL: NEW regimen system first
        const regimenStatus = getInstanceStatusByType('hydration');
        if (regimenStatus) return regimenStatus;

        // OLD routine system
        if (hasCarePlan && dayState) {
          const { completed, expected } = dayState.progress.hydration;
          if (expected === 0) return waterGlasses > 0 ? { text: `${waterGlasses} glasses`, done: waterGlasses >= 8 } : undefined;
          return { text: `${completed}/${expected}`, done: completed >= expected };
        }
        return waterGlasses > 0 ? { text: `${waterGlasses} glasses`, done: waterGlasses >= 8 } : undefined;
      })(),
      route: '/log-water',
    },
    {
      id: 'meals',
      emoji: '🍽️',
      question: 'Did they eat?',
      hint: 'Meals today',
      status: (() => {
        // GUARDRAIL: NEW regimen system first
        const regimenStatus = getInstanceStatusByType('nutrition');
        if (regimenStatus) return regimenStatus;

        // OLD routine system
        if (hasCarePlan && dayState) {
          const { completed, expected } = dayState.progress.meals;
          if (expected === 0) return undefined;
          return { text: `${completed}/${expected}`, done: completed >= expected };
        }
        // Fallback ONLY when no CarePlan
        return mealsLogged > 0 ? { text: `${mealsLogged}`, done: false } : undefined;
      })(),
      route: '/log-meal',
    },
  ];

  // Takes a moment items - more detail needed
  const momentItems: LogItemData[] = [
    {
      id: 'medications',
      emoji: '💊',
      question: 'Medications',
      hint: medications.length > 0 ? `${medications.length} scheduled` : 'No medications',
      status: getMedicationStatusText(),
      route: '/medications',  // Route to canonical Understand medications screen
    },
    {
      id: 'vitals',
      emoji: '📊',
      question: 'Check vitals?',
      hint: 'BP, heart rate, etc.',
      status: (() => {
        // GUARDRAIL: NEW regimen system first
        const regimenStatus = getInstanceStatusByType('vitals');
        if (regimenStatus) return regimenStatus;

        // OLD routine system
        if (hasCarePlan && dayState) {
          const { completed, expected } = dayState.progress.vitals;
          if (expected === 0) return undefined;
          return { text: `${completed}/${expected}`, done: completed >= expected };
        }
        // Fallback ONLY when no CarePlan
        return vitalsCount > 0 ? { text: `${vitalsCount}`, done: false } : undefined;
      })(),
      route: '/log-vitals',
    },
    {
      id: 'sleep',
      emoji: '😴',
      question: 'How was sleep?',
      hint: 'Quality & hours',
      status: sleepLogged ? { text: '✓ Logged', done: true } : undefined,
      route: '/log-sleep',
    },
    {
      id: 'appointment',
      emoji: '📅',
      question: 'Appointments',
      hint: 'View & manage visits',
      status: appointmentsCount > 0 ? { text: `${appointmentsCount} scheduled`, done: false } : undefined,
      route: '/appointments',  // Route to canonical Understand appointments screen
    },
  ];

  // More items - collapsed by default
  const moreItems: LogItemData[] = [
    {
      id: 'symptoms',
      emoji: '🩺',
      question: 'Anything feel off?',
      hint: 'Symptoms',
      status: symptomsLogged ? { text: '✓ Logged', done: true } : undefined,
      route: '/log-symptom',
    },
    {
      id: 'activity',
      emoji: '🚶',
      question: 'Activity today?',
      hint: 'Steps, exercise',
      route: '/log-activity',
    },
  ];

  // Optional items - always visible, low emphasis
  const optionalItems: LogItemData[] = [
    {
      id: 'notes',
      emoji: '📝',
      question: 'Anything else?',
      hint: 'Notes & observations',
      status: notesLogged ? { text: '✓ Added', done: true } : undefined,
      route: '/log-note',
    },
  ];

  const renderLogItem = (item: LogItemData) => {
    const isDone = item.status?.done;

    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.logItem, isDone && styles.logItemDone]}
        onPress={() => handleItemPress(item.route)}
        activeOpacity={0.7}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`${item.question}. ${item.status?.text || item.hint}`}
      >
        <View style={[styles.itemIcon, isDone && styles.itemIconDone]}>
          <Text style={styles.iconEmoji}>{item.emoji}</Text>
        </View>
        <View style={styles.itemContent}>
          <Text style={[styles.itemQuestion, isDone && styles.itemQuestionDone]}>
            {item.question}
          </Text>
          {item.status ? (
            <Text style={[styles.itemStatus, item.status.done && styles.itemStatusDone]}>
              {item.status.text}
            </Text>
          ) : (
            <Text style={styles.itemHint}>{item.hint}</Text>
          )}
        </View>
        <Text style={styles.itemChevron}>›</Text>
      </TouchableOpacity>
    );
  };

  if (loading || carePlanLoading || instancesLoading) {
    return (
      <View style={styles.container}>
        <AuroraBackground variant="log" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AuroraBackground variant="log" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          title="Record"
          subtitle={MICROCOPY.RECORD_SUBTITLE}
        />

        {/* Daily Instances Panel - NEW regimen-based system */}
        {hasRegimenInstances && instancesState && (
          <DailyInstancesPanel
            groups={instancesState.groups}
            nextPending={instancesState.nextPending}
            allComplete={instancesState.allComplete}
            stats={instancesState.stats}
            onCompleteInstance={completeInstance}
            onSkipInstance={skipInstance}
            onSetupPress={initializeCarePlan}
          />
        )}

        {/* OLD Care Plan Panel - Fallback for legacy routine-based system */}
        {!hasRegimenInstances && dayState && (
          <CarePlanPanel
            dayState={dayState}
            onItemOverride={setItemOverride}
            onClearOverride={clearItemOverride}
            onSetupPress={initializeCarePlan}
          />
        )}

        {/* Data Integrity Warning - Show if CarePlan has orphaned references */}
        {integrityWarnings && integrityWarnings.length > 0 && (
          <DataIntegrityBanner
            issueCount={integrityWarnings.length}
            onFix={() => router.push('/care-plan' as any)}
          />
        )}

        {/* Empty State: No Medications Set Up */}
        {medications.length === 0 && (
          <NoMedicationsBanner />
        )}

        {/* Group 1: Quick */}
        {/* Filter items based on enabled buckets - show all if no buckets enabled */}
        <Text style={styles.groupHeader}>QUICK</Text>
        {quickItems
          .filter(item => {
            if (enabledBuckets.length === 0) return true;
            const bucketMap: Record<string, BucketType> = {
              mood: 'mood',
              water: 'water',
              meals: 'meals',
            };
            const bucket = bucketMap[item.id];
            return !bucket || enabledBuckets.includes(bucket);
          })
          .map(renderLogItem)}

        {/* Group 2: More detail */}
        <Text style={styles.groupHeader}>MORE DETAIL</Text>
        {momentItems
          .filter(item => {
            if (enabledBuckets.length === 0) return true;
            const bucketMap: Record<string, BucketType> = {
              medications: 'meds',
              vitals: 'vitals',
              sleep: 'sleep',
              appointment: 'appointments',
            };
            const bucket = bucketMap[item.id];
            return !bucket || enabledBuckets.includes(bucket);
          })
          .map(renderLogItem)}

        {/* More items - Collapsed by default */}
        {!showMoreItems && (
          <TouchableOpacity
            style={styles.moreItems}
            onPress={() => setShowMoreItems(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.moreItemsLink}>+ More items</Text>
          </TouchableOpacity>
        )}

        {showMoreItems && (
          <>
            {moreItems.map(renderLogItem)}
            <TouchableOpacity
              style={styles.moreItems}
              onPress={() => setShowMoreItems(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.moreItemsLink}>− Hide items</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Group 3: Optional */}
        <Text style={styles.groupHeader}>OPTIONAL</Text>
        {optionalItems.map(renderLogItem)}

        {/* Encouragement Message */}
        <View style={styles.encouragement}>
          <Text style={styles.encouragementTitle}>{MICROCOPY.ONE_STEP}</Text>
          <Text style={styles.encouragementSubtitle}>{MICROCOPY.YOU_GOT_THIS}</Text>
        </View>

        {/* Bottom spacing */}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 16,
    marginTop: 10,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 80,
  },

  // Group Headers
  groupHeader: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 20,
  },

  // Log Items
  logItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 68,
  },
  logItemDone: {
    opacity: 0.6,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  itemIcon: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(94, 234, 212, 0.15)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemIconDone: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  iconEmoji: {
    fontSize: 24,
  },
  itemContent: {
    flex: 1,
  },
  itemQuestion: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  itemQuestionDone: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  itemHint: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  itemStatus: {
    fontSize: 11,
    color: 'rgba(94, 234, 212, 0.7)',
  },
  itemStatusDone: {
    color: '#10B981',
  },
  itemChevron: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.3)',
  },

  // More Items
  moreItems: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 6,
  },
  moreItemsLink: {
    color: 'rgba(94, 234, 212, 0.7)',
    fontSize: 12,
    fontWeight: '500',
  },

  // Encouragement
  encouragement: {
    alignItems: 'center',
    paddingVertical: 24,
    marginTop: 20,
  },
  encouragementTitle: {
    fontSize: 18,
    fontWeight: '300',
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 4,
  },
  encouragementSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.4)',
    fontWeight: '400',
  },
});
