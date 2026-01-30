import React from 'react';
import { View, StyleSheet, ViewStyle, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Colors, BorderRadius, Spacing } from '../../app/_theme/theme-tokens';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  glow?: string;         // Color for glow effect
  padding?: number;      // Override default padding
  noPadding?: boolean;   // Remove padding entirely
  intensity?: number;    // Blur intensity (default 25)
  // Accessibility props
  accessible?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: 'none' | 'button' | 'link' | 'search' | 'image' | 'text' | 'adjustable' | 'header' | 'summary' | 'alert';
}

export const GlassCard: React.FC<Props> = ({
  children,
  style,
  glow,
  padding,
  noPadding = false,
  intensity = 25,
  accessible,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole,
}) => {
  const cardPadding = noPadding ? 0 : (padding ?? Spacing.xl);

  return (
    <View
      style={[
        styles.container,
        glow && {
          shadowColor: glow,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.4,
          shadowRadius: 20,
          elevation: 8,
        },
        style,
      ]}
      accessible={accessible}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityRole={accessibilityRole}
    >
      {/* Blur layer - only on iOS/Android, not web */}
      {Platform.OS !== 'web' && (
        <BlurView
          intensity={intensity}
          tint="dark"
          style={StyleSheet.absoluteFill}
        />
      )}

      {/* Semi-transparent overlay for glass effect */}
      <View style={[StyleSheet.absoluteFill, styles.glassOverlay]} />

      {/* Content */}
      <View style={[styles.content, { padding: cardPadding }]}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    // Default shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  glassOverlay: {
    backgroundColor: Colors.glass,
  },
  content: {
    // Padding applied dynamically
  },
});

export default GlassCard;
