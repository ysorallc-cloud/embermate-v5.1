// ============================================================================
// LOG SLEEP — Phase 9.5 migration to LogScreen.
//
// Pre-9.5 wrapped LinearGradient + SubScreenHeader + hours input +
// quality 1–5 buttons + bottom "Log Sleep" save. Post-9.5 wraps in
// <LogScreen>; counter subtitle from listDailyInstances filtered to
// itemType 'sleep'. Storage write paths and instance-completion preserved.
// ============================================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { navigateBack } from '../lib/navigate';
import { Colors, BorderRadius, Spacing } from '../theme/theme-tokens';
import { useTheme } from '../contexts/ThemeContext';
import { saveDailyTracking, getDailyTracking } from '../utils/dailyTrackingStorage';
import { saveSleepLog } from '../utils/centralStorage';
import { hapticSuccess } from '../utils/hapticFeedback';
import { logError } from '../utils/devLog';
import { getTodayDateString } from '../services/carePlanGenerator';
import {
  listDailyInstances,
  logInstanceCompletion,
  DEFAULT_PATIENT_ID,
} from '../storage/carePlanRepo';
import { emitDataUpdate } from '../lib/events';
import { EVENT } from '../lib/eventNames';
import { LogScreen } from '../components/logging/LogScreen';

const QUALITY_LABELS = ['Very Poor', 'Poor', 'Fair', 'Good', 'Excellent'];

export default function LogSleep() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const params = useLocalSearchParams();
  const today = useMemo(() => getTodayDateString(), []);

  const [hours, setHours] = useState('');
  const [quality, setQuality] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [sleepCompleted, setSleepCompleted] = useState(0);
  const [sleepExpected, setSleepExpected] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const existing = await getDailyTracking(today);
        if (cancelled || !existing) return;
        if (existing.sleep != null) setHours(String(existing.sleep));
        if (existing.sleepQuality != null) setQuality(existing.sleepQuality);
      } catch (error) {
        logError('LogSleep.loadExistingData', error);
      }
    })();
    return () => { cancelled = true; };
  }, [today]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const instances = await listDailyInstances(DEFAULT_PATIENT_ID, today);
        if (cancelled) return;
        const sleepInstances = instances.filter((i) => i.itemType === 'sleep');
        setSleepExpected(sleepInstances.length);
        setSleepCompleted(sleepInstances.filter((i) => i.status === 'completed').length);
      } catch (err) {
        logError('LogSleep.loadInstances', err);
      }
    })();
    return () => { cancelled = true; };
  }, [today]);

  const canSave = (hours.trim().length > 0 || quality != null) && !loading;

  const handleSave = useCallback(async () => {
    if (!canSave) return;
    if (hours.trim()) {
      const hoursNum = parseFloat(hours);
      if (isNaN(hoursNum) || hoursNum < 0 || hoursNum > 24) {
        Alert.alert('Invalid Hours', 'Please enter a valid number of hours (0-24)');
        return;
      }
    }
    setLoading(true);
    try {
      const hoursNum = hours.trim() ? parseFloat(hours) : 0;
      await saveDailyTracking(today, {
        sleep: hours.trim() ? hoursNum : null,
        sleepQuality: quality,
      });
      if (hoursNum > 0 || quality) {
        await saveSleepLog({
          timestamp: new Date().toISOString(),
          hours: hoursNum,
          quality: quality || 3,
        });
      }
      const instanceId = params.instanceId as string | undefined;
      if (instanceId) {
        try {
          await logInstanceCompletion(
            DEFAULT_PATIENT_ID,
            today,
            instanceId,
            'completed',
            { type: 'sleep', hours: hoursNum, quality: quality || 3 } as any,
            { source: 'record' },
          );
          emitDataUpdate(EVENT.DAILY_INSTANCES);
        } catch (err) {
          logError('LogSleep.completeInstance', err);
        }
      }
      await hapticSuccess();
      navigateBack();
    } catch (error) {
      logError('LogSleep.handleSave', error);
      Alert.alert('Error', 'Failed to save sleep data');
      setLoading(false);
    }
  }, [canSave, hours, quality, today, params.instanceId]);

  const countSubtitle = sleepExpected > 0
    ? `${sleepCompleted} of ${sleepExpected} today`
    : undefined;

  return (
    <LogScreen
      title="Sleep"
      countSubtitle={countSubtitle}
      onBack={navigateBack}
      primaryAction={{
        label: loading ? 'Saving…' : 'Save sleep',
        onPress: handleSave,
        disabled: !canSave,
      }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <Text testID="log-sleep-disclaimer" style={styles.disclaimer}>
          For caregiver record-keeping. Not medical advice.
        </Text>

        <View style={styles.section}>
          <Text style={styles.label}>Hours slept</Text>
          <View style={styles.hoursInputContainer}>
            <TextInput
              testID="log-sleep-hours"
              style={styles.hoursInput}
              placeholder="7.5"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              value={hours}
              onChangeText={setHours}
              maxLength={4}
              accessibilityLabel="Hours slept"
            />
            <Text style={styles.hoursUnit}>hours</Text>
          </View>
          <Text style={styles.hint}>Enter a number between 0 and 24</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Quality</Text>
          <View style={styles.qualityContainer}>
            {[1, 2, 3, 4, 5].map((value) => {
              const selected = quality === value;
              return (
                <TouchableOpacity
                  key={value}
                  testID={`log-sleep-quality-${value}`}
                  style={[styles.qualityButton, selected && styles.qualityButtonSelected]}
                  onPress={() => setQuality(value)}
                  accessibilityLabel={`Sleep quality ${QUALITY_LABELS[value - 1]}, ${value} out of 5`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                >
                  <Text
                    style={[styles.qualityNumber, selected && styles.qualityNumberSelected]}
                  >
                    {value}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.qualityLabels}>
            <Text style={styles.qualityLabelText}>Very poor</Text>
            <Text style={styles.qualityLabelText}>Excellent</Text>
          </View>
          {quality != null && (
            <Text style={styles.selectedQualityText}>{QUALITY_LABELS[quality - 1]}</Text>
          )}
        </View>
      </KeyboardAvoidingView>
    </LogScreen>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  kav: {
    flex: 1,
  },
  disclaimer: {
    fontSize: 12,
    fontStyle: 'italic',
    color: c.textTertiary,
    marginBottom: Spacing.md,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: c.textTertiary,
    marginBottom: Spacing.sm,
  },
  hoursInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  hoursInput: {
    flex: 1,
    backgroundColor: c.surfaceElevated,
    borderWidth: 1,
    borderColor: c.glassBorder,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    color: c.textPrimary,
    fontSize: 20,
    fontWeight: '500',
    textAlign: 'center',
  },
  hoursUnit: {
    fontSize: 13,
    color: c.textSecondary,
    minWidth: 44,
  },
  hint: {
    fontSize: 12,
    color: c.textMuted,
    marginTop: Spacing.xs,
  },
  qualityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  qualityButton: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 56,
    maxHeight: 56,
    borderRadius: 28,
    backgroundColor: c.surfaceElevated,
    borderWidth: 0.5,
    borderColor: c.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qualityButtonSelected: {
    backgroundColor: c.accentLight,
    borderColor: c.accentBorder,
  },
  qualityNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: c.textSecondary,
  },
  qualityNumberSelected: {
    // selectionListContrast a11y contract: keep label color stable so
    // selection is conveyed by background + border, not by tint.
    color: c.textPrimary,
  },
  qualityLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.xxs,
  },
  qualityLabelText: {
    fontSize: 11,
    color: c.textTertiary,
  },
  selectedQualityText: {
    marginTop: Spacing.sm,
    fontSize: 13,
    color: c.textSecondary,
    textAlign: 'center',
  },
});
