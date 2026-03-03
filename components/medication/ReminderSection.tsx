// ============================================================================
// REMINDER SECTION
// Reminder toggle, timing options, and follow-up configuration
// ============================================================================

import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Switch, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius } from '../../theme/theme-tokens';
import {
  REMINDER_TIMING_OPTIONS,
  FOLLOW_UP_OPTIONS,
} from '../../types/carePlanConfig';
import { MedicationFormState } from '../../hooks/useMedicationForm';

interface Props {
  state: MedicationFormState;
  dispatch: React.Dispatch<any>;
}

export function ReminderSection({ state, dispatch }: Props) {
  return (
    <View style={[
      styles.reminderContainer,
      state.reminderEnabled && styles.reminderContainerActive,
    ]}>
      {/* Toggle Row */}
      <TouchableOpacity
        style={styles.reminderToggleRow}
        onPress={() => dispatch({ type: 'SET_FIELD', field: 'reminderEnabled', value: !state.reminderEnabled })}
        activeOpacity={0.7}
        accessibilityRole="switch"
        accessibilityLabel="Reminders"
        accessibilityState={{ checked: state.reminderEnabled }}
      >
        <View style={styles.reminderToggleLeft}>
          <Text style={styles.reminderIcon}>🔔</Text>
          <View style={styles.reminderToggleInfo}>
            <Text style={styles.reminderToggleLabel}>Reminders</Text>
            <Text style={styles.reminderToggleDesc}>
              {state.reminderEnabled ? 'When should we notify you?' : 'Dose still appears in Care Plan'}
            </Text>
          </View>
        </View>
        <Switch
          value={state.reminderEnabled}
          onValueChange={(v) => dispatch({ type: 'SET_FIELD', field: 'reminderEnabled', value: v })}
          trackColor={{ false: Colors.textMuted, true: Colors.amber }}
          thumbColor={Colors.surface}
          ios_backgroundColor={Colors.textMuted}
        />
      </TouchableOpacity>

      {/* Reminder Options */}
      {state.reminderEnabled && (
        <View style={styles.reminderOptionsContainer}>
          <Text style={styles.reminderSectionLabel}>Notify me</Text>
          <View style={styles.timingOptionsGrid}>
            {REMINDER_TIMING_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.timingOption,
                  state.reminderTiming === option.value && styles.timingOptionActive,
                ]}
                onPress={() => dispatch({ type: 'SET_FIELD', field: 'reminderTiming', value: option.value })}
                activeOpacity={0.7}
                accessibilityRole="radio"
                accessibilityLabel={`Notify me ${option.label}`}
                accessibilityState={{ selected: state.reminderTiming === option.value }}
              >
                <Text style={[
                  styles.timingOptionText,
                  state.reminderTiming === option.value && styles.timingOptionTextActive,
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Custom minutes input */}
          {state.reminderTiming === 'custom' && (
            <View style={styles.customInputRow}>
              <TextInput
                style={styles.customMinutesInput}
                value={state.reminderCustomMinutes}
                onChangeText={(v) => dispatch({ type: 'SET_FIELD', field: 'reminderCustomMinutes', value: v })}
                keyboardType="numeric"
                placeholder="15"
                placeholderTextColor={Colors.textMuted}
                accessibilityLabel="Custom reminder minutes"
                accessibilityHint="Minutes before dose to send reminder"
              />
              <Text style={styles.customMinutesLabel}>minutes before</Text>
            </View>
          )}

          {/* Follow-up reminder */}
          <View style={styles.followUpContainer}>
            <TouchableOpacity
              style={styles.followUpToggleRow}
              onPress={() => dispatch({ type: 'SET_FIELD', field: 'followUpEnabled', value: !state.followUpEnabled })}
              activeOpacity={0.7}
              accessibilityRole="switch"
              accessibilityLabel="Remind again if not logged"
              accessibilityState={{ checked: state.followUpEnabled }}
            >
              <View style={styles.followUpInfo}>
                <Text style={styles.followUpLabel}>Remind again if not logged</Text>
                <Text style={styles.followUpDesc}>Stops after 3 attempts</Text>
              </View>
              <Switch
                value={state.followUpEnabled}
                onValueChange={(v) => dispatch({ type: 'SET_FIELD', field: 'followUpEnabled', value: v })}
                trackColor={{ false: Colors.textMuted, true: Colors.amber }}
                thumbColor={Colors.surface}
                ios_backgroundColor={Colors.textMuted}
              />
            </TouchableOpacity>

            {state.followUpEnabled && (
              <View style={styles.followUpIntervalRow}>
                <Text style={styles.followUpIntervalLabel}>Remind again after:</Text>
                <View style={styles.followUpIntervalOptions}>
                  {FOLLOW_UP_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.followUpIntervalOption,
                        state.followUpInterval === option.value && styles.followUpIntervalOptionActive,
                      ]}
                      onPress={() => dispatch({ type: 'SET_FIELD', field: 'followUpInterval', value: option.value })}
                      activeOpacity={0.7}
                      accessibilityRole="radio"
                      accessibilityLabel={`Remind again after ${option.label}`}
                      accessibilityState={{ selected: state.followUpInterval === option.value }}
                    >
                      <Text style={[
                        styles.followUpIntervalText,
                        state.followUpInterval === option.value && styles.followUpIntervalTextActive,
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  reminderContainer: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
  },
  reminderContainerActive: {
    backgroundColor: Colors.amberFaint,
    borderColor: Colors.warningBorder,
  },
  reminderToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
  },
  reminderToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  reminderIcon: { fontSize: 20 },
  reminderToggleInfo: { flex: 1 },
  reminderToggleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  reminderToggleDesc: { fontSize: 11, color: Colors.textMuted },
  reminderOptionsContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.amberMuted,
  },
  reminderSectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.amberBright,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  timingOptionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timingOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.warningBorder,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  timingOptionActive: {
    backgroundColor: Colors.amberMuted,
    borderColor: Colors.amberBright,
  },
  timingOptionText: { fontSize: 13, color: Colors.textSecondary },
  timingOptionTextActive: { color: Colors.amberBright, fontWeight: '600' },
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: Spacing.sm,
  },
  customMinutesInput: {
    width: 60,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderWidth: 1,
    borderColor: Colors.warningBorder,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  customMinutesLabel: { fontSize: 13, color: Colors.textSecondary },
  followUpContainer: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.amberHint,
  },
  followUpToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  followUpInfo: { flex: 1 },
  followUpLabel: { fontSize: 13, color: Colors.textPrimary, marginBottom: 2 },
  followUpDesc: { fontSize: 10, color: Colors.textMuted },
  followUpIntervalRow: { marginTop: Spacing.md },
  followUpIntervalLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  followUpIntervalOptions: { flexDirection: 'row', gap: 8 },
  followUpIntervalOption: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.warningBorder,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  followUpIntervalOptionActive: {
    backgroundColor: Colors.amberMuted,
    borderColor: Colors.amberBright,
  },
  followUpIntervalText: { fontSize: 12, color: Colors.textSecondary },
  followUpIntervalTextActive: { color: Colors.amberBright, fontWeight: '600' },
});
