// ============================================================================
// REGISTERCARD — Design-Lock §6 card with a 3px inset left-accent bar.
//
// The bar is WAYFINDING (lock §5/§6): its color = the card's semantic
// register (coral/gold/sage/blue/neutral), resolved through theme tokens.
// Replaces the old top-glow as the primary card differentiator. The bar is
// inset vertically (10pt top/bottom) so it reads as a bar, not the card edge,
// and clears the rounded corners.
//
// Foundation primitive for the Phase-1 screen rebuilds — drop-in card surface
// + accent bar. Interactive when onPress/onLongPress is supplied.
// ============================================================================

import React, { useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  StyleProp,
  AccessibilityRole,
} from 'react-native';
import { Colors, Spacing } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { CardRegister, getRegisterColor } from '../../theme/registerColors';

export interface RegisterCardProps {
  /** Semantic register — drives the left-bar color (lock §5). */
  register: CardRegister;

  /** Card content. */
  children: React.ReactNode;

  /** Additional container styles (padding, margin, etc.). */
  style?: StyleProp<ViewStyle>;

  /** Press handler — makes the card interactive. */
  onPress?: () => void;

  /** Long-press handler. */
  onLongPress?: () => void;

  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}

export const RegisterCard: React.FC<RegisterCardProps> = ({
  register,
  children,
  style,
  onPress,
  onLongPress,
  accessibilityLabel,
  accessibilityHint,
  testID,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const barColor = getRegisterColor(colors, register);

  const interactive = !!(onPress || onLongPress);
  const a11yRole: AccessibilityRole = interactive ? 'button' : 'none';

  const inner = (
    <>
      <View
        style={[styles.accentBar, { backgroundColor: barColor }]}
        pointerEvents="none"
        testID={testID ? `${testID}-accent` : undefined}
      />
      {children}
    </>
  );

  if (interactive) {
    return (
      <TouchableOpacity
        style={[styles.card, style]}
        onPress={onPress}
        onLongPress={onLongPress}
        activeOpacity={0.8}
        accessible
        accessibilityRole={a11yRole}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        testID={testID}
      >
        {inner}
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={[styles.card, style]}
      accessible={!!accessibilityLabel}
      accessibilityRole="none"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      {inner}
    </View>
  );
};

const createStyles = (c: typeof Colors) =>
  StyleSheet.create({
    card: {
      position: 'relative',
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.glassBorder,
      borderRadius: 16,
      paddingVertical: Spacing.md,
      // Content clears the left bar (3px bar + 13pt breathing room).
      paddingLeft: Spacing.md,
      paddingRight: Spacing.md,
    },
    accentBar: {
      position: 'absolute',
      left: 0,
      top: 10,
      bottom: 10,
      width: 3,
      borderTopRightRadius: 2,
      borderBottomRightRadius: 2,
    },
  });

export default RegisterCard;
