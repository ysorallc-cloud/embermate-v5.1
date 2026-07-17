// ============================================================================
// YOU TAB — Reflection space (Option C, v6.7).
//
// Composition (top to bottom):
//   • Greeting + settings gear
//   • Daily affirmation header (serif italic ambient line)
//   • Breathing orb card (opens the shared BreathingExercise)
//   • Reflection card (mood + free-text + save — the mood now persists to the
//     mood_logged event store, not just the isolated reflectionRepo silo)
//   • Mood strip (display-only 7-day check-in timeline)
//   • Guidance tiles (wellness content — burnout, reflection prompts, box
//     breathing — moved up from the retired /caregiver-wellness sub-page)
//   • Single Caregiver Action Network resource link (the one live resource;
//     the "For when you need it" page + dead action cards were removed)
//
// Phase 26 — You-lane visual identity (Commit B):
//   F3 — Caregiver chip at top-left of the header row, on the same
//        baseline as the H1 title, mirroring the patient chip pattern
//        but caregiverAccent-tinted. Reads the caregiver name via
//        getCaregiverProfile() (same source as Now / Journal). When the
//        name is empty no chip renders — identity, not a slot.
//   F5 — Footer affirmation block dropped. AffirmationHeader at the top
//        of the tab already carries the witness signal (Phase 11.2's
//        witness.line wiring is unchanged), so the footer was a
//        duplicate emotional beat. witness.footerLine stays on the
//        WitnessSignal type for v1.1 cleanup — see comment in
//        utils/caregiverWitnessBuilder.ts.
// ============================================================================

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Linking,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { navigate } from '../../lib/navigate';
import { AffirmationHeader } from '../../components/support/AffirmationHeader';
import { ReflectionCard } from '../../components/support/ReflectionCard';
import { BreathingExercise } from '../../components/support/BreathingExercise';
import { BreathingOrbCard } from '../../components/support/BreathingOrbCard';
import { GuidanceTiles } from '../../components/wellness/GuidanceTiles';
import { Colors, Spacing, Fonts } from '../../theme/theme-tokens';
import { SECTION_GAP, TITLE_CLEARANCE } from '../../theme/spacing';
import {
  buildCaregiverWitness,
  WitnessSignal,
} from '../../utils/caregiverWitnessBuilder';
import { useDataListener } from '../../lib/events';
import { EVENT } from '../../lib/eventNames';
import { getCaregiverProfile } from '../../storage/caregiverProfileRepo';
import { composeYouGreeting } from '../../utils/text/composers/youGreeting';
// F7 C5 — mood strip data plumbing.
import { MoodStrip } from '../../components/support/MoodStrip';
import { getEventsByDateRange } from '../../storage/eventRepo';
import type { WeekRecapDay } from '../../utils/text/composers/weekRecap';
import type { MoodLevel } from '../../utils/text/composers/wellnessOpening';
import type { CareEvent } from '../../types/event';

// Events that change the data the witness builder reads. Anything else
// fires the listener but the listener filter ignores it — the builder
// reads from instances + logs + events, so we re-fetch only when one
// of those pipelines writes.
const WITNESS_EVENTS = new Set<string>([
  EVENT.DAILY_INSTANCES,
  EVENT.LOGS,
  EVENT.LOG_EVENTS,
  EVENT.MEDICATION,
  EVENT.WELLNESS,
]);


// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SupportScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [refreshing, setRefreshing] = useState(false);
  const [breathingVisible, setBreathingVisible] = useState(false);
  // Phase 29 Batch B F4 — `breathingAutoStart` state retired alongside
  // QuickResetPills. Pre-B the state arbitrated two entry points (orb →
  // autoStart=true, QuickResetPills.onBreathe → autoStart=false). After
  // B the orb is the sole entry; autoStart is always true. The single
  // BreathingExercise mount survives — only the per-entry flag drops.
  const [witness, setWitness] = useState<WitnessSignal | null>(null);
  // Phase 26 F3 — caregiver name for the lavender chip. Empty default;
  // useEffect populates on mount. When still empty after fetch (caregiver
  // hasn't completed profile) the chip's render-gate keeps it hidden —
  // no "Caregiver" placeholder appears, matching the no-chip fallback
  // the audit confirmed.
  const [caregiverName, setCaregiverName] = useState<string>('');
  // F7 C5 — 7-day mood timeline for the MoodStrip surface.
  const [moodDays, setMoodDays] = useState<WeekRecapDay[]>(() => {
    // Default to 7 empty days so the strip renders the onboarding empty
    // state on first paint without waiting for the async load.
    const out: WeekRecapDay[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      out.push({
        date: d.toISOString().split('T')[0],
        weekday: d.getDay(),
      });
    }
    return out;
  });

  // Single fetch on mount; re-fetch only when the witness builder's
  // read sources change. The builder is cheap (cached storage reads),
  // so no debounce — the multi-pipeline filter is what keeps this
  // from thrashing on unrelated emits.
  const refreshWitness = useCallback(async () => {
    const next = await buildCaregiverWitness();
    setWitness(next);
  }, []);

  useEffect(() => {
    refreshWitness();
  }, [refreshWitness]);

  useEffect(() => {
    getCaregiverProfile()
      .then((profile) => setCaregiverName(profile?.name?.trim() ?? ''))
      .catch(() => {});
  }, []);

  // F7 C5 — fetch 7 days of mood events for the MoodStrip. Same data
  // path caregiver-wellness uses (getEventsByDateRange + filter to
  // mood events) so the strip's voice matches the subscreen recap.
  const refreshMoodDays = useCallback(async () => {
    try {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 6);
      const startKey = start.toISOString().split('T')[0];
      const endKey = end.toISOString().split('T')[0];
      const events = await getEventsByDateRange(startKey, endKey, 'default');
      const moods = events.filter((e: CareEvent) => e.type === 'mood_logged');
      const out: WeekRecapDay[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        // Latest check-in for the day wins — a caregiver who changes their mood
        // in the ReflectionCard emits a new mood_logged event; show the final one.
        const dayEvents = moods.filter((e) => e.timestamp.slice(0, 10) === key);
        const event = dayEvents.length
          ? dayEvents.reduce((a, b) => (a.timestamp > b.timestamp ? a : b))
          : undefined;
        const mood = event && typeof event.value === 'number'
          ? (event.value as MoodLevel)
          : undefined;
        out.push({ date: key, weekday: d.getDay(), mood });
      }
      setMoodDays(out);
    } catch {
      // Non-blocking — strip falls back to its empty-state copy.
    }
  }, []);

  useEffect(() => {
    void refreshMoodDays();
  }, [refreshMoodDays]);

  useDataListener((category) => {
    if (WITNESS_EVENTS.has(category)) {
      refreshWitness();
    }
    // F7 C5 — MoodStrip refresh on mood / wellness saves.
    if (category === EVENT.MOOD || category === EVENT.WELLNESS) {
      void refreshMoodDays();
    }
  });

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshWitness();
    await new Promise((r) => setTimeout(r, 500));
    setRefreshing(false);
  }, [refreshWitness]);


  return (
    <View style={styles.root}>

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.accent}
            />
          }
        >
          {/* ═══ HEADER ═══
              Phase 29 F1 — the pre-29 22pt "You" title + 13pt subtitle
              pair retired. The top of the tab now leads with a time-
              aware Georgia italic greeting; the Phase 26 caregiver
              chip moves to its own row below the greeting and carries
              identity-statement copy ("This is your space") instead
              of the bare name. */}
          <View style={styles.headerWrap}>
            {/* Single canonical Settings entry (settings-entry stranding
                fix). The gear was retired from the Insights header (F7)
                and the You tab is its replacement home. Neutral
                navigation color — not an accent/status cue. */}
            <TouchableOpacity
              style={styles.settingsGear}
              onPress={() => navigate('/settings')}
              accessibilityRole="button"
              accessibilityLabel="Settings"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="settings-outline" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.greeting}>
              {composeYouGreeting({ hour: new Date().getHours(), name: caregiverName })}
            </Text>
            {/* You rebuild (S4) — the lavender "This is your space" chip is
                retired with the full de-purple. The warm top now flows
                greeting → reflect line → breath with no chip and no header
                divider (the first hairline rule comes after the breath). */}
          </View>

          {/* ═══ Daily affirmation — Phase 11.2: witness signal
                replaces the generic affirmation when one qualifies.
                Same styling, same voice. ═══ */}
          <AffirmationHeader witness={witness} />

          {/* ═══ Phase 29 Batch A F3 — breathing orb card.
                Lavender card that frames a 60-second breath. Tap opens
                the shared BreathingExercise mount with autoStart=true. ═══ */}
          <BreathingOrbCard
            onTap={() => setBreathingVisible(true)}
          />

          {/* Hairline rule — warm top (reflect + breath) closes here. */}
          <View style={styles.rule} />

          {/* Check-in — de-boxed faces + free-text + Save/F6 (unchanged). */}
          <ReflectionCard />

          {/* ═══ F7 C5 — Mood strip (7-dot timeline + weekRecap) ═══
              Sits between the ReflectionCard's daily check-in and the
              support tile row. SECTION_GAP carries the rhythm; the
              strip itself is open fabric — no card chrome. */}
          {/* Display-only mood strip — the caregiver's own week at a glance,
              read from the mood_logged event store the ReflectionCard now
              writes to. The /caregiver-wellness sub-page hop was retired, so
              there is no tap target. */}
          <View style={styles.rule} />
          <MoodStrip days={moodDays} />
          <View style={styles.rule} />

          {/* Wellness guidance — surfaced directly on the You tab (moved up
              from the retired "Your wellness" sub-page): "Recognizing
              caregiver burnout", the reflection prompts, and box-breathing
              guidance. The breathing exercise stays accessible via the orb
              card above. */}
          <GuidanceTiles />

          {/* Single honest resource — Caregiver Action Network (caregiveraction.org
              resolves; every other resource link was dead). Replaces the retired
              resources page + the dead Helpline/Community action cards. */}
          <View style={styles.rule} />
          <TouchableOpacity
            style={styles.resourceRow}
            onPress={() => Linking.openURL('https://caregiveraction.org/').catch(() => {})}
            activeOpacity={0.7}
            accessibilityRole="link"
            accessibilityLabel="Caregiver Action Network — education, peer support, and advocacy"
          >
            <View style={styles.resourceText}>
              <Text style={styles.resourceTitle}>Caregiver Action Network</Text>
              <Text style={styles.resourceDesc}>Education, peer support, and advocacy</Text>
            </View>
            <Ionicons name="open-outline" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Phase 26 F5 — footer affirmation block retired. The
              AffirmationHeader at the top of this tab already carries
              the witness signal (Phase 11.2 wiring), so the footer line
              was a duplicate emotional beat. Bottom spacing now relies
              on scrollContent.paddingBottom + the tab bar's 80pt height. */}
        </ScrollView>
      </SafeAreaView>

      <BreathingExercise
        visible={breathingVisible}
        onClose={() => setBreathingVisible(false)}
        autoStart
      />
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
    // Phase 3 page rhythm — every tab's outermost ScrollView lands at
    // paddingTop: 24 / paddingHorizontal: 14. The hero `headerWrap` below
    // carries its own paddingTop: 32 (lowered from 56 in 5.13.4) to clear
    // the safe-area without eating ~12% of screen height; scrollContent's
    // 24 stacks above that as the canonical page-edge offset before the
    // header begins.
    //
    // Phase 26 F5 — paddingBottom bumped 24 → 96 to compensate for the
    // retired footer block. The previous footer carried paddingBottom:
    // 108; dropping it without compensation would let the plan-ahead
    // card sit too close to the tab bar. 96 = (108 retired footer
    // padding) - (24 was previously double-counted via scrollContent) +
    // a small breathing-room buffer.
    scrollContent: {
      paddingTop: 24, // allow: tap-target padding (Apple HIG ≥44pt)
      paddingHorizontal: 14, // allow: tap-target padding (Apple HIG ≥44pt)
      paddingBottom: 96, // allow: tab-bar clearance (Phase 26 F5)
    },
    headerWrap: {
      // You rebuild (S4) — no header divider; the warm top (greeting →
      // reflect → breath) is one open beat, the first hairline rule comes
      // after the breath.
      paddingTop: 32,
      paddingBottom: 4,
      paddingHorizontal: 4,
    },
    // Hairline section divider (mockup `.rule`) — the You tab separates
    // sections with hairlines instead of boxes; only SUPPORT keeps borders.
    rule: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.hairlineInset,
      marginTop: Spacing.lg,
      marginHorizontal: 10,
    },
    // Settings gear — pinned to the header's upper-right, aligned with
    // the greeting's top. Absolute so it doesn't disturb the greeting /
    // caregiver-chip stack.
    settingsGear: {
      position: 'absolute',
      top: 28,
      right: 4,
      zIndex: 2,
      padding: 6, // allow: tap-target padding (Apple HIG ≥44pt with hitSlop)
    },
    // Phase 33b Scope 1 — greeting canonical block per
    // project_brand_alignment_canon.md `.phone-greeting`. Symmetric with
    // the Now-tab greeting at `components/now/NowGreeting.tsx` — both
    // tabs now render the same canonical greeting (regular serif, not
    // italic). Italic stays reserved for the subhead's witness-voice
    // register per Path 2 lock that superseded Q-33.5's italic-greeting
    // interpretation. F6's italic-serif greeting retired here.
    //
    // The Subhead component (Phase 33b Scope 1) lands below this
    // greeting in v1.1 via rewritten caregiverWitnessBuilder per
    // Path A. AffirmationHeader retires in v1.1 with subhead absorbing
    // its role. v1.0 ships subhead empty/null; integration deferred.
    greeting: {
      fontFamily: Fonts.serif,
      fontSize: 26,
      fontWeight: '400' as const,
      color: c.textPrimary,
      letterSpacing: -0.5,
    },
    // You rebuild (S4) — caregiverChip* styles retired with the lavender
    // "This is your space" chip (full de-purple; the warm top is chip-less).
    // Phase 29 Batch B F4 — wellnessLink / wellnessLabel / wellnessChevron
    // style entries retired alongside the wellnessLink JSX row. The
    // Wellness action card in ActionCardsRow now carries the route to
    // /caregiver-wellness; per-card accessibilityHint preserves the
    // pre-B "View your wellness history" screen-reader text.
    //
    // planAheadCard / planAheadBody also retired — the ResourcesList
    // compact variant renders chevron rows that ARE the chrome, so the
    // outer card wrapper became redundant (per Batch B R2).
    // Single Caregiver Action Network resource row — the one honest external
    // link, replacing the retired resources page + dead action cards.
    resourceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 13, // allow: tap-target padding (Apple HIG ≥44pt)
      paddingHorizontal: 14, // allow: tap-target padding (Apple HIG ≥44pt)
      marginTop: Spacing.sm,
    },
    resourceText: {
      flex: 1,
    },
    resourceTitle: {
      fontSize: 13,
      fontWeight: '500',
      color: c.textPrimary,
      marginBottom: 2,
    },
    resourceDesc: {
      fontSize: 11,
      color: c.textTertiary,
    },
    // Phase 26 F5 — footer + footerText style entries retired alongside
    // the JSX block. The closing emotional beat moved entirely onto
    // AffirmationHeader (top of tab) so the You tab has one warm-voice
    // surface, not two.
  });
}
