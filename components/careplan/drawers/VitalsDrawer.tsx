// ============================================================================
// VITALS DRAWER — Phase 32A F6
//
// Body:
//   • WHICH VITALS chips (multi-select) — Blood Pressure / Heart Rate /
//     Weight / Oxygen Level / Blood Sugar / Temperature. Default
//     BP+HR+Weight (from DEFAULT_VITALS_CONFIG).
//   • HOW OFTEN dropdown — Daily / Weekly / As Needed (default 'daily').
//   • Reminders Switch — default on per brief.
//
// HealthKit Auto-Import section from the retired vitals subscreen is
// NOT folded here (P3 lock — preserved/parked for v1.1 separately).
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, Switch, StyleSheet } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import type {
  BucketConfig,
  VitalsBucketConfig,
  VitalType,
} from '../../../types/carePlanConfig';

const VITAL_OPTIONS: { value: VitalType; label: string }[] = [
  { value: 'bp',      label: 'Blood Pressure' },
  { value: 'hr',      label: 'Heart Rate' },
  { value: 'weight',  label: 'Weight' },
  { value: 'spo2',    label: 'Oxygen Level' },
  { value: 'glucose', label: 'Blood Sugar' },
  { value: 'temp',    label: 'Temperature' },
];

// Phase 34 F4 — the HOW OFTEN frequency control is HIDDEN in v1. The
// Frequency type + FREQUENCY_OPTIONS are retired from this drawer; the
// VitalsBucketConfig.frequency field stays in the data model
// (types/carePlanConfig.ts) so stored values survive and v1.1 can
// re-surface the control. The generator already ignored frequency
// (always daily — Bug B), so hiding it is a UI-only change with no
// behavior delta.

export interface VitalsDrawerProps {
  config: VitalsBucketConfig;
  onUpdate: (updates: Partial<BucketConfig>) => void | Promise<void>;
}

export function VitalsDrawer({ config, onUpdate }: VitalsDrawerProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const selected: VitalType[] = (config.vitalTypes ?? ['bp', 'hr', 'weight']) as VitalType[];
  const remindersOn = config.notificationsEnabled ?? true;

  const toggleVital = (value: VitalType) => {
    const next = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value];
    onUpdate({ vitalTypes: next } as Partial<BucketConfig>);
  };

  return (
    <View>
      <Text style={styles.label}>WHICH VITALS</Text>
      <View style={styles.chipRow}>
        {VITAL_OPTIONS.map((opt) => {
          const isSelected = selected.includes(opt.value);
          return (
            <TouchableOpacity
              key={opt.value}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => toggleVital(opt.value)}
              activeOpacity={0.7}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSelected }}
              accessibilityLabel={opt.label}
            >
              <Text style={[styles.chipLabel, isSelected && styles.chipLabelSelected]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Phase 34 F4 — HOW OFTEN frequency control removed (hidden in
          v1; field preserved in the data model — see header comment). */}

      <View style={styles.row}>
        <View style={styles.rowLabelBlock}>
          <Text style={styles.rowLabel}>Reminders</Text>
          <Text style={styles.rowSubtitle}>Nudge when it's time to record vitals.</Text>
        </View>
        <Switch
          value={remindersOn}
          onValueChange={(v) => onUpdate({ notificationsEnabled: v })}
          trackColor={{ false: colors.glassStrong, true: colors.accent }}
          thumbColor={remindersOn ? colors.textPrimary : colors.switchThumbOff}
          ios_backgroundColor={colors.glassStrong}
          accessibilityLabel="Vitals reminders"
          accessibilityRole="switch"
          accessibilityState={{ checked: remindersOn }}
        />
      </View>
    </View>
  );
}

const createStyles = (c: any) => StyleSheet.create({
  label: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: c.textTertiary,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
    marginBottom: 8,
    marginTop: 4,
  },
  chipRow: {
    flexDirection: 'row' as const,
    gap: 8,
    flexWrap: 'wrap' as const,
    marginBottom: 12,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14, // allow: chip horizontal padding (Apple HIG ≥44pt tap target)
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.glassBorder,
    backgroundColor: c.glassFaint,
  },
  chipSelected: {
    borderColor: c.accent,
    backgroundColor: c.accentDim,
  },
  chipLabel: {
    fontSize: 12,
    color: c.textSecondary,
  },
  chipLabelSelected: {
    color: c.accent,
    fontWeight: '500' as const,
  },
  optionRow: {
    flexDirection: 'row' as const,
    gap: 8,
    marginBottom: 12,
  },
  option: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.glassBorder,
    backgroundColor: c.glassFaint,
    alignItems: 'center' as const,
  },
  optionSelected: {
    borderColor: c.accent,
    backgroundColor: c.accentDim,
  },
  optionLabel: {
    fontSize: 12,
    color: c.textSecondary,
  },
  optionLabelSelected: {
    color: c.accent,
    fontWeight: '500' as const,
  },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: 12,
    paddingTop: 4,
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
  },
});

export default VitalsDrawer;
