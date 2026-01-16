// ============================================================================
// TODAY PAGE - Quick glance dashboard
// "What do I do now?" — Show next action, complete tasks
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
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../_theme/theme-tokens';
import { getMedications, Medication } from '../../utils/medicationStorage';
import { getUpcomingAppointments, Appointment } from '../../utils/appointmentStorage';
import { getDailyTracking } from '../../utils/dailyTrackingStorage';
import { getSymptoms, SymptomLog } from '../../utils/symptomStorage';
import { getNotes, NoteLog } from '../../utils/noteStorage';
import { getVitals, VitalReading } from '../../utils/vitalsStorage';
import { CoffeeMomentModal } from '../../components/CoffeeMomentModal';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { QuickLogCard } from '../../components/today/QuickLogCard';
import { InsightCard } from '../../components/today/InsightCard';
import { Timeline } from '../../components/today/Timeline';
import { useTimeline } from '../../hooks/useTimeline';
import { addDays, format } from 'date-fns';

export default function TodayScreen() {
  const router = useRouter();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [dailyTracking, setDailyTracking] = useState<any>(null);
  const [symptoms, setSymptoms] = useState<SymptomLog[]>([]);
  const [notes, setNotes] = useState<NoteLog[]>([]);
  const [vitals, setVitals] = useState<VitalReading[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [coffeeMomentVisible, setCoffeeMomentVisible] = useState(false);
  const [hasPausedToday, setHasPausedToday] = useState(false);

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

      // Load today's logged data
      const allSymptoms = await getSymptoms();
      const todaySymptoms = allSymptoms.filter(s => s.date === today);
      setSymptoms(todaySymptoms);

      const allNotes = await getNotes();
      const todayNotes = allNotes.filter(n => n.date === today);
      setNotes(todayNotes);

      const allVitals = await getVitals();
      const todayVitals = allVitals.filter(v => {
        const vitalDate = new Date(v.timestamp).toISOString().split('T')[0];
        return vitalDate === today;
      });
      setVitals(todayVitals);
    } catch (error) {
      console.error('Error loading TODAY data:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  // Helper functions
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getDateLabel = () => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    }).toUpperCase();
  };

  const getStatus = () => {
    const mood = dailyTracking?.mood;
    if (!mood) return { label: 'Steady', color: Colors.green };
    if (mood >= 7) return { label: 'Great', color: Colors.green };
    if (mood >= 5) return { label: 'Steady', color: Colors.green };
    if (mood >= 3) return { label: 'Managing', color: Colors.gold };
    return { label: 'Difficult', color: Colors.red };
  };

  const getSummaryLine = () => {
    const tasksLeft = getTasksRemaining();
    const status = getStatus();

    if (tasksLeft === 0) {
      return `Mom's having a ${status.label.toLowerCase()} day. All tasks complete.`;
    }
    return `Mom's having a ${status.label.toLowerCase()} day. ${tasksLeft} task${tasksLeft !== 1 ? 's' : ''} left.`;
  };

  const getTasksRemaining = () => {
    return medications.filter((m) => !m.taken).length;
  };

  const getNextAction = () => {
    const hour = new Date().getHours();
    const morningMeds = medications.filter((m) => m.timeSlot === 'morning' && !m.taken);
    const eveningMeds = medications.filter((m) => m.timeSlot === 'evening' && !m.taken);

    if (hour < 12 && morningMeds.length > 0) {
      return {
        icon: '💊',
        title: 'Morning medications',
        subtitle: `${morningMeds.length} med${morningMeds.length !== 1 ? 's' : ''} due at 8:00 AM`,
        action: () => router.push('/medication-confirm'),
      };
    }

    if (hour >= 17 && eveningMeds.length > 0) {
      return {
        icon: '💊',
        title: 'Evening medications',
        subtitle: `${eveningMeds.length} med${eveningMeds.length !== 1 ? 's' : ''} due at 6:00 PM`,
        action: () => router.push('/medication-confirm'),
      };
    }

    return null;
  };

  const getTimelineItems = (): Array<{
    time: string;
    title: string;
    status: string;
    completed: boolean;
    isPending: boolean;
    timestamp: number;
    isAppointment?: boolean;
    isSymptom?: boolean;
    isVital?: boolean;
    isNote?: boolean;
  }> => {
    const items = [];
    const hour = new Date().getHours();

    // Morning meds
    const morningMeds = medications.filter((m) => m.timeSlot === 'morning');
    if (morningMeds.length > 0) {
      const allTaken = morningMeds.every((m) => m.taken);
      items.push({
        time: '8:00 AM',
        title: 'Morning medications',
        status: allTaken ? `${morningMeds.length} taken` : `${morningMeds.filter(m => !m.taken).length} to take`,
        completed: allTaken,
        isPending: hour < 12 && !allTaken,
        timestamp: new Date().setHours(8, 0, 0, 0),
      });
    }

    // Evening meds
    const eveningMeds = medications.filter((m) => m.timeSlot === 'evening');
    if (eveningMeds.length > 0) {
      const allTaken = eveningMeds.every((m) => m.taken);
      items.push({
        time: '6:00 PM',
        title: 'Evening medications',
        status: allTaken ? `${eveningMeds.length} taken` : `${eveningMeds.filter(m => !m.taken).length} to take`,
        completed: allTaken,
        isPending: hour >= 17 && !allTaken,
        timestamp: new Date().setHours(18, 0, 0, 0),
      });
    }

    // Today's appointments
    const todayAppts = appointments.filter((appt) => {
      const apptDate = new Date(appt.date);
      const today = new Date();
      return (
        apptDate.getDate() === today.getDate() &&
        apptDate.getMonth() === today.getMonth() &&
        apptDate.getFullYear() === today.getFullYear()
      );
    });

    todayAppts.forEach((appt) => {
      const [hours, minutes] = (appt.time || '12:00').split(':').map(Number);
      items.push({
        time: formatTime(appt.time || '12:00'),
        title: `${appt.provider} — ${appt.specialty}`,
        status: 'Upcoming',
        completed: false,
        isPending: false,
        isAppointment: true,
        timestamp: new Date().setHours(hours, minutes, 0, 0),
      });
    });

    // Symptoms
    symptoms.forEach((symptom) => {
      const date = new Date(symptom.timestamp);
      items.push({
        time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        title: `Symptom: ${symptom.symptom}`,
        status: `Severity ${symptom.severity}/10`,
        completed: true,
        isPending: false,
        isSymptom: true,
        timestamp: date.getTime(),
      });
    });

    // Vitals
    const groupedVitals = vitals.reduce((acc, vital) => {
      const date = new Date(vital.timestamp);
      const key = `${date.getHours()}:${date.getMinutes()}`;
      if (!acc[key]) {
        acc[key] = { timestamp: date.getTime(), vitals: [] };
      }
      acc[key].vitals.push(vital);
      return acc;
    }, {} as Record<string, { timestamp: number; vitals: VitalReading[] }>);

    Object.values(groupedVitals).forEach(({ timestamp, vitals: vitalGroup }) => {
      const date = new Date(timestamp);
      const vitalTypes = vitalGroup.map(v => {
        if (v.type === 'systolic' || v.type === 'diastolic') return 'BP';
        if (v.type === 'glucose') return 'Glucose';
        if (v.type === 'weight') return 'Weight';
        return v.type;
      }).filter((v, i, a) => a.indexOf(v) === i).join(', ');

      items.push({
        time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        title: `Vitals: ${vitalTypes}`,
        status: 'Logged',
        completed: true,
        isPending: false,
        isVital: true,
        timestamp,
      });
    });

    // Notes
    notes.forEach((note) => {
      const date = new Date(note.timestamp);
      const preview = note.content.length > 30 ? note.content.substring(0, 30) + '...' : note.content;
      items.push({
        time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        title: `Note: ${preview}`,
        status: 'Logged',
        completed: true,
        isPending: false,
        isNote: true,
        timestamp: date.getTime(),
      });
    });

    // Sort by timestamp
    return items.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours % 12 || 12;
    return `${displayHour}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  const isEvening = () => {
    return new Date().getHours() >= 17;
  };

  const isCheckInComplete = () => {
    return dailyTracking?.mood !== null && dailyTracking?.mood !== undefined;
  };

  const nextAction = getNextAction();
  const status = getStatus();
  const timelineItems = getTimelineItems();

  // Calculate tomorrow's item count for timeline row
  const getTomorrowItemCount = (): number => {
    const tomorrow = addDays(new Date(), 1);
    let count = 2; // Always has morning + evening wellness checks

    // Check for tomorrow's appointments
    const tomorrowAppts = appointments.filter((appt) => {
      const apptDate = new Date(appt.date);
      return (
        apptDate.getDate() === tomorrow.getDate() &&
        apptDate.getMonth() === tomorrow.getMonth() &&
        apptDate.getFullYear() === tomorrow.getFullYear()
      );
    });
    count += tomorrowAppts.length;

    // Add medication items if any active meds
    const morningMeds = medications.filter(m => m.timeSlot === 'morning');
    const eveningMeds = medications.filter(m => m.timeSlot === 'evening');
    if (morningMeds.length > 0) count++;
    if (eveningMeds.length > 0) count++;

    return count;
  };

  // Transform data for new timeline
  const timelineMedications = medications.map((med) => ({
    id: med.id,
    name: med.name,
    timeSlot: med.timeSlot as 'morning' | 'evening' | 'afternoon' | 'bedtime',
    scheduledHour: med.timeSlot === 'morning' ? 8 : 18,
    scheduledMinute: 0,
    taken: med.taken || false,
    takenTime: med.lastTaken ? new Date(med.lastTaken) : undefined,
  }));

  const timelineAppointments = appointments.map((apt) => ({
    id: apt.id,
    provider: apt.provider,
    specialty: apt.specialty,
    date: apt.date,
    time: apt.time || '12:00',
    location: apt.location,
  }));

  const { items: timelineItemsNew, overdueCount } = useTimeline({
    medications: timelineMedications,
    appointments: timelineAppointments,
    today: new Date(),
  });

  const tomorrowItemCount = getTomorrowItemCount();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        {/* Header */}
        <ScreenHeader
          label={getDateLabel()}
          title={getGreeting()}
          subtitle={getSummaryLine()}
          rightAction={{
            type: 'button',
            icon: '☕',
            label: 'Pause',
            variant: 'purple',
            onPress: () => setCoffeeMomentVisible(true),
          }}
        />
        <View style={styles.divider} />

        {/* Coffee Moment Modal */}
        <CoffeeMomentModal
          visible={coffeeMomentVisible}
          onClose={() => {
            setCoffeeMomentVisible(false);
            setHasPausedToday(true);
          }}
        />

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
          }
        >
          {/* AI Insights Card */}
          <View style={styles.section}>
            <InsightCard medications={medications} />
          </View>

          {/* Timeline */}
          <View style={styles.section}>
            <Timeline items={timelineItemsNew} tomorrowCount={tomorrowItemCount} />
          </View>

          {/* Quick Log */}
          <View style={styles.section}>
            <QuickLogCard />
          </View>

          {/* Evening Check-in Prompt */}
          {isEvening() && !isCheckInComplete() && (
            <TouchableOpacity
              style={styles.checkInCard}
              onPress={() => router.push('/daily-checkin')}
            >
              <Text style={styles.checkInIcon}>🌙</Text>
              <View style={styles.checkInContent}>
                <Text style={styles.checkInTitle}>Evening check-in</Text>
                <Text style={styles.checkInSubtitle}>Log mood, energy, meals (~60s)</Text>
              </View>
              <Text style={styles.checkInArrow}>→</Text>
            </TouchableOpacity>
          )}

          {/* Encouragement Footer */}
          <View style={styles.encouragement}>
            <Text style={styles.encouragementText}>
              ✨ You're doing great. One thing at a time.
            </Text>
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
    backgroundColor: Colors.background,
  },
  gradient: {
    flex: 1,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 20,
  },

  // Content
  content: {
    flex: 1,
    padding: 20,
  },

  // Section
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.5,
    color: 'rgba(255, 255, 255, 0.4)',
    marginBottom: 10,
  },

  // Next Action Card
  nextActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.goldLight,
    borderWidth: 1,
    borderColor: Colors.goldBorder,
    borderRadius: 16,
    padding: 18,
    gap: 14,
  },
  nextActionIcon: {
    fontSize: 32,
  },
  nextActionContent: {
    flex: 1,
  },
  nextActionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  nextActionSubtitle: {
    fontSize: 13,
    color: Colors.gold,
  },
  nextActionArrow: {
    fontSize: 24,
    color: Colors.gold,
  },

  // Timeline
  timeline: {
    position: 'relative',
    paddingLeft: 32,
  },
  timelineLine: {
    position: 'absolute',
    left: 11,
    top: 12,
    bottom: 12,
    width: 2,
    backgroundColor: 'rgba(20, 184, 166, 0.2)',
  },
  timelineItem: {
    position: 'relative',
    marginBottom: 24,
  },
  timelineDot: {
    position: 'absolute',
    left: -30,
    top: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(20, 184, 166, 0.3)',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotComplete: {
    backgroundColor: Colors.green,
    borderColor: Colors.green,
  },
  timelineDotPending: {
    borderColor: Colors.gold,
    backgroundColor: Colors.goldLight,
  },
  timelineDotAppointment: {
    borderColor: Colors.blue,
    backgroundColor: Colors.blueLight,
  },
  timelineDotSymptom: {
    borderColor: '#F87171',
    backgroundColor: 'rgba(248, 113, 113, 0.2)',
  },
  timelineDotVital: {
    borderColor: '#818CF8',
    backgroundColor: 'rgba(129, 140, 248, 0.2)',
  },
  timelineDotNote: {
    borderColor: '#FCD34D',
    backgroundColor: 'rgba(252, 211, 77, 0.2)',
  },
  timelineDotCheck: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  timelineContent: {
    paddingLeft: 8,
  },
  timelineTime: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    marginBottom: 2,
  },
  timelineTitle: {
    fontSize: 14,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  timelineStatus: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  timelineStatusComplete: {
    color: Colors.green,
  },
  timelineStatusPending: {
    color: Colors.gold,
  },

  // Evening Check-in Card
  checkInCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.purpleLight,
    borderWidth: 1,
    borderColor: Colors.purpleBorder,
    borderRadius: 14,
    padding: 16,
    gap: 12,
    marginBottom: 20,
  },
  checkInIcon: {
    fontSize: 24,
  },
  checkInContent: {
    flex: 1,
  },
  checkInTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  checkInSubtitle: {
    fontSize: 12,
    color: '#A78BFA',
  },
  checkInArrow: {
    fontSize: 20,
    color: '#A78BFA',
  },

  // Encouragement
  encouragement: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  encouragementText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
  },
});
