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
import { emitDataUpdate } from '../../lib/events';

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
  const [vitalsLogged, setVitalsLogged] = useState(false);
  const [moodLogged, setMoodLogged] = useState(false);
  const [sleepLogged, setSleepLogged] = useState(false);
  const [mealsLogged, setMealsLogged] = useState(0);
  const [waterGlasses, setWaterGlasses] = useState(0);
  const [symptomsLogged, setSymptomsLogged] = useState(false);
  const [notesLogged, setNotesLogged] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadTodayData();
    }, [])
  );

  // Handle navigation params to auto-expand sections
  useEffect(() => {
    if (params.expandSection) {
      // Could be used to scroll to or highlight a section
      setShowMoreItems(params.expandSection === 'symptoms');
    }
  }, [params.expandSection]);

  const loadTodayData = async () => {
    try {
      setLoading(true);

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
      ]);

      const activeMeds = allMeds.filter(m => m.active !== false);
      setMedications(activeMeds);
      setMedicationsTaken(todayMeds?.medicationIds?.length || 0);
      setVitalsLogged(Boolean(todayVitals?.systolic || todayVitals?.heartRate));
      setMoodLogged(todayMood?.mood !== null && todayMood?.mood !== undefined);
      setSleepLogged(Boolean(todaySleep?.hours));
      setMealsLogged(todayMeals?.meals?.length || 0);
      setWaterGlasses(todayWater?.glasses || 0);
      setSymptomsLogged(Boolean(todaySymptoms?.symptoms?.length));
      setNotesLogged(Boolean(todayNotes?.content));
    } catch (error) {
      console.error('Error loading Record data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleItemPress = (route: string) => {
    router.push(route as any);
  };

  // Generate medication status text
  const getMedicationStatusText = (): { text: string; done: boolean } | undefined => {
    if (medications.length === 0) return undefined;
    if (medicationsTaken === medications.length) {
      return { text: 'Nothing to do ✓', done: true };
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
      status: mealsLogged > 0 ? { text: `${mealsLogged}/3`, done: mealsLogged >= 3 } : undefined,
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
      status: vitalsLogged ? { text: '✓ Logged', done: true } : undefined,
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

  const renderLogItem = (item: LogItemData) => (
    <TouchableOpacity
      key={item.id}
      style={styles.logItem}
      onPress={() => handleItemPress(item.route)}
      activeOpacity={0.7}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`${item.question}. ${item.status?.text || item.hint}`}
    >
      <View style={styles.itemIcon}>
        <Text style={styles.iconEmoji}>{item.emoji}</Text>
      </View>
      <View style={styles.itemContent}>
        <Text style={styles.itemQuestion}>{item.question}</Text>
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

        {/* NO PROGRESS BAR - Removes pressure */}

        {/* Group 1: Quick */}
          <Text style={styles.groupHeader}>QUICK</Text>
          {quickItems.map(renderLogItem)}

          {/* Group 2: Takes a moment */}
          <Text style={styles.groupHeader}>TAKES A MOMENT</Text>
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

  // Group Headers
  groupHeader: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,                           // Reduced from 12
    marginTop: 20,                              // Reduced from 24
  },

  // Log Items - STANDARD sizing
  logItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 14,             // STANDARD
    padding: 14,                  // STANDARD
    marginBottom: 8,              // Reduced from 10
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,                      // STANDARD
    minHeight: 68,                // Slightly reduced from 72
  },
  itemIcon: {
    width: 48,                    // STANDARD
    height: 48,                   // STANDARD
    backgroundColor: 'rgba(94, 234, 212, 0.15)',
    borderRadius: 12,             // STANDARD
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 24,                 // Increased for larger icon
  },
  itemContent: {
    flex: 1,
  },
  itemQuestion: {
    fontSize: 15,                 // STANDARD
    fontWeight: '600',            // STANDARD
    color: '#FFFFFF',
    marginBottom: 2,
  },
  itemHint: {
    fontSize: 11,                 // STANDARD
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
    paddingVertical: 12,                        // Reduced from 16
    marginTop: 6,                               // Reduced from 10
  },
  moreItemsLink: {
    color: 'rgba(94, 234, 212, 0.7)',
    fontSize: 12,                               // Reduced from 13
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
