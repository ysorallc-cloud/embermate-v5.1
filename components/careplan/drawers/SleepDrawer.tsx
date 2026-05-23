// ============================================================================
// SLEEP DRAWER — Phase 32A F10
//
// Body: TRACKED AT chips (Morning / Evening). Multi-select. Default
// timesOfDay=['morning'] from DEFAULT_BUCKET_CONFIG. Writes via
// BucketConfig.timesOfDay (TimeOfDay[]).
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import type { BucketConfig, TimeOfDay } from '../../../types/carePlanConfig';

const OPTIONS: { value: TimeOfDay; label: string }[] = [
  { value: 'morning', label: 'Morning' },
  { value: 'evening', label: 'Evening' },
];

export interface SleepDrawerProps {
  config: BucketConfig;
  onUpdate: (updates: Partial<BucketConfig>) => void | Promise<void>;
}

export function SleepDrawer({ config, onUpdate }: SleepDrawerProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const selected = config.timesOfDay ?? ['morning'];

  const toggle = (value: TimeOfDay) => {
    const next = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value];
    onUpdate({ timesOfDay: next });
  };

  return (
    <View>
      <Text style={styles.label}>TRACKED AT</Text>
      <View style={styles.chipRow}>
        {OPTIONS.map((opt) => {
          const isSelected = selected.includes(opt.value);
          return (
            <TouchableOpacity
              key={opt.value}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => toggle(opt.value)}
              activeOpacity={0.7}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSelected }}
              accessibilityLabel={`${opt.label} sleep tracking`}
            >
              <Text style={[styles.chipLabel, isSelected && styles.chipLabelSelected]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
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
});

export default SleepDrawer;
