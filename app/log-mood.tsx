// ============================================================================
// LOG MOOD — Phase 9.5 migration to LogScreen + instance-completion fix.
//
// Pre-9.5 wrapped LinearGradient + SubScreenHeader + 5-mood emoji row +
// auto-save-on-tap. The auto-save UX traded explicit confirmation for
// speed; LogScreen's single-CTA contract restores select-then-Save,
// which costs one tap but matches the rest of the log family. The
// confirmation banner gets dropped (the navigateBack itself is the
// confirmation).
//
// Defensive instance-completion fix per 9.4 pattern: receive
// instanceId from search params, conditionally call
// logInstanceCompletion(instanceId) on save. Pre-9.5 the screen had
// neither — same silent-bug class as 9.4 silent-vitals had. Mood is a
// valid CarePlanItemType so the wiring is in place for when a template
// schedules mood instances.
// ============================================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { navigateBack } from '../lib/navigate';
import { Colors, Spacing } from '../theme/theme-tokens';
import { useTheme } from '../contexts/ThemeContext';
import { saveMoodLog } from '../utils/centralStorage';
import { logMood } from '../utils/logEvents';
import { hapticSuccess } from '../utils/hapticFeedback';
import { parseCarePlanContext, getCarePlanBannerText } from '../utils/carePlanRouting';
import { trackCarePlanProgress } from '../utils/carePlanStorage';
import { logError } from '../utils/devLog';
import { emitDataUpdate } from '../lib/events';
import { EVENT } from '../lib/eventNames';
import {
  listDailyInstances,
  logInstanceCompletion,
  DEFAULT_PATIENT_ID,
} from '../storage/carePlanRepo';
import { getTodayDateString } from '../services/carePlanGenerator';
import { LogScreen } from '../components/logging/LogScreen';

const MOODS: { id: string; value: number; label: string }[] = [
  { id: 'great',     value: 5, label: 'Great' },
  { id: 'good',      value: 4, label: 'Good' },
  { id: 'okay',      value: 3, label: 'Okay' },
  { id: 'down',      value: 2, label: 'Down' },
  { id: 'difficult', value: 1, label: 'Difficult' },
];

export default function LogMoodScreen() {
  const params = useLocalSearchParams();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const today = useMemo(() => getTodayDateString(), []);

  const carePlanContext = parseCarePlanContext(params as Record<string, string>);
  const isFromCarePlan = carePlanContext !== null;

  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [moodCompleted, setMoodCompleted] = useState(0);
  const [moodExpected, setMoodExpected] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const instances = await listDailyInstances(DEFAULT_PATIENT_ID, today);
        if (cancelled) return;
        const moodInstances = instances.filter((i) => i.itemType === 'mood');
        setMoodExpected(moodInstances.length);
        setMoodCompleted(moodInstances.filter((i) => i.status === 'completed').length);
      } catch (err) {
        logError('LogMood.loadInstances', err);
      }
    })();
    return () => { cancelled = true; };
  }, [today]);

  const canSave = selectedMood != null && !saving;

  const handleSave = useCallback(async () => {
    if (!canSave || !selectedMood) return;
    const moodValue = MOODS.find((m) => m.id === selectedMood)?.value ?? 3;
    setSaving(true);
    try {
      await saveMoodLog({
        timestamp: new Date().toISOString(),
        mood: moodValue,
        energy: null,
        pain: null,
      });

      await logMood(moodValue, {
        carePlanTaskId: carePlanContext?.carePlanItemId,
        routineId: carePlanContext?.routineId,
        audit: {
          source: isFromCarePlan ? 'careplan' : 'record',
          action: 'direct_tap',
        },
      });

      if (carePlanContext) {
        await trackCarePlanProgress(
          carePlanContext.routineId,
          carePlanContext.carePlanItemId,
          { logType: 'mood' },
        );
      }

      // Phase 9.5 — defensive instance-completion fix (9.4 pattern).
      // Mood is a valid CarePlanItemType; if a future template schedules
      // a mood instance and routes here, mark it completed.
      const instanceId = params.instanceId as string | undefined;
      if (instanceId) {
        try {
          await logInstanceCompletion(
            DEFAULT_PATIENT_ID,
            today,
            instanceId,
            'completed',
            { type: 'mood', mood: moodValue } as any,
            { source: 'record' },
          );
          emitDataUpdate(EVENT.DAILY_INSTANCES);
        } catch (err) {
          logError('LogMood.completeInstance', err);
        }
      }

      await hapticSuccess();
      emitDataUpdate(EVENT.MOOD);
      navigateBack();
    } catch (error) {
      logError('LogMoodScreen.handleSave', error);
      Alert.alert('Error', 'Failed to save mood');
      setSaving(false);
    }
  }, [canSave, selectedMood, today, carePlanContext, isFromCarePlan, params.instanceId]);

  const countSubtitle = moodExpected > 0
    ? `${moodCompleted} of ${moodExpected} today`
    : undefined;

  return (
    <LogScreen
      title="Mood"
      countSubtitle={countSubtitle}
      onBack={navigateBack}
      primaryAction={{
        label: saving ? 'Saving…' : 'Save mood',
        onPress: handleSave,
        disabled: !canSave,
      }}
    >
      <Text testID="log-mood-disclaimer" style={styles.disclaimer}>
        For caregiver record-keeping. Captures subjective state, not clinical assessment.
      </Text>

      {isFromCarePlan && carePlanContext && (
        <View style={styles.carePlanBanner}>
          <Text style={styles.carePlanBannerLabel}>FROM CARE PLAN</Text>
          <Text style={styles.carePlanBannerText}>
            {getCarePlanBannerText(carePlanContext)}
          </Text>
        </View>
      )}

      <Text style={styles.label}>Mood</Text>
      <View style={styles.row}>
        {MOODS.map((mood) => {
          const selected = selectedMood === mood.id;
          return (
            <Pressable
              key={mood.id}
              testID={`log-mood-pill-${mood.id}`}
              style={[styles.pill, selected && styles.pillSelected]}
              onPress={() => setSelectedMood(mood.id)}
              accessibilityRole="radio"
              accessibilityLabel={`${mood.label} mood`}
              accessibilityState={{ selected }}
            >
              <Text style={[styles.pillLabel, selected && styles.pillLabelSelected]}>
                {mood.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </LogScreen>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  disclaimer: {
    fontSize: 12,
    fontStyle: 'italic',
    color: c.textTertiary,
    marginBottom: Spacing.md,
  },
  carePlanBanner: {
    backgroundColor: c.accentFaint,
    borderRadius: 10,
    padding: 12, // allow: tap-target padding (Apple HIG ≥44pt)
    marginBottom: Spacing.md,
  },
  carePlanBannerLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: c.accent,
    letterSpacing: 1,
    marginBottom: 4,
  },
  carePlanBannerText: {
    fontSize: 13,
    color: c.textSecondary,
  },
  label: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: c.textTertiary,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
    alignItems: 'center',
    justifyContent: 'center',
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
    // selectionListContrast a11y contract — keep label color stable.
    fontWeight: '600',
  },
});
