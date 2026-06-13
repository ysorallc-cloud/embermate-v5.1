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
import { LinearGradient } from 'expo-linear-gradient';
import { AuroraBackground } from '../components/aurora/AuroraBackground';
import { SubScreenHeader } from '../components/SubScreenHeader';
import { useTheme } from '../contexts/ThemeContext';
import { getEventsByDateRange } from '../storage/eventRepo';
import { logError } from '../utils/devLog';
import { Colors, Fonts } from '../theme/theme-tokens';
import { SECTION_GAP } from '../theme/spacing';
import { GuidanceTiles } from '../components/wellness/GuidanceTiles';
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
        <SubScreenHeader title="Your wellness" titleVariant="serif" />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Page subtitle (Phase 1) */}
          <Text style={styles.pageSubtitle}>A look at how you’ve been.</Text>

          {/* Range toggle — Phase 29 Batch C F4 recolored this from sage
              to lavender as a Tier-1 within-surface coherence move. Phase
              33b extension lavender no-fill canon (site #6) reverses that
              flip: the new canon restricts lavender to eyebrow-scale text +
              thin accents, never fills. The selector returns to sage
              (colors.accent) — action-affirmative is the correct lane for a
              "selected range" toggle anyway. Near-black text reads on sage
              the same way it reads on lavender (Q-F9.3 / Phase 26 F4
              precedent). The subscreen's caregiver-lane identity now lives
              in the eyebrow + header chrome, not in this control. */}
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
                <Text style={[styles.rangeBtnText, range === r && { color: '#0a0c0a' }]}>
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

          {/* Mood timeline card — Phase 29 Batch C F5. Primary lane card
              chrome (Tier 3 rule): full-hex caregiverAccent left border +
              caregiverAccentBg body + caregiverAccentWash hairline border.
              Matches ReflectionCard + Phase 27/28 JournalSection — the
              wellness subscreen's headline surface reads as a peer of the
              other caregiver-lane primary cards across the app. */}
          {!loading && hasAnyCheckIn && (
            <View style={styles.cardWeekFelt}>
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

          {/* Your rhythm card — Phase 29 Batch C F5. Auxiliary data card
              with quiet neutral chrome (whisper white-rgba bg + thin left
              border at 0.20 alpha). Lavender enters only via the Noticed
              callout border and the per-tile stat color — the rhythm
              card itself recedes so the WEEK FELT card above stays the
              visual lead on the subscreen. */}
          {!loading && hasAnyCheckIn && (
            <View style={styles.cardRhythm}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardEyebrow}>{'YOUR RHYTHM'}</Text>
                <Text style={styles.cardSubtitle}>
                  Patterns from the last 30 days.
                </Text>
              </View>
              <View style={styles.cardBody}>
                <View style={styles.rhythmRow}>
                  <View style={styles.rhythmCell}>
                    <Text style={[styles.rhythmValue, { color: colors.caregiverAccent }]}>
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

          {/* A gentle nudge — Phase 29 Batch C F5. Lavender gradient body
              (caregiverAccentLight 0.10 → caregiverAccentBg 0.06 vertical)
              with primary CTA recolored to solid caregiverAccent + dark
              text per spec 2.7. Pre-C sage chrome retired (within-surface
              Tier 1 lane orphan inside a now-lavender subscreen). */}
          {!loading && nudge && !nudgeDismissed && (
            <LinearGradient
              colors={[colors.caregiverAccentLight, colors.caregiverAccentBg]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.nudgeCard}
            >
              <Text style={styles.nudgeEyebrow}>{'A GENTLE NUDGE'}</Text>
              <Text style={styles.nudgeHeadline}>{nudge.headline}</Text>
              <Text style={styles.nudgeBody}>{nudge.body}</Text>
              <View style={styles.nudgeActions}>
                {/* Phase 33b extension lavender no-fill canon — site #7.
                    "Try 2 minutes of breathing" is an action-affirmative CTA
                    (start a breathing exercise) — flipped from lavender fill
                    to sage `colors.accent`. The nudgeCard around it still
                    carries lavender lane identity via its gradient
                    background; the inner CTA now reads as a clear sage
                    "begin" beat per the no-fill canon. */}
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
            </LinearGradient>
          )}

          {/* F7 C6b — Guidance tiles. Four accordion tiles below the
              gentle nudge card. Always render regardless of data state
              (empty-state surface gets them too) so guidance is
              available from day one. */}
          <View style={{ height: SECTION_GAP }} />
          <GuidanceTiles />

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
    // Phase 29 Batch C F5 — `card` split into two lane-coded variants.
    // The shared `card` retired with the lane migration; cardWeekFelt
    // carries Tier 3 primary lane chrome (matches ReflectionCard +
    // JournalSection's caregiverAccent tint), cardRhythm carries
    // neutral auxiliary chrome per spec 2.6.
    cardWeekFelt: {
      backgroundColor: c.caregiverAccentBg,
      borderWidth: 0.5,
      borderColor: c.caregiverAccentWash,
      borderLeftWidth: 3,
      borderLeftColor: c.caregiverAccent,
      borderRadius: 11,
      padding: 16,
    },
    cardRhythm: {
      backgroundColor: 'rgba(255,255,255,0.035)',
      borderLeftWidth: 3,
      borderLeftColor: 'rgba(255,255,255,0.20)',
      borderRadius: 11,
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
      fontFamily: Fonts.serifItalic,
      fontStyle: 'italic' as const,
      fontSize: 14,
      lineHeight: 22,
      color: (c as any).youAffirmationText || c.textSecondary,
      paddingTop: 8,
      paddingBottom: 16,
      paddingHorizontal: 6,
    },
    // Phase 29 Batch C F5 — cream-strip header chrome retired. Pre-C
    // the cardHeader carried a warm-cream rgba(255,235,205,0.025) bg
    // and a youCardBorder bottom border, inherited from the You-tab
    // warm card pattern. Both read as cross-tone orphans inside the
    // now-lavender (cardWeekFelt) and neutral (cardRhythm) lane
    // chrome. Strip the strip; let the card's own chrome carry the
    // visual separation. Spacing rhythm preserved.
    cardHeader: {
      paddingTop: 11,
      paddingBottom: 8,
      paddingHorizontal: 14,
    },
    cardEyebrow: {
      fontSize: 9,
      fontWeight: '500' as const,
      letterSpacing: 0.5,
      color: c.textTertiary,
    },
    cardSubtitle: {
      fontFamily: Fonts.serifItalic,
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
    // Phase 29 Batch C F5 — stat tile wrappers per spec 2.6. Dark
    // inset blocks (rgba(0,0,0,0.18)) make numeric values land as
    // scannable peers; without the wrapper the values floated against
    // the now-neutral card body without anchor.
    rhythmCell: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.18)',
      borderRadius: 7,
      paddingVertical: 7,
      paddingHorizontal: 4,
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
    // Phase 29 Batch C F5 — fallback to c.accent retired; caregiverAccent
    // is the canonical token. The pre-C fallback was defensive for an
    // earlier theme-loading order; lavender lane work has made the token
    // a stable dependency. Drop the fallback for clarity.
    noticedCallout: {
      borderLeftWidth: 2,
      borderLeftColor: c.caregiverAccent,
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
      color: c.caregiverAccent,
      marginBottom: 4,
    },
    noticedBody: {
      fontSize: 12,
      color: c.textSecondary,
      lineHeight: 17,
    },
    // Phase 29 Batch C F5 — nudge card chrome migrated from sage
    // rgba(95,184,138,*) to lavender lane. Card body is now a
    // LinearGradient (lavender 0.10 → 0.06) wrapped in this style for
    // border/radius/padding; the bg color stops applied on the gradient
    // override any backgroundColor here, but kept the property removed
    // to avoid mixed sources of truth. Border + radius unchanged shape;
    // border color is the caregiverAccentStrong (0.25) per spec 2.7.
    nudgeCard: {
      borderWidth: 0.5,
      borderColor: c.caregiverAccentStrong,
      borderRadius: 11,
      padding: 13,
      marginTop: 16,
    },
    nudgeEyebrow: {
      fontSize: 9,
      fontWeight: '500' as const,
      letterSpacing: 0.5,
      color: c.caregiverAccent,
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
    // Phase 29 Batch C F5 — primary CTA dark-text-on-lavender per spec
    // 2.7. Pre-C white text on sage; post-C near-black text on lavender
    // (~9.5:1 contrast, AAA — same pattern Phase 26 share CTA used).
    nudgePrimaryText: {
      fontSize: 12,
      fontWeight: '600' as const,
      color: '#0a0c0a',
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
    // Phase 29 Batch C F5 — Tier 1 sweep: emptyCtaText sage → lavender.
    // The "Take a moment →" empty-state link sits inside a fully lavender
    // subscreen; sage would be a within-surface lane orphan.
    emptyCtaText: {
      fontSize: 13,
      color: c.caregiverAccent,
      fontWeight: '500' as const,
    },
  });
}
