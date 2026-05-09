// ============================================================================
// WELLNESS CHECK CONFIGURATION — Phase 10.2 tightened pass.
//
// Pre-10.2 the screen was a 504-line config sheet with:
//   • SubScreenHeader + LinearGradient page chrome
//   • 9 patient-name interpolations (5 evening + 2 morning field
//     descriptions, plus the helper signatures + the subtitle)
//   • "Core" badge per always-on field
//   • Evening section expanded by default (parity with Morning)
//   • Per-row description prose ("Track ${name}'s pain on a none-to-
//     severe scale.") that read like a clinician's chart
//   • Info card at the bottom restating the section structure in prose
//
// Post-10.2:
//   • Wraps in CarePlanConfigScreen with chrome="gradient" — the
//     bucket-config family chrome.
//   • Zero patient-name interpolation. Patient context comes from the
//     screen header / Care Plan ownership; per-row name echoes are gone.
//   • Section structure replaces per-row badges:
//       MORNING · 8 AM
//       ALWAYS TRACKED   — sleep / mood / energy
//       ADD MORE         — orientation / decision-making toggles
//       Reminder
//       (collapsible) EVENING · 8 PM · N fields
//         ALWAYS TRACKED   — mood / meals / day rating / notes
//         ADD MORE         — pain / alertness / bowel / bathing / mobility
//         Reminder
//   • Optional rows are label + toggle only. Description prose dropped.
//   • Info card removed — the section structure speaks for itself.
//
// The rewrite operates on the existing useWellnessSettings storage
// shape unchanged. Per Q5 from 10.0, Phase 10 is UI/copy/layout only;
// data model migrations are tracked separately.
// ============================================================================

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, BorderRadius } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { useWellnessSettings } from '../../hooks/useWellnessSettings';
import { CarePlanConfigScreen } from '../../components/care-plan/CarePlanConfigScreen';

// ============================================================================
// FIELD METADATA — patient-agnostic. No name interpolation.
// ============================================================================

interface FieldDef {
  key: string;
  label: string;
}

const MORNING_CORE_FIELDS: FieldDef[] = [
  { key: 'sleep',  label: 'Sleep quality' },
  { key: 'mood',   label: 'Mood' },
  { key: 'energy', label: 'Energy level' },
];

const MORNING_OPTIONAL_FIELDS: FieldDef[] = [
  { key: 'orientation',    label: 'Orientation' },
  { key: 'decisionMaking', label: 'Decision making' },
];

const EVENING_CORE_FIELDS: FieldDef[] = [
  { key: 'mood',      label: 'Mood' },
  { key: 'meals',     label: 'Meals tracked' },
  { key: 'dayRating', label: 'Day rating' },
  { key: 'notes',     label: 'Highlights & concerns' },
];

const EVENING_OPTIONAL_FIELDS: FieldDef[] = [
  { key: 'painLevel',      label: 'Pain level' },
  { key: 'alertness',      label: 'Alertness' },
  { key: 'bowelMovement',  label: 'Bowel movement' },
  { key: 'bathingStatus',  label: 'Bathing' },
  { key: 'mobilityStatus', label: 'Mobility' },
];

const MORNING_TIME_PRESETS = ['06:00', '07:00', '08:00', '09:00'];
const EVENING_TIME_PRESETS = ['19:00', '20:00', '21:00', '22:00'];

function formatTime(time: string): string {
  const [h] = time.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${display} ${ampm}`;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function WellnessConfigScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { settings, updateSettings } = useWellnessSettings();

  // Evening collapsed by default. Caregivers configure morning more
  // often (alarm time, mood/sleep checks); evening details surface on
  // demand.
  const [eveningExpanded, setEveningExpanded] = useState(false);

  const handleTimeChange = useCallback(async (period: 'morning' | 'evening', time: string) => {
    await updateSettings({
      ...settings,
      [period]: { ...settings[period], time },
    });
  }, [settings, updateSettings]);

  const handleToggleOptional = useCallback(async (period: 'morning' | 'evening', key: string, value: boolean) => {
    await updateSettings({
      ...settings,
      [period]: {
        ...settings[period],
        optionalChecks: {
          ...settings[period].optionalChecks,
          [key]: value,
        },
      },
    });
  }, [settings, updateSettings]);

  const handleToggleReminder = useCallback(async (period: 'morning' | 'evening', value: boolean) => {
    await updateSettings({
      ...settings,
      [period]: { ...settings[period], reminderEnabled: value },
    });
  }, [settings, updateSettings]);

  const eveningEnabledOptionals = EVENING_OPTIONAL_FIELDS.filter(
    (f) => settings.evening.optionalChecks[f.key] ?? false,
  ).length;
  const eveningTotalFields = EVENING_CORE_FIELDS.length + eveningEnabledOptionals;

  const renderTimeRow = (period: 'morning' | 'evening', presets: string[]) => (
    <View style={styles.timeRow}>
      {presets.map((time) => {
        const selected = settings[period].time === time;
        return (
          <TouchableOpacity
            key={time}
            style={[styles.timeChip, selected && styles.timeChipSelected]}
            onPress={() => handleTimeChange(period, time)}
            activeOpacity={0.7}
            accessibilityLabel={`${period} check time ${formatTime(time)}`}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
          >
            <Text style={[styles.timeChipText, selected && styles.timeChipTextSelected]}>
              {formatTime(time)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderCoreRows = (period: 'morning' | 'evening', fields: FieldDef[]) =>
    fields.map((field) => (
      <View
        key={field.key}
        testID={`wellness-core-row-${period}-${field.key}`}
        style={styles.coreRow}
      >
        <Text style={styles.rowLabel}>{field.label}</Text>
      </View>
    ));

  const renderOptionalRows = (period: 'morning' | 'evening', fields: FieldDef[]) =>
    fields.map((field) => {
      const value = settings[period].optionalChecks[field.key] ?? false;
      return (
        <View
          key={field.key}
          testID={`wellness-optional-row-${period}-${field.key}`}
          style={styles.optionalRow}
        >
          <Text style={styles.rowLabel}>{field.label}</Text>
          <Switch
            value={value}
            onValueChange={(v) => handleToggleOptional(period, field.key, v)}
            trackColor={{ false: colors.glassStrong, true: colors.accent }}
            thumbColor={value ? colors.textPrimary : colors.switchThumbOff}
            ios_backgroundColor={colors.glassStrong}
            accessibilityLabel={`${period} ${field.label}`}
            accessibilityRole="switch"
            accessibilityState={{ checked: value }}
          />
        </View>
      );
    });

  const renderReminderRow = (period: 'morning' | 'evening') => (
    <View
      testID={`wellness-reminder-row-${period}`}
      style={styles.reminderRow}
    >
      <View style={styles.reminderInfo}>
        <Text style={styles.rowLabel}>Reminder</Text>
        <Text style={styles.reminderHint}>Push notification at check-in time</Text>
      </View>
      <Switch
        value={settings[period].reminderEnabled}
        onValueChange={(v) => handleToggleReminder(period, v)}
        trackColor={{ false: colors.glassStrong, true: colors.accent }}
        thumbColor={settings[period].reminderEnabled ? colors.textPrimary : colors.switchThumbOff}
        ios_backgroundColor={colors.glassStrong}
        accessibilityLabel={`${period} reminder`}
        accessibilityRole="switch"
        accessibilityState={{ checked: settings[period].reminderEnabled }}
      />
    </View>
  );

  return (
    <CarePlanConfigScreen
      title="Wellness checks"
      subtitle="Daily morning and evening check-ins."
      chrome="gradient"
      onBack={() => router.back()}
    >
      {/* MORNING — expanded by default */}
      <Text style={styles.sectionHeader}>
        MORNING · {formatTime(settings.morning.time)}
      </Text>
      {renderTimeRow('morning', MORNING_TIME_PRESETS)}

      <Text testID="wellness-morning-always-eyebrow" style={styles.eyebrow}>
        ALWAYS TRACKED
      </Text>
      {renderCoreRows('morning', MORNING_CORE_FIELDS)}

      <Text testID="wellness-morning-add-more-eyebrow" style={styles.eyebrow}>
        ADD MORE
      </Text>
      {renderOptionalRows('morning', MORNING_OPTIONAL_FIELDS)}

      {renderReminderRow('morning')}

      {/* EVENING — collapsed by default; tap header to expand */}
      <TouchableOpacity
        testID="wellness-evening-header"
        style={styles.eveningHeader}
        onPress={() => setEveningExpanded((v) => !v)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={
          eveningExpanded
            ? 'Collapse evening check section'
            : 'Expand evening check section'
        }
        accessibilityState={{ expanded: eveningExpanded }}
      >
        <View style={styles.eveningHeaderTextBlock}>
          <Text style={styles.sectionHeader}>
            EVENING · {formatTime(settings.evening.time)}
          </Text>
          <Text style={styles.eveningSummary}>
            {eveningTotalFields} {eveningTotalFields === 1 ? 'field' : 'fields'}
          </Text>
        </View>
        <Text style={styles.eveningChevron}>{eveningExpanded ? '▴' : '▾'}</Text>
      </TouchableOpacity>

      {eveningExpanded && (
        <View testID="wellness-evening-body">
          {renderTimeRow('evening', EVENING_TIME_PRESETS)}

          <Text testID="wellness-evening-always-eyebrow" style={styles.eyebrow}>
            ALWAYS TRACKED
          </Text>
          {renderCoreRows('evening', EVENING_CORE_FIELDS)}

          <Text testID="wellness-evening-add-more-eyebrow" style={styles.eyebrow}>
            ADD MORE
          </Text>
          {renderOptionalRows('evening', EVENING_OPTIONAL_FIELDS)}

          {renderReminderRow('evening')}
        </View>
      )}
    </CarePlanConfigScreen>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const createStyles = (c: typeof Colors) => StyleSheet.create({
  sectionHeader: {
    fontSize: 11,
    fontWeight: '600',
    color: c.textHalf,
    letterSpacing: 1,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  eyebrow: {
    fontSize: 9,
    fontWeight: '600',
    color: c.textTertiary,
    letterSpacing: 1.5,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },

  // Time row
  timeRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  timeChip: {
    flex: 1,
    paddingVertical: Spacing.xs,
    backgroundColor: c.glassFaint,
    borderWidth: 0.5,
    borderColor: c.glassBorder,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  timeChipSelected: {
    borderColor: c.accentBorder,
    backgroundColor: c.accentLight,
  },
  timeChipText: {
    fontSize: 13,
    color: c.textSecondary,
    fontWeight: '500',
  },
  timeChipTextSelected: {
    // selectionListContrast a11y contract — keep label color stable.
    fontWeight: '600',
  },

  // Core row (always tracked) — label only, no badge
  coreRow: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: c.surfaceAlt,
    borderWidth: 0.5,
    borderColor: c.glassBorder,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xs,
  },

  // Optional row (toggleable) — label + switch only, no description
  optionalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: c.glassFaint,
    borderWidth: 0.5,
    borderColor: c.glassBorder,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xs,
  },

  rowLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: c.textPrimary,
  },

  // Reminder row — keeps a one-line hint since the toggle's effect
  // (push notification) isn't obvious from the label alone.
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: c.glassFaint,
    borderWidth: 0.5,
    borderColor: c.glassBorder,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  reminderInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  reminderHint: {
    fontSize: 12,
    color: c.textTertiary,
    marginTop: 2,
  },

  // Evening collapsible header
  eveningHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  eveningHeaderTextBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
  },
  eveningSummary: {
    fontSize: 12,
    color: c.textTertiary,
  },
  eveningChevron: {
    fontSize: 14,
    color: c.textTertiary,
    paddingHorizontal: Spacing.xs,
  },
});
