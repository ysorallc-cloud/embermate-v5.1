// ============================================================================
// LOG TOAST
//
// Persists for 5 seconds after an instant log on the Now timeline. Surfaces
// up to two callbacks: Add (open the detail sheet to add notes / dose / etc.)
// and Undo (revert the log + return the row to pending).
//
// Tenure-driven scaffolding (Prompt 6 Phase 2):
//   • new        — secondary line "Anything to note? (side effect, refused,
//                  mood)" + Add link primary
//   • experienced — short "Anything to note?" + Add link secondary
//   • seasoned   — Undo only; Add hidden by default at this tier
//
// Anomaly override: when `anomalyPrompt` is set, the toast surfaces it as
// the secondary line at every tier and re-shows the Add link so the
// caregiver can pivot into details. Anomaly prompts win over the generic
// scaffolding regardless of tenure.
// ============================================================================

import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import type { TenurePhase } from '../../services/userTenure';

export const TOAST_DURATION_MS = 5000;

export interface LogToastProps {
  visible: boolean;
  message: string;
  onAdd: () => void;
  onUndo: () => void;
  onDismiss: () => void;
  /** Defaults to 'new' so callers that haven't loaded tenure yet still
      render the helpful scaffolding (safe default). */
  tenure?: TenurePhase;
  /** Anomaly-driven copy that overrides the tenure default. */
  anomalyPrompt?: string;
  /** Phase 35 Slice 3-D — primary action label override. Defaults to
   *  'Undo'. The Redo mode used by the long-press done-row affordance
   *  passes 'Redo' here; the `onUndo` callback is wired to
   *  resurrectLogEntry in that case. Decoupling label from callback
   *  lets one component cover both 5s windows without a parallel
   *  toast surface. */
  undoLabel?: string;
  /** Phase 35 Slice 3-D — unconditional hide for the Add button.
   *  Wins over tenure-driven scaffolding. Used in Redo mode where
   *  there is no fresh log to add details to. */
  hideAdd?: boolean;
}

const NEW_PROMPT = 'Anything to note? (side effect, refused, mood)';
const EXPERIENCED_PROMPT = 'Anything to note?';

export function LogToast({
  visible,
  message,
  onAdd,
  onUndo,
  onDismiss,
  tenure = 'new',
  anomalyPrompt,
  undoLabel = 'Undo',
  hideAdd = false,
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

  // Resolve prompt + Add visibility from tenure + anomaly state.
  let promptLine: string | null = null;
  let showAdd = true;
  let addStyle = styles.actionText;
  if (anomalyPrompt) {
    promptLine = anomalyPrompt;
  } else if (tenure === 'new') {
    promptLine = NEW_PROMPT;
  } else if (tenure === 'experienced') {
    promptLine = EXPERIENCED_PROMPT;
    addStyle = styles.actionTextSecondary;
  } else {
    // seasoned + no anomaly — quiet by default
    promptLine = null;
    showAdd = false;
  }
  // Slice 3-D — hideAdd wins over tenure (Redo mode is single-action).
  if (hideAdd) showAdd = false;

  return (
    <View
      style={styles.wrap}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      <View style={styles.messageColumn}>
        <Text style={styles.message} numberOfLines={2}>{message}</Text>
        {promptLine ? (
          <Text style={styles.prompt} numberOfLines={2}>{promptLine}</Text>
        ) : null}
      </View>
      <View style={styles.actions}>
        {showAdd && (
          <TouchableOpacity
            testID="log-toast-add"
            style={styles.actionButton}
            onPress={onAdd}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Add details to this log"
          >
            <Text style={addStyle}>{'Add'}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          testID="log-toast-undo"
          style={styles.actionButton}
          onPress={onUndo}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`${undoLabel} this log`}
        >
          <Text style={[styles.actionText, styles.actionTextUndo]}>{undoLabel}</Text>
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
    paddingLeft: 14, // allow: tap-target padding (Apple HIG ≥44pt)
    paddingRight: 8,
    marginHorizontal: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  messageColumn: {
    flex: 1,
  },
  message: {
    fontSize: 13,
    color: c.textPrimary,
  },
  prompt: {
    fontSize: 11,
    color: c.textSecondary,
    marginTop: 2,
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
  // Secondary-styled Add link for the experienced tier (smaller emphasis).
  actionTextSecondary: {
    fontSize: 12,
    fontWeight: '500',
    color: c.accent,
  },
  actionTextUndo: {
    color: c.textSecondary,
  },
});

export default LogToast;
