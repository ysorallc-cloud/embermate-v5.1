// ============================================================================
// SILENT VITALS — Phase 9.4 migration to LogScreen.
//
// Pre-9.4 the screen rendered SubScreenHeader + TodaySilentVitals recap
// + the SilentVitalsCapture card-in-card with its own inline Cancel/Save
// footer. Wordy "How did Mom sleep?" question prose, patient-name echo,
// two competing CTAs (the inline footer pair).
//
// Post-9.4:
//   • Wraps in <LogScreen> — single sage "Save check-in" CTA, ghost
//     cancel, compact header. Title "Wellness check" matches existing
//     useWellnessSettings / Care Plan config language.
//   • Counter subtitle derived from listDailyInstances filtered to
//     itemType === 'wellness' — same canonical pattern 9.2/9.3 set.
//   • TodaySilentVitals recap dropped — slider rows display preset
//     selections via the controlled `values` prop, so the duplicate
//     "today" surface above became redundant.
//   • Instance-completion fix: when reached from a Now-tab wellness
//     instance (instanceId in search params), the save also calls
//     logInstanceCompletion so the schedule counter and StatRings
//     reflect the completion. Pre-9.4 the screen captured instanceId
//     but never marked the instance done — silent data bug, surfaced
//     in 9.4.0 pre-flight, fixed here.
//   • Medical disclaimer at the top of the input zone.
//
// Out of scope:
//   • The wellness data model (DailyReflection storage shape, wellness
//     settings).
//   • Modifications to LogScreen primitive itself.
// ============================================================================

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Colors } from '../theme/theme-tokens';
import { useTheme } from '../contexts/ThemeContext';
import {
  SilentVitalsCapture,
  type SilentVitalsValues,
} from '../components/now/SilentVitalsCapture';
import {
  upsertDailyReflection,
  getDailyReflection,
} from '../storage/dailyReflectionRepo';
import { usePatient } from '../contexts/PatientContext';
import { getTodayDateString } from '../services/carePlanGenerator';
import { navigateBack } from '../lib/navigate';
import { hapticSuccess } from '../utils/hapticFeedback';
import { logError } from '../utils/devLog';
import {
  listDailyInstances,
  logInstanceCompletion,
  DEFAULT_PATIENT_ID,
} from '../storage/carePlanRepo';
import { emitDataUpdate } from '../lib/events';
import { EVENT } from '../lib/eventNames';
import { LogScreen } from '../components/logging/LogScreen';

export default function SilentVitalsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { activePatient } = usePatient();
  const params = useLocalSearchParams<{ instanceId?: string; itemName?: string }>();

  const patientId = activePatient?.id || DEFAULT_PATIENT_ID;
  const today = useMemo(() => getTodayDateString(), []);

  const [values, setValues] = useState<SilentVitalsValues>({});
  const [saving, setSaving] = useState(false);
  const [wellnessCompleted, setWellnessCompleted] = useState(0);
  const [wellnessExpected, setWellnessExpected] = useState(0);

  // Load any existing reflection for today so the slider rows reflect a
  // mid-day re-open without losing the previous selections.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const existing = await getDailyReflection(patientId, today);
        if (cancelled || !existing) return;
        setValues({
          sleepQuality: existing.sleepQuality,
          mood: existing.mood,
          energyLevel: existing.energyLevel,
          reflection: existing.reflection,
        });
      } catch (err) {
        logError('silent-vitals.loadExisting', err);
      }
    })();
    return () => { cancelled = true; };
  }, [patientId, today]);

  // Phase 9.4 — counter subtitle reads from listDailyInstances directly,
  // mirroring the 9.2 / 9.3 pattern.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const instances = await listDailyInstances(patientId, today);
        if (cancelled) return;
        const wellnessInstances = instances.filter(i => i.itemType === 'wellness');
        setWellnessExpected(wellnessInstances.length);
        setWellnessCompleted(wellnessInstances.filter(i => i.status === 'completed').length);
      } catch (err) {
        logError('silent-vitals.loadInstances', err);
      }
    })();
    return () => { cancelled = true; };
  }, [patientId, today]);

  const filledCount =
    (values.sleepQuality != null ? 1 : 0) +
    (values.mood != null ? 1 : 0) +
    (values.energyLevel != null ? 1 : 0);
  const canSave = filledCount > 0 && !saving;

  const handleSave = useCallback(async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const payload: SilentVitalsValues = {};
      if (values.sleepQuality != null) payload.sleepQuality = values.sleepQuality;
      if (values.mood != null) payload.mood = values.mood;
      if (values.energyLevel != null) payload.energyLevel = values.energyLevel;
      const trimmed = (values.reflection ?? '').trim();
      if (trimmed) payload.reflection = trimmed;

      await upsertDailyReflection(patientId, today, {
        ...payload,
        source: 'silent-vitals',
      });

      // Phase 9.4 — instance-completion fix. When the user reached this
      // screen from a Now-tab wellness instance, mark that instance
      // completed so the schedule counter and StatRings reflect the save.
      // Pre-9.4 the screen captured instanceId but never marked the
      // instance done — silent data bug.
      if (params.instanceId) {
        try {
          await logInstanceCompletion(
            patientId,
            today,
            params.instanceId,
            'completed',
            { type: 'wellness', ...payload } as any,
            { source: 'record' },
          );
          emitDataUpdate(EVENT.DAILY_INSTANCES);
        } catch (err) {
          logError('silent-vitals.completeInstance', err);
        }
      }

      void hapticSuccess();
      navigateBack();
    } catch (err) {
      logError('silent-vitals.save', err);
      Alert.alert('Could not save', 'Please try again.');
      setSaving(false);
    }
  }, [canSave, values, patientId, today, params.instanceId]);

  const countSubtitle = wellnessExpected > 0
    ? `${wellnessCompleted} of ${wellnessExpected} today`
    : undefined;

  return (
    <LogScreen
      title="Wellness check"
      countSubtitle={countSubtitle}
      onBack={navigateBack}
      primaryAction={{
        label: saving ? 'Saving…' : 'Save check-in',
        onPress: handleSave,
        disabled: !canSave,
      }}
    >
      {/* KAV inside LogScreen children — primitive-level KAV is the
          tracked Phase 9 follow-up. */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <Text testID="silent-vitals-disclaimer" style={styles.disclaimer}>
          For caregiver record-keeping. Captures subjective state, not clinical assessment.
        </Text>
        <SilentVitalsCapture values={values} onChange={setValues} />
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
    marginBottom: 16,
  },
});
