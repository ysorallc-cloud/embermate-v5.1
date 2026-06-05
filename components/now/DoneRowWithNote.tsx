// Slice 3-A — wraps a Now-tab done row when the underlying LogEntry
// carries a non-empty `notes` value. The whole row becomes tappable
// (Q-3A.6 lock) and a chevron appears as the visual cue. Tap toggles
// an inline note panel below the row (Q-3A.8 lock — no modal, no
// scroll). When `note` is empty / whitespace / undefined and no
// onUndo callback is supplied, the component is a pure passthrough
// — the row chrome stays identical to the no-note case.
//
// Slice 3-D commit 3 — gained an onUndo affordance via long-press
// (Q-3D.4 lock — symmetric with pending rows' long-press skip
// gesture). The two affordances are independent:
//   short-tap   → toggle note expansion (only when note exists)
//   long-press  → invoke onUndo (only when onUndo is supplied)
// Passthrough refined: only when BOTH affordances are absent.
//
// Filter predicate matches the integration round-trip's contract in
// __tests__/integration/logEntryNotesRoundTrip35S3A.test.ts:
// notes?.trim().length > 0.

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

type Props = {
  /** Raw note string from the underlying LogEntry. May be undefined,
   *  empty, or whitespace-only — all three collapse to no-note. */
  note?: string;
  /** Slice 3-D — long-press handler. When supplied, the wrapper
   *  becomes touchable even on rows with no note, so the undo
   *  affordance is reachable everywhere a row is "done" (completed
   *  or skipped). When undefined, long-press is a no-op. */
  onUndo?: () => void;
  children: React.ReactNode;
};

export function DoneRowWithNote({ note, onUndo, children }: Props) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const cleaned = (note ?? '').trim();
  const hasNote = cleaned.length > 0;
  const hasUndo = typeof onUndo === 'function';

  // Passthrough only when BOTH affordances are absent — Slice 3-D
  // refined the Slice 3-A passthrough rule.
  if (!hasNote && !hasUndo) {
    return <>{children}</>;
  }

  const accessibilityLabel = hasNote
    ? expanded
      ? 'Hide note'
      : 'View note'
    : 'Done row';

  return (
    <View>
      <TouchableOpacity
        testID="done-row-note-touchable"
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={hasUndo ? 'Long-press to undo' : undefined}
        onPress={hasNote ? () => setExpanded((e) => !e) : undefined}
        onLongPress={hasUndo ? onUndo : undefined}
        activeOpacity={0.7}
      >
        <View style={styles.row}>
          <View style={styles.rowContent}>{children}</View>
          {hasNote && (
            <Text
              testID="done-row-note-chevron"
              style={[styles.chevron, { color: colors.textTertiary }]}
            >
              {expanded ? '⌃' : '›'}
            </Text>
          )}
        </View>
      </TouchableOpacity>
      {hasNote && expanded && (
        <Text
          testID="done-row-note-expanded"
          style={[styles.expanded, { color: colors.textSecondary }]}
        >
          {cleaned}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowContent: {
    flex: 1,
  },
  chevron: {
    fontSize: 14,
    marginLeft: 8,
    opacity: 0.7,
  },
  expanded: {
    fontStyle: 'italic',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    marginLeft: 8,
  },
});
