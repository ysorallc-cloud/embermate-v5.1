import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../theme/theme-tokens';
import { useTheme } from '../contexts/ThemeContext';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  purpose?: string;
  style?: ViewStyle;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    paddingHorizontal: 16, // allow: tap-target padding (Apple HIG ≥44pt)
    paddingTop: 32,
    paddingBottom: 24, // allow: tap-target padding (Apple HIG ≥44pt)
    borderBottomWidth: 0.5,
    borderBottomColor: c.glassHover,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  titleContainer: {
    flex: 1,
  },
  // Phase 3.6.3 — H1 fontSize 32 → 22 with weight 500 + letterSpacing
  // -0.3 to match Now's compressed greeting. ScreenHeader is consumed
  // by Insights (the 4th tab) plus ~20 sub-screens (log forms, care
  // report, patient questions). The same compression benefits the
  // sub-screens — they generally don't need a hero-sized title — so
  // this single change also propagates the new H1 contract beyond the
  // four-tab scope.
  title: {
    fontSize: 22,
    fontWeight: '500',
    color: c.textPrimary,
    marginBottom: 0,
    letterSpacing: -0.3,
  },
  titleShrink: {
    fontSize: 28,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '400',
    color: c.textSecondary,
    letterSpacing: 0.2,
    marginTop: 8,
    lineHeight: 20,
  },
  leftAction: {
    marginBottom: 8,
  },
  rightAction: {
    paddingTop: 2,
    paddingLeft: 12,
  },
  purpose: {
    fontSize: 13,
    color: c.textSecondary,
    marginTop: 4,
    letterSpacing: 0.1,
    lineHeight: 20,
  },
});

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  subtitle,
  purpose,
  style,
  leftAction,
  rightAction,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[styles.container, style]}>
      {leftAction && (
        <View style={styles.leftAction}>
          {leftAction}
        </View>
      )}
      <View style={styles.headerRow}>
        <View style={styles.titleContainer}>
          <Text
            style={[styles.title, title.length > 16 && styles.titleShrink]}
            numberOfLines={2}
            adjustsFontSizeToFit
          >
            {title}
          </Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          {purpose && <Text style={styles.purpose}>{purpose}</Text>}
        </View>
        {rightAction && (
          <View style={styles.rightAction}>
            {rightAction}
          </View>
        )}
      </View>
    </View>
  );
};

export default ScreenHeader;
