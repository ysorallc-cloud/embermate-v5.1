// ============================================================================
// YOU TAB — Reflection space (Option C, v6.7).
//
// Composition (top to bottom):
//   • Standardized 32pt "You" header + caregiver chip (Phase 26 F3) +
//     subtitle (56pt top / 24pt bottom)
//   • Daily affirmation header (serif italic ambient line)
//   • Reflection card (mood + free-text + save — the heart of the redesign)
//   • Quick reset pills (Breathe / Helpline / Community)
//   • Compact wellness link row (tappable, routes to /caregiver-wellness)
//   • Plan ahead section (header + quiet subtitle + ResourcesList)
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { navigate } from '../../lib/navigate';
import { AffirmationHeader } from '../../components/support/AffirmationHeader';
import { ReflectionCard } from '../../components/support/ReflectionCard';
import { ActionCardsRow } from '../../components/support/ActionCardsRow';
import { BreathingExercise } from '../../components/support/BreathingExercise';
import { BreathingOrbCard } from '../../components/support/BreathingOrbCard';
import { ResourcesList } from '../../components/support/ResourcesList';
import { Colors, Spacing } from '../../theme/theme-tokens';
import {
  buildCaregiverWitness,
  WitnessSignal,
} from '../../utils/caregiverWitnessBuilder';
import { useDataListener } from '../../lib/events';
import { EVENT } from '../../lib/eventNames';
import { getCaregiverProfile } from '../../storage/caregiverProfileRepo';
import { composeYouGreeting } from '../../utils/text/composers/youGreeting';

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

  useDataListener((category) => {
    if (WITNESS_EVENTS.has(category)) {
      refreshWitness();
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
            <Text style={styles.greeting}>
              {composeYouGreeting({ hour: new Date().getHours(), name: caregiverName })}
            </Text>
            {caregiverName.length > 0 && (
              <View
                style={styles.caregiverChip}
                accessibilityLabel={`Caregiver: ${caregiverName}. This is your space.`}
                accessibilityRole="text"
              >
                <View style={styles.caregiverChipAvatar}>
                  <Text style={styles.caregiverChipAvatarText}>
                    {caregiverName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.caregiverChipName}>{'This is your space'}</Text>
              </View>
            )}
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

          {/* ═══ Reflection card (mood + text + save) ═══ */}
          <ReflectionCard />

          {/* ═══ Phase 29 Batch B F4 — Action cards row.
                Replaces QuickResetPills (Breathe folded into the orb
                card above; Helpline + Community preserved as cards;
                Wellness added, folding the retired wellnessLink row).
                Pure presentational — handlers wire Linking + navigate
                here in the parent. ═══ */}
          <ActionCardsRow
            onHelpline={() => Linking.openURL('tel:18552273640').catch(() => {})}
            onCommunity={() => Linking.openURL('https://caregiveraction.org/').catch(() => {})}
            onWellness={() => navigate('/caregiver-wellness')}
          />

          {/* ═══ Plan ahead — Phase 7.3 reframe: the prior admin
                eyebrow + serif subtitle pair was retired in favour of a
                single caregiver-voice header sized to match the
                affirmation bump. Phase 29 Batch B F4 — planAheadCard
                wrapper retired alongside the ResourcesList compact
                variant; chevron rows are the chrome now. ═══ */}
          <Text style={styles.planAheadHeader}>When you have a moment</Text>
          <ResourcesList variant="compact" />

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
      paddingTop: 32,
      paddingBottom: 24, // allow: tap-target padding (Apple HIG ≥44pt)
      paddingHorizontal: 4,
      borderBottomWidth: 0.5,
      borderBottomColor: c.glassHover,
    },
    // Phase 29 F1 — time-aware Georgia italic greeting replaces the
    // pre-29 22pt sans-serif "You" title. Weight 400 keeps the line
    // warm without competing with the lower AffirmationHeader; 22pt
    // preserves the vertical rhythm headerStructureContract assumed.
    greeting: {
      fontFamily: 'Georgia',
      fontStyle: 'italic' as const,
      fontSize: 22,
      fontWeight: '400' as const,
      lineHeight: 28,
      color: c.textPrimary,
      letterSpacing: 0.1,
    },
    // Phase 26 F3 — caregiver chip. Mirrors the patient chip pattern in
    // NowHeader (height 22, borderRadius 11, 16pt avatar, 10pt name)
    // but tints lavender via caregiverAccent tokens so the You-lane
    // identity carries across header + tab bar.
    //
    // Phase 29 F1 — chip relocates from inline-with-title to its own
    // row below the greeting. `alignSelf: 'flex-start'` keeps the chip
    // tight to its content; `marginTop: 10` carries the breathing room
    // pre-29 came from the headerTitleRow's gap to the title baseline.
    // Inner Text copy changes from `{caregiverName}` to "This is your
    // space" — see render block above.
    caregiverChip: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      alignSelf: 'flex-start' as const,
      marginTop: 10,
      backgroundColor: c.caregiverAccentBg,
      borderWidth: 0.5,
      borderColor: c.caregiverAccentStrong,
      borderRadius: 11,
      height: 22,
      paddingHorizontal: 8, // allow: tap-target padding (Apple HIG ≥44pt)
      gap: 5,
    },
    caregiverChipAvatar: {
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: c.caregiverAccent,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    caregiverChipAvatarText: {
      fontSize: 9,
      fontWeight: '600' as const,
      color: c.textPrimary,
    },
    caregiverChipName: {
      fontSize: 10,
      color: c.caregiverAccentText,
      fontWeight: '500' as const,
    },
    // Phase 29 Batch B F4 — wellnessLink / wellnessLabel / wellnessChevron
    // style entries retired alongside the wellnessLink JSX row. The
    // Wellness action card in ActionCardsRow now carries the route to
    // /caregiver-wellness; per-card accessibilityHint preserves the
    // pre-B "View your wellness history" screen-reader text.
    //
    // planAheadCard / planAheadBody also retired — the ResourcesList
    // compact variant renders chevron rows that ARE the chrome, so the
    // outer card wrapper became redundant (per Batch B R2).
    planAheadHeader: {
      fontFamily: 'Georgia',
      fontStyle: 'italic' as const,
      fontSize: 18,
      lineHeight: 30,
      color: c.textPrimary,
      marginTop: Spacing.lg,
      marginBottom: 12, // allow: tap-target padding (Apple HIG ≥44pt)
      paddingHorizontal: 14, // allow: tap-target padding (Apple HIG ≥44pt)
    },
    // Phase 26 F5 — footer + footerText style entries retired alongside
    // the JSX block. The closing emotional beat moved entirely onto
    // AffirmationHeader (top of tab) so the You tab has one warm-voice
    // surface, not two.
  });
}
