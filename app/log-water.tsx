// ============================================================================
// LOG WATER — Phase 9.5 migration to LogScreen.
//
// Pre-9.5 wrapped AuroraBackground + custom header + counter + progress
// bar + quick-add row + bottom "Done ✓" button. Post-9.5 wraps in
// <LogScreen> with the standard header / disclaimer / single CTA pattern
// established by 9.2 / 9.3 / 9.4.
//
// Counter subtitle derives from listDailyInstances filtered to
// itemType === 'hydration', matching the canonical wizard-driven source.
// Instance-completion already wired (preserved as-is).
// ============================================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { navigateBack } from '../lib/navigate';
import { Colors } from '../theme/theme-tokens';
import { useTheme } from '../contexts/ThemeContext';
import { getTodayWaterLog, updateTodayWaterLog } from '../utils/centralStorage';
import { logError } from '../utils/devLog';
import { emitDataUpdate } from '../lib/events';
import { hapticSuccess } from '../utils/hapticFeedback';
import { EVENT } from '../lib/eventNames';
import {
  listDailyInstances,
  logInstanceCompletion,
  DEFAULT_PATIENT_ID,
} from '../storage/carePlanRepo';
import { getTodayDateString } from '../services/carePlanGenerator';
import { LogScreen } from '../components/logging/LogScreen';

const WATER_GOAL = 8;

export default function LogWaterScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const params = useLocalSearchParams();
  const today = useMemo(() => getTodayDateString(), []);

  const [glasses, setGlasses] = useState(0);
  const [saving, setSaving] = useState(false);
  const [hydrationCompleted, setHydrationCompleted] = useState(0);
  const [hydrationExpected, setHydrationExpected] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const todayWater = await getTodayWaterLog();
        if (!cancelled && todayWater?.glasses) setGlasses(todayWater.glasses);
      } catch (error) {
        logError('LogWaterScreen.loadWaterData', error);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Counter subtitle from listDailyInstances filtered to itemType hydration —
  // canonical 9.2 / 9.3 / 9.4 pattern.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const instances = await listDailyInstances(DEFAULT_PATIENT_ID, today);
        if (cancelled) return;
        const hydrationInstances = instances.filter((i) => i.itemType === 'hydration');
        setHydrationExpected(hydrationInstances.length);
        setHydrationCompleted(hydrationInstances.filter((i) => i.status === 'completed').length);
      } catch (err) {
        logError('LogWater.loadInstances', err);
      }
    })();
    return () => { cancelled = true; };
  }, [today]);

  const handleIncrement = useCallback(() => {
    setGlasses((prev) => Math.min(prev + 1, WATER_GOAL + 4));
  }, []);

  const handleDecrement = useCallback(() => {
    setGlasses((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleSave = async () => {
    if (saving) return;
    try {
      setSaving(true);
      await updateTodayWaterLog(glasses);

      const instanceId = params.instanceId as string | undefined;
      if (instanceId) {
        try {
          await logInstanceCompletion(
            DEFAULT_PATIENT_ID,
            today,
            instanceId,
            'completed',
            { type: 'hydration', glasses } as any,
            { source: 'record' },
          );
          emitDataUpdate(EVENT.DAILY_INSTANCES);
        } catch (err) {
          logError('LogWater.completeInstance', err);
        }
      }

      emitDataUpdate(EVENT.WATER);
      await hapticSuccess();
      navigateBack();
    } catch (error) {
      logError('LogWaterScreen.handleSave', error);
      Alert.alert('Error', 'Failed to save water intake');
      setSaving(false);
    }
  };

  const progressPercent = Math.min((glasses / WATER_GOAL) * 100, 100);
  const countSubtitle = hydrationExpected > 0
    ? `${hydrationCompleted} of ${hydrationExpected} today`
    : undefined;

  return (
    <LogScreen
      title="Water"
      countSubtitle={countSubtitle}
      onBack={navigateBack}
      primaryAction={{
        label: saving ? 'Saving…' : 'Save water',
        onPress: handleSave,
        disabled: saving,
      }}
    >
      <Text testID="log-water-disclaimer" style={styles.disclaimer}>
        For caregiver record-keeping. Not medical advice.
      </Text>

      <View style={styles.counterContainer}>
        <TouchableOpacity
          testID="log-water-decrement"
          style={styles.counterButton}
          onPress={handleDecrement}
          disabled={glasses === 0}
          accessibilityLabel="Decrease water by one glass"
          accessibilityRole="button"
        >
          <Text style={[styles.counterButtonText, glasses === 0 && styles.counterButtonDisabled]}>−</Text>
        </TouchableOpacity>

        <View style={styles.counterDisplay}>
          <Text testID="log-water-display" style={styles.counterNumber}>{glasses}</Text>
          <Text style={styles.counterLabel}>of {WATER_GOAL} glasses</Text>
        </View>

        <TouchableOpacity
          testID="log-water-increment"
          style={styles.counterButton}
          onPress={handleIncrement}
          accessibilityLabel="Increase water by one glass"
          accessibilityRole="button"
        >
          <Text style={styles.counterButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {glasses >= WATER_GOAL ? '✓ Goal reached' : `${WATER_GOAL - glasses} more to go`}
        </Text>
      </View>

      <View style={styles.quickAddRow}>
        {[1, 2, 3, 4].map((num) => (
          <TouchableOpacity
            key={num}
            style={styles.quickAddButton}
            onPress={() => setGlasses((prev) => Math.min(prev + num, WATER_GOAL + 4))}
            accessibilityLabel={`Add ${num} glass${num !== 1 ? 'es' : ''}`}
            accessibilityRole="button"
          >
            <Text style={styles.quickAddText}>+{num}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </LogScreen>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  disclaimer: {
    fontSize: 12,
    fontStyle: 'italic',
    color: c.textTertiary,
    marginBottom: 20,
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28, // allow: counter knob spacing (Apple HIG ≥44pt)
    marginVertical: 20,
  },
  counterButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: c.accentLight,
    borderWidth: 1,
    borderColor: c.accentBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterButtonText: {
    fontSize: 32,
    fontWeight: '300',
    color: c.accent,
  },
  counterButtonDisabled: {
    opacity: 0.3,
  },
  counterDisplay: {
    alignItems: 'center',
  },
  counterNumber: {
    fontSize: 64,
    fontWeight: '200',
    color: c.textPrimary,
  },
  counterLabel: {
    fontSize: 13,
    color: c.textMuted,
    marginTop: 2,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: c.glassActive,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: c.accent,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 13,
    color: c.textSecondary,
  },
  quickAddRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  quickAddButton: {
    paddingVertical: 12, // allow: tap-target padding (Apple HIG ≥44pt)
    paddingHorizontal: 20,
    backgroundColor: c.surfaceElevated,
    borderWidth: 0.5,
    borderColor: c.glassBorder,
    borderRadius: 8,
    minWidth: 56,
    alignItems: 'center',
  },
  quickAddText: {
    fontSize: 14,
    fontWeight: '500',
    color: c.textSecondary,
  },
});
