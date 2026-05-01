// ============================================================================
// SILENT VITALS — single-screen capture for the patient's silent vital signs
// (sleep / mood / energy). Replaces the legacy 5-page wellness wizard. Hosts
// the SilentVitalsCapture card on a dedicated screen so it's reachable from
// the Now-tab wellness checkbox, the wellness checklist, and any deep link.
// ============================================================================

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Colors } from '../theme/theme-tokens';
import { useTheme } from '../contexts/ThemeContext';
import { SubScreenHeader } from '../components/SubScreenHeader';
import {
  SilentVitalsCapture,
  type SilentVitalsValues,
} from '../components/now/SilentVitalsCapture';
import { TodaySilentVitals } from '../components/now/TodaySilentVitals';
import {
  upsertDailyReflection,
  getDailyReflection,
  type DailyReflection,
} from '../storage/dailyReflectionRepo';
import { usePatient } from '../contexts/PatientContext';
import { getTodayDateString } from '../services/carePlanGenerator';
import { navigateBack } from '../lib/navigate';
import { hapticSuccess } from '../utils/hapticFeedback';
import { logError } from '../utils/devLog';
import { DEFAULT_PATIENT_ID } from '../storage/carePlanRepo';

export default function SilentVitalsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { activePatient } = usePatient();
  const params = useLocalSearchParams<{ instanceId?: string; itemName?: string }>();

  const patientId = activePatient?.id || DEFAULT_PATIENT_ID;
  const patientName = activePatient?.name || 'they';
  const today = useMemo(() => getTodayDateString(), []);

  const [initial, setInitial] = useState<DailyReflection | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const existing = await getDailyReflection(patientId, today);
      if (!cancelled) setInitial(existing);
    })();
    return () => {
      cancelled = true;
    };
  }, [patientId, today]);

  const handleSave = useCallback(async (values: SilentVitalsValues) => {
    try {
      await upsertDailyReflection(patientId, today, {
        ...values,
        source: 'silent-vitals',
      });
      void hapticSuccess();
      navigateBack();
    } catch (err) {
      logError('silent-vitals.save', err);
      Alert.alert('Could not save', 'Please try again.');
    }
  }, [patientId, today]);

  const handleCancel = useCallback(() => {
    navigateBack();
  }, []);

  // initial is undefined until the load finishes; render the capture card
  // with no preset until then so the screen never blocks the user.
  const presetValues: SilentVitalsValues | undefined = initial
    ? {
        sleepQuality: initial.sleepQuality,
        mood: initial.mood,
        energyLevel: initial.energyLevel,
        reflection: initial.reflection,
      }
    : undefined;

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <SubScreenHeader
          title="Silent vital signs"
          subtitle={`How is ${patientName} today?`}
        />
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <TodaySilentVitals values={presetValues} />
          <SilentVitalsCapture
            initial={presetValues}
            patientName={patientName}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  content: { padding: 20, paddingBottom: 60 },
});
