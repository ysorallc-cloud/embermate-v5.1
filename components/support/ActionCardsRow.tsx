// ============================================================================
// ACTION CARDS ROW — Phase 29 Batch B F2.
//
// Three small cards in a single equal-width row on the You tab, between
// the ReflectionCard above and the compact ResourcesList below. Replaces
// the pre-B QuickResetPills surface (which fully retires in F4).
//
// Cards (in order):
//   1. Helpline   — call-outline icon, "24/7" subtitle
//   2. Community  — heart-outline icon, "Read" subtitle
//   3. Wellness   — pulse-outline icon, "Over time" subtitle
//
// Chrome — Path A per Phase 29 Batch B F2 decision (2026-05-16):
// neutral whisper chrome (rgba(255,255,255,0.035) bg + rgba(255,255,255,
// 0.08) border) with lavender ONLY on the icon accent. The across-
// surfaces lane-coherence rule applies: the orb above is the visual
// lead carrying full lavender chrome saturation; the action cards step
// back as auxiliary surfaces with neutral chrome and icon-as-lane-marker.
// Saturating these cards too would push the You tab into "everything is
// lavender" — lane identity dilutes into wallpaper.
//
// Component is purely presentational. Three required onPress handlers
// from the parent (support.tsx in F4) drive the Linking / navigate side
// effects. No internal navigation or Linking calls.
//
// Row structure preserved from QuickResetPills for F4 drop-in
// compatibility: flexDirection 'row', gap 8, marginVertical 14, flex 1
// per card. Vertical rhythm in support.tsx is unchanged across the swap.
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

export interface ActionCardsRowProps {
  /** Fired when the Helpline card is tapped. Parent (support.tsx) wires
   *  this to Linking.openURL('tel:18552273640') — the Caregiver Action
   *  Network 24/7 helpline. */
  onHelpline: () => void;
  /** Fired when the Community card is tapped. Parent wires this to
   *  Linking.openURL('https://caregiveraction.org/'). */
  onCommunity: () => void;
  /** Fired when the Wellness card is tapped. Parent wires this to
   *  navigate('/caregiver-wellness') — same destination as the retired
   *  wellnessLink row. */
  onWellness: () => void;
}

interface CardSpec {
  testID: string;
  iconName: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle: string;
  accessibilityLabel: string;
  accessibilityHint?: string;
}

export function ActionCardsRow({
  onHelpline,
  onCommunity,
  onWellness,
}: ActionCardsRowProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const cards: ReadonlyArray<CardSpec & { onPress: () => void }> = [
    {
      testID: 'action-card-helpline',
      iconName: 'call-outline',
      label: 'Helpline',
      subtitle: '24/7',
      accessibilityLabel: 'Helpline',
      accessibilityHint: 'Call the Caregiver Action Network helpline — free and confidential',
      onPress: onHelpline,
    },
    {
      testID: 'action-card-community',
      iconName: 'heart-outline',
      label: 'Community',
      subtitle: 'Read',
      accessibilityLabel: 'Community',
      accessibilityHint: 'Open the caregiver community',
      onPress: onCommunity,
    },
    {
      testID: 'action-card-wellness',
      iconName: 'pulse-outline',
      label: 'Wellness',
      subtitle: 'Over time',
      accessibilityLabel: 'Wellness',
      accessibilityHint: 'View your wellness history',
      onPress: onWellness,
    },
  ];

  return (
    <View style={styles.row}>
      {cards.map((c) => (
        <TouchableOpacity
          key={c.testID}
          testID={c.testID}
          style={styles.card}
          onPress={c.onPress}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={c.accessibilityLabel}
          accessibilityHint={c.accessibilityHint}
        >
          {/* F7 C5 — lavender icon accent → dusty blue (#6b8cae). The
              You-lane caregiverAccent identity stays on the broader
              tab; the support tiles step into the dusty handoff palette
              per F7 spec. */}
          <Ionicons name={c.iconName} size={13} color="#6b8cae" />
          <Text style={styles.label}>{c.label}</Text>
          <Text style={styles.subtitle}>{c.subtitle}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const createStyles = (c: any) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row' as const,
      gap: 8,
      marginVertical: 14, // allow: off-scale gap (preserves QuickResetPills vertical rhythm in F4 swap)
    },
    card: {
      flex: 1,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: 'rgba(255,255,255,0.035)',
      borderWidth: 0.5,
      borderColor: 'rgba(255,255,255,0.08)',
      borderRadius: 9,
      paddingVertical: 9,
      paddingHorizontal: 8, // allow: tap-target padding (Apple HIG ≥44pt)
      minHeight: 48, // allow: tap-target floor (Apple HIG ≥44pt; 18 padding + 30 content)
      gap: 2,
    },
    label: {
      fontSize: 9.5,
      fontWeight: '500' as const,
      color: c.textPrimary,
      marginTop: 3,
    },
    subtitle: {
      fontSize: 7.5,
      color: c.textTertiary,
      marginTop: 1,
    },
  });

export default ActionCardsRow;
