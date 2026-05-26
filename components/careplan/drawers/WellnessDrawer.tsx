// ============================================================================
// WELLNESS DRAWER — Phase 32A F7 (HIGHEST-RISK SLICE)
//
// Bridges to the existing wellness store (@embermate_wellness_settings via
// useWellnessSettings) — NOT useCarePlanConfig — per the P5 lock. Writes
// to that store exactly as the retiring app/care-plan/wellness.tsx
// subscreen does (no migration, no data path drift).
//
// Body — preserves the live 14-field clinical surface (P4 lock):
//
//   CHECK-IN TIMES (chips, multi-select): Morning · time, Evening · time
//     • toggles morning.enabled / evening.enabled
//   MORNING · TRACK (chips, multi-select): 5 fields
//     • core: Sleep quality / Mood / Energy (always-tracked in checks[])
//     • optional: Orientation / Decision making
//   Morning Reminders toggle → morning.reminderEnabled
//   EVENING · TRACK (chips, multi-select): 9 fields
//     • core: Mood / Meals tracked / Day rating / Highlights & concerns
//     • optional: Pain level / Alertness / Bowel movement / Bathing /
//       Mobility
//   Evening Reminders toggle → evening.reminderEnabled
//
// Each chip toggle handles BOTH stores' shapes:
//   - core field (in checks[]) → add/remove from checks[]
//   - optional field (in optionalChecks{}) → set optionalChecks[key] = bool
//
// The drawer is the tallest in the inline-expand set — by design per P4
// lock. Preserving the evening surface is more important than terse
// chrome.
// ============================================================================

import React, { useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, Switch, StyleSheet } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import { useWellnessSettings } from '../../../hooks/useWellnessSettings';
import type { WellnessSettings, WellnessCheckConfig } from '../../../types/wellnessSettings';

// Field schemas — mirror the retiring app/care-plan/wellness.tsx subscreen
// (MORNING_CORE_FIELDS etc.) so the chip labels + storage keys stay in
// sync. Each entry maps {storageKey → display label}.

interface FieldDef {
  key: string;
  label: string;
}

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

function fieldSelected(cfg: WellnessCheckConfig, field: FieldDef, isCore: boolean): boolean {
  if (isCore) return cfg.checks.includes(field.key);
  return cfg.optionalChecks[field.key] === true;
}

function timeLabel(time: string): string {
  // "07:00" → "7 AM"
  const [hStr] = time.split(':');
  const h24 = parseInt(hStr, 10);
  if (isNaN(h24)) return time;
  const meridiem = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12} ${meridiem}`;
}

export function WellnessDrawer() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { settings, updateSettings } = useWellnessSettings();

  // ---- Mutators ---------------------------------------------------------

  const togglePeriodEnabled = useCallback(
    (period: 'morning' | 'evening') => {
      const next: WellnessSettings = {
        ...settings,
        [period]: {
          ...settings[period],
          enabled: !settings[period].enabled,
        },
      };
      updateSettings(next);
    },
    [settings, updateSettings],
  );

  const toggleField = useCallback(
    (period: 'morning' | 'evening', field: FieldDef, isCore: boolean) => {
      const cfg = settings[period];
      const isOn = fieldSelected(cfg, field, isCore);
      let nextChecks = cfg.checks;
      let nextOptional = cfg.optionalChecks;
      if (isCore) {
        nextChecks = isOn
          ? cfg.checks.filter((k) => k !== field.key)
          : [...cfg.checks, field.key];
      } else {
        nextOptional = { ...cfg.optionalChecks, [field.key]: !isOn };
      }
      const next: WellnessSettings = {
        ...settings,
        [period]: { ...cfg, checks: nextChecks, optionalChecks: nextOptional },
      };
      updateSettings(next);
    },
    [settings, updateSettings],
  );

  const toggleReminder = useCallback(
    (period: 'morning' | 'evening', value: boolean) => {
      const next: WellnessSettings = {
        ...settings,
        [period]: { ...settings[period], reminderEnabled: value },
      };
      updateSettings(next);
    },
    [settings, updateSettings],
  );

  // ---- Render helpers --------------------------------------------------

  const renderChip = (
    period: 'morning' | 'evening',
    field: FieldDef,
    isCore: boolean,
  ) => {
    const isSelected = fieldSelected(settings[period], field, isCore);
    return (
      <TouchableOpacity
        key={`${period}-${field.key}`}
        style={[styles.chip, isSelected && styles.chipSelected]}
        onPress={() => toggleField(period, field, isCore)}
        activeOpacity={0.7}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isSelected }}
        accessibilityLabel={`${period === 'morning' ? 'Morning' : 'Evening'} — ${field.label}`}
      >
        <Text style={[styles.chipLabel, isSelected && styles.chipLabelSelected]}>
          {field.label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View>
      {/* ─── CHECK-IN TIMES ─── */}
      <Text style={styles.label}>CHECK-IN TIMES</Text>
      <View style={styles.chipRow}>
        {(['morning', 'evening'] as const).map((period) => {
          const isOn = settings[period].enabled;
          const labelText = `${period === 'morning' ? 'Morning' : 'Evening'} · ${timeLabel(settings[period].time)}`;
          return (
            <TouchableOpacity
              key={`time-${period}`}
              style={[styles.chip, isOn && styles.chipSelected]}
              onPress={() => togglePeriodEnabled(period)}
              activeOpacity={0.7}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isOn }}
              accessibilityLabel={`${period === 'morning' ? 'Morning' : 'Evening'} check-in`}
            >
              <Text style={[styles.chipLabel, isOn && styles.chipLabelSelected]}>
                {labelText}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ─── MORNING ─── */}
      <Text style={styles.label}>MORNING · TRACK</Text>
      <View style={styles.chipRow}>
        {MORNING_CORE.map((f) => renderChip('morning', f, true))}
        {/* Phase 33 F7 — MORNING_OPTIONAL (Orientation, Decision making)
            v1-hidden as part of the "hide clinical features for v1"
            backlog deferral. Render line removed; the FieldDef const
            stays declared above so stored selections in
            optionalChecks survive untouched (presentation-layer
            hide, never data deletion). v1.1 unhide = restore one
            JSX line. */}
      </View>
      <View style={styles.row}>
        <View style={styles.rowLabelBlock}>
          <Text style={styles.rowLabel}>Morning reminder</Text>
        </View>
        <Switch
          value={settings.morning.reminderEnabled}
          onValueChange={(v) => toggleReminder('morning', v)}
          trackColor={{ false: colors.glassStrong, true: colors.accentMuted }}
          thumbColor={settings.morning.reminderEnabled ? colors.textPrimary : colors.switchThumbOff}
          ios_backgroundColor={colors.glassStrong}
          accessibilityLabel="Morning reminder"
          accessibilityRole="switch"
          accessibilityState={{ checked: settings.morning.reminderEnabled }}
        />
      </View>

      {/* ─── EVENING ─── */}
      <Text style={styles.label}>EVENING · TRACK</Text>
      <View style={styles.chipRow}>
        {EVENING_CORE.map((f) => renderChip('evening', f, true))}
        {/* Phase 33 F7 — EVENING_OPTIONAL (Pain level, Alertness, Bowel
            movement, Bathing, Mobility) v1-hidden — clinical-tier
            options deferred to a future version per the "hide clinical
            features for v1" backlog. Const declaration above is
            preserved; storage selections in optionalChecks for any
            pre-F7 caregiver survive untouched. */}
      </View>
      <View style={styles.row}>
        <View style={styles.rowLabelBlock}>
          <Text style={styles.rowLabel}>Evening reminder</Text>
        </View>
        <Switch
          value={settings.evening.reminderEnabled}
          onValueChange={(v) => toggleReminder('evening', v)}
          trackColor={{ false: colors.glassStrong, true: colors.accentMuted }}
          thumbColor={settings.evening.reminderEnabled ? colors.textPrimary : colors.switchThumbOff}
          ios_backgroundColor={colors.glassStrong}
          accessibilityLabel="Evening reminder"
          accessibilityRole="switch"
          accessibilityState={{ checked: settings.evening.reminderEnabled }}
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
    marginTop: 12,
  },
  chipRow: {
    flexDirection: 'row' as const,
    gap: 8,
    flexWrap: 'wrap' as const,
    marginBottom: 8,
  },
  // Phase 33 F7 — chip restyle (style A, user-locked).
  //   Selected   = soft-sage fill, no border, light cream text.
  //   Unselected = text only — no fill, no border, muted text.
  // Replaces the pre-F7 every-chip-outlined look that read as a row
  // of equally-weighted cards regardless of state. The selected
  // state now carries the visual weight; unselected recedes.
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14, // allow: chip horizontal padding (Apple HIG ≥44pt tap target)
    borderRadius: 999,
  },
  // Phase 33 F7 — selected-chip fill. Uses the canon sage at 16%
  // (theme-tokens.ts:accentChipFill = rgba(95,184,138,0.16)). The
  // existing accentDim at 10% composited too close to the bgRaised
  // ground (~ΔL 6) to read as selected; 16% gives enough green
  // presence to register as ON without shouting. Token-named so
  // future drawer surfaces adopting the same soft-fill-on-dark-
  // ground chip pattern share one source of truth, and a palette
  // tweak lands in one place.
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

export default WellnessDrawer;
