// ============================================================================
// INLINE SAVE TOAST — Bottom-positioned confirmation with optional undo
// Design Rule 14: inline toasts with undo, never separate screens
// ============================================================================

import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export interface InlineSaveToastProps {
  visible: boolean;
  message: string;
  onUndo?: () => void;
  onDismiss: () => void;
  autoDismissMs?: number;
}

const DEFAULT_AUTO_DISMISS = 3000;

export function InlineSaveToast({
  visible,
  message,
  onUndo,
  onDismiss,
  autoDismissMs = DEFAULT_AUTO_DISMISS,
}: InlineSaveToastProps) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        onDismiss();
      }, autoDismissMs);

      return () => clearTimeout(timer);
    } else {
      opacity.setValue(0);
      translateY.setValue(10);
    }
  }, [visible]);

  if (!visible) return null;

  const handleUndo = () => {
    onUndo?.();
    onDismiss();
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: 'rgba(93,202,165,0.12)',
          borderColor: 'rgba(93,202,165,0.15)',
          opacity,
          transform: [{ translateY }],
        },
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <View style={styles.content}>
        <Text style={[styles.checkmark, { color: colors.accent }]}>✓</Text>
        <Text style={[styles.message, { color: colors.textPrimary }]} numberOfLines={1}>
          {message}
        </Text>
        {onUndo && (
          <TouchableOpacity
            onPress={handleUndo}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Undo save"
            accessibilityRole="button"
          >
            <Text style={[styles.undo, { color: colors.accent }]}>Undo</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkmark: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 6,
  },
  message: {
    fontSize: 13,
    flex: 1,
  },
  undo: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 12,
  },
});
