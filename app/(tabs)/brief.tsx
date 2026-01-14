// ============================================================================
// CARE HUB - Action-focused care summary
// Shows action items, care brief, and insights
// ============================================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing } from '../_theme/theme-tokens';
import { Platform } from 'react-native';
import { getMedications, Medication, getMedicationLogs } from '../../utils/medicationStorage';
import { getUpcomingAppointments, Appointment } from '../../utils/appointmentStorage';
import { getAllInsights, Insight } from '../../utils/insights';
import { getDailyTracking } from '../../utils/dailyTrackingStorage';

export default function CareHubScreen() {
  const router = useRouter();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [dailyTracking, setDailyTracking] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => {
    loadData();
  }, []));

  const loadData = async () => {
    try {
      const meds = await getMedications();
      setMedications(meds.filter(m => m.active));

      const appts = await getUpcomingAppointments();
      setAppointments(appts);

      const allInsights = await getAllInsights(meds);
      setInsights(allInsights);

      const today = new Date().toISOString().split('T')[0];
      const tracking = await getDailyTracking(today);
      setDailyTracking(tracking);
    } catch (e) {
      console.error('Error loading data:', e);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  // Derived values
  const completedCount = medications.filter(m => m?.taken).length;
  const totalCount = medications.length;
  const adherencePercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // These should eventually come from actual tracking data
  const streakDays = 7; // TODO: Calculate from getMedicationLogs()
  const trendPercent = 23; // TODO: Calculate this week vs last week
  const latestBP = '120/78'; // TODO: Get from vitals storage
  const currentMood = dailyTracking?.mood || '😊';

  const getActionItems = () => {
    const items = [];

    // Check for refills needed (daysSupply <= 7)
    const refillsNeeded = medications.filter(m =>
      m.active && m.daysSupply !== undefined && m.daysSupply <= 7
    );

    if (refillsNeeded.length > 0) {
      const med = refillsNeeded[0];
      items.push({
        icon: '💊',
        title: `${med.name} refill`,
        subtitle: `${med.daysSupply} days remaining`,
        actionLabel: 'Refill',
        onPress: () => router.push('/medications'),
        onAction: () => {
          router.push('/medications');
        },
      });
    }

    // Check for pattern-based suggestions (from insights)
    const missedPattern = insights.find(i => i.type === 'missed_window');
    if (missedPattern) {
      items.push({
        icon: '⏰',
        title: 'Saturday reminder',
        subtitle: 'Mornings often missed',
        actionLabel: 'Add',
        onPress: () => {},
        onAction: () => {
          Alert.alert('Reminder', 'Saturday 9am reminder added');
        },
      });
    }

    // Check for upcoming appointments needing prep (within 48 hours)
    const upcomingAppt = appointments.find(appt => {
      if (!appt?.date) return false;
      const apptDate = new Date(appt.date);
      const now = new Date();
      const hoursUntil = (apptDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      return hoursUntil > 0 && hoursUntil <= 48;
    });

    if (upcomingAppt) {
      items.push({
        icon: '🩺',
        title: `${upcomingAppt.provider} prep`,
        subtitle: `${upcomingAppt.specialty} — bring BP readings`,
        actionLabel: 'View',
        onPress: () => router.push('/appointments'),
        onAction: () => router.push('/appointments'),
      });
    }

    return items;
  };

  const getCareBriefText = () => {
    const takenCount = medications.filter(m => m.active && m.taken).length;
    const totalCount = medications.filter(m => m.active).length;

    let text = '';

    // Medication status
    if (takenCount === totalCount && totalCount > 0) {
      text += 'All meds taken today. ';
    } else if (takenCount > 0) {
      text += `${takenCount} of ${totalCount} meds taken. `;
    }

    // Appointment status
    const todayAppt = appointments.find(appt => {
      if (!appt?.date) return false;
      return new Date(appt.date).toDateString() === new Date().toDateString();
    });

    if (todayAppt) {
      text += `${todayAppt.provider} at ${todayAppt.time || '—'}. `;
    }

    // Mood if available
    if (currentMood) {
      text += "Mom's mood is good.";
    }

    return text.trim() || 'No updates today.';
  };

  const handleShareCareBrief = async () => {
    try {
      router.push('/care-summary-export');
    } catch (e) {
      console.error('Error sharing care brief:', e);
    }
  };

  const actionItems = getActionItems();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <LinearGradient
        colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        {/* Tinted Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Care Hub 🌱</Text>
            <Text style={styles.dateSubtitle}>This Week • {adherencePercent}% adherence</Text>
          </View>
          <TouchableOpacity style={styles.settingsButton} onPress={() => router.push('/settings')}>
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.accent}
            />
          }
        >
          {/* ACTION NEEDED Section */}
          {actionItems.length > 0 ? (
            <View style={styles.actionSection}>
              <Text style={styles.actionLabel}>ACTION NEEDED</Text>

              {actionItems.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.actionCard}
                  onPress={item.onPress}
                >
                  <Text style={styles.actionIcon}>{item.icon}</Text>
                  <View style={styles.actionContent}>
                    <Text style={styles.actionTitle}>{item.title}</Text>
                    <Text style={styles.actionSubtitle}>{item.subtitle}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={item.onAction}
                  >
                    <Text style={styles.actionButtonText}>{item.actionLabel}</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.noActionsCard}>
              <Text style={styles.noActionsIcon}>✓</Text>
              <Text style={styles.noActionsText}>No actions needed right now</Text>
            </View>
          )}

          {/* CARE BRIEF Section */}
          <View style={styles.careBriefSection}>
            <Text style={styles.sectionLabel}>CARE BRIEF</Text>

            <View style={styles.careBriefCard}>
              {/* Header with stats and share */}
              <View style={styles.careBriefHeader}>
                <View style={styles.careBriefStats}>
                  <Text style={styles.careBriefPercent}>{adherencePercent}%</Text>
                  <View>
                    <Text style={styles.careBriefStatLabel}>adherence</Text>
                    <Text style={styles.careBriefStreak}>{streakDays} day streak</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.shareButton}
                  onPress={handleShareCareBrief}
                >
                  <Text style={styles.shareButtonText}>Share</Text>
                </TouchableOpacity>
              </View>

              {/* Today summary */}
              <Text style={styles.careBriefText}>
                {getCareBriefText()}
              </Text>

              {/* Quick stats row */}
              <View style={styles.careBriefStatsRow}>
                <Text style={styles.careBriefStat}>
                  <Text style={styles.statLabel}>BP: </Text>
                  <Text style={styles.statValue}>{latestBP || '—'}</Text>
                </Text>
                <Text style={styles.careBriefStat}>
                  <Text style={styles.statLabel}>Mood: </Text>
                  <Text style={styles.statValue}>{currentMood || '😊'}</Text>
                </Text>
                <Text style={styles.careBriefStat}>
                  <Text style={styles.statLabel}>Trend: </Text>
                  <Text style={[styles.statValue, styles.statValuePositive]}>↑{trendPercent}%</Text>
                </Text>
              </View>
            </View>
          </View>

          {/* INSIGHTS Section */}
          {insights.length > 0 && (
            <View style={styles.insightsSection}>
              <Text style={styles.sectionLabel}>INSIGHTS</Text>

              {insights
                .filter(i => i.type !== 'missed_window') // Already shown in actions
                .slice(0, 2) // Limit to 2
                .map((insight, index) => (
                  <View key={index} style={styles.insightCard}>
                    <Text style={styles.insightIcon}>{insight.icon}</Text>
                    <Text style={styles.insightText}>{insight.description}</Text>
                  </View>
                ))
              }
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },

  // Tinted Header
  header: {
    backgroundColor: 'rgba(139, 168, 136, 0.03)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 168, 136, 0.15)',
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 24,
    color: Colors.textPrimary,
  },
  dateSubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 6,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(139, 168, 136, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(139, 168, 136, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsIcon: {
    fontSize: 22,
  },

  // ACTION NEEDED Section
  actionSection: {
    marginBottom: 20,
  },
  actionLabel: {
    fontSize: 10,
    letterSpacing: 1,
    color: '#fbbf24',
    marginBottom: 12,
    fontWeight: '700',
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.2)',
    borderLeftWidth: 3,
    borderLeftColor: '#fbbf24',
    marginBottom: 10,
    gap: 12,
  },
  actionIcon: {
    fontSize: 20,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  actionButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: '#fbbf24',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
  },

  // No Actions Card
  noActionsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(52, 211, 153, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.15)',
    marginBottom: 20,
    gap: 12,
  },
  noActionsIcon: {
    fontSize: 18,
    color: Colors.success,
  },
  noActionsText: {
    fontSize: 14,
    color: Colors.success,
  },

  // CARE BRIEF Section
  careBriefSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 10,
    letterSpacing: 1,
    color: Colors.accent,
    marginBottom: 12,
    fontWeight: '700',
  },
  careBriefCard: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  careBriefHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  careBriefStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  careBriefPercent: {
    fontSize: 32,
    fontWeight: '600',
    color: Colors.success,
  },
  careBriefStatLabel: {
    fontSize: 12,
    color: Colors.textPrimary,
  },
  careBriefStreak: {
    fontSize: 11,
    color: Colors.success,
  },
  shareButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: 'rgba(139, 168, 136, 0.1)',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  shareButtonText: {
    fontSize: 12,
    color: Colors.accent,
  },
  careBriefText: {
    fontSize: 14,
    lineHeight: 21,
    color: Colors.textPrimary,
    marginBottom: 14,
  },
  careBriefStatsRow: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  careBriefStat: {
    fontSize: 12,
  },
  statLabel: {
    color: Colors.textTertiary,
  },
  statValue: {
    color: Colors.textPrimary,
  },
  statValuePositive: {
    color: Colors.success,
  },

  // INSIGHTS Section
  insightsSection: {
    marginBottom: 20,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(139, 168, 136, 0.08)',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
    gap: 10,
  },
  insightIcon: {
    fontSize: 14,
  },
  insightText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textPrimary,
  },
});
