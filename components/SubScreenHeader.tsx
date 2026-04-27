// ============================================================================
// SUB-SCREEN HEADER
// Standardized header for all non-tab screens. Shape mirrors the four-tab
// contract (32pt title / 13pt subtitle / 56pt top padding / 24pt bottom)
// — see __tests__/screens/headerStructureContract.test.ts.
//
// Layout:
//   ┌─ topRow ────────────────────────────┐  44pt height
//   │  [BackButton]              [right]  │
//   ├──────────────────────────────────────┤  marginBottom: 16
//   │  Title (32pt, weight 300)            │
//   │  Subtitle (13pt, textSecondary)      │  marginTop: 8
//   └──────────────────────────────────────┘  paddingBottom: 24
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Colors } from '../theme/theme-tokens';
import { BackButton } from './common/BackButton';

interface SubScreenHeaderProps {
  title: string;
  subtitle?: string;
  /** @deprecated emoji is no longer rendered — kept for back-compat with older callers. */
  emoji?: string;
  rightAction?: React.ReactNode;
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 24,
    borderBottomWidth: 0.5,
    borderBottomColor: c.glassHover,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    marginBottom: 16,
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
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container} accessibilityRole="header">
      <View style={styles.topRow}>
        <BackButton variant="icon" />
        {rightAction ? <View style={styles.rightAction}>{rightAction}</View> : null}
      </View>
      <Text style={styles.title} numberOfLines={2} adjustsFontSizeToFit>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
};

export default SubScreenHeader;
