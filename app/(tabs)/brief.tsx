// ============================================================================
// HUB PAGE - Aurora Redesign
// Care Brief: Narrative summary + Health tracking hub
// ============================================================================

import React, { useState, useCallback } from 'react';
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
import { Colors, Spacing, Typography, BorderRadius } from '../_theme/theme-tokens';
import { getMedications, Medication } from '../../utils/medicationStorage';
import { getUpcomingAppointments, Appointment } from '../../utils/appointmentStorage';
import { getDailyTracking } from '../../utils/dailyTrackingStorage';
import { getVitalsByType } from '../../utils/vitalsStorage';
import { getMorningWellness, StoredMorningWellness } from '../../utils/wellnessCheckStorage';

// Aurora Components
import { AuroraBackground } from '../../components/aurora/AuroraBackground';
import { GlassCard } from '../../components/aurora/GlassCard';
import { SectionHeader } from '../../components/aurora/SectionHeader';

export default function HubScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [dailyTracking, setDailyTracking] = useState<any>(null);
  const [wellnessCheck, setWellnessCheck] = useState<StoredMorningWellness | null>(null);
  const [latestSystolic, setLatestSystolic] = useState<number | null>(null);
  const [latestDiastolic, setLatestDiastolic] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());

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

      const systolicReadings = await getVitalsByType('systolic');
      const diastolicReadings = await getVitalsByType('diastolic');

      if (systolicReadings.length > 0) {
        setLatestSystolic(systolicReadings[0].value);
      }

      if (diastolicReadings.length > 0) {
        setLatestDiastolic(diastolicReadings[0].value);
      }

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading Hub data:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  // Generate narrative summary
  const generateNarrative = () => {
    const moodMap = { 'struggling': 2, 'difficult': 4, 'managing': 5, 'good': 7, 'great': 9 };
    const mood = wellnessCheck?.mood ? moodMap[wellnessCheck.mood] : null;
    const energy = wellnessCheck?.energyLevel || null;
    const pain = dailyTracking?.pain;

    if (!mood && !energy && !pain) {
      return "Start logging to see Mom's story unfold here. Even small check-ins help build the picture.";
    }

    let narrative = "Mom's having a ";

    if (mood && energy && pain !== null) {
      if (mood >= 7 && energy >= 4 && pain <= 3) {
        narrative += "good day. ";
      } else if (mood >= 5 && energy >= 3 && pain <= 5) {
        narrative += "steady day. ";
      } else {
        narrative += "harder stretch. ";
      }
    } else {
      narrative += "steady day. ";
    }

    if (mood) {
      if (mood >= 7) {
        narrative += "Mood is positive and she's been upbeat. ";
      } else if (mood >= 5) {
        narrative += "Mood is stable and she's been calm. ";
      } else if (mood >= 3) {
        narrative += "Mood has been low and she seems quieter. ";
      } else {
        narrative += "She's been struggling and may need extra support. ";
      }
    }

    if (energy) {
      if (energy >= 4) {
        narrative += "Energy is strong today. ";
      } else if (energy >= 3) {
        narrative += "Energy is at a good level. ";
      } else if (energy >= 2) {
        narrative += "Energy is lower than usual. ";
      } else {
        narrative += "Energy is very low — prioritize rest. ";
      }
    }

    if (pain !== null && pain !== undefined) {
      if (pain === 0) {
        narrative += "No pain reported.";
      } else if (pain <= 3) {
        narrative += `Pain is minimal at ${pain}/10.`;
      } else if (pain <= 5) {
        narrative += `Pain at ${pain}/10 — manageable but present.`;
      } else {
        narrative += `Pain at ${pain}/10 — worth discussing.`;
      }
    }

    return narrative;
  };

  const generateApproach = () => {
    const moodMap = { 'struggling': 2, 'difficult': 4, 'managing': 5, 'good': 7, 'great': 9 };
    const mood = wellnessCheck?.mood ? moodMap[wellnessCheck.mood] : null;
    const energy = wellnessCheck?.energyLevel || null;
    const pain = dailyTracking?.pain;

    let approach = "";

    if (energy !== null && energy < 3) {
      approach += "Since energy is low, keep requests small today. ";
    }

    if (pain !== null && pain >= 5) {
      approach += "Ask about pain before meals — note if it's affecting appetite. ";
    }

    if (mood !== null && mood < 5) {
      approach += "If she seems restless, quiet company may be better. ";
    }

    if (energy !== null && pain !== null && mood !== null && energy >= 4 && pain <= 3 && mood >= 7) {
      approach += "This is a good day — maybe a short outing or favorite activity. ";
    }

    return approach || "Be present and attentive. Small gestures of comfort go a long way.";
  };

  // Calculate stats
  const totalMeds = medications.length;
  const takenMeds = medications.filter((m) => m.taken).length;
  const adherencePercent = totalMeds > 0 ? Math.round((takenMeds / totalMeds) * 100) : 100;

  const upcomingAppts = appointments.slice(0, 3);

  // Health tracking categories
  const healthCategories = [
    {
      title: 'Health Tracking',
      items: [
        {
          icon: '💊',
          label: 'Medications',
          value: `${totalMeds} active`,
          color: Colors.amber,
          route: '/medications',
        },
        {
          icon: '❤️',
          label: 'Vitals',
          value: latestSystolic ? `${latestSystolic}/${latestDiastolic}` : 'Not logged',
          color: Colors.rose,
          route: '/vitals',
        },
        {
          icon: '🩺',
          label: 'Symptoms',
          value: 'Log & track',
          color: Colors.purple,
          route: '/symptoms',
        },
      ],
    },
    {
      title: 'Reports & Insights',
      items: [
        {
          icon: '📊',
          label: 'Weekly Summary',
          value: 'View trends',
          color: Colors.purple,
          route: '/care-summary-export',
        },
        {
          icon: '🔍',
          label: 'Patterns',
          value: 'AI insights',
          color: Colors.amber,
          route: '/correlation-report',
        },
        {
          icon: '📈',
          label: 'Trends',
          value: 'Historical data',
          color: Colors.green,
          route: '/vitals',
        },
      ],
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
            <View>
              <Text style={styles.headerLabel}>CARE HUB</Text>
              <Text style={styles.headerTitle}>Mom's Story</Text>
            </View>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => router.push('/settings')}
            >
              <Text style={styles.settingsIcon}>⚙️</Text>
            </TouchableOpacity>
          </View>

          {/* Narrative Summary */}
          <GlassCard style={styles.narrativeCard}>
            <Text style={styles.narrativeText}>{generateNarrative()}</Text>
          </GlassCard>

          {/* Quick Stats */}
          <View style={styles.statsRow}>
            {[
              { label: 'Adherence', value: `${adherencePercent}%`, icon: '💊', color: Colors.green },
              { label: 'BP', value: latestSystolic ? `${latestSystolic}/${latestDiastolic}` : '--', icon: '❤️', color: Colors.rose },
              { label: 'Mood', value: wellnessCheck?.mood ? wellnessCheck.mood.charAt(0).toUpperCase() + wellnessCheck.mood.slice(1, 4) : '--', icon: '😊', color: Colors.purple },
            ].map((stat, i) => (
              <GlassCard key={i} style={styles.statCard} padding={16}>
                <Text style={styles.statIcon}>{stat.icon}</Text>
                <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </GlassCard>
            ))}
          </View>

          {/* V3: Reports Hub Link */}
          <TouchableOpacity
            style={styles.reportsHubButton}
            onPress={() => router.push('/hub/reports')}
            activeOpacity={0.7}
          >
            <GlassCard style={styles.reportsHubCard}>
              <View style={styles.reportsHubContent}>
                <View style={styles.reportsHubIcon}>
                  <Text style={styles.reportsHubIconText}>📊</Text>
                </View>
                <View style={styles.reportsHubText}>
                  <Text style={styles.reportsHubTitle}>Reports & Insights</Text>
                  <Text style={styles.reportsHubSubtitle}>8 reports · 6 patterns discovered</Text>
                </View>
                <Text style={styles.reportsHubArrow}>›</Text>
              </View>
            </GlassCard>
          </TouchableOpacity>

          {/* Suggested Approach */}
          <View style={styles.section}>
            <SectionHeader title="Suggested Approach" />
            <GlassCard>
              <View style={styles.approachContent}>
                <Text style={styles.approachText}>{generateApproach()}</Text>
              </View>
            </GlassCard>
          </View>

          {/* Upcoming Appointments */}
          {upcomingAppts.length > 0 && (
            <View style={styles.section}>
              <SectionHeader
                title="Coming Up"
                action={{
                  label: '+ Add',
                  onPress: () => router.push('/appointment-form'),
                }}
              />

              <GlassCard noPadding>
                {upcomingAppts.map((appt, i) => {
                  const apptDate = new Date(appt.date);
                  const isToday = apptDate.toDateString() === new Date().toDateString();
                  const isTomorrow = apptDate.toDateString() === new Date(Date.now() + 86400000).toDateString();

                  let dateLabel = apptDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
                  if (isToday) dateLabel = 'Today';
                  if (isTomorrow) dateLabel = 'Tomorrow';

                  const icon = appt.specialty?.toLowerCase().includes('telehealth') ? '📱' : '🏥';

                  return (
                    <TouchableOpacity
                      key={i}
                      style={[
                        styles.appointmentItem,
                        i < upcomingAppts.length - 1 && styles.appointmentItemBorder,
                      ]}
                      onPress={() => router.push('/appointments')}
                      activeOpacity={0.7}
                    >
                      <View style={[
                        styles.apptIcon,
                        { backgroundColor: icon === '📱' ? Colors.skyLight : Colors.amberLight },
                      ]}>
                        <Text style={styles.apptIconText}>{icon}</Text>
                      </View>
                      <View style={styles.apptContent}>
                        <Text style={styles.apptTitle}>{appt.specialty || 'Appointment'}</Text>
                        <Text style={styles.apptDetail}>
                          {dateLabel}{appt.time ? `, ${appt.time}` : ''} • {appt.provider}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </GlassCard>
            </View>
          )}

          {/* Health Categories */}
          {healthCategories.map((category, ci) => (
            <View key={ci} style={styles.section}>
              <SectionHeader title={category.title} />

              <GlassCard noPadding>
                {category.items.map((item, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.categoryItem,
                      i < category.items.length - 1 && styles.categoryItemBorder,
                    ]}
                    onPress={() => router.push(item.route as any)}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.categoryIcon,
                      { backgroundColor: `${item.color}15` },
                    ]}>
                      <Text style={styles.categoryIconText}>{item.icon}</Text>
                    </View>
                    <View style={styles.categoryContent}>
                      <Text style={styles.categoryLabel}>{item.label}</Text>
                      <Text style={styles.categoryValue}>{item.value}</Text>
                    </View>
                    <Text style={styles.categoryArrow}>›</Text>
                  </TouchableOpacity>
                ))}
              </GlassCard>
            </View>
          ))}

          {/* Quick Reference */}
          <View style={styles.section}>
            <SectionHeader title="Quick Reference" />
            <View style={styles.quickRefRow}>
              {[
                { icon: '💊', label: 'Medications', route: '/medications' },
                { icon: '📞', label: 'Contacts', route: '/settings' },
                { icon: '📊', label: 'History', route: '/care-summary-export' },
              ].map((item, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.quickRefButton}
                  onPress={() => router.push(item.route as any)}
                  activeOpacity={0.7}
                >
                  <GlassCard style={styles.quickRefCard} padding={16}>
                    <Text style={styles.quickRefIcon}>{item.icon}</Text>
                    <Text style={styles.quickRefLabel}>{item.label}</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xxl,
  },
  headerLabel: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  headerTitle: {
    ...Typography.displayMedium,
    color: Colors.textPrimary,
  },
  settingsButton: {
    padding: Spacing.sm,
  },
  settingsIcon: {
    fontSize: 20,
  },

  // Narrative
  narrativeCard: {
    marginBottom: Spacing.xxl,
  },
  narrativeText: {
    ...Typography.body,
    color: Colors.textPrimary,
    lineHeight: 24,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xxl,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 20,
    marginBottom: Spacing.xs,
  },
  statValue: {
    ...Typography.h2,
    fontWeight: '600',
  },
  statLabel: {
    ...Typography.captionSmall,
    color: Colors.textMuted,
  },

  // Sections
  section: {
    marginBottom: Spacing.xxl,
  },

  // V3: Reports Hub
  reportsHubButton: {
    marginBottom: Spacing.xxl,
  },
  reportsHubCard: {
    backgroundColor: `${Colors.purple}10`,
    borderColor: `${Colors.purple}30`,
  },
  reportsHubContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  reportsHubIcon: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportsHubIconText: {
    fontSize: 28,
  },
  reportsHubText: {
    flex: 1,
  },
  reportsHubTitle: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '500',
    marginBottom: 2,
  },
  reportsHubSubtitle: {
    ...Typography.bodySmall,
    color: Colors.purple,
  },
  reportsHubArrow: {
    fontSize: 20,
    color: Colors.purple,
  },

  // Approach
  approachContent: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.accent,
    paddingLeft: Spacing.lg,
  },
  approachText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    lineHeight: 22,
  },

  // Appointments
  appointmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  appointmentItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  apptIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  apptIconText: {
    fontSize: 22,
  },
  apptContent: {
    flex: 1,
  },
  apptTitle: {
    ...Typography.body,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  apptDetail: {
    ...Typography.labelSmall,
    color: Colors.textMuted,
  },

  // Categories
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  categoryItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIconText: {
    fontSize: 22,
  },
  categoryContent: {
    flex: 1,
  },
  categoryLabel: {
    ...Typography.body,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  categoryValue: {
    ...Typography.labelSmall,
    color: Colors.textMuted,
  },
  categoryArrow: {
    fontSize: 20,
    color: Colors.textMuted,
  },

  // Quick Reference
  quickRefRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  quickRefButton: {
    flex: 1,
  },
  quickRefCard: {
    alignItems: 'center',
  },
  quickRefIcon: {
    fontSize: 24,
    marginBottom: Spacing.sm,
  },
  quickRefLabel: {
    ...Typography.captionSmall,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
