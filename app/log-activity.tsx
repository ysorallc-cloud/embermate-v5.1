// ============================================================================
// LOG ACTIVITY — Phase 9.5 migration to LogScreen.
//
// Pre-9.5 wrapped AuroraBackground + custom header + 6-pill activity grid
// + duration + notes + bottom "Done ✓". Post-9.5 wraps in <LogScreen>.
// Counter subtitle from listDailyInstances filtered to itemType
// 'activity'. Activity multi-select preserved.
// ============================================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { devLog, logError } from '../utils/devLog';
import { navigateBack } from '../lib/navigate';
import { Colors, Spacing } from '../theme/theme-tokens';
import { useTheme } from '../contexts/ThemeContext';
import {
  listDailyInstances,
  logInstanceCompletion,
  DEFAULT_PATIENT_ID,
} from '../storage/carePlanRepo';
import { emitDataUpdate } from '../lib/events';
import { hapticSuccess } from '../utils/hapticFeedback';
import { EVENT } from '../lib/eventNames';
import { getTodayDateString } from '../services/carePlanGenerator';
import { LogScreen } from '../components/logging/LogScreen';

const ACTIVITY_TYPES: { id: string; label: string }[] = [
  { id: 'walk',     label: 'Walking' },
  { id: 'exercise', label: 'Exercise' },
  { id: 'stretch',  label: 'Stretching' },
  { id: 'garden',   label: 'Gardening' },
  { id: 'chores',   label: 'Chores' },
  { id: 'other',    label: 'Other' },
];

export default function LogActivityScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const params = useLocalSearchParams();
  const today = useMemo(() => getTodayDateString(), []);

  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [activityCompleted, setActivityCompleted] = useState(0);
  const [activityExpected, setActivityExpected] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const instances = await listDailyInstances(DEFAULT_PATIENT_ID, today);
        if (cancelled) return;
        const activityInstances = instances.filter((i) => i.itemType === 'activity');
        setActivityExpected(activityInstances.length);
        setActivityCompleted(activityInstances.filter((i) => i.status === 'completed').length);
      } catch (err) {
        logError('LogActivity.loadInstances', err);
      }
    })();
    return () => { cancelled = true; };
  }, [today]);

  const toggleActivity = useCallback((activityId: string) => {
    setSelectedActivities((prev) =>
      prev.includes(activityId)
        ? prev.filter((id) => id !== activityId)
        : [...prev, activityId],
    );
  }, []);

  const canSave = selectedActivities.length > 0 && !saving;

  const handleSave = useCallback(async () => {
    if (!canSave) {
      if (selectedActivities.length === 0) {
        Alert.alert('Select Activity', 'Please select at least one activity type');
      }
      return;
    }
    try {
      setSaving(true);
      devLog('Activity logged:', { selectedActivities, duration, notes });

      const instanceId = params.instanceId as string | undefined;
      if (instanceId) {
        try {
          await logInstanceCompletion(
            DEFAULT_PATIENT_ID,
            today,
            instanceId,
            'completed',
            {
              type: 'activity',
              activityType: selectedActivities.join(', '),
              duration: parseInt(duration) || 0,
            } as any,
            { source: 'record' },
          );
          emitDataUpdate(EVENT.DAILY_INSTANCES);
        } catch (err) {
          logError('LogActivity.completeInstance', err);
        }
      }

      await hapticSuccess();
      navigateBack();
    } catch (error) {
      logError('LogActivityScreen.handleSave', error);
      Alert.alert('Error', 'Failed to save activity');
      setSaving(false);
    }
  }, [canSave, selectedActivities, duration, notes, params.instanceId, today]);

  const countSubtitle = activityExpected > 0
    ? `${activityCompleted} of ${activityExpected} today`
    : undefined;

  return (
    <LogScreen
      title="Activity"
      countSubtitle={countSubtitle}
      onBack={navigateBack}
      primaryAction={{
        label: saving ? 'Saving…' : 'Save activity',
        onPress: handleSave,
        disabled: !canSave,
      }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <Text testID="log-activity-disclaimer" style={styles.disclaimer}>
          For caregiver record-keeping. Not medical advice.
        </Text>

        <Text style={styles.label}>Activity type</Text>
        <View style={styles.grid}>
          {ACTIVITY_TYPES.map((activity) => {
            const selected = selectedActivities.includes(activity.id);
            return (
              <Pressable
                key={activity.id}
                testID={`log-activity-pill-${activity.id}`}
                style={[styles.pill, selected && styles.pillSelected]}
                onPress={() => toggleActivity(activity.id)}
                accessibilityRole="checkbox"
                accessibilityLabel={activity.label}
                accessibilityState={{ selected, checked: selected }}
              >
                <Text style={[styles.pillLabel, selected && styles.pillLabelSelected]}>
                  {activity.label}
                </Text>
                {selected && <Text style={styles.pillCheck}>✓</Text>}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>How long? (optional)</Text>
          <TextInput
            testID="log-activity-duration"
            style={styles.textInput}
            placeholder="e.g., 30 minutes"
            placeholderTextColor={colors.textMuted}
            value={duration}
            onChangeText={setDuration}
            accessibilityLabel="Activity duration"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput
            testID="log-activity-notes"
            style={[styles.textInput, styles.textArea]}
            placeholder="Any observations…"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
            value={notes}
            onChangeText={setNotes}
            accessibilityLabel="Activity notes"
          />
        </View>
      </KeyboardAvoidingView>
    </LogScreen>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  kav: { flex: 1 },
  disclaimer: {
    fontSize: 12,
    fontStyle: 'italic',
    color: c.textTertiary,
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: c.textTertiary,
    marginBottom: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: Spacing.md,
  },
  pill: {
    flexBasis: '48%',
    flexGrow: 1,
    minHeight: 48,
    paddingVertical: 12, // allow: tap-target padding (Apple HIG ≥44pt)
    paddingHorizontal: 14, // allow: tap-target padding (Apple HIG ≥44pt)
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: c.glassBorder,
    backgroundColor: c.surfaceElevated,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pillSelected: {
    backgroundColor: c.accentLight,
    borderColor: c.accentBorder,
  },
  pillLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: c.textPrimary,
  },
  pillLabelSelected: {
    // selectionListContrast a11y contract — keep label color stable;
    // selection conveyed by background + checkmark.
    fontWeight: '600',
  },
  pillCheck: {
    fontSize: 14,
    fontWeight: '600',
    color: c.accent,
  },
  section: {
    marginBottom: Spacing.md,
  },
  textInput: {
    backgroundColor: c.surfaceElevated,
    borderWidth: 0.5,
    borderColor: c.glassBorder,
    borderRadius: 10,
    padding: 14, // allow: tap-target padding (Apple HIG ≥44pt)
    color: c.textPrimary,
    fontSize: 15,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
