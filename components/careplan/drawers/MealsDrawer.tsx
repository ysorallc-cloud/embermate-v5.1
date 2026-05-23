// ============================================================================
// MEALS DRAWER — Phase 32A F8
//
// Body:
//   • WHICH MEALS chips (multi-select) — Breakfast / Lunch / Dinner / Snack.
//     Defaults: Breakfast + Lunch + Dinner (from DEFAULT_MEALS_CONFIG).
//   • Reminders Switch — default off.
//
// trackingStyle stays as a silent default 'quick' in storage; no UI
// surface in v1.0 per the P-lock (hide-only — field preserved in
// MealsBucketConfig + storage so a future v1.1 surface can re-enable
// the picker without data migration).
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, Switch, StyleSheet } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import type {
  BucketConfig,
  MealsBucketConfig,
  TimeOfDay,
} from '../../../types/carePlanConfig';

const MEAL_OPTIONS: { value: TimeOfDay; label: string }[] = [
  { value: 'morning', label: 'Breakfast' },
  { value: 'midday', label: 'Lunch' },
  { value: 'evening', label: 'Dinner' },
  { value: 'night', label: 'Snack' },
];

export interface MealsDrawerProps {
  config: MealsBucketConfig;
  onUpdate: (updates: Partial<BucketConfig>) => void | Promise<void>;
}

export function MealsDrawer({ config, onUpdate }: MealsDrawerProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const selected: TimeOfDay[] = (config.timesOfDay ?? ['morning', 'midday', 'evening']) as TimeOfDay[];
  const remindersOn = config.notificationsEnabled ?? false;

  const toggleMeal = (value: TimeOfDay) => {
    const next = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value];
    onUpdate({ timesOfDay: next });
  };

  return (
    <View>
      <Text style={styles.label}>WHICH MEALS</Text>
      <View style={styles.chipRow}>
        {MEAL_OPTIONS.map((opt) => {
          const isSelected = selected.includes(opt.value);
          return (
            <TouchableOpacity
              key={opt.value}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => toggleMeal(opt.value)}
              activeOpacity={0.7}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSelected }}
              accessibilityLabel={`${opt.label} meal tracking`}
            >
              <Text style={[styles.chipLabel, isSelected && styles.chipLabelSelected]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.row}>
        <View style={styles.rowLabelBlock}>
          <Text style={styles.rowLabel}>Reminders</Text>
          <Text style={styles.rowSubtitle}>Nudge at meal times.</Text>
        </View>
        <Switch
          value={remindersOn}
          onValueChange={(v) => onUpdate({ notificationsEnabled: v })}
          trackColor={{ false: colors.glassStrong, true: colors.accent }}
          thumbColor={remindersOn ? colors.textPrimary : colors.switchThumbOff}
          ios_backgroundColor={colors.glassStrong}
          accessibilityLabel="Meal reminders"
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
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: 12,
    paddingTop: 4,
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

export default MealsDrawer;
