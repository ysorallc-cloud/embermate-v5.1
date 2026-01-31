// ============================================================================
// LOG TAB - Quick Capture (Redesigned)
// V3.1: 3×2 grid, secondary actions, collapsible history
// ============================================================================

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
  Modal,
  Animated,
  PanResponder,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuroraBackground } from '../../components/aurora/AuroraBackground';
import { GlassCard } from '../../components/aurora/GlassCard';
import { Colors, Spacing, Typography } from '../../theme/theme-tokens';
import { getMedications } from '../../utils/medicationStorage';
import { getVitals, deleteVital } from '../../utils/vitalsStorage';
import { getNotes, deleteNote } from '../../utils/noteStorage';
import { getDailyTracking } from '../../utils/dailyTrackingStorage';
import { getSymptoms, deleteSymptom } from '../../utils/symptomStorage';

const SWIPE_THRESHOLD = -80;

// Primary actions - 6 items for 3×2 grid (FIXED: unique colors)
const PRIMARY_LOGS = [
  { id: 'meds', icon: '💊', label: 'Meds', color: Colors.amber, route: '/medication-confirm' },
  { id: 'vitals', icon: '🫀', label: 'Vitals', color: Colors.rose, route: '/log-vitals' },
  { id: 'symptoms', icon: '🩺', label: 'Symptoms', color: Colors.orange, route: '/log-symptom' },
  { id: 'mood', icon: '😊', label: 'Mood', color: Colors.gold, route: '/log-mood' },
  { id: 'sleep', icon: '😴', label: 'Sleep', color: Colors.indigo, route: '/log-sleep' },
  { id: 'nutrition', icon: '🍽️', label: 'Meals', color: Colors.green, route: '/log-meal' },
];

// Secondary actions - compact row (Voice Note removed - merged into Notes)
const SECONDARY_LOGS = [
  { id: 'notes', icon: '📝', label: 'Note', color: Colors.accent, route: '/log-note' },
];

// Water storage key
const WATER_STORAGE_KEY = '@embermate_water_today';
const WATER_GOAL = 8; // glasses per day

interface LogEntry {
  id: string;
  icon: string;
  type: string;
  value: string;
  time: string;
  route?: string;
}

// Storage key for onboarding
const ONBOARDING_KEY = 'log_onboarding_shown';

export default function LogTab() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [recentLogs, setRecentLogs] = useState<LogEntry[]>([]);
  const [historyExpanded, setHistoryExpanded] = useState(true);
  const [todayCount, setTodayCount] = useState(0);

  // Onboarding modal state
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Quick action menu state
  const [selectedEntry, setSelectedEntry] = useState<LogEntry | null>(null);
  const [showActionMenu, setShowActionMenu] = useState(false);

  // Sequential logging state
  const [showSequentialPrompt, setShowSequentialPrompt] = useState(false);
  const [lastLoggedType, setLastLoggedType] = useState<string | null>(null);

  // Water counter state
  const [waterCount, setWaterCount] = useState(0);

  // Contextual info state
  const [medsInfo, setMedsInfo] = useState({ pending: 0, total: 0, allTaken: false });
  const [vitalsInfo, setVitalsInfo] = useState<{ lastReading: string | null; lastTime: string | null }>({ lastReading: null, lastTime: null });
  const [sleepInfo, setSleepInfo] = useState<string | null>(null);
  const [mealsLogged, setMealsLogged] = useState(0);

  // Check for first-time visit
  useEffect(() => {
    checkOnboarding();
  }, []);

  const checkOnboarding = async () => {
    try {
      const shown = await AsyncStorage.getItem(ONBOARDING_KEY);
      if (!shown) {
        setShowOnboarding(true);
      }
    } catch (error) {
      console.error('Error checking onboarding:', error);
    }
  };

  const dismissOnboarding = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      setShowOnboarding(false);
    } catch (error) {
      console.error('Error dismissing onboarding:', error);
    }
  };

  // Load water count for today
  const loadWaterCount = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const data = await AsyncStorage.getItem(WATER_STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.date === today) {
          setWaterCount(parsed.count);
        } else {
          // Reset for new day
          setWaterCount(0);
        }
      }
    } catch (error) {
      console.error('Error loading water count:', error);
    }
  };

  // Increment water count
  const incrementWater = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const newCount = Math.min(waterCount + 1, WATER_GOAL + 4); // Allow up to 12 glasses
      setWaterCount(newCount);
      await AsyncStorage.setItem(WATER_STORAGE_KEY, JSON.stringify({ date: today, count: newCount }));
    } catch (error) {
      console.error('Error incrementing water:', error);
    }
  };

  // Load contextual info for buttons
  const loadContextualInfo = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Meds info
      const meds = await getMedications();
      const activeMeds = meds.filter(m => m.active !== false);
      const takenToday = activeMeds.filter(m => {
        if (!m.lastTaken) return false;
        return new Date(m.lastTaken).toISOString().split('T')[0] === today && m.taken;
      });
      setMedsInfo({
        pending: activeMeds.length - takenToday.length,
        total: activeMeds.length,
        allTaken: takenToday.length >= activeMeds.length && activeMeds.length > 0,
      });

      // Vitals info - check for BP readings (systolic/diastolic)
      const vitals = await getVitals();
      const todayVitals = vitals.filter(v => new Date(v.timestamp).toISOString().split('T')[0] === today);
      if (todayVitals.length > 0) {
        // Look for BP readings first
        const systolic = todayVitals.find(v => v.type === 'systolic');
        const diastolic = todayVitals.find(v => v.type === 'diastolic');
        let displayReading: string;
        if (systolic && diastolic) {
          displayReading = `${systolic.value}/${diastolic.value}`;
        } else {
          const latest = todayVitals[todayVitals.length - 1];
          displayReading = `${latest.value}${latest.unit || ''}`;
        }
        setVitalsInfo({
          lastReading: displayReading,
          lastTime: format(new Date(todayVitals[todayVitals.length - 1].timestamp), 'h:mm a'),
        });
      } else {
        setVitalsInfo({ lastReading: null, lastTime: null });
      }

      // Sleep info - check daily tracking
      const tracking = await getDailyTracking(today);
      if (tracking?.sleep) {
        setSleepInfo(`${tracking.sleep}h`);
      } else {
        setSleepInfo(null);
      }

      // Meals logged count
      const notes = await getNotes();
      const mealNotes = notes.filter(n => n.date === today);
      setMealsLogged(mealNotes.length);
    } catch (error) {
      console.error('Error loading contextual info:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadRecentLogs();
      loadWaterCount();
      loadContextualInfo();

      // Check if returning from a log action (sequential logging)
      if (params.justLogged) {
        setLastLoggedType(params.justLogged as string);
        setShowSequentialPrompt(true);
      }
    }, [params.justLogged])
  );

  const loadRecentLogs = async () => {
    const today = new Date().toISOString().split('T')[0];
    const logs: LogEntry[] = [];

    try {
      // Get medications taken today
      const meds = await getMedications();
      const takenMeds = meds.filter((m) => {
        if (!m.lastTaken) return false;
        const takenDate = new Date(m.lastTaken).toISOString().split('T')[0];
        return takenDate === today && m.taken;
      });
      takenMeds.forEach((med) => {
        logs.push({
          id: `med-${med.id}`,
          icon: '💊',
          type: 'Medication',
          value: med.name,
          time: format(new Date(med.lastTaken!), 'h:mm a'),
          route: '/medication-confirm',
        });
      });

      // Get vitals logged today
      const vitals = await getVitals();
      const todayVitals = vitals.filter((v) => {
        const vitalDate = new Date(v.timestamp).toISOString().split('T')[0];
        return vitalDate === today;
      });
      todayVitals.forEach((vital) => {
        logs.push({
          id: `vital-${vital.timestamp}`,
          icon: '🫀',
          type: 'Vitals',
          value: `${vital.type}: ${vital.value}${vital.unit || ''}`,
          time: format(new Date(vital.timestamp), 'h:mm a'),
          route: '/log-vitals',
        });
      });

      // Get notes logged today
      const notes = await getNotes();
      const todayNotes = notes.filter((n) => n.date === today);
      todayNotes.forEach((note) => {
        logs.push({
          id: `note-${note.id}`,
          icon: '📝',
          type: 'Note',
          value: note.content.substring(0, 40) + (note.content.length > 40 ? '...' : ''),
          time: format(new Date(note.timestamp), 'h:mm a'),
          route: '/log-note',
        });
      });

      // Get symptoms logged today
      const symptoms = await getSymptoms();
      const todaySymptoms = symptoms.filter((s) => s.date === today);
      todaySymptoms.forEach((symptom) => {
        logs.push({
          id: `symptom-${symptom.id}`,
          icon: '🩺',
          type: 'Symptom',
          value: symptom.symptom,
          time: format(new Date(symptom.timestamp || Date.now()), 'h:mm a'),
          route: '/log-symptom',
        });
      });

      // Get daily tracking (mood, etc.)
      const tracking = await getDailyTracking(today);
      if (tracking?.mood) {
        logs.push({
          id: 'mood',
          icon: '😊',
          type: 'Mood',
          value: `${tracking.mood}/10`,
          time: format(new Date(), 'h:mm a'),
          route: '/log-mood',
        });
      }

      // Sort by time (most recent first)
      logs.sort((a, b) => {
        const timeA = new Date(`${today} ${a.time}`);
        const timeB = new Date(`${today} ${b.time}`);
        return timeB.getTime() - timeA.getTime();
      });

      setTodayCount(logs.length);
      setRecentLogs(logs.slice(0, 8)); // Show more entries
    } catch (error) {
      console.error('Error loading recent logs:', error);
    }
  };

  // Time-based contextual tip (memoized to prevent recalculation)
  const tip = useMemo(() => {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 10) {
      return {
        icon: '🌅',
        text: 'Morning vitals are most consistent for tracking patterns.',
      };
    } else if (hour >= 10 && hour < 12) {
      return {
        icon: '💧',
        text: 'Mid-morning is a great time to log water intake.',
      };
    } else if (hour >= 12 && hour < 14) {
      return {
        icon: '🥗',
        text: 'Log your lunch to track nutrition patterns.',
      };
    } else if (hour >= 14 && hour < 17) {
      return {
        icon: '🩺',
        text: 'Afternoon check: Note any symptoms or changes.',
      };
    } else if (hour >= 17 && hour < 20) {
      return {
        icon: '💊',
        text: 'Evening medications due? Log them now.',
      };
    } else if (hour >= 20 && hour < 23) {
      return {
        icon: '😊',
        text: 'End of day: How was your mood and energy?',
      };
    } else {
      return {
        icon: '😴',
        text: 'Track sleep quality in the morning for better insights.',
      };
    }
  }, []);

  // Open quick action menu on entry tap
  const handleEntryPress = (entry: LogEntry) => {
    setSelectedEntry(entry);
    setShowActionMenu(true);
  };

  // Quick action: Log Again (navigate to log screen with prefill)
  const handleLogAgain = () => {
    if (selectedEntry?.route) {
      setShowActionMenu(false);
      router.push(selectedEntry.route as any);
    }
  };

  // Quick action: Edit (same as log again for now)
  const handleEdit = () => {
    if (selectedEntry?.route) {
      setShowActionMenu(false);
      router.push(selectedEntry.route as any);
    }
  };

  // Quick action: Delete entry
  const handleDelete = async () => {
    if (!selectedEntry) return;

    Alert.alert(
      'Delete Entry',
      `Are you sure you want to delete this ${selectedEntry.type.toLowerCase()} entry?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete based on entry type
              if (selectedEntry.id.startsWith('vital-')) {
                const timestamp = selectedEntry.id.replace('vital-', '');
                await deleteVital(timestamp);
              } else if (selectedEntry.id.startsWith('note-')) {
                const noteId = selectedEntry.id.replace('note-', '');
                await deleteNote(noteId);
              } else if (selectedEntry.id.startsWith('symptom-')) {
                const symptomId = selectedEntry.id.replace('symptom-', '');
                await deleteSymptom(symptomId);
              }
              // Reload logs after deletion
              await loadRecentLogs();
            } catch (error) {
              console.error('Error deleting entry:', error);
              Alert.alert('Error', 'Failed to delete entry. Please try again.');
            }
            setShowActionMenu(false);
            setSelectedEntry(null);
          },
        },
      ]
    );
  };

  // Dismiss sequential logging prompt
  const dismissSequentialPrompt = () => {
    setShowSequentialPrompt(false);
    setLastLoggedType(null);
  };

  // Get suggested next logs for sequential logging
  const getSequentialSuggestions = () => {
    const suggestions = PRIMARY_LOGS.filter(log => log.label !== lastLoggedType).slice(0, 3);
    return suggestions;
  };

  // Get contextual info for each button
  const getButtonContext = (id: string): { badge?: string; subtext?: string; complete?: boolean } => {
    switch (id) {
      case 'meds':
        if (medsInfo.allTaken) return { complete: true, subtext: 'All taken ✓' };
        if (medsInfo.pending > 0) return { badge: `${medsInfo.pending}`, subtext: `${medsInfo.pending} pending` };
        return {};
      case 'vitals':
        if (vitalsInfo.lastReading) return { subtext: vitalsInfo.lastReading, complete: true };
        return { subtext: 'Not logged' };
      case 'sleep':
        if (sleepInfo) return { subtext: sleepInfo, complete: true };
        return { subtext: 'Log sleep' };
      case 'nutrition':
        return { subtext: `${mealsLogged}/3 meals` };
      default:
        return {};
    }
  };

  // Swipeable Log Entry Component
  const SwipeableLogEntry = ({ entry, index, isLast }: { entry: LogEntry; index: number; isLast: boolean }) => {
    const translateX = useRef(new Animated.Value(0)).current;
    const [isSwiping, setIsSwiping] = useState(false);

    const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          // Only respond to horizontal swipes
          return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10;
        },
        onPanResponderGrant: () => {
          setIsSwiping(true);
        },
        onPanResponderMove: (_, gestureState) => {
          // Only allow left swipe (negative dx)
          if (gestureState.dx < 0) {
            translateX.setValue(Math.max(gestureState.dx, -100));
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          setIsSwiping(false);
          if (gestureState.dx < SWIPE_THRESHOLD) {
            // Show delete confirmation
            setSelectedEntry(entry);
            handleDelete();
            // Reset position
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
            }).start();
          } else {
            // Snap back
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
            }).start();
          }
        },
      })
    ).current;

    return (
      <View style={styles.swipeContainer}>
        {/* Delete background */}
        <View style={styles.deleteBackground}>
          <Text style={styles.deleteText}>🗑️ Delete</Text>
        </View>

        {/* Swipeable content */}
        <Animated.View
          style={[
            styles.swipeableContent,
            { transform: [{ translateX }] },
          ]}
          {...panResponder.panHandlers}
        >
          <TouchableOpacity
            style={[
              styles.logRow,
              !isLast && styles.logRowBorder,
            ]}
            onPress={() => !isSwiping && handleEntryPress(entry)}
            activeOpacity={0.7}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={`${entry.type}: ${entry.value}. Logged at ${entry.time}`}
            accessibilityHint="Double tap to open actions. Swipe left to delete"
          >
            <Text style={styles.logIcon}>{entry.icon}</Text>
            <View style={styles.logContent}>
              <Text style={styles.logType}>{entry.type}</Text>
              <Text style={styles.logValue}>{entry.value}</Text>
            </View>
            <Text style={styles.logTime}>{entry.time}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <AuroraBackground variant="log" />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Header with daily count badge */}
          <View style={styles.header}>
            <View>
              <Text style={styles.subtitle}>QUICK CAPTURE</Text>
              <Text style={styles.title}>Log</Text>
            </View>
            {todayCount > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{todayCount} entries today</Text>
              </View>
            )}
          </View>

          {/* Primary 3×2 Grid with Contextual Info */}
          <View style={styles.primaryGrid}>
            {PRIMARY_LOGS.map((log) => {
              const context = getButtonContext(log.id);
              return (
                <TouchableOpacity
                  key={log.id}
                  style={styles.primaryItem}
                  onPress={() => router.push(log.route as any)}
                  activeOpacity={0.7}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={`${log.label}${context.subtext ? `. ${context.subtext}` : ''}`}
                  accessibilityHint={`Tap to log ${log.label.toLowerCase()}`}
                >
                  <GlassCard style={[styles.primaryCard, context.complete && styles.primaryCardComplete]}>
                    <View style={styles.primaryCardHeader}>
                      <Text style={styles.primaryIcon}>{log.icon}</Text>
                      {context.badge && (
                        <View style={[styles.buttonBadge, { backgroundColor: `${log.color}30` }]}>
                          <Text style={[styles.buttonBadgeText, { color: log.color }]}>{context.badge}</Text>
                        </View>
                      )}
                      {context.complete && !context.badge && (
                        <Text style={styles.completeCheck}>✓</Text>
                      )}
                    </View>
                    <Text style={styles.primaryLabel}>{log.label}</Text>
                    {context.subtext && (
                      <Text style={[styles.primarySubtext, context.complete && styles.primarySubtextComplete]}>
                        {context.subtext}
                      </Text>
                    )}
                  </GlassCard>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Water Counter + Notes Row */}
          <View style={styles.secondaryRow}>
            {/* Water Counter */}
            <View style={styles.waterCounterContainer}>
              <GlassCard style={styles.waterCounterCard}>
                <View style={styles.waterCounterContent}>
                  <Text style={styles.waterIcon}>💧</Text>
                  <View style={styles.waterInfo}>
                    <Text style={styles.waterLabel}>Water</Text>
                    <Text style={styles.waterProgress}>{waterCount}/{WATER_GOAL} glasses</Text>
                    <View style={styles.waterProgressBar}>
                      <View
                        style={[
                          styles.waterProgressFill,
                          { width: `${Math.min((waterCount / WATER_GOAL) * 100, 100)}%` },
                        ]}
                      />
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.waterPlusButton}
                    onPress={incrementWater}
                    activeOpacity={0.7}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel={`Add water. Currently ${waterCount} of ${WATER_GOAL} glasses`}
                    accessibilityHint="Tap to add one glass of water"
                  >
                    <Text style={styles.waterPlusText} importantForAccessibility="no-hide-descendants">+1</Text>
                  </TouchableOpacity>
                </View>
              </GlassCard>
            </View>

            {/* Notes Button */}
            {SECONDARY_LOGS.map((log) => (
              <TouchableOpacity
                key={log.id}
                style={styles.notesButton}
                onPress={() => router.push(log.route as any)}
                activeOpacity={0.7}
              >
                <GlassCard style={styles.notesCard}>
                  <Text style={styles.notesIcon}>{log.icon}</Text>
                  <Text style={styles.notesLabel}>{log.label}</Text>
                  <Text style={styles.notesSubtext}>Text / Voice</Text>
                </GlassCard>
              </TouchableOpacity>
            ))}
          </View>

          {/* Collapsible Today's Entries */}
          <View style={styles.historySection}>
            <TouchableOpacity
              style={styles.historyHeader}
              onPress={() => setHistoryExpanded(!historyExpanded)}
              activeOpacity={0.7}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`Today's entries. ${historyExpanded ? 'Expanded' : 'Collapsed'}. ${recentLogs.length} entries`}
              accessibilityHint={historyExpanded ? 'Tap to collapse' : 'Tap to expand'}
              accessibilityState={{ expanded: historyExpanded }}
            >
              <Text style={styles.sectionLabel}>TODAY'S ENTRIES</Text>
              <Text style={styles.collapseIcon} importantForAccessibility="no-hide-descendants">
                {historyExpanded ? '▼' : '▶'}
              </Text>
            </TouchableOpacity>

            {historyExpanded && (
              <GlassCard noPadding style={styles.historyCard}>
                {recentLogs.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyIcon}>{tip.icon}</Text>
                    <Text style={styles.emptyTitle}>No logs yet today</Text>
                    <Text style={styles.emptyHint}>
                      Tap 💊 Meds or 🫀 Vitals to start logging
                    </Text>
                    <Text style={styles.emptyTip}>{tip.text}</Text>
                  </View>
                ) : (
                  <>
                    {recentLogs.map((log, index) => (
                      <SwipeableLogEntry
                        key={log.id}
                        entry={log}
                        index={index}
                        isLast={index === recentLogs.length - 1}
                      />
                    ))}
                    <Text style={styles.swipeHint}>← Swipe left to delete</Text>
                  </>
                )}
              </GlassCard>
            )}
          </View>

          {/* View Full History Link */}
          <TouchableOpacity
            style={styles.historyLink}
            onPress={() => router.push('/hub/reports' as any)}
            activeOpacity={0.7}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="View Full History"
            accessibilityHint="Opens reports to see patterns and trends"
          >
            <GlassCard style={styles.historyLinkCard}>
              <View style={styles.historyLinkContent}>
                <Text style={styles.historyLinkIcon}>📊</Text>
                <View style={styles.historyLinkText}>
                  <Text style={styles.historyLinkTitle}>View Full History</Text>
                  <Text style={styles.historyLinkSubtitle}>See patterns & trends</Text>
                </View>
              </View>
              <Text style={styles.historyLinkArrow}>→</Text>
            </GlassCard>
          </TouchableOpacity>

          {/* Contextual Tip (compact, only when history has entries) */}
          {recentLogs.length > 0 && (
            <View style={styles.contextTip}>
              <Text style={styles.contextTipIcon}>{tip.icon}</Text>
              <Text style={styles.contextTipText}>{tip.text}</Text>
            </View>
          )}

          {/* Bottom spacing for tab bar */}
          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>

      {/* Onboarding Modal */}
      <Modal
        visible={showOnboarding}
        transparent
        animationType="fade"
        onRequestClose={dismissOnboarding}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.onboardingModal}>
            <Text style={styles.onboardingEmoji}>👋</Text>
            <Text style={styles.onboardingTitle}>Welcome to Quick Logging!</Text>
            <Text style={styles.onboardingText}>
              Track what matters most for better care insights.
            </Text>
            <View style={styles.onboardingIcons}>
              <View style={styles.onboardingIconItem}>
                <Text style={styles.onboardingIcon}>💊</Text>
                <Text style={styles.onboardingIconLabel}>Medications</Text>
              </View>
              <View style={styles.onboardingIconItem}>
                <Text style={styles.onboardingIcon}>🫀</Text>
                <Text style={styles.onboardingIconLabel}>Vitals</Text>
              </View>
              <View style={styles.onboardingIconItem}>
                <Text style={styles.onboardingIcon}>😊</Text>
                <Text style={styles.onboardingIconLabel}>Mood</Text>
              </View>
            </View>
            <Text style={styles.onboardingHint}>
              Each entry helps reveal patterns over time.
            </Text>
            <TouchableOpacity
              style={styles.onboardingButton}
              onPress={dismissOnboarding}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Get Started"
              accessibilityHint="Dismisses welcome message and starts logging"
            >
              <Text style={styles.onboardingButtonText}>Get Started</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Quick Action Menu Modal */}
      <Modal
        visible={showActionMenu}
        transparent
        animationType="slide"
        onRequestClose={() => setShowActionMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowActionMenu(false)}
        >
          <View style={styles.actionMenuContainer}>
            <View style={styles.actionMenuHeader}>
              <Text style={styles.actionMenuIcon}>{selectedEntry?.icon}</Text>
              <View>
                <Text style={styles.actionMenuTitle}>{selectedEntry?.type}</Text>
                <Text style={styles.actionMenuValue}>{selectedEntry?.value}</Text>
              </View>
            </View>

            <View style={styles.actionMenuDivider} />

            <TouchableOpacity style={styles.actionMenuItem} onPress={handleLogAgain}>
              <Text style={styles.actionMenuItemIcon}>🔄</Text>
              <Text style={styles.actionMenuItemText}>Log Again</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionMenuItem} onPress={handleEdit}>
              <Text style={styles.actionMenuItemIcon}>✏️</Text>
              <Text style={styles.actionMenuItemText}>Edit Details</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionMenuItem, styles.actionMenuItemDanger]} onPress={handleDelete}>
              <Text style={styles.actionMenuItemIcon}>🗑️</Text>
              <Text style={[styles.actionMenuItemText, styles.actionMenuItemTextDanger]}>Delete Entry</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionMenuCancel}
              onPress={() => setShowActionMenu(false)}
            >
              <Text style={styles.actionMenuCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Sequential Logging Prompt Modal */}
      <Modal
        visible={showSequentialPrompt}
        transparent
        animationType="slide"
        onRequestClose={dismissSequentialPrompt}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sequentialModal}>
            <Text style={styles.sequentialEmoji}>✓</Text>
            <Text style={styles.sequentialTitle}>{lastLoggedType} logged!</Text>
            <Text style={styles.sequentialText}>Log something else?</Text>

            <View style={styles.sequentialButtons}>
              {getSequentialSuggestions().map((log) => (
                <TouchableOpacity
                  key={log.id}
                  style={styles.sequentialButton}
                  onPress={() => {
                    dismissSequentialPrompt();
                    router.push(log.route as any);
                  }}
                >
                  <Text style={styles.sequentialButtonIcon}>{log.icon}</Text>
                  <Text style={styles.sequentialButtonLabel}>{log.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.sequentialDone}
              onPress={dismissSequentialPrompt}
            >
              <Text style={styles.sequentialDoneText}>Done for Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  scroll: {
    flex: 1,
  },
  content: {
    padding: Spacing.xl,
  },

  // Header with count badge
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xxl,
    paddingTop: Spacing.sm,
  },
  subtitle: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  title: {
    ...Typography.displayLarge,
    color: Colors.textPrimary,
  },
  countBadge: {
    backgroundColor: `${Colors.accent}15`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.accent,
  },

  // Primary 3×2 Grid - Larger tap targets with contextual info
  primaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: Spacing.lg,
  },
  primaryItem: {
    width: '31%', // 3 columns
  },
  primaryCard: {
    padding: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  primaryCardComplete: {
    borderColor: `${Colors.green}40`,
  },
  primaryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  primaryIcon: {
    fontSize: 32,
  },
  buttonBadge: {
    position: 'absolute',
    top: -8,
    right: -12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 18,
    alignItems: 'center',
  },
  buttonBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  completeCheck: {
    position: 'absolute',
    top: -6,
    right: -10,
    fontSize: 12,
    color: Colors.green,
  },
  primaryLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  primarySubtext: {
    fontSize: 9,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
  primarySubtextComplete: {
    color: Colors.green,
  },

  // Secondary Row - Water Counter + Notes
  secondaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: Spacing.xl,
  },
  waterCounterContainer: {
    flex: 2,
  },
  waterCounterCard: {
    padding: 12,
  },
  waterCounterContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  waterIcon: {
    fontSize: 28,
  },
  waterInfo: {
    flex: 1,
  },
  waterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  waterProgress: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  waterProgressBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  waterProgressFill: {
    height: '100%',
    backgroundColor: Colors.cyan,
    borderRadius: 2,
  },
  waterPlusButton: {
    backgroundColor: `${Colors.cyan}20`,
    borderWidth: 1,
    borderColor: `${Colors.cyan}40`,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  waterPlusText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.cyan,
  },
  notesButton: {
    flex: 1,
  },
  notesCard: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 70,
  },
  notesIcon: {
    fontSize: 22,
    marginBottom: 2,
  },
  notesLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  notesSubtext: {
    fontSize: 9,
    color: Colors.textMuted,
    marginTop: 1,
  },
  secondaryItem: {
    flex: 1,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  secondaryButtonVoice: {
    backgroundColor: `${Colors.accent}15`,
    borderColor: `${Colors.accent}30`,
  },
  secondaryIcon: {
    fontSize: 20,
  },
  secondaryLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  secondaryLabelVoice: {
    color: Colors.accent,
    fontWeight: '600',
  },

  // History Section - Collapsible
  historySection: {
    marginBottom: Spacing.lg,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 2,
    color: Colors.textMuted,
  },
  collapseIcon: {
    fontSize: 12,
    color: Colors.textMuted,
  },

  // Log entries - Tappable
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: Spacing.md,
  },
  logRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
  },
  logIcon: {
    fontSize: 20,
  },
  logContent: {
    flex: 1,
  },
  logType: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  logValue: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  logTime: {
    fontSize: 11,
    color: Colors.textMuted,
  },

  // Empty state - Enhanced
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  emptyHint: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  emptyTip: {
    fontSize: 12,
    color: Colors.accent,
    fontStyle: 'italic',
    textAlign: 'center',
  },

  // View Full History Link
  historyLink: {
    marginBottom: Spacing.lg,
  },
  historyLinkCard: {
    backgroundColor: `${Colors.purple}08`,
    borderColor: `${Colors.purple}25`,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyLinkContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  historyLinkIcon: {
    fontSize: 18,
  },
  historyLinkText: {
    flex: 1,
  },
  historyLinkTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  historyLinkSubtitle: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  historyLinkArrow: {
    fontSize: 18,
    color: Colors.purple,
  },

  // Contextual Tip - Compact inline
  contextTip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  contextTipIcon: {
    fontSize: 16,
  },
  contextTipText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },

  // Swipeable entries
  historyCard: {
    overflow: 'hidden',
  },
  swipeContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  deleteBackground: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 100,
    backgroundColor: Colors.red,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  swipeableContent: {
    backgroundColor: Colors.glass,
  },
  swipeHint: {
    fontSize: 10,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: 8,
    fontStyle: 'italic',
  },

  // Modal overlay
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Onboarding Modal
  onboardingModal: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 24,
    padding: 32,
    width: '85%',
    maxWidth: 340,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  onboardingEmoji: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  onboardingTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  onboardingText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  onboardingIcons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: Spacing.xl,
  },
  onboardingIconItem: {
    alignItems: 'center',
  },
  onboardingIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  onboardingIconLabel: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  onboardingHint: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    fontStyle: 'italic',
  },
  onboardingButton: {
    backgroundColor: Colors.accent,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
    width: '100%',
  },
  onboardingButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Quick Action Menu
  actionMenuContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: Colors.glassBorder,
  },
  actionMenuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  actionMenuIcon: {
    fontSize: 28,
  },
  actionMenuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  actionMenuValue: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  actionMenuDivider: {
    height: 1,
    backgroundColor: Colors.glassBorder,
    marginVertical: Spacing.md,
  },
  actionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: 14,
  },
  actionMenuItemIcon: {
    fontSize: 20,
  },
  actionMenuItemText: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
  actionMenuItemDanger: {
    marginTop: Spacing.sm,
  },
  actionMenuItemTextDanger: {
    color: Colors.red,
  },
  actionMenuCancel: {
    marginTop: Spacing.lg,
    paddingVertical: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    alignItems: 'center',
  },
  actionMenuCancelText: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '500',
  },

  // Sequential Logging Prompt
  sequentialModal: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 24,
    padding: 28,
    width: '85%',
    maxWidth: 340,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  sequentialEmoji: {
    fontSize: 40,
    marginBottom: Spacing.sm,
    color: Colors.green,
  },
  sequentialTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  sequentialText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
  },
  sequentialButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: Spacing.xl,
  },
  sequentialButton: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    minWidth: 80,
  },
  sequentialButtonIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  sequentialButtonLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  sequentialDone: {
    paddingVertical: 12,
  },
  sequentialDoneText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
});
