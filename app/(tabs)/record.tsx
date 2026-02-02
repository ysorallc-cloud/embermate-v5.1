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
import {
  getRhythm,
  getTodayProgress,
  setFirstUseDate,
  Rhythm,
  TodayProgress,
} from '../../utils/rhythmStorage';

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

  // Rhythm state
  const [rhythm, setRhythm] = useState<Rhythm | null>(null);
  const [todayProgress, setTodayProgress] = useState<TodayProgress | null>(null);

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

      // Set first use date if not set
      await setFirstUseDate();

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
        rhythmData,
        progressData,
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
        getRhythm(),
        getTodayProgress(),
      ]);

      // Set rhythm data
      setRhythm(rhythmData);
      setTodayProgress(progressData);

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

  // Render rhythm panel (only shows on Day 4+)
  const renderRhythmPanel = () => {
    if (!rhythm) return null;

    const panelTitle = rhythm.isInferred ? "Observed Rhythm" : "Today's Rhythm";

    return (
      <View style={styles.rhythmPanel}>
        <View style={styles.rhythmContent}>
          <Text style={[styles.rhythmTitle, rhythm.isInferred && styles.rhythmTitleObserved]}>
            {panelTitle}
          </Text>
          <Text style={styles.rhythmBaseline}>
            {rhythm.medications > 0 && (
              <>
                <Text style={styles.rhythmLabel}>Medications:</Text> {rhythm.medications} doses
                {(rhythm.vitals > 0 || rhythm.meals > 0) && ' • '}
              </>
            )}
            {rhythm.vitals > 0 && (
              <>
                <Text style={styles.rhythmLabel}>Vitals:</Text> {rhythm.vitals} checks
                {rhythm.meals > 0 && ' • '}
              </>
            )}
            {rhythm.meals > 0 && (
              <>
                <Text style={styles.rhythmLabel}>Meals:</Text> {rhythm.meals}
              </>
            )}
          </Text>
        </View>
        <View style={styles.rhythmFooter}>
          <TouchableOpacity onPress={() => router.push('/rhythm-edit' as any)}>
            <Text style={styles.rhythmLink}>Adjust if needed</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Generate medication status text
  const getMedicationStatusText = (): { text: string; done: boolean } | undefined => {
    // If rhythm exists, show progress against expected
    if (todayProgress && todayProgress.medications.expected > 0) {
      const { completed, expected } = todayProgress.medications;
      const done = completed >= expected;
      return { text: `${completed}/${expected}`, done };
    }

    // Fallback to existing logic
    if (medications.length === 0) return undefined;
    if (medicationsTaken === medications.length) {
      return { text: 'Nothing to do', done: true };
    }
    const remaining = medications.length - medicationsTaken;
    return { text: `${remaining} remaining`, done: false };
  };

  // Quick items - 1-tap, low effort
  const quickItems: LogItemData[] = [
    {
      id: 'mood',
      emoji: '😊',
      question: 'How are they feeling?',
      hint: 'Mood & energy',
      status: moodLogged ? { text: '✓ Logged', done: true } : undefined,
      route: '/log-mood',
    },
    {
      id: 'water',
      emoji: '💧',
      question: 'Water today?',
      hint: 'Quick count',
      status: waterGlasses > 0 ? { text: `${waterGlasses} glasses`, done: waterGlasses >= 8 } : undefined,
      route: '/log-water',
    },
    {
      id: 'meals',
      emoji: '🍽️',
      question: 'Did they eat?',
      hint: 'Meals today',
      status: (() => {
        if (todayProgress && todayProgress.meals.expected > 0) {
          const { completed, expected } = todayProgress.meals;
          return { text: `${completed}/${expected}`, done: completed >= expected };
        }
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
      route: '/medication-confirm',
    },
    {
      id: 'vitals',
      emoji: '📊',
      question: 'Check vitals?',
      hint: 'BP, heart rate, etc.',
      status: (() => {
        if (todayProgress && todayProgress.vitals.expected > 0) {
          const { completed, expected } = todayProgress.vitals;
          return { text: `${completed}/${expected}`, done: completed >= expected };
        }
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
      question: 'Log appointment?',
      hint: 'Doctor visits & notes',
      status: appointmentsCount > 0 ? { text: `${appointmentsCount} scheduled`, done: true } : undefined,
      route: '/log-appointment',
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

  if (loading) {
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

        {/* Rhythm Panel - Only shows on Day 4+ */}
        {renderRhythmPanel()}

        {/* Group 1: Quick */}
        <Text style={styles.groupHeader}>QUICK</Text>
        {quickItems.map(renderLogItem)}

        {/* Group 2: More detail */}
        <Text style={styles.groupHeader}>MORE DETAIL</Text>
        {momentItems.map(renderLogItem)}

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

  // Rhythm Panel
  rhythmPanel: {
    backgroundColor: 'rgba(74, 222, 128, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.2)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  rhythmContent: {
    gap: 6,
  },
  rhythmTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rhythmTitleObserved: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontWeight: '500',
  },
  rhythmBaseline: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
  },
  rhythmLabel: {
    color: '#4ade80',
    fontWeight: '600',
  },
  rhythmFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  rhythmLink: {
    fontSize: 10,
    color: 'rgba(74, 222, 128, 0.5)',
    fontWeight: '400',
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
