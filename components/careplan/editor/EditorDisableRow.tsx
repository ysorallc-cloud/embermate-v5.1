// ============================================================================
// EditorDisableRow — Phase 34 F5.1 primitive.
//
// Sibling to EditorSection (F5.0). Wraps an editor drawer with a
// "Turn off {category}" row at the top and a dimmable body slot.
// Q-34.F5.1.B locked option (b): flipping the in-drawer Switch OFF
// keeps the drawer open with the body dimmed + non-interactive —
// caregiver confirms the disable visibly, can re-enable from the
// same Switch, and closes via Done when ready. Instant-collapse was
// rejected because it erases context of what just happened.
//
// CONTRACT (pinned by __tests__/components/editorDisableRow34F5_1.test.tsx):
//
//   1. `label` (required) renders verbatim with the row chrome.
//   2. `enabled` (required) drives the Switch's `value`.
//   3. `onToggle` (required) fires with the new boolean when the
//      Switch flips.
//   4. `children` (required) render below the row in the body slot.
//   5. enabled=true  → body opacity 1,   pointerEvents 'auto'.
//   6. enabled=false → body opacity 0.4, pointerEvents 'none'.
//
// CONSUMED BY: F5.1 (Vitals), F5.2 (Meals), F5.3 (Wellness split —
// once per editor since the split lives behind two drawers), F5.4
// (Meds). Same single source of truth contract that EditorSection
// pins for the section chrome.
// ============================================================================

import React from 'react';
import { View, Text, Switch, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';

export interface EditorDisableRowProps {
  /** Caregiver-facing label, typically "Turn off {category}". */
  label: string;
  /** Current bucket-enabled state. Drives Switch value AND the body
   *  dim treatment (true → active, false → dimmed). */
  enabled: boolean;
  /** Called with the new boolean when the Switch flips. Consumers
   *  route to useCarePlanConfig.toggleBucket. */
  onToggle: (next: boolean) => void;
  /** Optional style override on the outer wrapper. Structural
   *  chrome stays non-overridable. */
  style?: ViewStyle;
  /** Body slot — the rest of the editor (EditorSection blocks etc.).
   *  Dimmed + non-interactive when enabled=false. */
  children: React.ReactNode;
}

export function EditorDisableRow({
  label,
  enabled,
  onToggle,
  style,
  children,
}: EditorDisableRowProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, style]}>
      <View style={styles.row}>
        <Text
          testID="editor-disable-row-label"
          style={[styles.label, { color: colors.textPrimary }]}
        >
          {label}
        </Text>
        <Switch
          testID="editor-disable-row-switch"
          value={enabled}
          onValueChange={onToggle}
          trackColor={{ false: colors.glassStrong, true: colors.accentMuted }}
          thumbColor={enabled ? colors.textPrimary : colors.switchThumbOff}
          ios_backgroundColor={colors.glassStrong}
          accessibilityRole="switch"
          accessibilityLabel={label}
          accessibilityState={{ checked: enabled }}
        />
      </View>
      <View
        testID="editor-disable-row-body"
        // Q-34.F5.1.B option (b): dim+non-interactive when disabled
        // rather than collapse. Caregiver sees what they just turned
        // off; can re-enable from the same Switch without backing out.
        style={[
          styles.body,
          { opacity: enabled ? 1 : 0.4 },
        ]}
        pointerEvents={enabled ? 'auto' : 'none'}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: 6,
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  body: {
    // The dim treatment sits on the opacity prop above; this style
    // is just the layout container.
  },
});
