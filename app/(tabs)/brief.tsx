// ============================================================================
// HUB PAGE - Aurora Redesign
// Care Brief: Narrative summary + Health tracking hub
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
import Svg, { Circle } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { formatDistanceToNow } from 'date-fns';
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

  // Collapsible section state
  const [keyFeaturesExpanded, setKeyFeaturesExpanded] = useState(true);
  const [managementExpanded, setManagementExpanded] = useState(true);

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
      return "Start logging to see your loved one's story unfold here. Even small check-ins help build the picture.";
    }

    let narrative = "Today is shaping up to be a ";

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
        narrative += "Mood is positive and upbeat. ";
      } else if (mood >= 5) {
        narrative += "Mood is stable and calm. ";
      } else if (mood >= 3) {
        narrative += "Mood has been low, seeming quieter. ";
      } else {
        narrative += "Struggling today and may need extra support. ";
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
      approach += "If restless, quiet company may be better. ";
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

  // Calculate health score (0-100) and contributing factors
  const healthScoreData = useMemo(() => {
    let score = 0;
    let factorCount = 0;
    const factors = {
      meds: { tracked: false, status: 'missing' as 'good' | 'warning' | 'missing' },
      mood: { tracked: false, status: 'missing' as 'good' | 'warning' | 'missing' },
      bp: { tracked: false, status: 'missing' as 'good' | 'warning' | 'missing' },
      energy: { tracked: false, status: 'missing' as 'good' | 'warning' | 'missing' },
    };

    // Medication adherence (30%)
    if (totalMeds > 0) {
      score += adherencePercent * 0.3;
      factorCount++;
      factors.meds.tracked = true;
      factors.meds.status = adherencePercent >= 80 ? 'good' : 'warning';
    }

    // Mood score (30%)
    const moodMap: { [key: string]: number } = { 'struggling': 20, 'difficult': 40, 'managing': 60, 'good': 80, 'great': 100 };
    if (wellnessCheck?.mood) {
      score += moodMap[wellnessCheck.mood] * 0.3;
      factorCount++;
      factors.mood.tracked = true;
      factors.mood.status = moodMap[wellnessCheck.mood] >= 60 ? 'good' : 'warning';
    }

    // BP (20%) - normal range is ~120/80
    if (latestSystolic && latestDiastolic) {
      const bpScore = Math.max(0, 100 - Math.abs(120 - latestSystolic) - Math.abs(80 - latestDiastolic));
      score += bpScore * 0.2;
      factorCount++;
      factors.bp.tracked = true;
      factors.bp.status = bpScore >= 70 ? 'good' : 'warning';
    }

    // Energy level (20%)
    if (wellnessCheck?.energyLevel) {
      score += (wellnessCheck.energyLevel / 5) * 100 * 0.2;
      factorCount++;
      factors.energy.tracked = true;
      factors.energy.status = wellnessCheck.energyLevel >= 3 ? 'good' : 'warning';
    }

    const trackedCount = Object.values(factors).filter(f => f.tracked).length;

    return {
      score: factorCount > 0 ? Math.round(score) : 75,
      factors,
      trackedCount,
    };
  }, [totalMeds, adherencePercent, wellnessCheck, latestSystolic, latestDiastolic]);

  const healthScore = healthScoreData.score;

  // Last updated text
  const lastUpdatedText = useMemo(() => {
    try {
      return `Updated ${formatDistanceToNow(lastUpdated)} ago`;
    } catch {
      return 'Updated just now';
    }
  }, [lastUpdated]);

  // Quick stats
  const quickStats = useMemo(() => {
    const nextAppt = appointments[0];
    let nextApptText = 'None scheduled';
    if (nextAppt) {
      const apptDate = new Date(nextAppt.date);
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      if (apptDate.toDateString() === today.toDateString()) {
        nextApptText = 'Today';
      } else if (apptDate.toDateString() === tomorrow.toDateString()) {
        nextApptText = 'Tomorrow';
      } else {
        nextApptText = apptDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
    }

    // Count logs for today
    const logsToday = dailyTracking ? Object.keys(dailyTracking).filter(k => dailyTracking[k] !== null && dailyTracking[k] !== undefined).length : 0;

    return [
      { icon: '💊', value: `${totalMeds}`, label: 'meds active' },
      { icon: '📝', value: `${logsToday}`, label: 'logs today' },
      { icon: '📅', value: nextApptText, label: 'next appt' },
    ];
  }, [totalMeds, dailyTracking, appointments]);

  // Hub sections - grouped by category
  const KEY_FEATURES = [
    {
      id: 'reports',
      icon: '📋',
      title: 'Reports',
      subtitle: '8 report types',
      badge: appointments.length > 0 ? `${appointments.length} upcoming` : undefined,
      badgeColor: Colors.red,
      primary: true,
      route: '/hub/reports',
    },
    {
      id: 'insights',
      icon: '🧠',
      title: 'Insights & Correlations',
      subtitle: '6 patterns discovered',
      badge: 'New',
      badgeColor: Colors.purple,
      route: '/correlation-report',
    },
    {
      id: 'trends',
      icon: '📈',
      title: 'Trends',
      subtitle: '30-day overview',
      route: '/vitals',
    },
  ];

  const MANAGEMENT_SECTIONS = [
    {
      id: 'medications',
      icon: '💊',
      title: 'Medications',
      subtitle: `${totalMeds} active medications`,
      route: '/medications',
    },
    {
      id: 'appointments',
      icon: '📅',
      title: 'Appointments',
      subtitle: 'Upcoming & past visits',
      badge: upcomingAppts.length > 0 ? upcomingAppts[0].date : undefined,
      badgeColor: Colors.accent,
      route: '/appointments',
    },
    {
      id: 'contacts',
      icon: '📞',
      title: 'Emergency Contacts',
      subtitle: 'Quick dial',
      route: '/emergency',
    },
    {
      id: 'settings',
      icon: '⚙️',
      title: 'Settings',
      subtitle: 'Reminders & preferences',
      route: '/settings',
    },
  ];

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
              <Text style={styles.headerLabel}>EMBERMATE</Text>
              <Text style={styles.headerTitle}>Hub</Text>
              <Text style={styles.lastUpdated}>{lastUpdatedText}</Text>
            </View>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => router.push('/settings')}
            >
              <Text style={styles.settingsIcon}>⚙️</Text>
            </TouchableOpacity>
          </View>

          {/* Health Score Card */}
          <GlassCard style={styles.healthScoreCard}>
            <View style={styles.healthScoreContent}>
              <View style={styles.scoreRing}>
                <Svg width={80} height={80}>
                  {/* Background circle */}
                  <Circle
                    cx={40}
                    cy={40}
                    r={34}
                    stroke="rgba(255, 255, 255, 0.1)"
                    strokeWidth={6}
                    fill="none"
                  />
                  {/* Progress circle */}
                  <Circle
                    cx={40}
                    cy={40}
                    r={34}
                    stroke={Colors.accent}
                    strokeWidth={6}
                    fill="none"
                    strokeDasharray={2 * Math.PI * 34}
                    strokeDashoffset={2 * Math.PI * 34 * (1 - healthScore / 100)}
                    strokeLinecap="round"
                    transform={`rotate(-90 40 40)`}
                  />
                </Svg>
                <View style={styles.scoreValue}>
                  <Text style={styles.scoreNumber}>{healthScore}</Text>
                </View>
              </View>
              <View style={styles.scoreText}>
                <Text style={styles.scoreTitle}>Health Score</Text>
                <Text style={styles.scoreTrend}>↑ +5 this month</Text>
                <Text style={styles.scoreDescription}>
                  {healthScoreData.trackedCount} metrics tracked today
                </Text>
              </View>
            </View>
            {/* Health Factors */}
            <View style={styles.healthFactors}>
              {[
                { key: 'meds', label: 'Meds' },
                { key: 'mood', label: 'Mood' },
                { key: 'bp', label: 'BP' },
                { key: 'energy', label: 'Energy' },
              ].map((factor) => {
                const f = healthScoreData.factors[factor.key as keyof typeof healthScoreData.factors];
                return (
                  <View key={factor.key} style={styles.factorItem}>
                    <Text style={[
                      styles.factorIcon,
                      f.tracked ? (f.status === 'good' ? styles.factorGood : styles.factorWarning) : styles.factorMissing,
                    ]}>
                      {f.tracked ? '✓' : '○'}
                    </Text>
                    <Text style={styles.factorLabel}>{factor.label}</Text>
                  </View>
                );
              })}
            </View>
          </GlassCard>

          {/* Quick Stats Row */}
          <View style={styles.quickStatsRow}>
            {quickStats.map((stat, i) => (
              <GlassCard key={i} style={styles.quickStatCard}>
                <Text style={styles.quickStatIcon}>{stat.icon}</Text>
                <Text style={styles.quickStatValue}>{stat.value}</Text>
                <Text style={styles.quickStatLabel}>{stat.label}</Text>
              </GlassCard>
            ))}
          </View>

          {/* Hub Sections - Grouped */}
          <View style={styles.hubSections}>
            {/* KEY FEATURES Group */}
            <TouchableOpacity
              style={styles.groupHeader}
              onPress={() => setKeyFeaturesExpanded(!keyFeaturesExpanded)}
              activeOpacity={0.7}
            >
              <Text style={styles.groupHeaderText}>KEY FEATURES</Text>
              <Text style={styles.groupHeaderChevron}>{keyFeaturesExpanded ? '▼' : '▶'}</Text>
            </TouchableOpacity>
            {keyFeaturesExpanded && (
              <View style={styles.groupContent}>
                {KEY_FEATURES.map((section) => (
                  <TouchableOpacity
                    key={section.id}
                    onPress={() => router.push(section.route as any)}
                    activeOpacity={0.7}
                  >
                    <GlassCard
                      style={[
                        styles.hubSectionCard,
                        section.primary ? styles.hubSectionPrimary : undefined,
                      ].filter(Boolean)}
                    >
                      <View style={styles.hubSectionContent}>
                        <View
                          style={[
                            styles.hubSectionIcon,
                            section.primary && styles.hubSectionIconPrimary,
                          ]}
                        >
                          <Text style={styles.hubSectionIconText}>{section.icon}</Text>
                        </View>
                        <View style={styles.hubSectionText}>
                          <Text style={styles.hubSectionTitle}>{section.title}</Text>
                          <Text style={styles.hubSectionSubtitle}>{section.subtitle}</Text>
                        </View>
                        {section.badge && (
                          <View
                            style={[
                              styles.hubBadge,
                              { backgroundColor: `${section.badgeColor}20` },
                            ]}
                          >
                            <Text
                              style={[styles.hubBadgeText, { color: section.badgeColor }]}
                            >
                              {section.badge}
                            </Text>
                          </View>
                        )}
                        <Text style={styles.hubChevron}>›</Text>
                      </View>
                    </GlassCard>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* MANAGEMENT Group */}
            <TouchableOpacity
              style={styles.groupHeader}
              onPress={() => setManagementExpanded(!managementExpanded)}
              activeOpacity={0.7}
            >
              <Text style={styles.groupHeaderText}>MANAGEMENT</Text>
              <Text style={styles.groupHeaderChevron}>{managementExpanded ? '▼' : '▶'}</Text>
            </TouchableOpacity>
            {managementExpanded && (
              <View style={styles.groupContent}>
                {MANAGEMENT_SECTIONS.map((section) => (
                  <TouchableOpacity
                    key={section.id}
                    onPress={() => router.push(section.route as any)}
                    activeOpacity={0.7}
                  >
                    <GlassCard style={styles.hubSectionCard}>
                      <View style={styles.hubSectionContent}>
                        <View style={styles.hubSectionIcon}>
                          <Text style={styles.hubSectionIconText}>{section.icon}</Text>
                        </View>
                        <View style={styles.hubSectionText}>
                          <Text style={styles.hubSectionTitle}>{section.title}</Text>
                          <Text style={styles.hubSectionSubtitle}>{section.subtitle}</Text>
                        </View>
                        {section.badge && (
                          <View
                            style={[
                              styles.hubBadge,
                              { backgroundColor: `${section.badgeColor}20` },
                            ]}
                          >
                            <Text
                              style={[styles.hubBadgeText, { color: section.badgeColor }]}
                            >
                              {section.badge}
                            </Text>
                          </View>
                        )}
                        <Text style={styles.hubChevron}>›</Text>
                      </View>
                    </GlassCard>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Legacy sections - now integrated into Hub Sections above */}
          {/* Upcoming Appointments - hidden, now in Hub Sections */}
          {false && upcomingAppts.length > 0 && (
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

          {/* Health Categories - hidden, now in Hub Sections */}
          {false && healthCategories.map((category, ci) => (
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
  lastUpdated: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 4,
  },
  settingsButton: {
    padding: Spacing.sm,
  },
  settingsIcon: {
    fontSize: 20,
  },

  // Narrative (legacy)
  narrativeCard: {
    marginBottom: Spacing.xxl,
  },
  narrativeText: {
    ...Typography.body,
    color: Colors.textPrimary,
    lineHeight: 24,
  },

  // Health Score Card
  healthScoreCard: {
    marginBottom: Spacing.xl,
    backgroundColor: `${Colors.accent}10`,
    borderColor: `${Colors.accent}30`,
  },
  healthScoreContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xl,
  },
  scoreRing: {
    position: 'relative',
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreValue: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumber: {
    fontSize: 22,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  scoreText: {
    flex: 1,
  },
  scoreTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  scoreTrend: {
    fontSize: 13,
    color: Colors.green,
    marginTop: 4,
  },
  scoreDescription: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 4,
  },

  // Health Factors
  healthFactors: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Spacing.md,
    marginTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  factorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  factorIcon: {
    fontSize: 12,
    fontWeight: '600',
  },
  factorGood: {
    color: Colors.green,
  },
  factorWarning: {
    color: Colors.amber,
  },
  factorMissing: {
    color: Colors.textMuted,
  },
  factorLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
  },

  // Quick Stats Row
  quickStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.xl,
  },
  quickStatCard: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
  },
  quickStatIcon: {
    fontSize: 18,
    marginBottom: 4,
  },
  quickStatValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  quickStatLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    textAlign: 'center',
  },

  // Hub Sections
  hubSections: {
    gap: 10,
    marginBottom: Spacing.xxl,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  groupHeaderText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  groupHeaderChevron: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  groupContent: {
    gap: 8,
    marginBottom: 8,
  },
  hubSectionCard: {
    padding: 14,
  },
  hubSectionPrimary: {
    backgroundColor: `${Colors.accent}10`,
    borderColor: `${Colors.accent}30`,
  },
  hubSectionContent: {
    flexDirection: 'row',
    alignItems: 'center',  // Vertical center all children
    gap: 14,
  },
  hubSectionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.glass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubSectionIconPrimary: {
    backgroundColor: `${Colors.accent}20`,
  },
  hubSectionIconText: {
    fontSize: 22,
    textAlign: 'center',
    includeFontPadding: false,  // Android fix
  },
  hubSectionText: {
    flex: 1,
    justifyContent: 'center',  // Vertical center the text block
  },
  hubSectionTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  hubSectionSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  hubBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  hubBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  hubChevron: {
    fontSize: 16,
    color: Colors.textMuted,
  },

  // Stats (legacy)
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
