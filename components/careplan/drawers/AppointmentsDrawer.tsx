// ============================================================================
// APPOINTMENTS DRAWER — Phase 32A F12
//
// Body: single Reminders Switch with Q-32A.1.1-locked subtitle copy.
//
//   Off: "Reminders disabled. Appointments still visible on Now and in
//        Journal."
//   On:  "Reminded 1 day ahead. Tap to edit."
//
// Q-32A.1.1 rationale: keep the row label "Appointments" (parallels
// Medications / Vitals / Wellness check-ins / Meals / Water / Sleep /
// Activity). The toggle controls REMINDERS only — appointments
// themselves are not "off" when the switch is off — so the subtitle
// carries the disambiguation rather than the row label.
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import type { BucketConfig } from '../../../types/carePlanConfig';

export interface AppointmentsDrawerProps {
  config: BucketConfig;
  onUpdate: (updates: Partial<BucketConfig>) => void | Promise<void>;
}

const SUBTITLE_OFF = 'Reminders disabled. Appointments still visible on Now and in Journal.';
const SUBTITLE_ON = 'Reminded 1 day ahead. Tap to edit.';

export function AppointmentsDrawer({ config, onUpdate }: AppointmentsDrawerProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const remindersOn = config.notificationsEnabled ?? false;

  return (
    <View>
      <View style={styles.row}>
        <View style={styles.rowLabelBlock}>
          <Text style={styles.rowLabel}>Reminders</Text>
          <Text style={styles.rowSubtitle}>
            {remindersOn ? SUBTITLE_ON : SUBTITLE_OFF}
          </Text>
        </View>
        <Switch
          value={remindersOn}
          onValueChange={(v) => onUpdate({ notificationsEnabled: v })}
          trackColor={{ false: colors.glassStrong, true: colors.accent }}
          thumbColor={remindersOn ? colors.textPrimary : colors.switchThumbOff}
          ios_backgroundColor={colors.glassStrong}
          accessibilityLabel="Appointment reminders"
          accessibilityRole="switch"
          accessibilityState={{ checked: remindersOn }}
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
    paddingRight: 8,
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
    lineHeight: 15,
  },
});

export default AppointmentsDrawer;
