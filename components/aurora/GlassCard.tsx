import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors, BorderRadius, Spacing } from '../../app/_theme/theme-tokens';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  glow?: string;         // Color for glow effect
  padding?: number;      // Override default padding
  noPadding?: boolean;   // Remove padding entirely
}

export const GlassCard: React.FC<Props> = ({
  children,
  style,
  glow,
  padding,
  noPadding = false,
}) => {
  const cardPadding = noPadding ? 0 : (padding ?? Spacing.xl);

  return (
    <View style={[
      styles.container,
      { padding: cardPadding },
      glow && {
        shadowColor: glow,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 8,
      },
      style,
    ]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.glass,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
});

export default GlassCard;
