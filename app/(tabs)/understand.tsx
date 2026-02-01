// ============================================================================
// UNDERSTAND PAGE - Insight Hub (3-Layer Hierarchy)
// Layer 1: Insight (dominant) - What your data suggests
// Layer 2: Exploration Tools - How to explore
// Layer 3: Reference - What's on file
//
// DATA STAGES:
// - Early (1-3 days): Orientation, not insight
// - Emerging (4-10 days): Directional signals
// - Established (14+ days): Pattern confidence
// ============================================================================

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme/theme-tokens';
import { getMedications, Medication, getMedicationLogs } from '../../utils/medicationStorage';
import { getUpcomingAppointments, Appointment } from '../../utils/appointmentStorage';
import { getDailyTracking, getDailyTrackingLogs } from '../../utils/dailyTrackingStorage';
import { getLatestVitalsByTypes, getVitalsInRange } from '../../utils/vitalsStorage';
import { getMorningWellness, StoredMorningWellness } from '../../utils/wellnessCheckStorage';
import {
  getTodayMoodLog,
  getTodayMealsLog,
  getTodayVitalsLog,
  getMedicationLogs as getCentralMedLogs,
} from '../../utils/centralStorage';
import {
  getAllBaselines,
  getAllTodayVsBaseline,
  BaselineData,
  TodayVsBaseline,
  getBaselineLanguage,
  MIN_DAYS_FOR_BASELINE,
} from '../../utils/baselineStorage';

// Aurora Components
import { AuroraBackground } from '../../components/aurora/AuroraBackground';
import { GlassCard } from '../../components/aurora/GlassCard';

// Track first use date
const FIRST_USE_KEY = '@embermate_first_use_date';

type DataStage = 'early' | 'emerging' | 'established';

interface DataMetrics {
  daysOfData: number;
  stage: DataStage;
  medAdherenceRate: number;
  medConsistencyStreak: number;
  vitalsLoggedDays: number;
  moodLoggedDays: number;
  mealsLoggedDays: number;
  totalDataPoints: number;
  hasEnoughData: boolean;
}


export default function UnderstandScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [dailyTracking, setDailyTracking] = useState<any>(null);
  const [wellnessCheck, setWellnessCheck] = useState<StoredMorningWellness | null>(null);
  const [latestSystolic, setLatestSystolic] = useState<number | null>(null);
  const [latestDiastolic, setLatestDiastolic] = useState<number | null>(null);
  const [dataMetrics, setDataMetrics] = useState<DataMetrics>({
    daysOfData: 0,
    stage: 'early',
    medAdherenceRate: 0,
    medConsistencyStreak: 0,
    vitalsLoggedDays: 0,
    moodLoggedDays: 0,
    mealsLoggedDays: 0,
    totalDataPoints: 0,
    hasEnoughData: false,
  });
  const [baselineData, setBaselineData] = useState<BaselineData | null>(null);
  const [todayVsBaseline, setTodayVsBaseline] = useState<TodayVsBaseline[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      // Track first use date
      let firstUseDate = await AsyncStorage.getItem(FIRST_USE_KEY);
      if (!firstUseDate) {
        firstUseDate = new Date().toISOString();
        await AsyncStorage.setItem(FIRST_USE_KEY, firstUseDate);
      }

      const daysSinceFirstUse = Math.floor(
        (Date.now() - new Date(firstUseDate).getTime()) / (1000 * 60 * 60 * 24)
      ) + 1; // +1 to include today

      const meds = await getMedications();
      const activeMeds = meds.filter((m) => m.active);
      setMedications(activeMeds);

      const appts = await getUpcomingAppointments();
      setAppointments(appts);

      const today = new Date().toISOString().split('T')[0];
      const tracking = await getDailyTracking(today);
      setDailyTracking(tracking);

      const wellness = await getMorningWellness(today);
      setWellnessCheck(wellness);

      // Load BP vitals
      const latestVitals = await getLatestVitalsByTypes(['systolic', 'diastolic']);
      if (latestVitals.systolic) setLatestSystolic(latestVitals.systolic.value);
      if (latestVitals.diastolic) setLatestDiastolic(latestVitals.diastolic.value);

      // Calculate data metrics
      const metrics = await calculateDataMetrics(daysSinceFirstUse, activeMeds);
      setDataMetrics(metrics);

      // Load baseline data
      const baselines = await getAllBaselines();
      setBaselineData(baselines);

      if (baselines.hasAnyBaseline) {
        const comparisons = await getAllTodayVsBaseline();
        setTodayVsBaseline(comparisons);
      } else {
        setTodayVsBaseline([]);
      }
    } catch (error) {
      console.error('Error loading Understand data:', error);
    }
  };

  const calculateDataMetrics = async (
    daysSinceFirstUse: number,
    activeMeds: Medication[]
  ): Promise<DataMetrics> => {
    // Determine stage
    let stage: DataStage = 'early';
    if (daysSinceFirstUse >= 14) stage = 'established';
    else if (daysSinceFirstUse >= 4) stage = 'emerging';

    // Get historical data for the period
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Math.min(daysSinceFirstUse, 30));
    const startDateStr = startDate.toISOString().split('T')[0];

    // Get tracking logs
    let trackingLogs: any[] = [];
    try {
      trackingLogs = await getDailyTrackingLogs(startDateStr, endDate);
    } catch (e) {
      trackingLogs = [];
    }

    // Calculate medication adherence
    let medAdherenceRate = 100;
    let medConsistencyStreak = 0;
    if (activeMeds.length > 0) {
      try {
        const medLogs = await getMedicationLogs();
        const recentLogs = medLogs.filter(
          log => new Date(log.timestamp) >= startDate
        );
        const expectedDoses = activeMeds.length * daysSinceFirstUse;
        const takenDoses = recentLogs.filter(log => log.taken).length;
        medAdherenceRate = expectedDoses > 0 ? Math.round((takenDoses / expectedDoses) * 100) : 100;

        // Calculate streak (simplified - consecutive days with all meds taken)
        // This would need more complex logic for real streak calculation
        medConsistencyStreak = medAdherenceRate >= 80 ? Math.min(daysSinceFirstUse, 7) : 0;
      } catch (e) {
        medAdherenceRate = 0;
      }
    }

    // Count days with different types of logs
    const vitalsLoggedDays = trackingLogs.filter(t =>
      t.vitals?.systolic || t.vitals?.diastolic || t.vitals?.heartRate
    ).length;
    const moodLoggedDays = trackingLogs.filter(t =>
      t.mood !== null && t.mood !== undefined
    ).length;
    const mealsLoggedDays = trackingLogs.filter(t =>
      t.meals && t.meals.length > 0
    ).length;

    // Total data points
    const totalDataPoints = vitalsLoggedDays + moodLoggedDays + mealsLoggedDays +
      (activeMeds.length > 0 ? daysSinceFirstUse : 0);

    return {
      daysOfData: daysSinceFirstUse,
      stage,
      medAdherenceRate,
      medConsistencyStreak,
      vitalsLoggedDays,
      moodLoggedDays,
      mealsLoggedDays,
      totalDataPoints,
      hasEnoughData: totalDataPoints >= 3,
    };
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  // Generate "What's normal" items based on baselines
  const getWhatsNormal = useMemo((): string[] => {
    if (!baselineData || !baselineData.hasAnyBaseline) return [];

    const items: string[] = [];
    const confident = baselineData.daysOfData >= 5;
    const adverb = confident ? 'typically' : 'usually';

    if (baselineData.meals && baselineData.meals.dailyCount > 0) {
      items.push(`Meals are ${adverb} logged ${baselineData.meals.dailyCount} time${baselineData.meals.dailyCount !== 1 ? 's' : ''} per day`);
    }

    if (baselineData.vitals && baselineData.vitals.dailyCount > 0) {
      items.push(`Vitals are ${adverb} checked ${baselineData.vitals.dailyCount === 1 ? 'once' : baselineData.vitals.dailyCount + ' times'} per day`);
    }

    if (baselineData.meds && baselineData.meds.dailyCount > 0) {
      items.push(`${baselineData.meds.dailyCount} medication${baselineData.meds.dailyCount !== 1 ? 's' : ''} ${adverb} taken daily`);
    }

    return items;
  }, [baselineData]);

  // Generate "What's different today" items
  const getWhatsDifferent = useMemo((): string[] => {
    if (!baselineData || !baselineData.hasAnyBaseline || todayVsBaseline.length === 0) return [];

    const items: string[] = [];

    for (const comparison of todayVsBaseline) {
      if (comparison.belowBaseline && comparison.today === 0) {
        switch (comparison.category) {
          case 'meals':
            items.push("Meals haven't been logged yet today");
            break;
          case 'vitals':
            items.push("Vitals haven't been logged yet today");
            break;
          case 'meds':
            items.push("Medications haven't been logged yet today");
            break;
        }
      } else if (comparison.belowBaseline) {
        switch (comparison.category) {
          case 'meals':
            items.push(`Meals are lower than usual (${comparison.today} of ${comparison.baseline})`);
            break;
          case 'vitals':
            items.push(`Vitals are lower than usual (${comparison.today} of ${comparison.baseline})`);
            break;
          case 'meds':
            items.push(`Fewer medications logged than usual (${comparison.today} of ${comparison.baseline})`);
            break;
        }
      }
    }

    return items;
  }, [baselineData, todayVsBaseline]);

  // Check if baseline is still forming
  const isBaselineForming = useMemo(() => {
    return !baselineData || baselineData.daysOfData < MIN_DAYS_FOR_BASELINE || !baselineData.hasAnyBaseline;
  }, [baselineData]);

  // Calculate stats
  const totalMeds = medications.length;

  // Exploration tools (Layer 2)
  const EXPLORATION_TOOLS = [
    {
      id: 'insights',
      icon: '🧠',
      title: 'Insights & Correlations',
      subtitle: 'Pattern discovery',
      route: '/correlation-report',
    },
    {
      id: 'trends',
      icon: '📈',
      title: 'Trends',
      subtitle: 'Time-based understanding',
      route: '/vitals',
    },
    {
      id: 'reports',
      icon: '📋',
      title: 'Reports',
      subtitle: 'Export & share',
      route: '/hub/reports',
    },
  ];

  // Reference items (Layer 3 - demoted)
  const REFERENCE_ITEMS = [
    {
      id: 'medications',
      icon: '💊',
      title: 'Medications',
      route: '/medications',
    },
    {
      id: 'appointments',
      icon: '📅',
      title: 'Appointments',
      route: '/appointments',
    },
    {
      id: 'contacts',
      icon: '📞',
      title: 'Emergency contacts',
      route: '/emergency',
    },
  ];

  // Get card style based on baseline status
  const getInsightCardStyle = () => {
    if (isBaselineForming) {
      return styles.insightCardEarly;
    }
    if (getWhatsDifferent.length > 0) {
      return styles.insightCardEmerging; // Amber for differences
    }
    return styles.insightCardEstablished; // Teal for normal
  };

  return (
    <View style={styles.container}>
      <AuroraBackground variant="hub" />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.accent}
            />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>Understand</Text>
              <Text style={styles.headerSubtitle}>What your data suggests</Text>
            </View>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => router.push('/settings')}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Settings"
            >
              <Text style={styles.settingsIcon}>⚙️</Text>
            </TouchableOpacity>
          </View>

          {/* Layer 1: Insight Card (Dominant) */}
          <View style={[styles.insightCard, getInsightCardStyle()]}>
            {/* Gradient background - warm purple, deeper on left */}
            <LinearGradient
              colors={[
                'rgba(126, 34, 206, 0.25)',    // Deep purple (left)
                'rgba(168, 85, 247, 0.18)',    // Medium purple
                'rgba(192, 132, 252, 0.12)',   // Light purple (right)
              ]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.insightCardGradient}
            />
            <View style={styles.insightContent}>
              {/* Baseline forming state */}
              {isBaselineForming ? (
                <>
                  <Text style={styles.insightSectionTitle}>Building your routine</Text>
                  <Text style={styles.insightSubText}>
                    We're learning what a typical day looks like. Insights will improve as more data is recorded.
                  </Text>
                  {baselineData && baselineData.daysOfData > 0 && (
                    <View style={styles.dataContextBadge}>
                      <Text style={styles.dataContextText}>
                        Day {baselineData.daysOfData} of tracking
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                <>
                  {/* Section 1: What's normal */}
                  {getWhatsNormal.length > 0 && (
                    <View style={styles.insightSection}>
                      <Text style={styles.insightSectionTitle}>What's normal</Text>
                      {getWhatsNormal.map((item, index) => (
                        <Text key={index} style={styles.insightBullet}>• {item}</Text>
                      ))}
                    </View>
                  )}

                  {/* Section 2: What's different (only if true) */}
                  {getWhatsDifferent.length > 0 && (
                    <View style={styles.insightSection}>
                      <Text style={styles.insightSectionTitleDifferent}>What's different today</Text>
                      {getWhatsDifferent.map((item, index) => (
                        <Text key={index} style={styles.insightBulletDifferent}>• {item}</Text>
                      ))}
                    </View>
                  )}

                  {/* If nothing different, just show normal - no invented insight */}
                  {getWhatsDifferent.length === 0 && getWhatsNormal.length > 0 && (
                    <View style={styles.dataContextBadge}>
                      <Text style={styles.dataContextText}>
                        Based on {baselineData?.daysOfData || 0} days of data
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>
          </View>

          {/* Layer 2: Exploration Tools */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>EXPLORE YOUR DATA</Text>
            <View style={styles.toolsContainer}>
              {EXPLORATION_TOOLS.map((tool) => (
                <TouchableOpacity
                  key={tool.id}
                  onPress={() => router.push(tool.route as any)}
                  activeOpacity={0.7}
                >
                  <GlassCard style={styles.toolCard}>
                    <View style={styles.toolContent}>
                      <View style={styles.toolIcon}>
                        <Text style={styles.toolIconText}>{tool.icon}</Text>
                      </View>
                      <View style={styles.toolText}>
                        <Text style={styles.toolTitle}>{tool.title}</Text>
                        <Text style={styles.toolSubtitle}>{tool.subtitle}</Text>
                      </View>
                      <Text style={styles.chevron}>›</Text>
                    </View>
                  </GlassCard>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Layer 3: Reference (Demoted) */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>RECORDS & REFERENCE</Text>
            <View style={styles.referenceContainer}>
              {REFERENCE_ITEMS.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => router.push(item.route as any)}
                  activeOpacity={0.7}
                >
                  <GlassCard style={styles.referenceCard}>
                    <View style={styles.referenceContent}>
                      <View style={styles.referenceIcon}>
                        <Text style={styles.referenceIconText}>{item.icon}</Text>
                      </View>
                      <Text style={styles.referenceTitle}>{item.title}</Text>
                      <Text style={styles.referenceChevron}>›</Text>
                    </View>
                  </GlassCard>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Bottom spacing */}
          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.xl,
  },

  // Header
  header: {
    paddingTop: 60,
    paddingHorizontal: 0,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '300',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 0.3,
  },
  settingsButton: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 16,
  },
  settingsIcon: {
    fontSize: 24,
  },

  // Layer 1: Insight Card (Dominant)
  insightCard: {
    marginBottom: 28,
    borderWidth: 1.5,
    padding: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  insightCardEarly: {
    backgroundColor: 'transparent', // Use gradient
    borderColor: 'rgba(168, 85, 247, 0.4)',
  },
  insightCardEmerging: {
    backgroundColor: 'transparent', // Use gradient
    borderColor: 'rgba(168, 85, 247, 0.4)',
  },
  insightCardEstablished: {
    backgroundColor: 'transparent', // Use gradient
    borderColor: 'rgba(168, 85, 247, 0.4)',
  },
  insightCardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 1,
  },
  insightContent: {
    gap: 14,
  },
  insightSection: {
    gap: 6,
  },
  insightSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  insightSectionTitleDifferent: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(251, 191, 36, 0.95)',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  insightBullet: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.75)',
    lineHeight: 21,
    paddingLeft: 4,
  },
  insightBulletDifferent: {
    fontSize: 14,
    color: 'rgba(251, 191, 36, 0.85)',
    lineHeight: 21,
    paddingLeft: 4,
  },
  dataContextBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    marginTop: 6,
  },
  dataContextText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.65)',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  insightSubText: {
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.75)',
    lineHeight: 20,
  },

  // Sections
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 12,
    paddingHorizontal: 4,
  },

  // Layer 2: Exploration Tools (More prominent with teal accent)
  toolsContainer: {
    gap: 10,
  },
  toolCard: {
    padding: 14,
    backgroundColor: 'rgba(94, 234, 212, 0.08)',
    borderColor: 'rgba(94, 234, 212, 0.2)',
    borderWidth: 1,
    borderLeftWidth: 3,
    borderLeftColor: 'rgba(94, 234, 212, 0.5)',
  },
  toolContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toolIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(94, 234, 212, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolIconText: {
    fontSize: 20,
    textAlign: 'center',
  },
  toolText: {
    flex: 1,
    justifyContent: 'center',
  },
  toolTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    letterSpacing: 0.2,
  },
  toolSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
  },
  chevron: {
    fontSize: 18,
    color: 'rgba(94, 234, 212, 0.6)',
    fontWeight: '600',
  },

  // Layer 3: Reference (Subtle with minimal borders)
  referenceContainer: {
    gap: 8,
  },
  referenceCard: {
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderRadius: 12,
  },
  referenceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  referenceIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  referenceIconText: {
    fontSize: 16,
    opacity: 0.7,
  },
  referenceTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.75)',
  },
  referenceChevron: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.4)',
  },
});
