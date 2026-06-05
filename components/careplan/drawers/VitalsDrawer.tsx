// ============================================================================
// VITALS DRAWER — Phase 34 F5.1.
//
// First per-category adoption of the F5 What → When → Reminder
// editor skeleton (primitive F5.0 EditorSection + F5.1
// EditorDisableRow). Also closes the F2.1-banked Vitals
// When-surface gap by adding the four-window chip set the existing
// VitalsBucketConfig.timesOfDay field already accepted but had no
// UI for (audit decision: Q-34.F5.1).
//
// SECTIONS (top to bottom):
//   • EditorDisableRow — turn-off-inside affordance (in-drawer
//     Switch). Q-34.F5.1.B option (b): flipping OFF keeps the
//     drawer open with the body dimmed + non-interactive.
//   • EditorSection "What to track" — six vital-type chips
//     (BP / HR / Weight / Oxygen Level / Blood Sugar / Temperature).
//   • EditorSection "When" — four canonical windows
//     (Morning / Afternoon / Evening / Night). Writes to
//     carePlanConfig.vitals.timesOfDay; the generator's vitals
//     Pass-B reconciliation (services/carePlanGenerator.ts) honors
//     additions + removals atomically with the chip flip.
//   • EditorSection "Reminder" — Switch + sub-line copy.
//
// HealthKit Auto-Import surface from the retired vitals subscreen
// is NOT folded here (P3 lock — preserved for v1.1 separately).
// HOW OFTEN frequency control stays HIDDEN per Phase 34 F4 (data
// model preserved — types/carePlanConfig.ts:VitalsBucketConfig
// retains the frequency field).
//
// Pinned by:
//   __tests__/components/vitalsDrawerF5_1Adoption.test.tsx
//   __tests__/integration/vitalsBucketRoundTrip34F5_1.test.ts
//   __tests__/screens/carePlanDrawerVitals32A.test.tsx (legacy
//     source-pin tests for the chip labels + named export survive)
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, Switch, StyleSheet } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import type {
  BucketConfig,
  VitalsBucketConfig,
  VitalType,
  TimeOfDay,
} from '../../../types/carePlanConfig';
import { EditorSection } from '../editor/EditorSection';
import { EditorDisableRow } from '../editor/EditorDisableRow';

const VITAL_OPTIONS: { value: VitalType; label: string }[] = [
  { value: 'bp',      label: 'Blood Pressure' },
  { value: 'hr',      label: 'Heart Rate' },
  { value: 'weight',  label: 'Weight' },
  { value: 'spo2',    label: 'Oxygen Level' },
  { value: 'glucose', label: 'Blood Sugar' },
  { value: 'temp',    label: 'Temperature' },
];

// Phase 34 F5.1 — When chip set. Four canonical windows. Q-34.F5.1
// audit decision: full set (Vitals is a measurement, not a
// check-in — no v1-filter applies). Internal `'midday'` value
// renders as the user-facing "Afternoon" label per the unified
// time model (Phase 34 F1).
const WHEN_WINDOWS: { value: TimeOfDay; label: string }[] = [
  { value: 'morning', label: 'Morning' },
  { value: 'midday',  label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
  { value: 'night',   label: 'Night' },
];

export interface VitalsDrawerProps {
  config: VitalsBucketConfig;
  onUpdate: (updates: Partial<BucketConfig>) => void | Promise<void>;
  /** Phase 34 F5.1 — current bucket-enabled state. Drives the
   *  in-drawer EditorDisableRow Switch + the body dim treatment.
   *  Mirrors the outer-row Switch state; same single source of
   *  truth (carePlanConfig.vitals.enabled). */
  enabled: boolean;
  /** Phase 34 F5.1 — turn-off-inside flip. Routes through the
   *  caller's toggleBucket (useCarePlanConfig). */
  onToggleEnabled: (next: boolean) => void;
}

export function VitalsDrawer({
  config,
  onUpdate,
  enabled,
  onToggleEnabled,
}: VitalsDrawerProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const selectedVitals: VitalType[] = (config.vitalTypes ?? ['bp', 'hr', 'weight']) as VitalType[];
  const selectedWhen: TimeOfDay[] = (config.timesOfDay ?? ['morning']) as TimeOfDay[];
  const remindersOn = config.notificationsEnabled ?? true;

  const toggleVital = (value: VitalType) => {
    const next = selectedVitals.includes(value)
      ? selectedVitals.filter((v) => v !== value)
      : [...selectedVitals, value];
    onUpdate({ vitalTypes: next } as Partial<BucketConfig>);
  };

  // Phase 34 F5.1 — When toggle. Membership semantics — write the
  // updated array back through onUpdate; the generator's vitals
  // Pass-B reconciliation handles additions / removals atomically.
  const toggleWhen = (value: TimeOfDay) => {
    const next = selectedWhen.includes(value)
      ? selectedWhen.filter((v) => v !== value)
      : [...selectedWhen, value];
    onUpdate({ timesOfDay: next });
  };

  return (
    <EditorDisableRow
      label="Turn off Vitals"
      enabled={enabled}
      onToggle={onToggleEnabled}
    >
      {/* WHAT */}
      <EditorSection
        title="What to track"
        narration="Pick the readings you record for this person."
      >
        <View style={styles.chipRow}>
          {VITAL_OPTIONS.map((opt) => {
            const isSelected = selectedVitals.includes(opt.value);
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
      </EditorSection>

      {/* WHEN */}
      <EditorSection
        title="When"
        narration="Which times of day to record. Tap to add or remove a window."
      >
        <View style={styles.chipRow}>
          {WHEN_WINDOWS.map((opt) => {
            const isSelected = selectedWhen.includes(opt.value);
            return (
              <TouchableOpacity
                key={opt.value}
                testID={`vitals-when-chip-${opt.value}`}
                style={[styles.chip, isSelected && styles.chipSelected]}
                onPress={() => toggleWhen(opt.value)}
                activeOpacity={0.7}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={`${opt.label} vitals window`}
              >
                <Text style={[styles.chipLabel, isSelected && styles.chipLabelSelected]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </EditorSection>

      {/* REMINDER */}
      <EditorSection
        title="Reminder"
        narration="Nudge when it's time to record."
      >
        <View style={styles.row}>
          <View style={styles.rowLabelBlock}>
            <Text style={styles.rowLabel}>Reminders on</Text>
          </View>
          <Switch
            testID="vitals-reminder-switch"
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
      </EditorSection>
    </EditorDisableRow>
  );
}

const createStyles = (c: any) => StyleSheet.create({
  chipRow: {
    flexDirection: 'row' as const,
    gap: 8,
    flexWrap: 'wrap' as const,
    marginBottom: 4,
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
    paddingRight: 8,
  },
  rowLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: c.textPrimary,
  },
});

export default VitalsDrawer;
