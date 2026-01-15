// ============================================================================
// ENHANCED CARE HUB - Actionable daily brief with priority alerts
// Shows alerts, today's snapshot with status, smart insights, and weekly summary
// ============================================================================

import React, { useState, useCallback, useEffect } from 'react';
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
import { Colors } from '../_theme/theme-tokens';
import { getMedications, Medication } from '../../utils/medicationStorage';
import { getUpcomingAppointments, Appointment } from '../../utils/appointmentStorage';
import { VITAL_THRESHOLDS, getVitalStatus } from '../../utils/vitalThresholds';
import AsyncStorage from '@react-native-async-storage/async-storage';

const VITALS_KEY = '@EmberMate:vitals';

interface Alert {
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  action?: string;
  vitalType?: string;
}

interface Insight {
  type: 'positive' | 'warning' | 'info';
  icon: string;
  message: string;
}

interface VitalLog {
  id: string;
  timestamp: string;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  oxygenSaturation?: number;
  glucose?: number;
  temperature?: number;
  weight?: number;
  notes?: string;
}

export default function EnhancedCareHub() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [latestVitals, setLatestVitals] = useState<VitalLog | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [weeklyAdherence, setWeeklyAdherence] = useState<number[]>([85, 100, 75, 100, 100, 60, 80]);
  const [nextAppointment, setNextAppointment] = useState<Appointment | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      // Load medications
      const meds = await getMedications();
      const activeMeds = meds.filter((m) => m.active);
      setMedications(activeMeds);

      // Load latest vitals
      const vitalsData = await AsyncStorage.getItem(VITALS_KEY);
      if (vitalsData) {
        const vitals: VitalLog[] = JSON.parse(vitalsData);
        if (vitals.length > 0) {
          setLatestVitals(vitals[0]);
        }
      }

      // Load appointments
      const appts = await getUpcomingAppointments();
      setNextAppointment(appts[0] || null);

      // Generate alerts and insights after data is loaded
    } catch (error) {
      console.error('Error loading Care Hub data:', error);
    }
  };

  // Generate alerts based on vitals
  useEffect(() => {
    if (!latestVitals) return;

    const newAlerts: Alert[] = [];

    // Check glucose level
    if (latestVitals.glucose && latestVitals.glucose > VITAL_THRESHOLDS.glucose.high) {
      newAlerts.push({
        type: 'critical',
        title: 'Action Needed',
        message: `Blood glucose ${latestVitals.glucose} mg/dL is above target (70-140). Consider checking again in 2 hours.`,
        action: 'Log New Reading',
        vitalType: 'glucose',
      });
    }

    // Check BP
    if (latestVitals.bloodPressureSystolic && latestVitals.bloodPressureSystolic > VITAL_THRESHOLDS.systolic.high) {
      newAlerts.push({
        type: 'warning',
        title: 'Elevated Blood Pressure',
        message: `BP ${latestVitals.bloodPressureSystolic}/${latestVitals.bloodPressureDiastolic || '—'} is higher than usual. Monitor and rest.`,
        action: 'Log New Reading',
        vitalType: 'bp',
      });
    }

    setAlerts(newAlerts);
  }, [latestVitals]);

  // Generate insights
  useEffect(() => {
    const newInsights: Insight[] = [];

    // Example insights - in production these would be calculated from historical data
    if (latestVitals?.glucose && latestVitals.glucose > 150) {
      newInsights.push({
        type: 'warning',
        icon: '📊',
        message: 'Glucose trending up — 3 readings above 150 this week. Morning readings are consistently higher.',
      });
    }

    if (latestVitals?.bloodPressureSystolic && latestVitals.bloodPressureSystolic <= VITAL_THRESHOLDS.systolic.high) {
      newInsights.push({
        type: 'positive',
        icon: '🎯',
        message: 'Great BP control — All 5 readings this week in normal range. Keep it up!',
      });
    }

    if (nextAppointment) {
      const daysUntil = Math.ceil(
        (new Date(nextAppointment.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntil >= 0 && daysUntil <= 7) {
        newInsights.push({
          type: 'info',
          icon: '📅',
          message: `Dr. ${nextAppointment.provider} appointment in ${daysUntil} days. Bring glucose log and BP readings.`,
        });
      }
    }

    setInsights(newInsights);
  }, [latestVitals, nextAppointment]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const takenCount = medications.filter((m) => m.taken).length;
  const totalCount = medications.length;
  const adherencePercent = totalCount > 0 ? Math.round((takenCount / totalCount) * 100) : 100;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Care Hub 🌱</Text>
            <Text style={styles.subtitle}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} • Mom's Daily Brief
            </Text>
          </View>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => router.push('/settings')}
          >
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
          }
        >
          {/* PRIORITY ALERTS */}
          {alerts.map((alert, index) => (
            <View
              key={index}
              style={[
                styles.alertCard,
                alert.type === 'critical' && styles.alertCritical,
                alert.type === 'warning' && styles.alertWarning,
              ]}
            >
              <View style={styles.alertHeader}>
                <View style={styles.alertIconContainer}>
                  <Text style={styles.alertIcon}>⚠️</Text>
                </View>
                <View style={styles.alertContent}>
                  <Text style={[styles.alertTitle, alert.type === 'critical' && styles.alertTitleCritical]}>
                    {alert.title}
                  </Text>
                  <Text style={styles.alertMessage}>{alert.message}</Text>
                </View>
              </View>
              <View style={styles.alertActions}>
                <TouchableOpacity
                  style={[styles.alertButton, alert.type === 'critical' && styles.alertButtonCritical]}
                  onPress={() => router.push('/vitals-log')}
                >
                  <Text style={[styles.alertButtonText, alert.type === 'critical' && styles.alertButtonTextCritical]}>
                    {alert.action}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.alertDismiss}>
                  <Text style={styles.alertDismissText}>Dismiss</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {/* TODAY'S SNAPSHOT */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>TODAY'S SNAPSHOT</Text>
            <View style={styles.snapshotCard}>
              {/* Status Row */}
              <View style={styles.statusRow}>
                <View style={[styles.statusIcon, adherencePercent === 100 && styles.statusIconComplete]}>
                  <Text style={styles.statusIconText}>{adherencePercent === 100 ? '✓' : `${takenCount}`}</Text>
                </View>
                <View style={styles.statusInfo}>
                  <Text style={styles.statusValue}>
                    {takenCount} of {totalCount}
                  </Text>
                  <Text style={styles.statusLabel}>medications taken</Text>
                </View>
                <View style={styles.nextDose}>
                  <Text style={styles.nextDoseLabel}>Next dose</Text>
                  <Text style={styles.nextDoseTime}>6:00 PM</Text>
                </View>
              </View>

              {/* Quick Stats */}
              <View style={styles.quickStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {latestVitals?.bloodPressureSystolic || '—'}/{latestVitals?.bloodPressureDiastolic || '—'}
                  </Text>
                  <Text
                    style={[
                      styles.statLabel,
                      {
                        color: latestVitals?.bloodPressureSystolic
                          ? getVitalStatus('systolic', latestVitals.bloodPressureSystolic).color
                          : Colors.textMuted,
                      },
                    ]}
                  >
                    BP {latestVitals?.bloodPressureSystolic ? getVitalStatus('systolic', latestVitals.bloodPressureSystolic).label : ''}
                  </Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{latestVitals?.glucose || '—'}</Text>
                  <Text
                    style={[
                      styles.statLabel,
                      {
                        color: latestVitals?.glucose
                          ? getVitalStatus('glucose', latestVitals.glucose).color
                          : Colors.textMuted,
                      },
                    ]}
                  >
                    Glucose {latestVitals?.glucose ? getVitalStatus('glucose', latestVitals.glucose).label : ''}
                  </Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>😊</Text>
                  <Text style={styles.statLabel}>Mood: Good</Text>
                </View>
              </View>
            </View>
          </View>

          {/* INSIGHTS */}
          {insights.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>INSIGHTS</Text>
              {insights.map((insight, index) => (
                <View
                  key={index}
                  style={[
                    styles.insightCard,
                    insight.type === 'positive' && styles.insightPositive,
                    insight.type === 'warning' && styles.insightWarning,
                    insight.type === 'info' && styles.insightInfo,
                  ]}
                >
                  <Text style={styles.insightIcon}>{insight.icon}</Text>
                  <Text style={styles.insightText}>{insight.message}</Text>
                </View>
              ))}
            </View>
          )}

          {/* QUICK ACTIONS */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>
            <View style={styles.quickActions}>
              {[
                { icon: '💊', label: 'Meds', route: '/medications' },
                { icon: '❤️', label: 'Vitals', route: '/vitals-log' },
                { icon: '📋', label: 'Report', route: '/care-summary-export' },
                { icon: '📅', label: 'Appts', route: '/appointments' },
              ].map((action, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.quickActionButton}
                  onPress={() => router.push(action.route as any)}
                >
                  <Text style={styles.quickActionIcon}>{action.icon}</Text>
                  <Text style={styles.quickActionLabel}>{action.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* WEEKLY SUMMARY */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>THIS WEEK</Text>
            <View style={styles.weeklyCard}>
              <View style={styles.weeklyHeader}>
                <Text style={styles.weeklyLabel}>Medication Adherence</Text>
                <Text style={styles.weeklyPercent}>
                  {Math.round(weeklyAdherence.reduce((a, b) => a + b, 0) / weeklyAdherence.length)}%
                </Text>
              </View>
              <View style={styles.weeklyChart}>
                {weeklyAdherence.map((pct, index) => (
                  <View
                    key={index}
                    style={[
                      styles.weeklyBar,
                      {
                        height: `${pct}%`,
                        backgroundColor:
                          pct === 100 ? '#10B981' : pct >= 75 ? '#14B8A6' : '#F59E0B',
                      },
                    ]}
                  />
                ))}
              </View>
              <View style={styles.weeklyDays}>
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
                  <Text key={index} style={styles.weeklyDay}>
                    {day}
                  </Text>
                ))}
              </View>
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#051614',
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(20, 184, 166, 0.15)',
  },
  title: {
    fontSize: 26,
    fontWeight: '300',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(13, 148, 136, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsIcon: {
    fontSize: 20,
  },
  content: {
    flex: 1,
    padding: 18,
  },

  // Section
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    color: 'rgba(255, 255, 255, 0.4)',
    marginBottom: 10,
  },

  // Alert Card
  alertCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  alertCritical: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  alertWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  alertHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  alertIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertIcon: {
    fontSize: 18,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F59E0B',
    marginBottom: 4,
  },
  alertTitleCritical: {
    color: '#EF4444',
  },
  alertMessage: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.75)',
    lineHeight: 18,
  },
  alertActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  alertButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 8,
    alignItems: 'center',
  },
  alertButtonCritical: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  alertButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F59E0B',
  },
  alertButtonTextCritical: {
    color: '#EF4444',
  },
  alertDismiss: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
  },
  alertDismissText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
  },

  // Snapshot Card
  snapshotCard: {
    backgroundColor: 'rgba(13, 148, 136, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.15)',
    borderRadius: 14,
    padding: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIconComplete: {
    borderColor: '#10B981',
  },
  statusIconText: {
    fontSize: 18,
    color: '#10B981',
    fontWeight: '600',
  },
  statusInfo: {
    flex: 1,
  },
  statusValue: {
    fontSize: 22,
    fontWeight: '600',
    color: '#10B981',
  },
  statusLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  nextDose: {
    alignItems: 'flex-end',
  },
  nextDoseLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  nextDoseTime: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  quickStats: {
    flexDirection: 'row',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(20, 184, 166, 0.15)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(20, 184, 166, 0.15)',
  },

  // Insight Cards
  insightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  insightPositive: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  insightWarning: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
  },
  insightInfo: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  insightIcon: {
    fontSize: 16,
  },
  insightText: {
    flex: 1,
    fontSize: 13,
    color: '#FFFFFF',
    lineHeight: 18,
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    gap: 10,
  },
  quickActionButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(13, 148, 136, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.15)',
    borderRadius: 12,
    alignItems: 'center',
    gap: 6,
  },
  quickActionIcon: {
    fontSize: 22,
  },
  quickActionLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
  },

  // Weekly Summary
  weeklyCard: {
    backgroundColor: 'rgba(13, 148, 136, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.15)',
    borderRadius: 12,
    padding: 14,
  },
  weeklyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  weeklyLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  weeklyPercent: {
    fontSize: 15,
    fontWeight: '600',
    color: '#10B981',
  },
  weeklyChart: {
    flexDirection: 'row',
    gap: 4,
    height: 32,
    alignItems: 'flex-end',
  },
  weeklyBar: {
    flex: 1,
    borderRadius: 3,
    opacity: 0.8,
  },
  weeklyDays: {
    flexDirection: 'row',
    marginTop: 6,
  },
  weeklyDay: {
    flex: 1,
    textAlign: 'center',
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.4)',
  },
});
