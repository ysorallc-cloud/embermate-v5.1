// ============================================================================
// YOU TAB — Reflection space (Option C, v6.7).
//
// Composition (top to bottom):
//   • Standardized 32pt "You" header + subtitle (56pt top / 24pt bottom)
//   • Daily affirmation header (serif italic ambient line)
//   • Reflection card (mood + free-text + save — the heart of the redesign)
//   • Quick reset pills (Breathe / Helpline / Community)
//   • Compact wellness link row (tappable, routes to /caregiver-wellness)
//   • Plan ahead section (header + quiet subtitle + ResourcesList)
//   • Footer affirmation
// ============================================================================

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { navigate } from '../../lib/navigate';
import { AffirmationHeader } from '../../components/support/AffirmationHeader';
import { ReflectionCard } from '../../components/support/ReflectionCard';
import { QuickResetPills } from '../../components/support/QuickResetPills';
import { BreathingExercise } from '../../components/support/BreathingExercise';
import { ResourcesList } from '../../components/support/ResourcesList';
import { Colors, Spacing } from '../../theme/theme-tokens';


// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SupportScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [refreshing, setRefreshing] = useState(false);
  const [breathingVisible, setBreathingVisible] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 500));
    setRefreshing(false);
  }, []);


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
          {/* ═══ HEADER ═══ */}
          <View style={styles.headerWrap}>
            <Text style={styles.title}>You</Text>
            <Text style={styles.headerMessage}>
              A space for you, not your loved one.
            </Text>
          </View>

          {/* ═══ Daily affirmation ═══ */}
          <AffirmationHeader />

          {/* ═══ Reflection card (mood + text + save) ═══ */}
          <ReflectionCard />

          {/* ═══ Quick reset pills ═══ */}
          <QuickResetPills
            onBreathe={() => setBreathingVisible(true)}
            onHelpline={() => Linking.openURL('tel:18552273640').catch(() => {})}
            onCommunity={() => Linking.openURL('https://caregiveraction.org/').catch(() => {})}
          />

          {/* ═══ Compact wellness link ═══ */}
          <TouchableOpacity
            style={styles.wellnessLink}
            onPress={() => navigate('/caregiver-wellness')}
            activeOpacity={0.7}
            accessibilityLabel="View your wellness history"
            accessibilityRole="button"
          >
            <Text style={styles.wellnessLabel}>YOUR WELLNESS OVER TIME</Text>
            <Text style={styles.wellnessChevron}>{'›'}</Text>
          </TouchableOpacity>

          {/* ═══ Plan ahead — Phase 7.3 reframe: the prior admin
                eyebrow + serif subtitle pair was retired in favour of a
                single caregiver-voice header sized to match the
                affirmation bump. The list below carries the meaning.
                ═══ */}
          <Text style={styles.planAheadHeader}>When you have a moment</Text>
          <View style={styles.planAheadCard}>
            <View style={styles.planAheadBody}>
              <ResourcesList />
            </View>
          </View>

          {/* ═══ Footer affirmation ═══ */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              You're doing something{'\n'}most people never see.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>

      <BreathingExercise
        visible={breathingVisible}
        onClose={() => setBreathingVisible(false)}
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
    scrollContent: {
      paddingTop: 24, // allow: tap-target padding (Apple HIG ≥44pt)
      paddingHorizontal: 14, // allow: tap-target padding (Apple HIG ≥44pt)
      paddingBottom: 24, // allow: tap-target padding (Apple HIG ≥44pt)
    },
    headerWrap: {
      paddingTop: 32,
      paddingBottom: 24, // allow: tap-target padding (Apple HIG ≥44pt)
      paddingHorizontal: 4,
      borderBottomWidth: 0.5,
      borderBottomColor: c.glassHover,
    },
    // Phase 3.6.3 — H1 fontSize 32 → 22 with weight 500 + letterSpacing
    // -0.3 to match Now's compressed greeting (Phase 3.6.2).
    title: {
      fontSize: 22,
      fontWeight: '500' as const,
      color: c.textPrimary,
      letterSpacing: -0.3,
      marginBottom: 0,
    },
    headerMessage: {
      fontSize: 13,
      color: c.textSecondary,
      lineHeight: 20,
      marginTop: 8,
    },
    // ── Wellness link (compact row) ──
    wellnessLink: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      backgroundColor: c.glassDim,
      borderWidth: 0.5,
      borderColor: c.glassBorder,
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 14, // allow: tap-target padding (Apple HIG ≥44pt)
    },
    wellnessLabel: {
      fontSize: 10,
      fontWeight: '600' as const,
      color: c.textTertiary,
      letterSpacing: 0.3,
    },
    wellnessChevron: {
      fontSize: 14,
      color: c.textTertiary,
    },
    // ── Plan ahead — contained card with an internal eyebrow header
    //    Surface tinted slightly warmer than
    //    the global glass via the youCardSurface token. ──
    // v6.7 Phase 5 — single grouped card; no internal header (the eyebrow
    // sits above via planAheadHeader). marginTop folded into planAheadHeader.
    planAheadCard: {
      backgroundColor: (c as any).youCardSurface || c.glass,
      borderWidth: 0.5,
      borderColor: (c as any).youCardBorder || c.glassBorder,
      borderRadius: 10,
      overflow: 'hidden' as const,
    },
    // v6.7 Phase 5 — eyebrow + subtitle now live ABOVE the card. No
    // Phase 7.3 — single serif-italic header replaces the prior eyebrow +
    // subtitle pair. Sized to match the affirmation header (18pt) so
    // the "warm voice" lines of the You tab read at the same volume.
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
    planAheadBody: {
      paddingTop: 4,
      paddingHorizontal: 0,
      paddingBottom: 4,
    },
    // ── Footer affirmation ──
    // Phase 7.4 — Option B: lift the closing affirmation slightly so it
    // reads as a deliberate emotional beat rather than chrome. +2pt
    // type, +1 token of color (textTertiary → textSecondary), +8pt of
    // vertical breathing room above and below.
    footer: {
      alignItems: 'center' as const,
      paddingTop: 44,
      paddingBottom: 108,
    },
    footerText: {
      fontSize: 15,
      color: c.textSecondary,
      textAlign: 'center' as const,
      lineHeight: 24,
      fontStyle: 'italic' as const,
    },
  });
}
