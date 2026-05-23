// ============================================================================
// ACTIVITY DRAWER — Phase 32A F11
//
// Smallest drawer in the inline-expand set. Renders inside the Care Plan
// home accordion below the Activity toggle row when Activity is enabled
// AND the row is expanded.
//
// Body: one Reminders Switch wired to bucket-config notificationsEnabled.
// Default: off (matches DEFAULT_BUCKET_CONFIG.notificationsEnabled).
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import type { BucketConfig } from '../../../types/carePlanConfig';

export interface ActivityDrawerProps {
  config: BucketConfig;
  onUpdate: (updates: Partial<BucketConfig>) => void | Promise<void>;
}

export function ActivityDrawer({ config, onUpdate }: ActivityDrawerProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View>
      <View style={styles.row}>
        <View style={styles.rowLabelBlock}>
          <Text style={styles.rowLabel}>Reminders</Text>
          <Text style={styles.rowSubtitle}>Nudge when it's time to log activity.</Text>
        </View>
        <Switch
          value={config.notificationsEnabled ?? false}
          onValueChange={(v) => onUpdate({ notificationsEnabled: v })}
          trackColor={{ false: colors.glassStrong, true: colors.accent }}
          thumbColor={(config.notificationsEnabled ?? false) ? colors.textPrimary : colors.switchThumbOff}
          ios_backgroundColor={colors.glassStrong}
          accessibilityLabel="Activity reminders"
          accessibilityRole="switch"
          accessibilityState={{ checked: config.notificationsEnabled ?? false }}
        />
      </View>
    </View>
  );
}

const createStyles = (c: any) => StyleSheet.create({
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: 12,
  },
  rowLabelBlock: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: c.textPrimary,
  },
  rowSubtitle: {
    marginTop: 2,
    fontSize: 11,
    color: c.textSecondary,
  },
});

export default ActivityDrawer;
