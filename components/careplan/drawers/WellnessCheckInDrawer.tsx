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
// **REMINDER + TIME WIRING (CLOSED END-TO-END):** the F5.3-banked
// write-without-consequence gap is gone. Three slices closed the
// loop:
//   • B1 (00fbbec1) — utils/notificationService.ts scheduler
//     live-reads wellnessSettings.{period}.reminderEnabled per
//     instance at schedule time (Layer 2 AND-gate).
//   • B3 (97998228) — services/carePlanGenerator.ts wellness sync
//     ladder routes item `at` through resolveWellnessTime(tod,
//     wellnessSettings) so fire time tracks the caregiver's edit.
//   • B2 (b087b469) + HIGH #5 (this commit) — this drawer's
//     toggleReminder + commitTime call the canonical reschedule
//     surface so changes take effect immediately, not on the next
//     ensureDailyInstances cycle.
//
// **ASYMMETRIC TRIGGER — DO NOT COLLAPSE:**
//   • reminderEnabled toggle → rescheduleAllNotifications ONLY.
//     The B1 gate is a LIVE READ at schedule time; the OS queue
//     just needs to be re-emitted with the new gate state.
//   • time change → ensureDailyInstances → rescheduleAllNotifications.
//     Fire-time is BAKED into item.schedule + instance.scheduledTime
//     (B3's resolver runs inside the sync ladder; line-1194 refreshes
//     today's already-materialized instance). Bare reschedule alone
//     fires stale because listDailyInstances reads the still-stale
//     scheduledTime. Forward-guarded by
//     __tests__/integration/wellnessFireTimeNotB3.test.ts contract 7
//     (rescheduleAllNotifications is read-only on instance.scheduledTime).
// ============================================================================

import React, { useMemo, useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Platform,
  Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../../../contexts/ThemeContext';
import { useWellnessSettings } from '../../../hooks/useWellnessSettings';
import type {
  WellnessSettings,
  WellnessCheckConfig,
} from '../../../types/wellnessSettings';
import { EditorSection } from '../editor/EditorSection';
import { EditorDisableRow } from '../editor/EditorDisableRow';
import { rescheduleAllNotifications } from '../../../utils/notificationService';
import { DEFAULT_PATIENT_ID } from '../../../storage/carePlanRepo';
import {
  ensureDailyInstances,
  getTodayDateString,
} from '../../../services/carePlanGenerator';
import { logError } from '../../../utils/devLog';

// Phase 34 HIGH #5 — wellness time-edit helpers.
function hhmmToDate(hhmm: string | undefined): Date {
  const fallback = new Date();
  fallback.setSeconds(0, 0);
  if (!hhmm) return fallback;
  const [hh, mm] = hhmm.split(':').map((n) => parseInt(n, 10));
  if (isNaN(hh) || isNaN(mm)) return fallback;
  const d = new Date();
  d.setHours(hh, mm, 0, 0);
  return d;
}

function dateToHhmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatTime12(hhmm: string | undefined): string {
  if (!hhmm) return '—';
  const [hh, mm] = hhmm.split(':').map((n) => parseInt(n, 10));
  if (isNaN(hh) || isNaN(mm)) return hhmm;
  const period = hh >= 12 ? 'PM' : 'AM';
  const display = hh % 12 || 12;
  return `${display}:${String(mm).padStart(2, '0')} ${period}`;
}

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
    async (value: boolean) => {
      if (!settings || !periodCfg) return;
      const next: WellnessSettings = {
        ...settings,
        [period]: { ...periodCfg, reminderEnabled: value },
      };
      updateSettings(next);
      // Phase 34 NOT.B2 — trigger reschedule so B1's gate state takes
      // effect immediately, not on the next ensureDailyInstances cycle.
      // Reminder toggle is LIVE-READ by the scheduler (utils/
      // notificationService.ts:686 reads wellnessSettings[period].
      // reminderEnabled per-instance), so a bare reschedule is the
      // correct trigger here — no sync/ensure needed. B3 contract 7
      // forward-guards the read-only invariant for the future time-
      // edit path (which DOES require sync+ensure+reschedule).
      try {
        await rescheduleAllNotifications(DEFAULT_PATIENT_ID);
      } catch {
        // Toggle save succeeded; reschedule failure must not block.
        // The next ensureDailyInstances cycle will retry.
      }
    },
    [settings, periodCfg, period, updateSettings],
  );

  // Phase 34 HIGH #5 — wellness time-edit picker state. Mirrors the
  // appointment-form pattern: Android dialog fires onChange once with
  // the final value; iOS shows a Modal with a Done affordance that
  // commits tempTime.
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempTime, setTempTime] = useState<Date>(() =>
    hhmmToDate(periodCfg?.time),
  );

  const openTimePicker = useCallback(() => {
    setTempTime(hhmmToDate(periodCfg?.time));
    setShowTimePicker(true);
  }, [periodCfg]);

  // commitTime — the load-bearing B2 time-change handler. Persists
  // to the wellnessSettings store, then runs the FULL chain:
  //   ensureDailyInstances → rescheduleAllNotifications.
  // syncOtherBucketsWithConfig (inside ensureDailyInstances) routes
  // the new value through B3's resolveWellnessTime, refreshes the
  // item's schedule.times[].at, AND refreshes today's already-
  // materialized DailyCareInstance.scheduledTime (line-1194). The
  // subsequent rescheduleAllNotifications then reads the refreshed
  // instance and emits the OS notification at the new time.
  // Forward-guard: wellnessFireTimeNotB3 contract 7 pins reschedule
  // as read-only on instance.scheduledTime, so the ensure step is
  // load-bearing — a bare reschedule fires stale.
  const commitTime = useCallback(
    async (picked: Date) => {
      if (!settings || !periodCfg) return;
      const hhmm = dateToHhmm(picked);
      const next: WellnessSettings = {
        ...settings,
        [period]: { ...periodCfg, time: hhmm },
      };
      updateSettings(next);
      try {
        await ensureDailyInstances(DEFAULT_PATIENT_ID, getTodayDateString());
        await rescheduleAllNotifications(DEFAULT_PATIENT_ID);
      } catch (e) {
        // Settings save succeeded; the next ensureDailyInstances
        // cycle will pick up the new value if the chain failed here.
        logError('WellnessCheckInDrawer.commitTime', e);
      }
    },
    [settings, periodCfg, period, updateSettings],
  );

  const handleTimeChange = useCallback(
    (_event: any, selectedTime?: Date) => {
      if (Platform.OS === 'android') {
        // Android: dialog fires once with the final selection.
        setShowTimePicker(false);
        if (selectedTime) {
          void commitTime(selectedTime);
        }
      } else {
        // iOS: spinner streams the in-progress value into tempTime;
        // confirmTime commits on Done.
        if (selectedTime) setTempTime(selectedTime);
      }
    },
    [commitTime],
  );

  const confirmTime = useCallback(() => {
    setShowTimePicker(false);
    void commitTime(tempTime);
  }, [commitTime, tempTime]);

  const cancelTime = useCallback(() => {
    setShowTimePicker(false);
  }, []);

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

      {/* REMINDER — closed end-to-end (see file header). The Switch
          fires toggleReminder → rescheduleAllNotifications (live-read
          gate at the scheduler). The Time row fires commitTime →
          ensureDailyInstances → rescheduleAllNotifications (sync the
          new value into items + refresh today's instance + emit OS
          notifications). */}
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
        {/* Phase 34 HIGH #5 — wellness time-edit row. Tap to open
            the platform DateTimePicker (iOS Modal + Done; Android
            native dialog). commitTime persists + runs the full B2
            chain. */}
        <TouchableOpacity
          testID={`wellness-${period}-time-row`}
          style={styles.row}
          onPress={openTimePicker}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`${periodCap} check-in time, ${formatTime12(periodCfg?.time)}. Tap to change.`}
        >
          <View style={styles.rowLabelBlock}>
            <Text style={styles.rowLabel}>Time</Text>
          </View>
          <Text style={styles.timeValue}>{formatTime12(periodCfg?.time)}</Text>
        </TouchableOpacity>
      </EditorSection>

      {/* Phase 34 HIGH #5 — DateTimePicker mounts. iOS uses a Modal
          with Cancel + Done; Android uses the native dialog. Pattern
          mirrors app/appointment-form.tsx so the platform conventions
          stay consistent across the codebase. */}
      {Platform.OS === 'ios' && showTimePicker && (
        <Modal transparent animationType="slide">
          <View style={styles.pickerOverlay}>
            <View style={styles.pickerContainer}>
              <View style={styles.pickerHeader}>
                <TouchableOpacity
                  onPress={cancelTime}
                  accessibilityRole="button"
                  accessibilityLabel={`Cancel ${periodCap} time selection`}
                >
                  <Text style={styles.pickerCancel}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.pickerTitle}>{`${periodCap} time`}</Text>
                <TouchableOpacity
                  onPress={confirmTime}
                  accessibilityRole="button"
                  accessibilityLabel={`Confirm ${periodCap} time`}
                >
                  <Text style={styles.pickerDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                testID={`wellness-${period}-time-picker`}
                value={tempTime}
                mode="time"
                display="spinner"
                onChange={handleTimeChange}
                style={{ height: 200 }}
              />
            </View>
          </View>
        </Modal>
      )}
      {Platform.OS === 'android' && showTimePicker && (
        <DateTimePicker
          testID={`wellness-${period}-time-picker`}
          value={tempTime}
          mode="time"
          display="default"
          onChange={handleTimeChange}
        />
      )}
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
  // Phase 34 HIGH #5 — wellness time-edit styles.
  timeValue: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: c.textPrimary,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  pickerContainer: {
    backgroundColor: c.glass,
    paddingBottom: 32,
  },
  pickerHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 16, // allow: matches app/appointment-form.tsx picker header convention
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: c.glassBorder,
  },
  pickerTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: c.textPrimary,
  },
  pickerCancel: {
    fontSize: 15,
    color: c.textSecondary,
  },
  pickerDone: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: c.accent,
  },
});

export default WellnessCheckInDrawer;
