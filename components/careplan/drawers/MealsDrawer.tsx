// ============================================================================
// MEALS DRAWER — Phase 34 F5.2.
//
// Second per-category adoption of the F5 What → Reminder editor
// skeleton (primitive F5.0 EditorSection + F5.1 EditorDisableRow).
// Meals is the F5 "no When" exception — meal names encode time
// (Breakfast=morning, Lunch=midday, Dinner=evening, Evening
// snack=night), so the What chip set IS the When equivalent.
//
// **DO NOT ADD A WHEN SECTION HERE.** Future reader, please read
// this comment before "fixing" the apparent omission:
//   • Vitals + Wellness need a When chip set because their
//     CarePlanItem holds multiple time windows in one item's
//     schedule.times array. The window membership is independent
//     of "what" is tracked.
//   • Meals work differently: each meal is its own CarePlanItem
//     (sync-meal-morning, sync-meal-midday, sync-meal-evening,
//     sync-meal-night). The chip set BOTH picks which meals to
//     track AND, by virtue of the meal name, encodes when. There's
//     no second dimension to surface.
// The "no When" exception is forward-guarded by contract 8 of
// __tests__/components/mealsDrawerF5_2Adoption.test.tsx.
//
// CHIP LABELS ARE CANONICAL — they match the user-facing item names
// on Now, Journal Section 2, and the handoff PDF. The generator
// creates items with these exact names at
// services/carePlanGenerator.ts:466-471. If you rename a chip label
// here, update that map in the SAME commit. Pre-F5.2 the drawer
// said "Snack" while the generator said "Evening snack" — caregivers
// saw inconsistent labels across surfaces. F5.2 aligns both to the
// canonical "Evening snack" (drawer matches generator; generator was
// already correct on every other surface).
//
// trackingStyle stays as a silent default 'quick' in storage; no UI
// surface in v1.0 per the P-lock (hide-only — field preserved in
// MealsBucketConfig + storage so a future v1.1 surface can re-enable
// the picker without data migration).
//
// Pinned by:
//   __tests__/components/mealsDrawerF5_2Adoption.test.tsx
//   __tests__/integration/mealsBucketRoundTrip34F5_1_1.test.ts
//   __tests__/screens/carePlanDrawerMeals32A.test.tsx (legacy
//     source-pin contracts for the chip labels + named export
//     survive verbatim — the F5.2 rewrite keeps all data writes
//     intact)
// ============================================================================

import React, { useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, Switch, StyleSheet } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import type {
  BucketConfig,
  MealsBucketConfig,
  TimeOfDay,
} from '../../../types/carePlanConfig';
import { EditorSection } from '../editor/EditorSection';
import { EditorDisableRow } from '../editor/EditorDisableRow';
import { updateBucketConfig } from '../../../storage/carePlanConfigRepo';
import { rescheduleAllNotifications } from '../../../utils/notificationService';
import { DEFAULT_PATIENT_ID } from '../../../storage/carePlanRepo';
import { logError } from '../../../utils/devLog';

// F5.2 — meal labels aligned to the canonical user-facing names
// (services/carePlanGenerator.ts:466-471). Drawer + generator + Now +
// Journal + handoff PDF all read the SAME label per TimeOfDay value.
const MEAL_OPTIONS: { value: TimeOfDay; label: string }[] = [
  { value: 'morning', label: 'Breakfast' },
  { value: 'midday', label: 'Lunch' },
  { value: 'evening', label: 'Dinner' },
  { value: 'night', label: 'Evening snack' },
];

export interface MealsDrawerProps {
  config: MealsBucketConfig;
  onUpdate: (updates: Partial<BucketConfig>) => void | Promise<void>;
  /** Phase 34 F5.2 — current bucket-enabled state. Drives the
   *  in-drawer EditorDisableRow Switch + the body dim treatment.
   *  Mirrors the outer-row Switch state; same single source of
   *  truth (carePlanConfig.meals.enabled). */
  enabled: boolean;
  /** Phase 34 F5.2 — turn-off-inside flip. Routes through the
   *  caller's toggleBucket (useCarePlanConfig). */
  onToggleEnabled: (next: boolean) => void;
}

export function MealsDrawer({
  config,
  onUpdate,
  enabled,
  onToggleEnabled,
}: MealsDrawerProps) {
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

  // Phase 34 NOT.7 — bucket-level reminder toggle. Writes the new
  // value DIRECTLY through updateBucketConfig (storage layer) so the
  // persistence completes before rescheduleAllNotifications runs —
  // the scheduler's NOT.7 branch live-reads the persisted gate.
  // onUpdate still fires so the parent's useCarePlanConfig state
  // refreshes; we do NOT rely on the parent's persistence path.
  // Same bare-reschedule shape as VitalsDrawer.toggleReminders +
  // WellnessWindowsDrawer.handleReminderTap: no sync/ensure because the
  // gate is a live read, not baked into instance.scheduledTime
  // (B3 contract 7).
  const toggleReminders = useCallback(
    async (value: boolean) => {
      // Order documented in VitalsDrawer.toggleReminders — parent
      // state refresh first (sync), then storage persist, then
      // reschedule reads the persisted gate.
      onUpdate({ notificationsEnabled: value });
      try {
        await updateBucketConfig(DEFAULT_PATIENT_ID, 'meals', {
          notificationsEnabled: value,
        });
        await rescheduleAllNotifications(DEFAULT_PATIENT_ID);
      } catch (e) {
        logError('MealsDrawer.toggleReminders', e);
      }
    },
    [onUpdate],
  );

  return (
    <EditorDisableRow
      label="Turn off Meals"
      enabled={enabled}
      onToggle={onToggleEnabled}
    >
      {/* WHAT — Q-34.F5.2.A narration lock. Voice matches the F5.1
          vitals adoption ("Pick the readings you record for this
          person.") so the cadence reads consistent across the four
          v1 editors. */}
      <EditorSection
        title="What to track"
        narration="Pick the meals you'd like to track for this person."
      >
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
                accessibilityLabel={`${opt.label} tracking`}
              >
                <Text style={[styles.chipLabel, isSelected && styles.chipLabelSelected]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </EditorSection>

      {/* NO WHEN SECTION — see file header for the exception. Future
          reader, do not add one. Pinned by contract 8 of
          mealsDrawerF5_2Adoption.test.tsx. */}

      {/* REMINDER */}
      <EditorSection
        title="Reminder"
        narration="Nudge at mealtimes."
      >
        <View style={styles.row}>
          <View style={styles.rowLabelBlock}>
            <Text style={styles.rowLabel}>Reminders on</Text>
          </View>
          <Switch
            testID="meals-reminder-switch"
            value={remindersOn}
            onValueChange={toggleReminders}
            trackColor={{ false: colors.glassStrong, true: colors.accent }}
            thumbColor={remindersOn ? colors.textPrimary : colors.switchThumbOff}
            ios_backgroundColor={colors.glassStrong}
            accessibilityLabel="Meal reminders"
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

export default MealsDrawer;
