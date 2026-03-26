// ============================================================================
// SHARE TOAST — Slide-down confirmation banner after sharing
// Reusable across Journal and Insights
// ============================================================================

import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export const SHARE_TOAST_DURATION = 3000;

interface ShareToastProps {
  visible: boolean;
  message?: string;
  subtitle?: string;
  onDismiss: () => void;
}

export function ShareToast({
  visible,
  message = 'Report ready to share',
  subtitle = 'Opening share sheet...',
  onDismiss,
}: ShareToastProps) {
  const { colors } = useTheme();
  const translateY = useRef(new Animated.Value(-80)).current;

  useEffect(() => {
    if (visible) {
      // Slide in from top
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }).start();

      // Auto-dismiss after timeout
      const timer = setTimeout(() => {
        Animated.timing(translateY, {
          toValue: -80,
          duration: 250,
          useNativeDriver: true,
        }).start(() => onDismiss());
      }, SHARE_TOAST_DURATION);

      return () => clearTimeout(timer);
    } else {
      translateY.setValue(-80);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.glass,
          borderColor: colors.accent,
          transform: [{ translateY }],
        },
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Text style={[styles.message, { color: colors.textPrimary }]}>{message}</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    zIndex: 999,
  },
  message: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
  },
});
