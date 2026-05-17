import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Fonts } from '../theme/theme-tokens';
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
  // Phase 33 F4 — header typography aligned to the website source-of-truth.
  // The pre-Phase-33 H1 was 22pt sans-serif weight 500 (Phase 3.6.3
  // compression). Phase 33 re-establishes the brand serif at headline
  // scale: Source Serif 4, weight 400, letter-spacing −0.8, color
  // textPrimary (warm cream from F1a). Q-33.5 lock: informational tab
  // titles (Journal, Insights) carry REGULAR-weight serif — italic stays
  // reserved for witness voice.
  //
  // Per spec: 28–32pt range with auto-shrink at long titles. Base 32pt
  // for short titles (Journal / Insights / Care Plan); `titleShrink`
  // drops to 28pt at title.length > 16 chars. (Pre-F4 the naming was
  // inverted: titleShrink GREW long titles from 22 → 28. F4 fixes the
  // semantic — titleShrink now actually shrinks 32 → 28, matching the
  // name.) `adjustsFontSizeToFit` handles runtime overflow at 28pt.
  title: {
    fontFamily: Fonts.serif,
    fontSize: 32,
    fontWeight: '400',
    color: c.textPrimary,
    marginBottom: 0,
    letterSpacing: -0.8,
  },
  titleShrink: {
    fontSize: 28,
    letterSpacing: -0.8,
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
