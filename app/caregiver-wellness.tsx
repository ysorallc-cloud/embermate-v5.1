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
import { composeWellnessOpening, type MoodLevel } from '../utils/text/composers/wellnessOpening';
import { composeWeekRecap, type WeekRecapDay } from '../utils/text/composers/weekRecap';
import { composeRhythmObservation, type RhythmCheckIn } from '../utils/text/composers/rhythmObservation';
import {
  shouldShowNudge,
  isNudgeDismissedToday,
  dismissNudgeForToday,
  type NudgeContent,
} from '../utils/wellnessNudge';

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
  const [hasAnyCheckIn, setHasAnyCheckIn] = useState(true);
  const [nudge, setNudge] = useState<NudgeContent | null>(null);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);

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

      // Lifetime check-in detection — anything older than the selected
      // range counts. We pull a 365-day window for the all-time check.
      const yearAgo = getDateNDaysAgo(365);
      const yearEvents = await getEventsByDateRange(yearAgo, endDate, 'default');
      const yearMoodEvents = yearEvents.filter((e) => e.type === 'mood_logged');
      setHasAnyCheckIn(yearMoodEvents.length > 0);

      // Nudge inputs — last-check-in age, tough days last 14, breath last 30.
      const last14Start = getDateNDaysAgo(14);
      const last30Start = getDateNDaysAgo(30);
      const last14Events = yearMoodEvents.filter(
        (e) => e.timestamp.slice(0, 10) >= last14Start,
      );
      const toughDaysLast14 = last14Events.filter(
        (e) => typeof e.value === 'number' && e.value <= 3,
      ).length;
      const breath30 = yearEvents.filter((e) =>
        e.type === 'wellness_check' &&
        e.timestamp.slice(0, 10) >= last30Start &&
        (e.metadata?.responses as any)?.type === 'breathing_exercise'
      );
      const lastMood = yearMoodEvents.length > 0
        ? yearMoodEvents.reduce((latest, e) =>
            e.timestamp > latest.timestamp ? e : latest,
            yearMoodEvents[0])
        : null;
      const daysSinceLastCheckIn = lastMood
        ? Math.floor((Date.now() - new Date(lastMood.timestamp).getTime()) / (24 * 60 * 60 * 1000))
        : null;

      const dismissedToday = await isNudgeDismissedToday();
      setNudgeDismissed(dismissedToday);
      const candidate = shouldShowNudge({
        daysSinceLastCheckIn,
        toughDaysLast14,
        breathSessionsLast30: breath30.length,
      });
      setNudge(candidate);
    } catch (err) {
      logError('CaregiverWellnessScreen.loadData', err);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Derived data for the new composers ─────────────────────────────
  const moodValues: MoodLevel[] = moodEvents
    .map((e) => (typeof e.value === 'number' ? e.value : 0) as MoodLevel)
    .filter((v) => v >= 1 && v <= 5);

  const opening = useMemo(
    () => composeWellnessOpening({
      checkInsCount: moodEvents.length,
      moodValues,
      daysOfData: range,
      isFirstTimeUser: !hasAnyCheckIn,
    }),
    [moodEvents.length, moodValues, range, hasAnyCheckIn],
  );

  // Build the timeline-day inputs for the recap composer.
  const recapDays = useMemo<WeekRecapDay[]>(() => {
    const days: WeekRecapDay[] = [];
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const event = moodEvents.find((e) => e.timestamp.slice(0, 10) === key);
      const mood = event && typeof event.value === 'number'
        ? (event.value as MoodLevel)
        : undefined;
      days.push({ date: key, weekday: d.getDay(), mood });
    }
    return days;
  }, [moodEvents, range]);
  const weekRecap = useMemo(() => composeWeekRecap(recapDays), [recapDays]);

  const rhythmCheckIns = useMemo<RhythmCheckIn[]>(
    () =>
      moodEvents
        .filter((e) => typeof e.value === 'number')
        .map((e) => {
          const t = new Date(e.timestamp);
          return {
            date: e.timestamp.slice(0, 10),
            weekday: t.getDay(),
            hour: t.getHours(),
            mood: e.value as MoodLevel,
          };
        }),
    [moodEvents],
  );
  const rhythmObservation = useMemo(
    () => composeRhythmObservation({ checkIns: rhythmCheckIns }),
    [rhythmCheckIns],
  );

  const lastCheckInLabel = useMemo(() => {
    if (moodEvents.length === 0) return '—';
    const last = moodEvents.reduce((latest, e) =>
      e.timestamp > latest.timestamp ? e : latest,
      moodEvents[0]);
    const diffDays = Math.floor(
      (Date.now() - new Date(last.timestamp).getTime()) / (24 * 60 * 60 * 1000),
    );
    if (diffDays === 0) return 'earlier today';
    if (diffDays === 1) return 'yesterday';
    return `${diffDays} days`;
  }, [moodEvents]);

  const handleDismissNudge = async () => {
    setNudgeDismissed(true);
    await dismissNudgeForToday();
  };

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
          {/* Page subtitle (Phase 1) */}
          <Text style={styles.pageSubtitle}>A look at how you’ve been.</Text>

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

          {/* Opening reflection (Phase 2) */}
          {!loading && (
            <Text style={styles.opening}>{opening}</Text>
          )}

          {/* First-time user empty state (Phase 8) — hide everything else */}
          {!loading && !hasAnyCheckIn ? (
            <TouchableOpacity
              style={styles.emptyCta}
              onPress={() => {/* nav to Reflection card on You tab — wired via deep link */}}
              accessibilityRole="button"
              accessibilityLabel="Take a moment to reflect on the You tab"
            >
              <Text style={styles.emptyCtaText}>{'Take a moment →'}</Text>
            </TouchableOpacity>
          ) : null}

          {/* Mood timeline card (Phase 3) — shows when at least one check-in exists */}
          {!loading && hasAnyCheckIn && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardEyebrow}>{'HOW THE WEEK FELT'}</Text>
                <Text style={styles.cardSubtitle}>
                  Each dot is a check-in. Empty dots are days you didn’t.
                </Text>
              </View>
              <View style={styles.cardBody}>
                <View style={styles.timelineRow}>
                  {recapDays.map((d, i) => {
                    const dotColor =
                      d.mood == null ? 'rgba(255, 235, 205, 0.06)'
                      : d.mood <= 2 ? 'rgba(230, 119, 110, 0.55)'
                      : d.mood === 3 ? 'rgba(229, 176, 74, 0.55)'
                      : d.mood === 4 ? 'rgba(95, 184, 138, 0.55)'
                      : 'rgba(95, 184, 138, 0.85)';
                    const glyph = d.mood == null ? ''
                      : d.mood === 1 ? '😞'
                      : d.mood === 2 ? '😟'
                      : d.mood === 3 ? '😐'
                      : d.mood === 4 ? '🙂'
                      : '😊';
                    return (
                      <View key={d.date} style={styles.timelineCell}>
                        <View style={[styles.timelineDot, { backgroundColor: dotColor }]}>
                          <Text style={styles.timelineGlyph}>{glyph}</Text>
                        </View>
                        <Text style={styles.timelineDayLabel}>
                          {new Date(d.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })}
                        </Text>
                      </View>
                    );
                  })}
                </View>
                {weekRecap.length > 0 && (
                  <Text style={styles.weekRecap}>{weekRecap}</Text>
                )}
              </View>
            </View>
          )}

          {/* Your rhythm card (Phase 4) — only when there's enough check-in data */}
          {!loading && hasAnyCheckIn && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardEyebrow}>{'YOUR RHYTHM'}</Text>
                <Text style={styles.cardSubtitle}>
                  Patterns from the last 30 days.
                </Text>
              </View>
              <View style={styles.cardBody}>
                <View style={styles.rhythmRow}>
                  <View style={styles.rhythmCell}>
                    <Text style={[styles.rhythmValue, { color: colors.accent }]}>
                      {lastCheckInLabel}
                    </Text>
                    <Text style={styles.rhythmLabel}>since last check-in</Text>
                  </View>
                  <View style={styles.rhythmCell}>
                    <Text style={styles.rhythmValue}>{breathingCount}</Text>
                    <Text style={styles.rhythmLabel}>sessions in 30d</Text>
                  </View>
                </View>
                {rhythmObservation && (
                  <View style={styles.noticedCallout}>
                    <Text style={styles.noticedEyebrow}>{'NOTICED'}</Text>
                    <Text style={styles.noticedBody}>{rhythmObservation}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* A gentle nudge (Phase 5) — only fires under specific signals */}
          {!loading && nudge && !nudgeDismissed && (
            <View style={styles.nudgeCard}>
              <Text style={styles.nudgeEyebrow}>{'A GENTLE NUDGE'}</Text>
              <Text style={styles.nudgeHeadline}>{nudge.headline}</Text>
              <Text style={styles.nudgeBody}>{nudge.body}</Text>
              <View style={styles.nudgeActions}>
                <TouchableOpacity
                  style={[styles.nudgePrimary, { backgroundColor: colors.accent }]}
                  accessibilityRole="button"
                  accessibilityLabel="Try 2 minutes of breathing"
                >
                  <Text style={styles.nudgePrimaryText}>{'Try 2 minutes'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.nudgeSecondary}
                  onPress={handleDismissNudge}
                  accessibilityRole="button"
                  accessibilityLabel="Maybe later — dismiss for the day"
                >
                  <Text style={styles.nudgeSecondaryText}>{'Maybe later'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

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
    // ── v6.7 wellness reframe styles ─────────────────────────────────────
    pageSubtitle: {
      fontSize: 12,
      color: c.textSecondary,
      lineHeight: 16.8,
      marginBottom: 12,
    },
    opening: {
      fontFamily: 'Georgia',
      fontStyle: 'italic' as const,
      fontSize: 14,
      lineHeight: 22,
      color: (c as any).youAffirmationText || c.textSecondary,
      paddingTop: 8,
      paddingBottom: 16,
      paddingHorizontal: 6,
    },
    cardHeader: {
      paddingTop: 11,
      paddingBottom: 8,
      paddingHorizontal: 14,
      backgroundColor: 'rgba(255, 235, 205, 0.025)',
      borderBottomWidth: 0.5,
      borderBottomColor: (c as any).youCardBorder || c.glassBorder,
    },
    cardEyebrow: {
      fontSize: 9,
      fontWeight: '500' as const,
      letterSpacing: 0.5,
      color: c.textTertiary,
    },
    cardSubtitle: {
      fontFamily: 'Georgia',
      fontStyle: 'italic' as const,
      fontSize: 11,
      lineHeight: 15,
      color: c.textSecondary,
      marginTop: 4,
    },
    cardBody: {
      padding: 14,
    },
    timelineRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      marginBottom: 10,
    },
    timelineCell: {
      alignItems: 'center' as const,
      flex: 1,
    },
    timelineDot: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      marginBottom: 4,
    },
    timelineGlyph: {
      fontSize: 14,
    },
    timelineDayLabel: {
      fontSize: 8.5,
      color: c.textTertiary,
    },
    weekRecap: {
      fontSize: 12,
      color: c.textSecondary,
      lineHeight: 17,
      marginTop: 8,
      fontStyle: 'italic' as const,
    },
    rhythmRow: {
      flexDirection: 'row' as const,
      gap: 16,
      marginBottom: 12,
    },
    rhythmCell: {
      flex: 1,
    },
    rhythmValue: {
      fontSize: 17,
      fontWeight: '500' as const,
      color: c.textPrimary,
    },
    rhythmLabel: {
      fontSize: 9,
      color: c.textTertiary,
      marginTop: 2,
    },
    noticedCallout: {
      borderLeftWidth: 2,
      borderLeftColor: (c as any).caregiverAccent || c.accent,
      backgroundColor: 'rgba(170, 138, 220, 0.06)',
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 4,
      marginTop: 4,
    },
    noticedEyebrow: {
      fontSize: 9,
      fontWeight: '500' as const,
      letterSpacing: 0.5,
      color: (c as any).caregiverAccent || c.accent,
      marginBottom: 4,
    },
    noticedBody: {
      fontSize: 12,
      color: c.textSecondary,
      lineHeight: 17,
    },
    nudgeCard: {
      backgroundColor: 'rgba(95, 184, 138, 0.07)',
      borderWidth: 0.5,
      borderColor: 'rgba(95, 184, 138, 0.22)',
      borderRadius: 10,
      padding: 13,
      marginTop: 16,
    },
    nudgeEyebrow: {
      fontSize: 9,
      fontWeight: '500' as const,
      letterSpacing: 0.5,
      color: c.accent,
    },
    nudgeHeadline: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: c.textPrimary,
      marginTop: 6,
      marginBottom: 4,
    },
    nudgeBody: {
      fontSize: 11,
      color: c.textSecondary,
      lineHeight: 16.5,
      marginBottom: 12,
    },
    nudgeActions: {
      flexDirection: 'row' as const,
      gap: 8,
    },
    nudgePrimary: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 8,
    },
    nudgePrimaryText: {
      fontSize: 12,
      fontWeight: '600' as const,
      color: c.textPrimary,
    },
    nudgeSecondary: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 8,
      borderWidth: 0.5,
      borderColor: c.glassBorder,
    },
    nudgeSecondaryText: {
      fontSize: 12,
      color: c.textSecondary,
    },
    emptyCta: {
      paddingVertical: 14,
      alignItems: 'center' as const,
    },
    emptyCtaText: {
      fontSize: 13,
      color: c.accent,
      fontWeight: '500' as const,
    },
  });
}
