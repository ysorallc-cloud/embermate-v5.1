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

interface StageInsight {
  mainText: string;
  subText: string;
  dataContext: string;
  tone: 'educational' | 'observational' | 'confident';
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

  // Calculate stats
  const totalMeds = medications.length;
  const takenMeds = medications.filter((m) => m.taken).length;
  const adherencePercent = totalMeds > 0 ? Math.round((takenMeds / totalMeds) * 100) : 100;

  // Generate stage-appropriate insight
  const stageInsight = useMemo((): StageInsight => {
    const { stage, daysOfData, medAdherenceRate, vitalsLoggedDays, moodLoggedDays, totalDataPoints } = dataMetrics;

    // EARLY STAGE (Day 1-3): Orientation, not insight
    if (stage === 'early') {
      if (totalDataPoints === 0) {
        return {
          mainText: "We're ready to start building your baseline.",
          subText: "Log medications, vitals, or mood to begin seeing patterns. Even small check-ins help build the picture.",
          dataContext: `Day ${daysOfData} of tracking`,
          tone: 'educational',
        };
      }

      const logged: string[] = [];
      if (medAdherenceRate > 0) logged.push('medications');
      if (vitalsLoggedDays > 0) logged.push('vitals');
      if (moodLoggedDays > 0) logged.push('mood');

      return {
        mainText: "Building your personal baseline.",
        subText: logged.length > 0
          ? `${logged.join(' and ')} tracking started. Pattern detection improves with each day of data.`
          : "Insights will appear as you log more data. We need a few days to identify meaningful patterns.",
        dataContext: `Based on ${daysOfData} day${daysOfData > 1 ? 's' : ''} of data`,
        tone: 'educational',
      };
    }

    // EMERGING STAGE (Day 4-10): Directional signals
    if (stage === 'emerging') {
      const observations: string[] = [];

      // Medication observations (use soft language)
      if (totalMeds > 0) {
        if (medAdherenceRate >= 80) {
          observations.push('Medication tracking tends to be consistent so far');
        } else if (medAdherenceRate >= 50) {
          observations.push('Medication adherence may be worth watching');
        } else {
          observations.push('Medication gaps are appearing — this may affect patterns');
        }
      }

      // Vitals observations
      if (vitalsLoggedDays >= 3 && latestSystolic && latestDiastolic) {
        if (latestSystolic <= 130 && latestDiastolic <= 85) {
          observations.push('Vitals appear stable so far');
        } else {
          observations.push('Blood pressure seems elevated — worth monitoring');
        }
      }

      // Mood observations
      if (moodLoggedDays >= 3) {
        observations.push('Mood data is building — patterns may emerge soon');
      }

      if (observations.length === 0) {
        return {
          mainText: "Patterns are starting to form.",
          subText: "Continue logging to unlock directional insights. We're looking for trends in your data.",
          dataContext: `Based on ${daysOfData} days of data`,
          tone: 'observational',
        };
      }

      return {
        mainText: observations[0] + '.',
        subText: observations.length > 1
          ? observations.slice(1).join('. ') + '.'
          : "More data will strengthen these early observations.",
        dataContext: `Based on ${daysOfData} days of data`,
        tone: 'observational',
      };
    }

    // ESTABLISHED STAGE (14+ days): Pattern confidence
    const patterns: string[] = [];
    const concerns: string[] = [];

    // Medication patterns (confident language)
    if (totalMeds > 0) {
      if (medAdherenceRate >= 90) {
        patterns.push('Consistent medication adherence correlates with steadier overall patterns');
      } else if (medAdherenceRate >= 70) {
        patterns.push('Medication adherence is moderate — consistency may improve outcomes');
      } else {
        concerns.push('review medication schedule — gaps may be affecting your health patterns');
      }
    }

    // Vitals patterns
    if (vitalsLoggedDays >= 7 && latestSystolic && latestDiastolic) {
      if (latestSystolic <= 120 && latestDiastolic <= 80) {
        patterns.push('Blood pressure remains in healthy range');
      } else if (latestSystolic <= 130 && latestDiastolic <= 85) {
        patterns.push('Blood pressure is slightly elevated but stable');
      } else {
        concerns.push('blood pressure trends warrant attention');
      }
    }

    // Mood-sleep correlation (would need actual correlation data)
    if (moodLoggedDays >= 7) {
      patterns.push('Mood tracking provides baseline for correlation detection');
    }

    if (patterns.length === 0 && concerns.length === 0) {
      return {
        mainText: "Data collection is strong.",
        subText: "Continue logging to maintain pattern visibility. Your consistency helps identify meaningful changes.",
        dataContext: `Based on ${daysOfData} days of data`,
        tone: 'confident',
      };
    }

    const mainText = patterns.length > 0 ? patterns[0] + '.' : 'Some areas need attention.';
    let subText = '';
    if (patterns.length > 1) {
      subText = patterns.slice(1).join('. ') + '.';
    }
    if (concerns.length > 0) {
      subText += (subText ? ' ' : '') + `Consider: ${concerns[0]}.`;
    }

    return {
      mainText,
      subText: subText || 'Your tracking consistency enables reliable pattern detection.',
      dataContext: `Based on ${daysOfData} days of data`,
      tone: 'confident',
    };
  }, [dataMetrics, totalMeds, takenMeds, latestSystolic, latestDiastolic]);

  // Generate score based on data quality and health indicators
  const healthScore = useMemo(() => {
    const { stage, medAdherenceRate, vitalsLoggedDays, moodLoggedDays, totalDataPoints } = dataMetrics;

    if (stage === 'early' || totalDataPoints < 3) {
      return null; // Don't show score in early stage
    }

    let score = 50; // Base score

    // Medication component
    if (totalMeds > 0) {
      score += (medAdherenceRate / 100) * 25;
    } else {
      score += 25; // No penalty if no meds
    }

    // Vitals component
    if (latestSystolic && latestDiastolic) {
      const bpScore = Math.max(0, 100 - Math.abs(120 - latestSystolic) - Math.abs(80 - latestDiastolic));
      score += (bpScore / 100) * 15;
    }

    // Data consistency component
    const consistencyScore = Math.min(100, (totalDataPoints / 20) * 100);
    score += (consistencyScore / 100) * 10;

    return Math.round(Math.min(100, score));
  }, [dataMetrics, totalMeds, latestSystolic, latestDiastolic]);

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

  // Get card style based on stage
  const getInsightCardStyle = () => {
    switch (dataMetrics.stage) {
      case 'early':
        return styles.insightCardEarly;
      case 'emerging':
        return styles.insightCardEmerging;
      case 'established':
        return styles.insightCardEstablished;
      default:
        return {};
    }
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
          <GlassCard style={[styles.insightCard, getInsightCardStyle()]}>
            <View style={styles.insightContent}>
              {/* Data context badge */}
              <View style={styles.dataContextBadge}>
                <Text style={styles.dataContextText}>{stageInsight.dataContext}</Text>
              </View>

              {/* Insight text FIRST - dominant */}
              <Text style={styles.insightMainText}>{stageInsight.mainText}</Text>
              {stageInsight.subText ? (
                <Text style={styles.insightSubText}>{stageInsight.subText}</Text>
              ) : null}

              {/* Score row - only show for emerging/established */}
              {healthScore !== null && (
                <View style={styles.scoreRow}>
                  <Text style={styles.scoreNumber}>{healthScore}</Text>
                  <View style={styles.trendContainer}>
                    <Text style={styles.trendArrow}>
                      {healthScore >= 70 ? '↑' : healthScore >= 50 ? '→' : '↓'}
                    </Text>
                    <Text style={styles.trendText}>
                      {dataMetrics.stage === 'emerging' ? 'Building baseline' :
                       healthScore >= 70 ? 'Positive trend' :
                       healthScore >= 50 ? 'Stable' : 'Needs attention'}
                    </Text>
                  </View>
                </View>
              )}

              {/* Improvement hint for early stage */}
              {dataMetrics.stage === 'early' && (
                <Text style={styles.improvementHint}>
                  Insights improve as more data is recorded.
                </Text>
              )}
            </View>
          </GlassCard>

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
    marginBottom: Spacing.xl,
    borderWidth: 1,
    padding: 16,
  },
  insightCardEarly: {
    backgroundColor: 'rgba(148, 163, 184, 0.08)', // Slate/gray - educational
    borderColor: 'rgba(148, 163, 184, 0.25)',
  },
  insightCardEmerging: {
    backgroundColor: 'rgba(251, 191, 36, 0.08)', // Amber - observational
    borderColor: 'rgba(251, 191, 36, 0.25)',
  },
  insightCardEstablished: {
    backgroundColor: 'rgba(94, 234, 212, 0.08)', // Teal - confident
    borderColor: 'rgba(94, 234, 212, 0.25)',
  },
  insightContent: {
    gap: 8,
  },
  dataContextBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  dataContextText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
  },
  insightMainText: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.95)',
    lineHeight: 22,
  },
  insightSubText: {
    fontSize: 13,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 19,
  },
  improvementHint: {
    fontSize: 12,
    fontStyle: 'italic',
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 8,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 10,
  },
  scoreNumber: {
    fontSize: 24,
    fontWeight: '300',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendArrow: {
    fontSize: 14,
    color: Colors.accent,
  },
  trendText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
  },

  // Sections
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingHorizontal: 4,
  },

  // Layer 2: Exploration Tools
  toolsContainer: {
    gap: 6,
  },
  toolCard: {
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  toolContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  toolIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(94, 234, 212, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolIconText: {
    fontSize: 18,
    textAlign: 'center',
  },
  toolText: {
    flex: 1,
    justifyContent: 'center',
  },
  toolTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  toolSubtitle: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  chevron: {
    fontSize: 14,
    color: Colors.textMuted,
  },

  // Layer 3: Reference (Demoted)
  referenceContainer: {
    gap: 4,
  },
  referenceCard: {
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  referenceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  referenceIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  referenceIconText: {
    fontSize: 14,
    opacity: 0.6,
  },
  referenceTitle: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  referenceChevron: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
  },
});
