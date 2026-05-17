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
import { Colors, Spacing } from '../theme/theme-tokens';
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
  title: {
    fontSize: 32,
    fontWeight: '300',
    color: c.textPrimary,
    letterSpacing: -0.5,
  },
  // Phase 29 Batch C F1 — serif variant. Witness-voice typography for
  // caregiver-lane subscreens (caregiver-wellness, /resources). 20pt is
  // smaller than the 22pt You-tab greeting on purpose — subscreen H1
  // sits below the tab H1 in the visual hierarchy.
  titleSerif: {
    fontFamily: 'Georgia',
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
