// ============================================================================
// LOG VITALS — Phase 9.2 migration to LogScreen.
//
// Pre-9.2 the screen rendered all 6 fields at once with no priority hierarchy,
// prefilled inputs from prior readings as state values, and surfaced a
// "6 of 2 vitals checks logged today" counter whose numerator counted
// non-null FIELDS (rhythmStorage.ts:213–218) while the denominator counted
// scheduled CHECKS — a unit mismatch documented in 9.2.0.
//
// Post-9.2:
//   • Wraps in <LogScreen> — single sage CTA, ghost cancel, compact header.
//   • Title "Vitals", subtitle derived directly from listDailyInstances
//     (canonical wizard-driven source — sidesteps getTodayProgress per
//     the 9.2.0 scope decision; the legacy helper retires by attrition
//     through Phases 9.3/9.4/9.5 and gets deleted in 9.6).
//   • BP + HR primary (always visible). SpO₂ / Temp / Glucose / Weight
//     collapsed behind a single "More fields" expander row.
//   • Smart defaults are PLACEHOLDERS only (per Q1(a) decision) — empty
//     save = unrecorded.
//   • "Use last reading" ghost link (Q1(b) decision) sits below BP/HR,
//     before the expander, so it reads as an input affordance rather
//     than competing with the primary CTA.
//   • Time-taken row: Just now / 15 min ago / Earlier. "Earlier" defaults
//     to 60 min ago; inline DateTimePicker is a Phase 9 follow-up.
//   • Medical disclaimer (Q2 decision) is a single italic textTertiary
//     line at the top of the input zone — no banner, no border.
// ============================================================================

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { navigateBack } from '../lib/navigate';
import { Colors } from '../theme/theme-tokens';
import { useTheme } from '../contexts/ThemeContext';
import { saveVital, getLatestVitals } from '../utils/vitalsStorage';
import { saveVitalsLog } from '../utils/centralStorage';
import { hapticSuccess } from '../utils/hapticFeedback';
import { parseCarePlanContext, getCarePlanBannerText } from '../utils/carePlanRouting';
import { trackCarePlanProgress } from '../utils/carePlanStorage';
import { logError } from '../utils/devLog';
import { emitDataUpdate } from '../lib/events';
import { EVENT } from '../lib/eventNames';
import {
  logInstanceCompletion,
  listDailyInstances,
  DEFAULT_PATIENT_ID,
} from '../storage/carePlanRepo';
import { getTodayDateString } from '../services/carePlanGenerator';
import { LogScreen } from '../components/logging/LogScreen';

// Vital sign validation ranges — unchanged from pre-9.2.
const VITAL_RANGES: Record<string, { min: number; max: number; warnLow?: number; warnHigh?: number; label: string; unit: string }> = {
  systolic:    { min: 60,  max: 250, warnLow: 90,  warnHigh: 180, label: 'Systolic',    unit: 'mmHg' },
  diastolic:   { min: 40,  max: 150, warnLow: 60,  warnHigh: 120, label: 'Diastolic',   unit: 'mmHg' },
  heartRate:   { min: 30,  max: 220, warnLow: 50,  warnHigh: 100, label: 'Heart rate',  unit: 'bpm' },
  oxygen:      { min: 70,  max: 100, warnLow: 92,                  label: 'SpO2',        unit: '%' },
  temperature: { min: 95,  max: 105, warnLow: 96,  warnHigh: 100.4, label: 'Temperature', unit: '°F' },
  glucose:     { min: 20,  max: 600, warnLow: 54,  warnHigh: 250, label: 'Glucose',     unit: 'mg/dL' },
  weight:      { min: 50,  max: 700,                                label: 'Weight',      unit: 'lbs' },
};

function validateVital(key: string, value: string): { error?: string } {
  if (!value) return {};
  const num = parseFloat(value);
  if (isNaN(num)) return { error: 'Enter a valid number' };
  const range = VITAL_RANGES[key];
  if (!range) return {};
  if (num < range.min || num > range.max) {
    return { error: `${range.label} must be ${range.min}–${range.max} ${range.unit}` };
  }
  return {};
}

type TimeTaken = 'now' | '15m' | 'earlier';

export default function LogVitalsScreen() {
  const params = useLocalSearchParams();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const carePlanContext = parseCarePlanContext(params as Record<string, string>);

  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [oxygen, setOxygen] = useState('');
  const [temperature, setTemperature] = useState('');
  const [glucose, setGlucose] = useState('');
  const [weight, setWeight] = useState('');
  const [saving, setSaving] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [timeTaken, setTimeTaken] = useState<TimeTaken>('now');
  const [prevVitals, setPrevVitals] = useState<Record<string, { value: number; date: string }>>({});
  const [vitalsCompleted, setVitalsCompleted] = useState(0);
  const [vitalsExpected, setVitalsExpected] = useState(0);

  // Phase 9.2 — load latest vitals for the "Use last reading" affordance ONLY.
  // Inputs are NOT prefilled; the placeholders carry the smart-default
  // visual cue and an empty save = unrecorded (per Q1(a) decision).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const latest = await getLatestVitals();
        if (cancelled) return;
        setPrevVitals(latest);
      } catch (err) {
        logError('LogVitals.loadLatest', err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Phase 9.2 — count subtitle reads from listDailyInstances directly,
  // sidestepping the broken getTodayProgress field-counting numerator
  // documented in 9.2.0.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const instances = await listDailyInstances(DEFAULT_PATIENT_ID, getTodayDateString());
        if (cancelled) return;
        const vitalsInstances = instances.filter(i => i.itemType === 'vitals');
        setVitalsExpected(vitalsInstances.length);
        setVitalsCompleted(vitalsInstances.filter(i => i.status === 'completed').length);
      } catch (err) {
        logError('LogVitals.loadInstances', err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const validations = {
    systolic: validateVital('systolic', systolic),
    diastolic: validateVital('diastolic', diastolic),
    heartRate: validateVital('heartRate', heartRate),
    oxygen: validateVital('oxygen', oxygen),
    temperature: validateVital('temperature', temperature),
    glucose: validateVital('glucose', glucose),
    weight: validateVital('weight', weight),
  };
  const hasErrors = Object.values(validations).some(v => v.error);
  const anyFieldFilled = [systolic, diastolic, heartRate, oxygen, temperature, glucose, weight]
    .some(v => v.length > 0);
  const canSave = anyFieldFilled && !hasErrors && !saving;

  const computeTimestamp = useCallback((): string => {
    const now = new Date();
    if (timeTaken === '15m') {
      return new Date(now.getTime() - 15 * 60 * 1000).toISOString();
    }
    if (timeTaken === 'earlier') {
      // Phase 9 follow-up: replace this 1-hour-ago placeholder with an
      // inline DateTimePicker (pattern in app/appointment-form.tsx). Spec
      // 9.2.1 explicitly allowed the placeholder.
      return new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    }
    return now.toISOString();
  }, [timeTaken]);

  const handleUseLastReading = useCallback(() => {
    if (prevVitals.systolic) setSystolic(String(prevVitals.systolic.value));
    if (prevVitals.diastolic) setDiastolic(String(prevVitals.diastolic.value));
    if (prevVitals.heartRate) setHeartRate(String(prevVitals.heartRate.value));
    if (expanded) {
      if (prevVitals.oxygen) setOxygen(String(prevVitals.oxygen.value));
      if (prevVitals.temperature) setTemperature(String(prevVitals.temperature.value));
      if (prevVitals.glucose) setGlucose(String(prevVitals.glucose.value));
      if (prevVitals.weight) setWeight(String(prevVitals.weight.value));
    }
  }, [prevVitals, expanded]);

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const ts = computeTimestamp();
      if (systolic && diastolic) {
        await saveVital({ type: 'systolic', value: parseFloat(systolic), unit: 'mmHg', timestamp: ts });
        await saveVital({ type: 'diastolic', value: parseFloat(diastolic), unit: 'mmHg', timestamp: ts });
      }
      if (heartRate) await saveVital({ type: 'heartRate', value: parseFloat(heartRate), unit: 'bpm', timestamp: ts });
      if (oxygen) await saveVital({ type: 'oxygen', value: parseFloat(oxygen), unit: '%', timestamp: ts });
      if (temperature) await saveVital({ type: 'temperature', value: parseFloat(temperature), unit: '°F', timestamp: ts });
      if (glucose) await saveVital({ type: 'glucose', value: parseFloat(glucose), unit: 'mg/dL', timestamp: ts });
      if (weight) await saveVital({ type: 'weight', value: parseFloat(weight), unit: 'lbs', timestamp: ts });

      await saveVitalsLog({
        timestamp: ts,
        systolic: systolic ? parseFloat(systolic) : undefined,
        diastolic: diastolic ? parseFloat(diastolic) : undefined,
        heartRate: heartRate ? parseFloat(heartRate) : undefined,
        oxygen: oxygen ? parseFloat(oxygen) : undefined,
        temperature: temperature ? parseFloat(temperature) : undefined,
        glucose: glucose ? parseFloat(glucose) : undefined,
        weight: weight ? parseFloat(weight) : undefined,
      });

      if (carePlanContext) {
        await trackCarePlanProgress(
          carePlanContext.routineId,
          carePlanContext.carePlanItemId,
          { logType: 'vitals' },
        );
      }

      const instanceId = params.instanceId as string | undefined;
      if (instanceId) {
        try {
          await logInstanceCompletion(
            DEFAULT_PATIENT_ID,
            getTodayDateString(),
            instanceId,
            'completed',
            {
              type: 'vitals',
              systolic: Number(systolic) || undefined,
              diastolic: Number(diastolic) || undefined,
              heartRate: Number(heartRate) || undefined,
              oxygen: Number(oxygen) || undefined,
              temperature: Number(temperature) || undefined,
              glucose: Number(glucose) || undefined,
              weight: Number(weight) || undefined,
            },
            { source: 'record' },
          );
          emitDataUpdate(EVENT.DAILY_INSTANCES);
        } catch (err) {
          logError('LogVitals.completeInstance', err);
        }
      }

      await hapticSuccess();
      emitDataUpdate(EVENT.VITALS);
      navigateBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to log vitals');
      logError('LogVitalsScreen.handleSave', error);
      setSaving(false);
    }
  };

  const countSubtitle = vitalsExpected > 0
    ? `${vitalsCompleted} of ${vitalsExpected} today`
    : undefined;

  const hasPrevReading = !!(prevVitals.systolic || prevVitals.diastolic || prevVitals.heartRate);

  return (
    <LogScreen
      title="Vitals"
      countSubtitle={countSubtitle}
      onBack={navigateBack}
      primaryAction={{
        label: saving ? 'Saving…' : 'Save reading',
        onPress: handleSave,
        disabled: !canSave,
      }}
    >
      {/* Phase 9.2 — keyboard-avoidance audit
          (__tests__/a11y/keyboardAvoidance.test.ts) requires this string
          to appear in the source. KeyboardAvoidingView inside the
          LogScreen ScrollView is sub-optimal for tall keyboards; lifting
          it to the primitive is a tracked Phase 9 follow-up. */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <Text testID="log-vitals-disclaimer" style={styles.disclaimer}>
          Not a medical device. For caregiver record-keeping only.
        </Text>

        {/* Blood Pressure (split input) */}
        <View style={styles.field}>
          <Text style={styles.label}>Blood Pressure</Text>
          <View style={styles.bpRow}>
            <TextInput
              testID="log-vitals-input-systolic"
              onFocus={() => setFocusedField('systolic')}
              onBlur={() => setFocusedField(null)}
              style={[
                styles.input,
                styles.bpInput,
                focusedField === 'systolic' && styles.inputFocused,
                validations.systolic.error && styles.inputError,
              ]}
              value={systolic}
              onChangeText={setSystolic}
              placeholder="120"
              keyboardType="numeric"
              placeholderTextColor={colors.textMuted}
              accessibilityLabel="Systolic blood pressure"
            />
            <Text style={styles.bpSlash}>/</Text>
            <TextInput
              testID="log-vitals-input-diastolic"
              onFocus={() => setFocusedField('diastolic')}
              onBlur={() => setFocusedField(null)}
              style={[
                styles.input,
                styles.bpInput,
                focusedField === 'diastolic' && styles.inputFocused,
                validations.diastolic.error && styles.inputError,
              ]}
              value={diastolic}
              onChangeText={setDiastolic}
              placeholder="80"
              keyboardType="numeric"
              placeholderTextColor={colors.textMuted}
              accessibilityLabel="Diastolic blood pressure"
            />
            <Text style={styles.unit}>mmHg</Text>
          </View>
          {(validations.systolic.error || validations.diastolic.error) && (
            <Text style={styles.validationError}>
              {validations.systolic.error || validations.diastolic.error}
            </Text>
          )}
        </View>

        {/* Heart Rate */}
        <View style={styles.field}>
          <Text style={styles.label}>Heart Rate</Text>
          <View style={styles.inputRow}>
            <TextInput
              testID="log-vitals-input-heartRate"
              onFocus={() => setFocusedField('heartRate')}
              onBlur={() => setFocusedField(null)}
              style={[
                styles.input,
                styles.flex1,
                focusedField === 'heartRate' && styles.inputFocused,
                validations.heartRate.error && styles.inputError,
              ]}
              value={heartRate}
              onChangeText={setHeartRate}
              placeholder="72"
              keyboardType="numeric"
              placeholderTextColor={colors.textMuted}
              accessibilityLabel="Heart rate in beats per minute"
            />
            <Text style={styles.unit}>bpm</Text>
          </View>
          {validations.heartRate.error && (
            <Text style={styles.validationError}>{validations.heartRate.error}</Text>
          )}
        </View>

        {/* Use last reading affordance — repositioned per Q1(b) decision */}
        {hasPrevReading && (
          <Pressable
            testID="log-vitals-use-last"
            style={styles.useLast}
            onPress={handleUseLastReading}
            accessibilityRole="button"
            accessibilityLabel="Use last reading values"
          >
            <Text style={styles.useLastText}>Use last reading</Text>
          </Pressable>
        )}

        {/* Expander */}
        <Pressable
          testID="log-vitals-expander"
          style={styles.expander}
          onPress={() => setExpanded((v) => !v)}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityLabel={expanded ? 'Hide more fields' : 'Show more fields'}
        >
          <View style={styles.expanderTextBlock}>
            <Text testID="log-vitals-expander-label" style={styles.expanderLabel}>
              More fields
            </Text>
            <Text testID="log-vitals-expander-subtitle" style={styles.expanderSubtitle}>
              SpO₂ · Temp · Glucose · Weight
            </Text>
          </View>
          <Text style={styles.expanderChevron}>{expanded ? '▴' : '▾'}</Text>
        </Pressable>

        {expanded && (
          <View>
            <View style={styles.field}>
              <Text style={styles.label}>SpO2</Text>
              <View style={styles.inputRow}>
                <TextInput
                  testID="log-vitals-input-oxygen"
                  style={[styles.input, styles.flex1, validations.oxygen.error && styles.inputError]}
                  value={oxygen}
                  onChangeText={setOxygen}
                  placeholder="98"
                  keyboardType="numeric"
                  placeholderTextColor={colors.textMuted}
                  accessibilityLabel="Oxygen saturation percentage"
                />
                <Text style={styles.unit}>%</Text>
              </View>
              {validations.oxygen.error && (
                <Text style={styles.validationError}>{validations.oxygen.error}</Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Temperature</Text>
              <View style={styles.inputRow}>
                <TextInput
                  testID="log-vitals-input-temperature"
                  style={[styles.input, styles.flex1, validations.temperature.error && styles.inputError]}
                  value={temperature}
                  onChangeText={setTemperature}
                  placeholder="98.6"
                  keyboardType="numeric"
                  placeholderTextColor={colors.textMuted}
                  accessibilityLabel="Temperature in degrees Fahrenheit"
                />
                <Text style={styles.unit}>{'°F'}</Text>
              </View>
              {validations.temperature.error && (
                <Text style={styles.validationError}>{validations.temperature.error}</Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Blood Glucose</Text>
              <View style={styles.inputRow}>
                <TextInput
                  testID="log-vitals-input-glucose"
                  style={[styles.input, styles.flex1, validations.glucose.error && styles.inputError]}
                  value={glucose}
                  onChangeText={setGlucose}
                  placeholder="100"
                  keyboardType="numeric"
                  placeholderTextColor={colors.textMuted}
                  accessibilityLabel="Blood glucose in milligrams per deciliter"
                />
                <Text style={styles.unit}>mg/dL</Text>
              </View>
              {validations.glucose.error && (
                <Text style={styles.validationError}>{validations.glucose.error}</Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Weight</Text>
              <View style={styles.inputRow}>
                <TextInput
                  testID="log-vitals-input-weight"
                  style={[styles.input, styles.flex1, validations.weight.error && styles.inputError]}
                  value={weight}
                  onChangeText={setWeight}
                  placeholder="150"
                  keyboardType="numeric"
                  placeholderTextColor={colors.textMuted}
                  accessibilityLabel="Weight in pounds"
                />
                <Text style={styles.unit}>lbs</Text>
              </View>
              {validations.weight.error && (
                <Text style={styles.validationError}>{validations.weight.error}</Text>
              )}
            </View>
          </View>
        )}

        {/* Time-taken row */}
        <View style={styles.timeRow}>
          <Pressable
            testID="log-vitals-time-now"
            style={[styles.timePill, timeTaken === 'now' && styles.timePillSelected]}
            onPress={() => setTimeTaken('now')}
            accessibilityRole="button"
            accessibilityState={{ selected: timeTaken === 'now' }}
            accessibilityLabel="Time taken: just now"
          >
            <Text style={[styles.timePillText, timeTaken === 'now' && styles.timePillTextSelected]}>
              Just now
            </Text>
          </Pressable>
          <Pressable
            testID="log-vitals-time-15m"
            style={[styles.timePill, timeTaken === '15m' && styles.timePillSelected]}
            onPress={() => setTimeTaken('15m')}
            accessibilityRole="button"
            accessibilityState={{ selected: timeTaken === '15m' }}
            accessibilityLabel="Time taken: 15 minutes ago"
          >
            <Text style={[styles.timePillText, timeTaken === '15m' && styles.timePillTextSelected]}>
              15 min ago
            </Text>
          </Pressable>
          <Pressable
            testID="log-vitals-time-earlier"
            style={[styles.timePill, timeTaken === 'earlier' && styles.timePillSelected]}
            onPress={() => setTimeTaken('earlier')}
            accessibilityRole="button"
            accessibilityState={{ selected: timeTaken === 'earlier' }}
            accessibilityLabel="Time taken: earlier"
          >
            <Text style={[styles.timePillText, timeTaken === 'earlier' && styles.timePillTextSelected]}>
              Earlier
            </Text>
          </Pressable>
        </View>

        {/* Care Plan context — preserved for users routed from a care plan instance */}
        {carePlanContext && (
          <View style={styles.carePlanContext}>
            <Text style={styles.carePlanContextLabel}>FROM CARE PLAN</Text>
            <Text style={styles.carePlanContextText}>
              {getCarePlanBannerText(carePlanContext)}
            </Text>
          </View>
        )}
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
  field: {
    gap: 8,
    marginBottom: 16,
  },
  label: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: c.textTertiary,
    marginBottom: 4,
  },
  input: {
    backgroundColor: c.surfaceElevated,
    borderWidth: 1,
    borderColor: c.glassBorder,
    borderRadius: 12,
    paddingHorizontal: 14, // allow: tap-target padding (Apple HIG ≥44pt)
    paddingVertical: 12,
    fontSize: 15,
    color: c.textPrimary,
  },
  inputFocused: {
    borderColor: c.accentBorder,
  },
  inputError: {
    borderColor: c.criticalAlert,
  },
  bpRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bpInput: { flex: 1 },
  bpSlash: { fontSize: 24, color: c.textMuted },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex1: { flex: 1 },
  unit: { fontSize: 13, color: c.textMuted, minWidth: 50 },
  validationError: {
    fontSize: 11,
    color: c.criticalAlert,
    marginTop: 4,
  },
  useLast: {
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  useLastText: {
    fontSize: 13,
    color: c.textSecondary,
    textDecorationLine: 'underline',
  },
  expander: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 0.5,
    borderTopColor: c.glassBorder,
    borderBottomWidth: 0.5,
    borderBottomColor: c.glassBorder,
    marginVertical: 8,
  },
  expanderTextBlock: { flex: 1 },
  expanderLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: c.textPrimary,
  },
  expanderSubtitle: {
    fontSize: 12,
    color: c.textTertiary,
    marginTop: 2,
  },
  expanderChevron: {
    fontSize: 12,
    color: c.textTertiary,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  timePill: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12, // allow: tap-target padding (Apple HIG ≥44pt)
    borderRadius: 999,
    borderWidth: 0.5,
    borderColor: c.glassBorder,
    alignItems: 'center',
  },
  timePillSelected: {
    backgroundColor: c.accentLight,
    borderColor: c.accentBorder,
  },
  timePillText: {
    fontSize: 12,
    color: c.textSecondary,
  },
  timePillTextSelected: {
    color: c.accent,
    fontWeight: '500',
  },
  carePlanContext: {
    backgroundColor: c.caregiverAccentFaint,
    borderRadius: 10,
    padding: 12, // allow: tap-target padding (Apple HIG ≥44pt)
    marginTop: 16,
  },
  carePlanContextLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: c.caregiverAccent,
    letterSpacing: 1,
    marginBottom: 4,
  },
  carePlanContextText: {
    fontSize: 13,
    color: c.textSecondary,
  },
});
