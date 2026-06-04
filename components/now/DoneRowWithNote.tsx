// Slice 3-A — wraps a Now-tab done row when the underlying LogEntry
// carries a non-empty `notes` value. The whole row becomes tappable
// (Q-3A.6 lock) and a chevron appears as the visual cue. Tap toggles
// an inline note panel below the row (Q-3A.8 lock — no modal, no
// scroll). When `note` is empty / whitespace / undefined, the
// component is a pure passthrough — the row chrome stays identical to
// the no-note case, so rows without notes are visually unchanged.
//
// Filter predicate matches the integration round-trip's contract in
// __tests__/integration/logEntryNotesRoundTrip35S3A.test.ts:
// notes?.trim().length > 0.

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

type Props = {
  /** Raw note string from the underlying LogEntry. May be undefined,
   *  empty, or whitespace-only — all three collapse to passthrough. */
  note?: string;
  children: React.ReactNode;
};

export function DoneRowWithNote({ note, children }: Props) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const cleaned = (note ?? '').trim();

  if (cleaned.length === 0) {
    return <>{children}</>;
  }

  return (
    <View>
      <TouchableOpacity
        testID="done-row-note-touchable"
        accessibilityRole="button"
        accessibilityLabel={expanded ? 'Hide note' : 'View note'}
        onPress={() => setExpanded((e) => !e)}
        activeOpacity={0.7}
      >
        <View style={styles.row}>
          <View style={styles.rowContent}>{children}</View>
          <Text
            testID="done-row-note-chevron"
            style={[styles.chevron, { color: colors.textTertiary }]}
          >
            {expanded ? '⌃' : '›'}
          </Text>
        </View>
      </TouchableOpacity>
      {expanded && (
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
