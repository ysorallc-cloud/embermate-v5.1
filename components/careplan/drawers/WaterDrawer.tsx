// ============================================================================
// WATER DRAWER — Phase 32A F9
//
// Body: DAILY GOAL dropdown — 6 / 8 / 10 glasses. Default 8 (matches
// DEFAULT_WATER_CONFIG.dailyGoalGlasses).
//
// The "dropdown" renders as a three-button segmented control inline —
// simpler than a real Picker for three options and matches the chip
// pattern used elsewhere in the inline-expand drawers.
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import type { WaterBucketConfig, BucketConfig } from '../../../types/carePlanConfig';

const GOAL_OPTIONS: number[] = [6, 8, 10];

export interface WaterDrawerProps {
  config: WaterBucketConfig;
  onUpdate: (updates: Partial<BucketConfig>) => void | Promise<void>;
}

export function WaterDrawer({ config, onUpdate }: WaterDrawerProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const selected = config.dailyGoalGlasses ?? 8;

  return (
    <View>
      <Text style={styles.label}>DAILY GOAL</Text>
      <View style={styles.optionRow}>
        {GOAL_OPTIONS.map((value) => {
          const isSelected = selected === value;
          return (
            <TouchableOpacity
              key={value}
              style={[styles.option, isSelected && styles.optionSelected]}
              onPress={() => onUpdate({ dailyGoalGlasses: value } as Partial<BucketConfig>)}
              activeOpacity={0.7}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${value} glasses daily goal`}
            >
              <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                {value} glasses
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
  optionRow: {
    flexDirection: 'row' as const,
    gap: 8,
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
});

export default WaterDrawer;
