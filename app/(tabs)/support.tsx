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
import { AuroraBackground } from '../../components/aurora/AuroraBackground';
import { useTheme } from '../../contexts/ThemeContext';
import { navigate } from '../../lib/navigate';
import { AffirmationHeader } from '../../components/support/AffirmationHeader';
import { ReflectionCard } from '../../components/support/ReflectionCard';
import { QuickResetPills } from '../../components/support/QuickResetPills';
import { BreathingExercise } from '../../components/support/BreathingExercise';
import { ResourcesList } from '../../components/support/ResourcesList';
import { Colors } from '../../theme/theme-tokens';


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
      <AuroraBackground variant="support" />

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

          {/* ═══ Plan ahead — Phase 5 visual-consistency: eyebrow +
                serif italic subtitle live ABOVE the card, not inside.
                The card itself is a single grouped surface with row
                hairlines (rendered by ResourcesList). ═══ */}
          <View style={styles.planAheadHeader}>
            <Text style={styles.planAheadEyebrow}>{'PLAN AHEAD'}</Text>
            <Text style={styles.planAheadSubtitle}>
              When things are calm, future you will be glad.
            </Text>
          </View>
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
    scrollContent: {
      paddingHorizontal: 20,
      paddingBottom: 24,
    },
    headerWrap: {
      paddingTop: 56,
      paddingBottom: 24,
      paddingHorizontal: 4,
      borderBottomWidth: 0.5,
      borderBottomColor: c.glassHover,
    },
    title: {
      fontSize: 32,
      fontWeight: '300' as const,
      color: c.textPrimary,
      letterSpacing: -0.5,
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
      paddingHorizontal: 14,
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
    //    ("future you will be glad"). Surface tinted slightly warmer than
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
    // background tint, no border — it's a free-standing label group.
    planAheadHeader: {
      marginTop: 16,
      paddingHorizontal: 4,
      paddingBottom: 8,
    },
    planAheadEyebrow: {
      fontSize: 9,
      fontWeight: '500' as const,
      letterSpacing: 0.5,
      color: c.textTertiary,
    },
    planAheadSubtitle: {
      fontFamily: 'Georgia',
      fontStyle: 'italic' as const,
      fontSize: 11,
      lineHeight: 15.4,
      color: c.textSecondary,
      marginTop: 4,
    },
    planAheadBody: {
      paddingTop: 4,
      paddingHorizontal: 0,
      paddingBottom: 4,
    },
    // ── Footer affirmation ──
    footer: {
      alignItems: 'center' as const,
      paddingTop: 36,
      paddingBottom: 100,
    },
    footerText: {
      fontSize: 13,
      color: c.textTertiary,
      textAlign: 'center' as const,
      lineHeight: 21,
      fontStyle: 'italic' as const,
    },
  });
}
