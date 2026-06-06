// ============================================================================
// WELLNESS CHECK-IN DRAWER — Phase 34 F5.3.
//
// Third per-category adoption of the F5 What → Reminder editor
// skeleton. Replaces the legacy combined WellnessDrawer (retired in
// this commit) with a SINGLE shared component mounted twice — once
// for Morning Check-in, once for Evening Check-in. The `period` prop
// drives which slice of the P5 wellnessSettings store the editor
// reads/writes.
//
// **DO NOT ADD A WHEN SECTION HERE.** Future reader, please read
// this comment before "fixing" the apparent omission:
//   • Vitals + Meals already documented their "no When" / "no
//     category-When" exceptions in their own file headers (F5.1 +
//     F5.2 respectively). Wellness's exception is different again:
//     each editor IS the window. The editor toggle (turn-off-inside
//     EditorDisableRow Switch) controls whether the period's
//     check-in is active by adding/removing the period from
//     carePlanConfig.wellness.timesOfDay (Q-34.F5.B (b) lock —
//     F3.1's single-source-of-truth stays closed).
//   • Adding a "When" chip set here would either duplicate the
//     toggle (the editor's own enabled state IS its window) or
//     re-fragment the chip set across two editors (the Q-34.F5.A
//     Option C lock specifically rejected that).
// The exception is forward-guarded by contract 8 of
// __tests__/components/wellnessCheckInDrawerF5_3Adoption.test.tsx.
//
// Q-34.F5.A Option C lock: the legacy combined WellnessDrawer is
// split into two sibling editor cards. UI-layer pseudo-keys
// ('wellness-morning', 'wellness-evening') route to this component
// with different periods. NO BucketType enum change — backing
// storage stays one bucket (carePlanConfig.wellness + the P5
// wellnessSettings.{morning,evening} store).
//
// Q-34.F5.B Option (b) lock: timesOfDay array membership is the
// single source of truth for which check-ins exist. The editor
// toggle writes the membership directly. F3.1's lock stays closed.
//
// **REMINDER GAP BANKED (NOT CLOSED HERE):** the Reminder Switch
// writes to wellnessSettings.{period}.reminderEnabled — but no
// notification service currently reads that field. The Switch is a
// write-without-consequence trust gap of the same class as the
// notes-into-the-void bug closed in Phase 35 Slice 2/3. F5.3
// preserves the write path so the wiring is in place when a
// follow-up slice closes the consumer side. See F5.3 commit
// message for the explicit ack.
// ============================================================================

import React, { useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, Switch, StyleSheet } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import { useWellnessSettings } from '../../../hooks/useWellnessSettings';
import type {
  WellnessSettings,
  WellnessCheckConfig,
} from '../../../types/wellnessSettings';
import { EditorSection } from '../editor/EditorSection';
import { EditorDisableRow } from '../editor/EditorDisableRow';

interface FieldDef {
  key: string;
  label: string;
}

// Period-specific CORE field schemas — preserved verbatim from the
// retiring WellnessDrawer (Phase 33 F7 lock — OPTIONAL fields stay
// v1-hidden at the JSX render line; the consts persist for data
// preservation).
const MORNING_CORE: FieldDef[] = [
  { key: 'sleep',  label: 'Sleep quality' },
  { key: 'mood',   label: 'Mood' },
  { key: 'energy', label: 'Energy' },
];
const MORNING_OPTIONAL: FieldDef[] = [
  { key: 'orientation',    label: 'Orientation' },
  { key: 'decisionMaking', label: 'Decision making' },
];
const EVENING_CORE: FieldDef[] = [
  { key: 'mood',      label: 'Mood' },
  { key: 'meals',     label: 'Meals tracked' },
  { key: 'dayRating', label: 'Day rating' },
  { key: 'notes',     label: 'Highlights & concerns' },
];
const EVENING_OPTIONAL: FieldDef[] = [
  { key: 'painLevel',      label: 'Pain level' },
  { key: 'alertness',      label: 'Alertness' },
  { key: 'bowelMovement',  label: 'Bowel movement' },
  { key: 'bathingStatus',  label: 'Bathing' },
  { key: 'mobilityStatus', label: 'Mobility' },
];

// `MORNING_OPTIONAL` / `EVENING_OPTIONAL` consts referenced via
// `void` so v1-hidden field schemas stay in source (Phase 33 F7
// data-preservation lock) without triggering an "unused export"
// lint warning.
void MORNING_OPTIONAL;
void EVENING_OPTIONAL;

function fieldSelected(cfg: WellnessCheckConfig, field: FieldDef): boolean {
  return cfg.checks.includes(field.key);
}

export type CheckInPeriod = 'morning' | 'evening';

export interface WellnessCheckInDrawerProps {
  /** Which check-in this editor represents. Drives field schema +
   *  copy + the slice of the P5 wellnessSettings store the editor
   *  reads/writes. */
  period: CheckInPeriod;
  /** Current toggle state. Q-34.F5.B (b): derived by the parent as
   *  `wellness.enabled && wellness.timesOfDay.includes(period)`. */
  enabled: boolean;
  /** Turn-off-inside flip. The parent translates this into a
   *  membership write on carePlanConfig.wellness.timesOfDay (and
   *  potentially a bucket.enabled flip when the array empties or
   *  the first window arrives). Keeps the membership-vs-bucket
   *  logic in one place at the call site. */
  onToggleEnabled: (next: boolean) => void;
}

const PERIOD_CAP: Record<CheckInPeriod, string> = {
  morning: 'Morning',
  evening: 'Evening',
};

const PERIOD_CORE: Record<CheckInPeriod, FieldDef[]> = {
  morning: MORNING_CORE,
  evening: EVENING_CORE,
};

export function WellnessCheckInDrawer({
  period,
  enabled,
  onToggleEnabled,
}: WellnessCheckInDrawerProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { settings, updateSettings } = useWellnessSettings();

  const periodCap = PERIOD_CAP[period];
  const periodCore = PERIOD_CORE[period];
  const periodCfg = settings?.[period] as WellnessCheckConfig | undefined;

  const toggleField = useCallback(
    (field: FieldDef) => {
      if (!settings || !periodCfg) return;
      const isOn = fieldSelected(periodCfg, field);
      const nextChecks = isOn
        ? periodCfg.checks.filter((k) => k !== field.key)
        : [...periodCfg.checks, field.key];
      const next: WellnessSettings = {
        ...settings,
        [period]: { ...periodCfg, checks: nextChecks },
      };
      updateSettings(next);
    },
    [settings, periodCfg, period, updateSettings],
  );

  const toggleReminder = useCallback(
    (value: boolean) => {
      if (!settings || !periodCfg) return;
      const next: WellnessSettings = {
        ...settings,
        [period]: { ...periodCfg, reminderEnabled: value },
      };
      updateSettings(next);
    },
    [settings, periodCfg, period, updateSettings],
  );

  return (
    <EditorDisableRow
      label={`Turn off ${periodCap} check-in`}
      enabled={enabled}
      onToggle={onToggleEnabled}
    >
      {/* WHAT — Q-34.F5.3 narration. Voice cadence matches F5.1
          vitals + F5.2 meals so the four-editor sweep reads
          consistent. */}
      <EditorSection
        title="What to track"
        narration={`Pick what to check in on each ${period}.`}
      >
        <View style={styles.chipRow}>
          {periodCore.map((field) => {
            const isSelected = periodCfg
              ? fieldSelected(periodCfg, field)
              : false;
            return (
              <TouchableOpacity
                key={`${period}-${field.key}`}
                style={[styles.chip, isSelected && styles.chipSelected]}
                onPress={() => toggleField(field)}
                activeOpacity={0.7}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={`${periodCap} — ${field.label}`}
              >
                <Text style={[styles.chipLabel, isSelected && styles.chipLabelSelected]}>
                  {field.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </EditorSection>

      {/* NO WHEN SECTION — see file header. Forward-guarded by
          contract 8 of the adoption pin. */}

      {/* REMINDER — write-without-consequence gap banked in the
          F5.3 commit message. The Switch writes; no notification
          service consumes yet. Wiring stays in place so a follow-up
          slice can close the gap by adding the consumer. */}
      <EditorSection
        title="Reminder"
        narration={`Nudge when it's time for the ${period} check-in.`}
      >
        <View style={styles.row}>
          <View style={styles.rowLabelBlock}>
            <Text style={styles.rowLabel}>Reminders on</Text>
          </View>
          <Switch
            testID={`wellness-${period}-reminder-switch`}
            value={periodCfg?.reminderEnabled ?? false}
            onValueChange={toggleReminder}
            trackColor={{ false: colors.glassStrong, true: colors.accentMuted }}
            thumbColor={
              periodCfg?.reminderEnabled
                ? colors.textPrimary
                : colors.switchThumbOff
            }
            ios_backgroundColor={colors.glassStrong}
            accessibilityLabel={`${periodCap} reminder`}
            accessibilityRole="switch"
            accessibilityState={{ checked: periodCfg?.reminderEnabled ?? false }}
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
  // Phase 33 F7 chip restyle preserved: selected = soft-sage fill,
  // unselected = text only. F5.3 keeps that visual contract.
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14, // allow: chip horizontal padding (Apple HIG ≥44pt tap target)
    borderRadius: 999,
  },
  chipSelected: {
    backgroundColor: c.accentChipFill,
  },
  chipLabel: {
    fontSize: 12,
    color: c.textSecondary,
  },
  chipLabelSelected: {
    color: c.textPrimary,
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

export default WellnessCheckInDrawer;
