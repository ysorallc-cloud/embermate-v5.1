// ============================================================================
// LOG TOAST
//
// Persists for 5 seconds after an instant log on the Now timeline. Surfaces
// two callbacks: Add (open the detail sheet to add notes / dose / etc.)
// and Undo (revert the log + return the row to pending).
//
// The toast only owns its visual + dismiss timer; the parent owns the
// "what was just logged" memory and decides what Add / Undo do.
// ============================================================================

import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export const TOAST_DURATION_MS = 5000;

export interface LogToastProps {
  visible: boolean;
  message: string;
  onAdd: () => void;
  onUndo: () => void;
  onDismiss: () => void;
}

export function LogToast({
  visible,
  message,
  onAdd,
  onUndo,
  onDismiss,
}: LogToastProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onDismiss(), TOAST_DURATION_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [visible, onDismiss]);

  if (!visible) return null;

  return (
    <View
      style={styles.wrap}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      <Text style={styles.message} numberOfLines={2}>{message}</Text>
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onAdd}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Add details to this log"
        >
          <Text style={styles.actionText}>{'Add'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onUndo}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Undo this log"
        >
          <Text style={[styles.actionText, styles.actionTextUndo]}>{'Undo'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (c: any) => StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: (c as any).menuSurface || c.glass,
    borderWidth: 0.5,
    borderColor: c.glassBorder,
    borderRadius: 12,
    paddingVertical: 10,
    paddingLeft: 14,
    paddingRight: 8,
    marginHorizontal: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  message: {
    flex: 1,
    fontSize: 13,
    color: c.textPrimary,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
  },
  actionButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '500',
    color: c.accent,
  },
  actionTextUndo: {
    color: c.textSecondary,
  },
});

export default LogToast;
