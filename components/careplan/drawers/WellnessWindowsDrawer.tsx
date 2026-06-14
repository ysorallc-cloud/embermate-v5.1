// ============================================================================
// WELLNESS WINDOWS DRAWER — F3 of the wellness-merge slice.
//
// Compact per-window drawer behind the merged "Wellness Check-in" row on
// Care Plan home. Replaces the F5.3 two-pseudo-key UI; the drawer is
// presentation + per-window write wiring only — no new storage, no model
// change.
//
// LAYOUT
//   ONE drawer, ONE compact row per active window. Each row exposes:
//     • window name (capitalized)
//     • time (tap to edit; opens DateTimePicker)
//     • reminder bell (tap to toggle reminderEnabled)
//     • enable Switch (drives timesOfDay membership)
//
//   • Morning + Evening rows render ALWAYS so they can be toggled on
//     when off. Their enable Switch reads from timesOfDay membership.
//   • Legacy periods (e.g. 'midday', 'night') render their own row
//     ONLY when present in timesOfDay — never silently dropped, and
//     toggling them off clears them. No re-add affordance (legacy
//     windows are clearable, not introducible).
//
// WIRE — contract 7 (per-window WRITES)
//   • enable toggle  → onUpdate({ timesOfDay, enabled }) where
//                      enabled = timesOfDay.length > 0
//   • time           → useWellnessSettings().updateSettings(...) with
//                      the period slot's `time` patched.
//   • reminder bell  → useWellnessSettings().updateSettings(...) with
//                      the period slot's `reminderEnabled` flipped.
//
//   The time + reminder writes are scoped to the wellnessSettings store
//   only — they never touch the wellness bucket on carePlanConfig. The
//   enable write is the only one that touches the bucket, and it's
//   atomic ({ timesOfDay, enabled } in one updateBucket call).
//
// PERIOD → SETTINGS SLOT
//   wellnessSettings has slots for morning / afternoon / evening (no
//   night). Legacy 'midday' (TimeOfDay) bridges to 'afternoon'
//   (settings key) per Q-34.NOT.B.2. 'night' has no slot → its row
//   shows the enable Switch only (no time/reminder controls). Same
//   defensive shape the scheduler uses.
// ============================================================================

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../../../contexts/ThemeContext';
import { Colors, Spacing } from '../../../theme/theme-tokens';
import { ThemedSwitch } from '../../common/ThemedSwitch';
import { useWellnessSettings } from '../../../hooks/useWellnessSettings';
import type {
  WellnessSettings,
  WellnessCheckConfig,
} from '../../../types/wellnessSettings';
import { rescheduleAllNotifications } from '../../../utils/notificationService';
import {
  ensureDailyInstances,
  getTodayDateString,
} from '../../../services/carePlanGenerator';
import { DEFAULT_PATIENT_ID } from '../../../storage/carePlanRepo';
import { logError } from '../../../utils/devLog';
import { nextWellnessWindowMembership } from '../../../utils/wellnessWindowMembership';

// ── Period helpers ──────────────────────────────────────────────────────────

const STANDARD_PERIODS = ['morning', 'evening'] as const;

// 'midday' renders as "Afternoon" — the codebase canon (MEDS_TIME_LABEL
// + carePlanUnifiedTimeModel34F1 contract 11 ban the user-facing string
// "Midday"), and it matches the merged Wellness row's subtitle
// (WELLNESS_WINDOW_LABEL in app/care-plan/index.tsx). The 'midday'
// TimeOfDay still bridges to the 'afternoon' settings slot (settingsKeyOf).
const PERIOD_LABEL: Record<string, string> = {
  morning: 'Morning',
  midday: 'Afternoon',
  afternoon: 'Afternoon',
  evening: 'Evening',
  night: 'Night',
};

function periodLabel(period: string): string {
  return PERIOD_LABEL[period] ?? period.charAt(0).toUpperCase() + period.slice(1);
}

/** TimeOfDay → WellnessSettings slot key, or undefined when the period
 *  has no settings slot (night, custom). Mirrors
 *  WINDOW_LABEL_TO_WELLNESS_PERIOD in types/wellnessSettings.ts. */
function settingsKeyOf(period: string): keyof WellnessSettings | undefined {
  if (period === 'morning') return 'morning';
  if (period === 'evening') return 'evening';
  if (period === 'midday' || period === 'afternoon') return 'afternoon';
  return undefined;
}

/** Build the ordered list of periods to render: standard (always)
 *  followed by any legacy periods present in timesOfDay. */
function periodsToRender(timesOfDay: string[]): string[] {
  const out: string[] = [...STANDARD_PERIODS];
  for (const p of timesOfDay) {
    if (!STANDARD_PERIODS.includes(p as any) && !out.includes(p)) {
      out.push(p);
    }
  }
  return out;
}

// ── Time formatting helpers ─────────────────────────────────────────────────

function hhmmToDate(hhmm: string | undefined): Date {
  const d = new Date();
  d.setSeconds(0, 0);
  if (!hhmm) return d;
  const [hh, mm] = hhmm.split(':').map((n) => parseInt(n, 10));
  if (!isNaN(hh) && !isNaN(mm)) d.setHours(hh, mm, 0, 0);
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

// ── Component ───────────────────────────────────────────────────────────────

export interface WellnessWindowsDrawerProps {
  /** Current value of wellness.timesOfDay from carePlanConfig. */
  timesOfDay: string[];
  /** Bucket-level write. Receives { timesOfDay, enabled } whenever the
   *  enable Switch fires. Parent wires to updateBucket('wellness', ...). */
  onUpdate: (updates: { timesOfDay: string[]; enabled: boolean }) => void;
}

export function WellnessWindowsDrawer({
  timesOfDay,
  onUpdate,
}: WellnessWindowsDrawerProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { settings, updateSettings } = useWellnessSettings();
  const [openPicker, setOpenPicker] = useState<string | null>(null);

  const handleEnableChange = useCallback(
    (period: string, next: boolean) => {
      // Wellness-merge F4 — shared membership math (the SAME function
      // the onboarding wizard's setWellnessWindowEnabled calls), so the
      // two surfaces can never fork.
      onUpdate(nextWellnessWindowMembership(timesOfDay, period, next));
      // Bucket toggle is enough to drive the scheduler downstream via
      // the parent's updateBucket → ensureDailyInstances loop. The
      // drawer does not call reschedule itself for enable changes (the
      // F5.3 split called rescheduleAllNotifications inside the editor;
      // here the parent already owns that loop through updateBucket).
    },
    [timesOfDay, onUpdate],
  );

  const handleReminderTap = useCallback(
    (period: string) => {
      const key = settingsKeyOf(period);
      if (!key || !settings) return;
      const current = settings[key] as WellnessCheckConfig;
      const next: WellnessSettings = {
        ...settings,
        [key]: { ...current, reminderEnabled: !current.reminderEnabled },
      };
      updateSettings(next);
      // Asymmetric trigger discipline (Phase 34 NOT.B2): reminder
      // toggle bare-reschedules; time edit goes through
      // ensureDailyInstances first. Mirror that here.
      void rescheduleAllNotifications(DEFAULT_PATIENT_ID).catch((err) =>
        logError('WellnessWindowsDrawer.handleReminderTap.reschedule', err),
      );
    },
    [settings, updateSettings],
  );

  const handleTimePress = useCallback((period: string) => {
    if (!settingsKeyOf(period)) return; // night → no picker
    setOpenPicker(period);
  }, []);

  const handlePickerChange = useCallback(
    async (period: string, _event: any, date?: Date) => {
      // Android dismisses with type === 'dismissed'; iOS always emits
      // 'set' on confirm. Close the picker regardless on either.
      setOpenPicker(null);
      if (!date) return;
      const key = settingsKeyOf(period);
      if (!key || !settings) return;
      const current = settings[key] as WellnessCheckConfig;
      const hhmm = dateToHhmm(date);
      if (hhmm === current.time) return;
      const next: WellnessSettings = {
        ...settings,
        [key]: { ...current, time: hhmm },
      };
      updateSettings(next);
      // Time edit asymmetric trigger (Phase 34 NOT.B3): bake the new
      // fire-time into today's already-materialized instance via
      // ensureDailyInstances, THEN reschedule the OS queue.
      try {
        await ensureDailyInstances(DEFAULT_PATIENT_ID, getTodayDateString());
        await rescheduleAllNotifications(DEFAULT_PATIENT_ID);
      } catch (err) {
        logError('WellnessWindowsDrawer.handlePickerChange', err);
      }
    },
    [settings, updateSettings],
  );

  const rendered = periodsToRender(timesOfDay);

  return (
    <View style={styles.root}>
      {rendered.map((period) => {
        const key = settingsKeyOf(period);
        const cfg = key ? (settings?.[key] as WellnessCheckConfig | undefined) : undefined;
        const enabled = timesOfDay.includes(period);
        const reminderOn = !!cfg?.reminderEnabled;
        const timeText = cfg ? formatTime12(cfg.time) : '—';

        return (
          <View
            key={period}
            style={styles.row}
            testID={`wellness-window-${period}`}
          >
            <Text style={styles.windowLabel}>{periodLabel(period)}</Text>

            {/* Time — tap to edit. Hidden for periods without a
                settings slot ('night'). */}
            {key ? (
              <TouchableOpacity
                onPress={() => handleTimePress(period)}
                accessibilityRole="button"
                accessibilityLabel={`${periodLabel(period)} check-in time, ${timeText}. Tap to edit.`}
                testID={`wellness-window-${period}-time`}
                style={styles.timeChip}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.timeText}>{timeText}</Text>
              </TouchableOpacity>
            ) : null}

            {/* Reminder bell — tap to flip reminderEnabled. Hidden
                for periods without a settings slot. */}
            {key ? (
              <TouchableOpacity
                onPress={() => handleReminderTap(period)}
                accessibilityRole="button"
                accessibilityLabel={
                  reminderOn
                    ? `${periodLabel(period)} reminder on. Tap to turn off.`
                    : `${periodLabel(period)} reminder off. Tap to turn on.`
                }
                accessibilityState={{ selected: reminderOn }}
                testID={`wellness-window-${period}-reminder`}
                style={styles.bellChip}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {/* Line-glyph bell on the app's -outline register.
                    ACTIVE reminder = sage (accent) — a reminder being
                    on reads as active, not "upcoming." OFF = dim
                    (textMuted). Gold stays reserved for the time chip
                    (schedule), never the bell. */}
                <Ionicons
                  testID={`wellness-window-${period}-bell`}
                  name={reminderOn ? 'notifications-outline' : 'notifications-off-outline'}
                  size={18}
                  color={reminderOn ? colors.accent : colors.textMuted}
                />
              </TouchableOpacity>
            ) : null}

            {/* Enable toggle — the shared sage/cream ThemedSwitch (not
                a bare iOS-green Switch). Drives timesOfDay membership. */}
            <ThemedSwitch
              testID={`wellness-window-${period}-enable`}
              value={enabled}
              onValueChange={(next) => handleEnableChange(period, next)}
              accessibilityLabel={`${periodLabel(period)} check-in, ${enabled ? 'on' : 'off'}`}
            />

            {/* Inline iOS picker — modal-wrapped to keep the row layout
                clean. Android falls back to the native picker via the
                same component (no Modal wrapper needed). */}
            {openPicker === period && key ? (
              Platform.OS === 'ios' ? (
                <Modal
                  visible
                  transparent
                  animationType="fade"
                  onRequestClose={() => setOpenPicker(null)}
                >
                  <View style={styles.pickerBackdrop}>
                    <View style={styles.pickerSheet}>
                      <DateTimePicker
                        testID={`wellness-window-${period}-time-picker`}
                        value={hhmmToDate(cfg?.time)}
                        mode="time"
                        display="spinner"
                        onChange={(e, d) => handlePickerChange(period, e, d)}
                      />
                      <TouchableOpacity
                        onPress={() => setOpenPicker(null)}
                        style={styles.pickerDone}
                        accessibilityRole="button"
                        accessibilityLabel="Done"
                      >
                        <Text style={styles.pickerDoneText}>Done</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Modal>
              ) : (
                <DateTimePicker
                  testID={`wellness-window-${period}-time-picker`}
                  value={hhmmToDate(cfg?.time)}
                  mode="time"
                  display="default"
                  onChange={(e, d) => handlePickerChange(period, e, d)}
                />
              )
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const createStyles = (c: typeof Colors) =>
  StyleSheet.create({
    root: {
      // Drawer body — the parent provides its own scaffold wrapper.
      paddingTop: 4,
      paddingBottom: 4,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 4,
    },
    windowLabel: {
      flex: 1,
      fontSize: 15,
      color: c.textPrimary,
    },
    timeChip: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      marginRight: 8,
    },
    timeText: {
      fontSize: 14,
      // Quiet gray. Gold is the schedule-URGENCY semantic (Now's "Up
      // Next"); a static settings time isn't that, so coloring it gold
      // would dilute gold's meaning. The bell carries the only color
      // accent in this row (sage when active).
      color: c.textSecondary,
    },
    bellChip: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      marginRight: 8,
    },
    pickerBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    pickerSheet: {
      backgroundColor: c.glass,
      paddingTop: Spacing.sm,
      paddingBottom: Spacing.s5,
      borderTopLeftRadius: 14, // allow: card radius matches existing drawer chrome
      borderTopRightRadius: 14, // allow: card radius matches existing drawer chrome
    },
    pickerDone: {
      alignSelf: 'flex-end',
      paddingHorizontal: Spacing.s4,
      paddingVertical: Spacing.xs,
    },
    pickerDoneText: {
      color: c.accent,
      fontSize: 16,
      fontWeight: '600',
    },
  });

export default WellnessWindowsDrawer;
