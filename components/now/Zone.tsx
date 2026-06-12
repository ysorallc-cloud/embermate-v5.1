// ============================================================================
// ZONE — F7 zone wrapper for the Now (and forward) zone architecture.
//
// A zone is a tinted-background region grouping related rows under a
// single micro-eyebrow header. Three zones live on Now today (Action,
// Health, Reflection); the wrapper is generic so the same primitive
// can mount on Insights / Care Plan / You as those surfaces re-pass.
//
// Eyebrow contract:
//   ICON · LABEL · "verb"
//   (e.g. "💊 MEDICATIONS · do", "♥ TODAY'S HEALTH · review")
//
// Tint contract:
//   tint='z1' — warm ember-near-black (action / always-on)
//   tint='z2' — slightly cooler reflection tint
//   tint='none' — open fabric, no background
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import {
  CARD_PADDING_H,
  CARD_PADDING_V,
  TITLE_CLEARANCE,
  TypeScale,
  ZoneTint,
} from '../../theme/spacing';

export type ZoneTintName = 'z1' | 'z2' | 'none';

export interface ZoneProps {
  /** Single emoji or unicode glyph for the zone's leading icon. */
  icon: string;
  /** UPPERCASE label, e.g. "MEDICATIONS". */
  label: string;
  /** Lowercase verb describing the zone's intent ("do", "review",
   *  "reflect"). Reads as a tiny suffix after the label. */
  verb: string;
  /** Zone background tint. */
  tint: ZoneTintName;
  /** Zone body — rows or cards. */
  children: React.ReactNode;
  /** Test affordance. */
  testID?: string;
}

export function Zone({ icon, label, verb, tint, children, testID }: ZoneProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors, tint), [colors, tint]);

  return (
    <View style={styles.zone} testID={testID}>
      <Text style={styles.eyebrow}>
        {icon}
        {' '}
        <Text style={styles.eyebrowLabel}>{label}</Text>
        <Text style={styles.eyebrowVerb}>{` · ${verb}`}</Text>
      </Text>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const createStyles = (c: typeof Colors, tint: ZoneTintName) =>
  StyleSheet.create({
    zone: {
      backgroundColor: tint === 'none' ? 'transparent' : ZoneTint[tint],
      paddingTop: tint === 'none' ? 0 : CARD_PADDING_V,
      paddingBottom: tint === 'none' ? 0 : CARD_PADDING_V,
      paddingHorizontal: tint === 'none' ? 0 : CARD_PADDING_H,
      borderRadius: tint === 'none' ? 0 : 12,
    },
    eyebrow: {
      ...TypeScale.micro,
      color: c.textTertiary,
      marginBottom: TITLE_CLEARANCE - CARD_PADDING_V, // allow: zone-eyebrow-to-body rhythm
    },
    eyebrowLabel: {
      color: c.textPrimary,
    },
    eyebrowVerb: {
      color: c.textTertiary,
      fontWeight: '400',
      letterSpacing: 0.3,
      textTransform: 'lowercase',
    },
    body: {
      // Body owns its own row rhythm; zone just provides bg + eyebrow.
    },
  });

export default Zone;
