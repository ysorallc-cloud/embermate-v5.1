// ============================================================================
// UNDERSTAND PAGE - Insight Hub (3-Layer Hierarchy)
// Layer 1: Insight (dominant) - What your data suggests
// Layer 2: Exploration Tools - How to explore
// Layer 3: Reference - What's on file
// ============================================================================

import React, { useState, useCallback, useMemo } from 'react';
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
import { Colors, Spacing, Typography, BorderRadius } from '../../theme/theme-tokens';
import { getMedications, Medication } from '../../utils/medicationStorage';
import { getUpcomingAppointments, Appointment } from '../../utils/appointmentStorage';
import { getDailyTracking } from '../../utils/dailyTrackingStorage';
import { getLatestVitalsByTypes } from '../../utils/vitalsStorage';
import { getMorningWellness, StoredMorningWellness } from '../../utils/wellnessCheckStorage';

// Aurora Components
import { AuroraBackground } from '../../components/aurora/AuroraBackground';
import { GlassCard } from '../../components/aurora/GlassCard';

export default function UnderstandScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [dailyTracking, setDailyTracking] = useState<any>(null);
  const [wellnessCheck, setWellnessCheck] = useState<StoredMorningWellness | null>(null);
  const [latestSystolic, setLatestSystolic] = useState<number | null>(null);
  const [latestDiastolic, setLatestDiastolic] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      const meds = await getMedications();
      setMedications(meds.filter((m) => m.active));

      const appts = await getUpcomingAppointments();
      setAppointments(appts);

      const today = new Date().toISOString().split('T')[0];
      const tracking = await getDailyTracking(today);
      setDailyTracking(tracking);

      const wellness = await getMorningWellness(today);
      setWellnessCheck(wellness);

      // Load BP vitals
      const latestVitals = await getLatestVitalsByTypes(['systolic', 'diastolic']);

      if (latestVitals.systolic) {
        setLatestSystolic(latestVitals.systolic.value);
      }

      if (latestVitals.diastolic) {
        setLatestDiastolic(latestVitals.diastolic.value);
      }
    } catch (error) {
      console.error('Error loading Understand data:', error);
    }
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

  // Calculate health score and generate insight
  const insightData = useMemo(() => {
    let score = 0;
    let factorCount = 0;
    const insights: string[] = [];
    const concerns: string[] = [];

    // Medication adherence (30%)
    if (totalMeds > 0) {
      score += adherencePercent * 0.3;
      factorCount++;
      if (adherencePercent >= 80) {
        insights.push('Medication adherence improving steadily');
      } else if (adherencePercent < 60) {
        concerns.push('medication adherence needs attention');
      }
    }

    // Mood score (30%)
    const moodMap: { [key: string]: number } = { 'struggling': 20, 'difficult': 40, 'managing': 60, 'good': 80, 'great': 100 };
    if (wellnessCheck?.mood) {
      const moodScore = moodMap[wellnessCheck.mood];
      score += moodScore * 0.3;
      factorCount++;
      if (moodScore >= 80) {
        insights.push('Mood consistency improving');
      } else if (moodScore < 50) {
        concerns.push('mood has been lower');
      }
    }

    // BP (20%)
    if (latestSystolic && latestDiastolic) {
      const bpScore = Math.max(0, 100 - Math.abs(120 - latestSystolic) - Math.abs(80 - latestDiastolic));
      score += bpScore * 0.2;
      factorCount++;
      if (bpScore >= 70) {
        insights.push('Vitals stable');
      } else {
        concerns.push('blood pressure needs monitoring');
      }
    }

    // Energy level (20%)
    if (wellnessCheck?.energyLevel) {
      const energyScore = (wellnessCheck.energyLevel / 5) * 100;
      score += energyScore * 0.2;
      factorCount++;
      if (energyScore >= 60) {
        insights.push('Energy levels holding steady');
      } else {
        concerns.push('energy shows declining trend');
      }
    }

    const finalScore = factorCount > 0 ? Math.round(score) : 75;

    // Generate main insight text
    let insightText = '';
    let subText = '';

    if (insights.length === 0 && concerns.length === 0) {
      insightText = 'Start tracking to see insights here.';
      subText = 'Even small check-ins help build the picture.';
    } else if (insights.length > 0 && concerns.length === 0) {
      insightText = insights[0] + '.';
      if (insights.length > 1) {
        subText = insights.slice(1).join('. ') + '.';
      } else {
        subText = 'Overall trends looking positive.';
      }
    } else if (insights.length > 0 && concerns.length > 0) {
      insightText = insights[0] + '.';
      subText = concerns.length > 0 ? `However, ${concerns[0]}.` : '';
    } else {
      insightText = 'Some areas need attention.';
      subText = concerns[0] ? `Notably, ${concerns[0]}.` : '';
    }

    // Trend direction
    let trendDirection = '→';
    let trendText = 'Stable this month';
    if (finalScore >= 80) {
      trendDirection = '↑';
      trendText = 'Improvement this month';
    } else if (finalScore < 50) {
      trendDirection = '↓';
      trendText = 'Needs attention';
    }

    return {
      score: finalScore,
      insightText,
      subText,
      trendDirection,
      trendText,
      trackedCount: factorCount,
    };
  }, [totalMeds, adherencePercent, wellnessCheck, latestSystolic, latestDiastolic]);

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
          <GlassCard style={styles.insightCard}>
            <View style={styles.insightContent}>
              {/* Insight text FIRST - dominant */}
              <Text style={styles.insightMainText}>{insightData.insightText}</Text>
              {insightData.subText ? (
                <Text style={styles.insightSubText}>{insightData.subText}</Text>
              ) : null}

              {/* Score secondary - at bottom */}
              <View style={styles.scoreRow}>
                <Text style={styles.scoreNumber}>{insightData.score}</Text>
                <View style={styles.trendContainer}>
                  <Text style={styles.trendArrow}>{insightData.trendDirection}</Text>
                  <Text style={styles.trendText}>{insightData.trendText}</Text>
                </View>
              </View>
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
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
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
    marginBottom: Spacing.xxl,
    backgroundColor: 'rgba(94, 234, 212, 0.08)',
    borderColor: 'rgba(94, 234, 212, 0.25)',
    borderWidth: 1,
    padding: 20,
  },
  insightContent: {
    gap: 12,
  },
  insightMainText: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 22,
  },
  insightSubText: {
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.65)',
    lineHeight: 20,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 12,
  },
  scoreNumber: {
    fontSize: 28,
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
    marginBottom: Spacing.xxl,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
    paddingHorizontal: 4,
  },

  // Layer 2: Exploration Tools
  toolsContainer: {
    gap: 8,
  },
  toolCard: {
    padding: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  toolContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  toolIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(94, 234, 212, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolIconText: {
    fontSize: 22,
    textAlign: 'center',
  },
  toolText: {
    flex: 1,
    justifyContent: 'center',
  },
  toolTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  toolSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  chevron: {
    fontSize: 16,
    color: Colors.textMuted,
  },

  // Layer 3: Reference (Demoted)
  referenceContainer: {
    gap: 6,
  },
  referenceCard: {
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  referenceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  referenceIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  referenceIconText: {
    fontSize: 18,
    opacity: 0.6,
  },
  referenceTitle: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  referenceChevron: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.4)',
  },
});
