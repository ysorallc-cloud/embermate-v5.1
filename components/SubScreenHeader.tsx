// ============================================================================
// SUB-SCREEN HEADER
// Standardized header for all non-tab screens. Shape mirrors the four-tab
// contract (32pt title / 13pt subtitle / 56pt top padding / 24pt bottom)
// — see __tests__/screens/headerStructureContract.test.ts.
//
// Layout:
//   ┌─ topRow ────────────────────────────┐  44pt height
//   │  [BackButton]              [right]  │
//   ├──────────────────────────────────────┤  marginBottom: Spacing.md
//   │  Title (32pt, weight 300)            │
//   │  Subtitle (13pt, textSecondary)      │  marginTop: 8
//   └──────────────────────────────────────┘  paddingBottom: 24
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Colors, Spacing, Fonts } from '../theme/theme-tokens';
import { BackButton } from './common/BackButton';

interface SubScreenHeaderProps {
  title: string;
  subtitle?: string;
  /** @deprecated emoji is no longer rendered — kept for back-compat with older callers. */
  emoji?: string;
  rightAction?: React.ReactNode;
  /**
   * Phase 29 Batch C F1 — title typography variant. Defaults to
   * 'default' (32pt sans-serif weight 300, the structural shape every
   * sub-screen has used since the four-tab unification). 'serif'
   * renders Georgia italic 20pt weight 400 — the witness-voice
   * register the You-lane carries on the greeting + ReflectionCard +
   * orb card. Used by the caregiver-wellness subscreen and the
   * /resources subscreen so their lavender-lane subscreens read in
   * the same voice as the You tab that launches them.
   */
  titleVariant?: 'default' | 'serif';
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    paddingHorizontal: 16, // allow: tap-target padding (Apple HIG ≥44pt)
    paddingTop: 56,
    paddingBottom: 24, // allow: tap-target padding (Apple HIG ≥44pt)
    borderBottomWidth: 0.5,
    borderBottomColor: c.glassHover,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    marginBottom: Spacing.md,
  },
  rightAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Phase 33 F5 — default variant aligned to website source-of-truth.
  // The pre-Phase-33 default was 32pt sans-serif weight 300 (informational
  // hairline-light). Phase 33 re-establishes the brand serif at headline
  // scale: Source Serif 4, weight 400, letter-spacing −0.8 (was −0.5).
  // Q-33.5/Q-33.7 lock: subscreen labels via SubScreenHeader default
  // variant carry REGULAR-weight serif — informational, not witness-voice.
  // The opt-in serif (italic) variant below stays for witness-voice
  // subscreens (Batch C "Your wellness" pattern).
  title: {
    fontFamily: Fonts.serif,
    fontSize: 32,
    fontWeight: '400',
    color: c.textPrimary,
    letterSpacing: -0.8,
  },
  // Phase 29 Batch C F1 — opt-in italic-serif variant. Witness-voice
  // typography for caregiver-lane subscreens (caregiver-wellness,
  // /resources). 20pt is smaller than the 32pt default + tab H1 on
  // purpose — italic witness-voice subscreen H1 sits below the
  // informational H1 register.
  // Phase 33 F5 — fontFamily literal 'Georgia' replaced with
  // Fonts.serifItalic token so the variant picks up the Source Serif 4
  // italic from the F3 loader. Pre-loader fallback: RN's font-resolution
  // falls back to system Georgia if the registered font name doesn't
  // resolve, preserving the v6.7 rendering during the splash window.
  titleSerif: {
    fontFamily: Fonts.serifItalic,
    fontStyle: 'italic' as const,
    fontSize: 20,
    fontWeight: '400' as const,
    color: c.textPrimary,
    letterSpacing: 0.1,
    lineHeight: 26,
  },
  subtitle: {
    fontSize: 13,
    color: c.textSecondary,
    lineHeight: 20,
    marginTop: 8,
  },
});

export const SubScreenHeader: React.FC<SubScreenHeaderProps> = ({
  title,
  subtitle,
  rightAction,
  titleVariant = 'default',
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const titleStyle = titleVariant === 'serif' ? styles.titleSerif : styles.title;

  return (
    <View style={styles.container} accessibilityRole="header">
      <View style={styles.topRow}>
        <BackButton variant="icon" />
        {rightAction ? <View style={styles.rightAction}>{rightAction}</View> : null}
      </View>
      <Text style={titleStyle} numberOfLines={2} adjustsFontSizeToFit>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
};

export default SubScreenHeader;
