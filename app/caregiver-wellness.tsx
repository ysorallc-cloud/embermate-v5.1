// ============================================================================
// CAREGIVER WELLNESS — Sub-page from Support tab
// Shows mood history, breathing sessions, self-care streak
// ============================================================================

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuroraBackground } from '../components/aurora/AuroraBackground';
import { SubScreenHeader } from '../components/SubScreenHeader';
import { useTheme } from '../contexts/ThemeContext';
import { getEventsByDateRange } from '../storage/eventRepo';
import { logError } from '../utils/devLog';
import { Colors } from '../theme/theme-tokens';
import type { CareEvent } from '../types/event';

// ============================================================================
// HELPERS
// ============================================================================

function getDateNDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

function todayDate(): string {
  return new Date().toISOString().split('T')[0];
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function CaregiverWellnessScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [range, setRange] = useState<7 | 14 | 30>(7);
  const [moodEvents, setMoodEvents] = useState<CareEvent[]>([]);
  const [breathingCount, setBreathingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const startDate = getDateNDaysAgo(range);
      const endDate = todayDate();

      const events = await getEventsByDateRange(startDate, endDate, 'default');

      // Mood events
      const moods = events.filter(e => e.type === 'mood_logged');
      setMoodEvents(moods);

      // Breathing sessions (wellness_check with breathing_exercise type)
      const breathing = events.filter(e =>
        e.type === 'wellness_check' &&
        (e.metadata?.responses as any)?.type === 'breathing_exercise'
      );
      setBreathingCount(breathing.length);
    } catch (err) {
      logError('CaregiverWellnessScreen.loadData', err);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Compute mood stats
  const moodAvg = moodEvents.length > 0
    ? (moodEvents.reduce((sum, e) => sum + (typeof e.value === 'number' ? e.value : 3), 0) / moodEvents.length).toFixed(1)
    : null;

  const moodLabels = ['', 'Rough', 'Struggling', 'Getting by', 'Okay', 'Good'];

  return (
    <View style={styles.root}>
      <AuroraBackground variant="support" />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <SubScreenHeader title="Your Wellness" />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Range toggle */}
          <View style={styles.rangeRow}>
            {([7, 14, 30] as const).map(r => (
              <TouchableOpacity
                key={r}
                style={[styles.rangeBtn, range === r && { backgroundColor: colors.accent }]}
                onPress={() => setRange(r)}
                accessibilityLabel={`${r} days`}
                accessibilityRole="button"
                accessibilityState={{ selected: range === r }}
              >
                <Text style={[styles.rangeBtnText, range === r && { color: '#fff' }]}>
                  {r}d
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Mood history */}
          <Text style={styles.sectionLabel}>MOOD HISTORY</Text>
          <View style={styles.card}>
            {loading ? (
              <Text style={styles.loadingText}>Loading...</Text>
            ) : moodEvents.length === 0 ? (
              <Text style={styles.emptyText}>No mood check-ins in the last {range} days</Text>
            ) : (
              <>
                <View style={styles.statRow}>
                  <View style={styles.stat}>
                    <Text style={styles.statValue}>{moodEvents.length}</Text>
                    <Text style={styles.statLabel}>Check-ins</Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={styles.statValue}>{moodAvg}</Text>
                    <Text style={styles.statLabel}>Avg mood</Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={styles.statValue}>
                      {moodLabels[Math.round(parseFloat(moodAvg || '3'))] || '—'}
                    </Text>
                    <Text style={styles.statLabel}>Overall</Text>
                  </View>
                </View>

                {/* Recent entries */}
                {moodEvents.slice(-5).reverse().map((e, i) => {
                  const label = (e.metadata?.label as string) || moodLabels[typeof e.value === 'number' ? e.value : 3];
                  const date = new Date(e.timestamp).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                  return (
                    <View key={e.id || i} style={styles.historyRow}>
                      <Text style={styles.historyDate}>{date}</Text>
                      <Text style={styles.historyLabel}>{label}</Text>
                      <Text style={styles.historyScore}>{e.value}/5</Text>
                    </View>
                  );
                })}
              </>
            )}
          </View>

          {/* Breathing sessions */}
          <Text style={styles.sectionLabel}>BREATHING SESSIONS</Text>
          <View style={styles.card}>
            <View style={styles.statRow}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{breathingCount}</Text>
                <Text style={styles.statLabel}>Sessions ({range}d)</Text>
              </View>
            </View>
            {breathingCount === 0 && (
              <Text style={styles.emptyText}>
                No breathing sessions yet. Try one from the Support tab.
              </Text>
            )}
          </View>

          {/* Bottom padding */}
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

function createStyles(c: typeof Colors) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: c.background,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 16,
    },
    rangeRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 16,
    },
    rangeBtn: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: c.glass,
      borderWidth: 1,
      borderColor: c.glassBorder,
    },
    rangeBtnText: {
      fontSize: 13,
      fontWeight: '600',
      color: c.textSecondary,
    },
    sectionLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: c.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 1.4,
      marginTop: 20,
      marginBottom: 10,
    },
    card: {
      backgroundColor: c.glass,
      borderWidth: 1,
      borderColor: c.glassBorder,
      borderRadius: 14,
      padding: 16,
    },
    statRow: {
      flexDirection: 'row',
      gap: 16,
      marginBottom: 12,
    },
    stat: {
      flex: 1,
      alignItems: 'center',
    },
    statValue: {
      fontSize: 22,
      fontWeight: '700',
      color: c.textPrimary,
      marginBottom: 2,
    },
    statLabel: {
      fontSize: 11,
      color: c.textMuted,
    },
    historyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      borderTopWidth: 1,
      borderTopColor: c.glassFaint,
      gap: 8,
    },
    historyDate: {
      fontSize: 12,
      color: c.textMuted,
      width: 90,
    },
    historyLabel: {
      fontSize: 13,
      color: c.textSecondary,
      flex: 1,
    },
    historyScore: {
      fontSize: 13,
      fontWeight: '600',
      color: c.textPrimary,
    },
    loadingText: {
      fontSize: 13,
      color: c.textMuted,
      textAlign: 'center',
      paddingVertical: 16,
    },
    emptyText: {
      fontSize: 13,
      color: c.textMuted,
      textAlign: 'center',
      paddingVertical: 12,
    },
  });
}
