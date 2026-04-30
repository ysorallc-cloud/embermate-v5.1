// ============================================================================
// INLINE CHECKBOX
//
// Trailing-edge log affordance for Now timeline rows. Replaces the legacy
// "Log" button. Three visual states:
//
//   pending — empty circle, mint border, neutral fill
//   logged  — filled mint circle with a centred checkmark
//   skipped — outlined circle with a dash glyph
//
// Tap → instant log (parent fires onPress). Long-press → skip menu (parent
// fires onLongPress; the InlineCheckbox itself doesn't render the menu).
// Tapping the row body lives outside this component — the row owns that
// gesture so the checkbox's tap target stays small and intentional.
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export type InlineCheckboxState = 'pending' | 'logged' | 'skipped';

export interface InlineCheckboxProps {
  state: InlineCheckboxState;
  /** Plain-language label for the item (e.g. "Acetaminophen"). Drives a11y. */
  label: string;
  onPress: () => void;
  onLongPress?: () => void;
  testID?: string;
}

export function InlineCheckbox({
  state,
  label,
  onPress,
  onLongPress,
  testID,
}: InlineCheckboxProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const a11yLabel = state === 'logged'
    ? `${label}: logged. Tap to undo.`
    : state === 'skipped'
      ? `${label}: skipped.`
      : `${label}: not logged yet. Tap to log.`;
  const a11yHint = onLongPress
    ? 'Long press to skip with a reason or add details.'
    : undefined;

  const filled = state === 'logged';
  const skipped = state === 'skipped';

  return (
    <TouchableOpacity
      testID={testID}
      style={[
        styles.box,
        filled && styles.boxFilled,
        skipped && styles.boxSkipped,
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
      accessibilityRole="checkbox"
      accessibilityLabel={a11yLabel}
      accessibilityHint={a11yHint}
      accessibilityState={{ checked: filled }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      {filled && <Text style={styles.glyphFilled}>{'✓'}</Text>}
      {skipped && <Text style={styles.glyphSkipped}>{'—'}</Text>}
    </TouchableOpacity>
  );
}

const createStyles = (c: any) => StyleSheet.create({
  box: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: c.glassBorder,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxFilled: {
    backgroundColor: c.accent,
    borderColor: c.accent,
  },
  boxSkipped: {
    backgroundColor: 'transparent',
    borderColor: c.textTertiary,
  },
  glyphFilled: {
    fontSize: 14,
    fontWeight: '600',
    color: c.textPrimary,
  },
  glyphSkipped: {
    fontSize: 14,
    color: c.textTertiary,
  },
});

export default InlineCheckbox;
