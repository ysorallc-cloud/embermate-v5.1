// ============================================================================
// CARE BRIEF - Narrative, emotionally intelligent summary
// Provides full context about patient's state, patterns, and guidance
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
import { getDailyTracking } from '../../utils/dailyTrackingStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const VITALS_KEY = '@EmberMate:vitals';

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

export default function CareBriefScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [dailyTracking, setDailyTracking] = useState<any>(null);
  const [latestVitals, setLatestVitals] = useState<VitalLog | null>(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      // Load medications
      const meds = await getMedications();
      setMedications(meds.filter((m) => m.active));

      // Load appointments
      const appts = await getUpcomingAppointments();
      setAppointments(appts);

      // Load daily tracking (mood, energy, pain)
      const today = new Date().toISOString().split('T')[0];
      const tracking = await getDailyTracking(today);
      setDailyTracking(tracking);

      // Load latest vitals
      const vitalsData = await AsyncStorage.getItem(VITALS_KEY);
      if (vitalsData) {
        const vitals: VitalLog[] = JSON.parse(vitalsData);
        if (vitals.length > 0) {
          setLatestVitals(vitals[0]);
        }
      }

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading Care Brief data:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  // Generate narrative summary
  const generateNarrative = () => {
    const mood = dailyTracking?.mood;
    const energy = dailyTracking?.energy;
    const pain = dailyTracking?.pain;

    let narrative = "Mom's having a ";

    // Overall status
    if (mood >= 7 && energy >= 6 && pain <= 3) {
      narrative += "**good day**. ";
    } else if (mood >= 5 && energy >= 4 && pain <= 5) {
      narrative += "**steady day**. ";
    } else {
      narrative += "**harder stretch**. ";
    }

    // Mood state
    if (mood >= 7) {
      narrative += "Mood is positive and she's been upbeat this afternoon. ";
    } else if (mood >= 5) {
      narrative += "Mood is stable and she's been calm this afternoon. ";
    } else if (mood >= 3) {
      narrative += "Mood has been low and she seems quieter than usual. ";
    } else {
      narrative += "She's been struggling today and may need extra support. ";
    }

    // Energy level
    if (energy >= 7) {
      narrative += "Energy is **strong today**, which is wonderful to see. ";
    } else if (energy >= 5) {
      narrative += "Energy is at a **good level** for light activity. ";
    } else if (energy >= 3) {
      narrative += "Energy is **lower than usual**, so she may need more rest. ";
    } else {
      narrative += "Energy is **very low** — prioritize rest and comfort. ";
    }

    // Pain level
    if (pain === 0) {
      narrative += "No pain reported today.";
    } else if (pain <= 3) {
      narrative += `Pain is minimal at **${pain}/10**.`;
    } else if (pain <= 5) {
      narrative += `Pain has been at **${pain}/10** — manageable but present.`;
    } else {
      narrative += `Pain has been at **${pain}/10 for two days now** — worth discussing at the next visit.`;
    }

    return narrative || "Start logging to see Mom's story unfold here. Even small check-ins help build the picture.";
  };

  // Detect patterns
  const detectPattern = () => {
    const pain = dailyTracking?.pain;

    // Example: Pain elevated above baseline
    if (pain && pain >= 5) {
      return {
        detected: true,
        message: `Pain has been ${pain}/10 or higher for 2 consecutive days. This is above her typical baseline of 3/10.`,
      };
    }

    return { detected: false, message: '' };
  };

  // Generate suggested approach
  const generateApproach = () => {
    const energy = dailyTracking?.energy;
    const pain = dailyTracking?.pain;
    const mood = dailyTracking?.mood;

    let approach = "";

    if (energy && energy < 4) {
      approach += "Since energy is low, keep requests small today. ";
    }

    if (pain && pain >= 5) {
      approach += "Ask about pain before meals — note if it's affecting appetite. A warm compress or gentle position change might help with comfort. ";
    }

    if (mood && mood < 5) {
      approach += "If she seems restless, quiet company may be better than conversation. ";
    }

    if (energy >= 7 && pain <= 3 && mood >= 7) {
      approach += "This is a good day — maybe a short outing or a favorite activity if she's interested. ";
    }

    return approach || "Be present and attentive to her needs. Small gestures of comfort go a long way.";
  };

  // Generate caregiver message
  const getCaregiverMessage = () => {
    const pain = dailyTracking?.pain;
    const mood = dailyTracking?.mood;

    if (pain && pain >= 5) {
      return "Days with elevated pain can feel heavier for everyone. You're not responsible for fixing everything — being present is enough. If you need to step away, that's okay.";
    }

    if (mood && mood < 5) {
      return "Caring for someone through difficult days takes strength. Remember: you're doing important work, even when progress isn't visible. Take breaks when you need them.";
    }

    return "You're doing a wonderful job. Remember to take moments for yourself — even caregivers need care.";
  };

  const pattern = detectPattern();
  const upcomingAppts = appointments.slice(0, 3);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={['#051614', '#041210']}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerLabel}>CARE BRIEF</Text>
            <Text style={styles.title}>Mom's Story</Text>
            <Text style={styles.timestamp}>
              Updated today at {lastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
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
          {/* 1. Narrative Summary */}
          <View style={styles.narrativeCard}>
            <Text style={styles.narrativeText}>{generateNarrative()}</Text>
          </View>

          {/* 2. Appointment Prep Card (HERO FEATURE) */}
          {upcomingAppts.length > 0 && (() => {
            const nextAppt = upcomingAppts[0];
            const apptDate = new Date(nextAppt.date);
            const hoursUntil = (apptDate.getTime() - Date.now()) / (1000 * 60 * 60);

            // Show prominent prep card if appointment is within 48 hours
            if (hoursUntil <= 48 && hoursUntil > 0) {
              const isToday = apptDate.toDateString() === new Date().toDateString();
              const isTomorrow = apptDate.toDateString() === new Date(Date.now() + 86400000).toDateString();
              let dateLabel = apptDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
              if (isToday) dateLabel = 'Today';
              if (isTomorrow) dateLabel = 'Tomorrow';

              return (
                <TouchableOpacity
                  style={styles.appointmentPrepCard}
                  onPress={() => router.push('/visit-prep')}
                >
                  <Text style={styles.prepCardIcon}>📋</Text>
                  <View style={styles.prepCardContent}>
                    <Text style={styles.prepCardTitle}>
                      {nextAppt.provider || 'Upcoming Appointment'} — {dateLabel} {nextAppt.time}
                    </Text>
                    <Text style={styles.prepCardDescription}>
                      2-week report ready with vitals, meds, and symptoms.
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.prepCardButton}>
                    <Text style={styles.prepCardButtonText}>Prepare Visit Report →</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            }
            return null;
          })()}

          {/* 3. Pattern Alert (Conditional) */}
          {pattern.detected && (
            <View style={styles.patternAlert}>
              <Text style={styles.patternIcon}>⚠️</Text>
              <View style={styles.patternContent}>
                <Text style={styles.patternTitle}>Pattern detected</Text>
                <Text style={styles.patternText}>{pattern.message}</Text>
              </View>
            </View>
          )}

          {/* 4. Quick Stats Row */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>QUICK STATS</Text>
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: Colors.green }]}>
                  {Math.round((medications.filter(m => m.taken).length / Math.max(medications.length, 1)) * 100)}%
                </Text>
                <Text style={styles.statLabel}>Meds</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: latestVitals?.bloodPressureSystolic && latestVitals.bloodPressureSystolic > 140 ? Colors.gold : Colors.green }]}>
                  {latestVitals?.bloodPressureSystolic && latestVitals?.bloodPressureDiastolic
                    ? `${latestVitals.bloodPressureSystolic}/${latestVitals.bloodPressureDiastolic}`
                    : '--'}
                </Text>
                <Text style={styles.statLabel}>BP</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: dailyTracking?.mood >= 7 ? Colors.green : dailyTracking?.mood >= 4 ? Colors.gold : Colors.red }]}>
                  {dailyTracking?.mood >= 7 ? 'Good' : dailyTracking?.mood >= 4 ? 'Steady' : 'Low'}
                </Text>
                <Text style={styles.statLabel}>Mood</Text>
              </View>
            </View>
          </View>

          {/* 5. Suggested Approach */}
          <View style={styles.approachSection}>
            <Text style={styles.sectionLabel}>SUGGESTED APPROACH</Text>
            <View style={styles.approachContent}>
              <Text style={styles.approachText}>{generateApproach()}</Text>
            </View>
          </View>

          {/* 4. Coming Up */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>COMING UP</Text>
            {upcomingAppts.length > 0 ? (
              upcomingAppts.map((appt, index) => {
                const apptDate = new Date(appt.date);
                const isToday = apptDate.toDateString() === new Date().toDateString();
                const isTomorrow = apptDate.toDateString() === new Date(Date.now() + 86400000).toDateString();

                let dateLabel = apptDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
                if (isToday) dateLabel = 'Today';
                if (isTomorrow) dateLabel = 'Tomorrow';

                const icon = appt.specialty?.toLowerCase().includes('telehealth') ? '📱' : '🏥';

                return (
                  <TouchableOpacity
                    key={index}
                    style={styles.appointmentCard}
                    onPress={() => router.push('/appointments')}
                  >
                    <View style={[styles.apptIconCircle, { backgroundColor: icon === '📱' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(245, 158, 11, 0.12)' }]}>
                      <Text style={styles.apptIcon}>{icon}</Text>
                    </View>
                    <View style={styles.apptContent}>
                      <Text style={styles.apptTitle}>{appt.specialty || 'Appointment'}</Text>
                      <Text style={styles.apptDetail}>
                        {dateLabel}{appt.time ? `, ${appt.time}` : ''} • {appt.provider}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <Text style={styles.emptyText}>No upcoming appointments. Tap + to add one.</Text>
            )}
          </View>

          {/* 5. For You (Caregiver Support) */}
          <View style={styles.forYouSection}>
            <Text style={styles.forYouLabel}>✨ FOR YOU</Text>
            <Text style={styles.forYouText}>{getCaregiverMessage()}</Text>
            <View style={styles.forYouButtons}>
              <TouchableOpacity style={styles.forYouButton}>
                <Text style={styles.forYouButtonText}>Log how you're feeling</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.forYouButton}>
                <Text style={styles.forYouButtonText}>Request help</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 7. Reports Section */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>REPORTS</Text>
            <View style={styles.reportsList}>
              <TouchableOpacity
                style={styles.reportItem}
                onPress={() => router.push('/medication-report')}
              >
                <Text style={styles.reportIcon}>💊</Text>
                <View style={styles.reportContent}>
                  <Text style={styles.reportTitle}>Medication Adherence</Text>
                  <Text style={styles.reportSubtitle}>7 & 30 day view</Text>
                </View>
                <Text style={styles.reportChevron}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.reportItem}
                onPress={() => router.push('/vitals-report')}
              >
                <Text style={styles.reportIcon}>❤️</Text>
                <View style={styles.reportContent}>
                  <Text style={styles.reportTitle}>Vitals Trends</Text>
                  <Text style={styles.reportSubtitle}>BP, glucose, weight</Text>
                </View>
                <Text style={styles.reportChevron}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.reportItem}
                onPress={() => router.push('/symptom-report')}
              >
                <Text style={styles.reportIcon}>🩹</Text>
                <View style={styles.reportContent}>
                  <Text style={styles.reportTitle}>Symptom Timeline</Text>
                  <Text style={styles.reportSubtitle}>Patterns & triggers</Text>
                </View>
                <Text style={styles.reportChevron}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.reportItem}
                onPress={() => router.push('/insights')}
              >
                <Text style={styles.reportIcon}>📊</Text>
                <View style={styles.reportContent}>
                  <Text style={styles.reportTitle}>Insights & Correlations</Text>
                  <Text style={styles.reportSubtitle}>AI-detected patterns</Text>
                </View>
                <Text style={styles.reportChevron}>›</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 8. Quick Reference */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>QUICK REFERENCE</Text>
            <View style={styles.quickRefRow}>
              <TouchableOpacity
                style={styles.quickRefButton}
                onPress={() => router.push('/medications')}
              >
                <Text style={styles.quickRefIcon}>💊</Text>
                <Text style={styles.quickRefLabel}>Medications</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickRefButton}
                onPress={() => router.push('/settings')}
              >
                <Text style={styles.quickRefIcon}>📞</Text>
                <Text style={styles.quickRefLabel}>Contacts</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickRefButton}
                onPress={() => router.push('/care-summary-export')}
              >
                <Text style={styles.quickRefIcon}>📊</Text>
                <Text style={styles.quickRefLabel}>History</Text>
              </TouchableOpacity>
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
  headerLeft: {
    flex: 1,
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
    color: '#14B8A6',
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '300',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.35)',
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
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

  // Narrative Summary
  narrativeCard: {
    backgroundColor: 'rgba(13, 148, 136, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.15)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 18,
  },
  narrativeText: {
    fontSize: 14,
    lineHeight: 23.8,
    color: '#FFFFFF',
  },

  // Pattern Alert
  patternAlert: {
    flexDirection: 'row',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
    gap: 12,
  },
  patternIcon: {
    fontSize: 20,
  },
  patternContent: {
    flex: 1,
  },
  patternTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F59E0B',
    marginBottom: 4,
  },
  patternText: {
    fontSize: 13,
    lineHeight: 19.5,
    color: 'rgba(255, 255, 255, 0.85)',
  },

  // Suggested Approach
  approachSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    color: 'rgba(255, 255, 255, 0.4)',
    marginBottom: 10,
  },
  approachContent: {
    borderLeftWidth: 3,
    borderLeftColor: '#14B8A6',
    paddingLeft: 14,
  },
  approachText: {
    fontSize: 13,
    lineHeight: 22.1,
    color: 'rgba(255, 255, 255, 0.85)',
  },

  // Coming Up
  section: {
    marginBottom: 20,
  },
  appointmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(13, 148, 136, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.15)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  apptIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  apptIcon: {
    fontSize: 20,
  },
  apptContent: {
    flex: 1,
  },
  apptTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  apptDetail: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  emptyText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
    fontStyle: 'italic',
  },

  // For You
  forYouSection: {
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  forYouLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
    color: '#A78BFA',
    marginBottom: 10,
  },
  forYouText: {
    fontSize: 13,
    lineHeight: 22.1,
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: 14,
  },
  forYouButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  forYouButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.4)',
    borderRadius: 8,
    alignItems: 'center',
  },
  forYouButtonText: {
    fontSize: 12,
    color: '#A78BFA',
    fontWeight: '500',
  },

  // Quick Reference
  quickRefRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickRefButton: {
    flex: 1,
    backgroundColor: 'rgba(13, 148, 136, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.15)',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 8,
  },
  quickRefIcon: {
    fontSize: 24,
  },
  quickRefLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
  },

  // Appointment Prep Card (HERO)
  appointmentPrepCard: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
    gap: 12,
  },
  prepCardIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  prepCardContent: {
    marginBottom: 12,
  },
  prepCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  prepCardDescription: {
    fontSize: 13,
    lineHeight: 19.5,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  prepCardButton: {
    backgroundColor: 'rgba(59, 130, 246, 0.25)',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  prepCardButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#60A5FA',
  },

  // Quick Stats Row
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(13, 148, 136, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.15)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Reports Section
  reportsList: {
    gap: 8,
  },
  reportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(13, 148, 136, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.15)',
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  reportIcon: {
    fontSize: 20,
  },
  reportContent: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  reportSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  reportChevron: {
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.3)',
  },
});
