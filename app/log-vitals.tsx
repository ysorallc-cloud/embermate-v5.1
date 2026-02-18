// Functional vitals logging
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '../theme/theme-tokens';
import { saveVital } from '../utils/vitalsStorage';
import { saveVitalsLog } from '../utils/centralStorage';
import { hapticSuccess } from '../utils/hapticFeedback';
import { getTodayProgress, TodayProgress } from '../utils/rhythmStorage';
import { parseCarePlanContext, getCarePlanBannerText, CarePlanNavigationContext } from '../utils/carePlanRouting';
import { trackCarePlanProgress } from '../utils/carePlanStorage';
import { logError } from '../utils/devLog';
import { emitDataUpdate } from '../lib/events';

export default function LogVitalsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Parse CarePlan context from navigation params
  const carePlanContext = parseCarePlanContext(params as Record<string, string>);
  const isFromCarePlan = carePlanContext !== null;

  // Prepopulate with typical values - user can adjust if needed
  const [systolic, setSystolic] = useState('120');
  const [diastolic, setDiastolic] = useState('80');
  const [heartRate, setHeartRate] = useState('');
  const [oxygen, setOxygen] = useState('');
  const [temperature, setTemperature] = useState('');
  const [glucose, setGlucose] = useState('');
  const [weight, setWeight] = useState('');
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<TodayProgress | null>(null);

  // Load rhythm progress on mount
  React.useEffect(() => {
    const loadProgress = async () => {
      const progressData = await getTodayProgress();
      setProgress(progressData);
    };
    loadProgress();
  }, []);

  const handleSave = async () => {
    // Allow saving with any values (prepopulated or entered)
    setSaving(true);
    try {
      const now = new Date();

      // Save to vitalsStorage (for detailed vitals history)
      if (systolic && diastolic) {
        await saveVital({ type: 'systolic', value: parseFloat(systolic), unit: 'mmHg', timestamp: now.toISOString() });
        await saveVital({ type: 'diastolic', value: parseFloat(diastolic), unit: 'mmHg', timestamp: now.toISOString() });
      }
      if (heartRate) await saveVital({ type: 'heartRate', value: parseFloat(heartRate), unit: 'bpm', timestamp: now.toISOString() });
      if (oxygen) await saveVital({ type: 'oxygen', value: parseFloat(oxygen), unit: '%', timestamp: now.toISOString() });
      if (temperature) await saveVital({ type: 'temperature', value: parseFloat(temperature), unit: '°F', timestamp: now.toISOString() });
      if (glucose) await saveVital({ type: 'glucose', value: parseFloat(glucose), unit: 'mg/dL', timestamp: now.toISOString() });
      if (weight) await saveVital({ type: 'weight', value: parseFloat(weight), unit: 'lbs', timestamp: now.toISOString() });

      // Also save to centralStorage for Now page sync
      await saveVitalsLog({
        timestamp: now.toISOString(),
        systolic: systolic ? parseFloat(systolic) : undefined,
        diastolic: diastolic ? parseFloat(diastolic) : undefined,
        heartRate: heartRate ? parseFloat(heartRate) : undefined,
        oxygen: oxygen ? parseFloat(oxygen) : undefined,
        temperature: temperature ? parseFloat(temperature) : undefined,
        glucose: glucose ? parseFloat(glucose) : undefined,
        weight: weight ? parseFloat(weight) : undefined,
      });

      // Track CarePlan progress if navigated from CarePlan
      if (carePlanContext) {
        await trackCarePlanProgress(
          carePlanContext.routineId,
          carePlanContext.carePlanItemId,
          { logType: 'vitals' }
        );
      }

      await hapticSuccess();
      emitDataUpdate('vitals');
      router.back();
    } catch (error) {
      Alert.alert('Error', 'Failed to log vitals');
      logError('LogVitalsScreen.handleSave', error);
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]} style={styles.gradient}>
        <ScrollView style={styles.scrollView}>
          <View style={styles.content}>
            <View style={styles.header}>
              <TouchableOpacity style={styles.backButton} onPress={() => router.back()} accessibilityLabel="Go back" accessibilityRole="button">
                <Text style={styles.backText}>← Back</Text>
              </TouchableOpacity>
              <Text style={styles.icon}>❤️</Text>
              <Text style={styles.title}>Log Vitals</Text>
              <Text style={styles.subtitle}>Track blood pressure, glucose, weight, and more</Text>
            </View>

            {/* CarePlan context banner */}
            {isFromCarePlan && carePlanContext && (
              <View style={[styles.contextBanner, styles.carePlanBanner]}>
                <Text style={styles.carePlanBannerLabel}>FROM CARE PLAN</Text>
                <Text style={styles.contextText}>
                  {getCarePlanBannerText(carePlanContext)}
                </Text>
                {carePlanContext.completed !== undefined && carePlanContext.targetCount !== undefined && (
                  <Text style={styles.progressText}>
                    {carePlanContext.completed} of {carePlanContext.targetCount} logged today
                  </Text>
                )}
              </View>
            )}

            {/* Rhythm context banner (fallback when not from CarePlan) */}
            {!isFromCarePlan && progress && progress.vitals.expected > 0 && (
              <View style={styles.contextBanner}>
                <Text style={styles.contextText}>
                  {progress.vitals.completed} of {progress.vitals.expected} vitals checks logged today
                </Text>
              </View>
            )}

            <View style={styles.form}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Blood Pressure</Text>
                <View style={styles.bpRow}>
                  <TextInput style={[styles.input, styles.bpInput]} value={systolic} onChangeText={setSystolic} placeholder="120" keyboardType="numeric" placeholderTextColor={Colors.textMuted} accessibilityLabel="Systolic blood pressure" />
                  <Text style={styles.bpSlash}>/</Text>
                  <TextInput style={[styles.input, styles.bpInput]} value={diastolic} onChangeText={setDiastolic} placeholder="80" keyboardType="numeric" placeholderTextColor={Colors.textMuted} accessibilityLabel="Diastolic blood pressure" />
                  <Text style={styles.unit}>mmHg</Text>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Heart Rate</Text>
                <View style={styles.inputRow}>
                  <TextInput style={[styles.input, styles.flex1]} value={heartRate} onChangeText={setHeartRate} placeholder="72" keyboardType="numeric" placeholderTextColor={Colors.textMuted} accessibilityLabel="Heart rate in beats per minute" />
                  <Text style={styles.unit}>bpm</Text>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>SpO2</Text>
                <View style={styles.inputRow}>
                  <TextInput style={[styles.input, styles.flex1]} value={oxygen} onChangeText={setOxygen} placeholder="98" keyboardType="numeric" placeholderTextColor={Colors.textMuted} accessibilityLabel="Oxygen saturation percentage" />
                  <Text style={styles.unit}>%</Text>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Temperature</Text>
                <View style={styles.inputRow}>
                  <TextInput style={[styles.input, styles.flex1]} value={temperature} onChangeText={setTemperature} placeholder="98.6" keyboardType="numeric" placeholderTextColor={Colors.textMuted} accessibilityLabel="Temperature in degrees Fahrenheit" />
                  <Text style={styles.unit}>{'\u00B0'}F</Text>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Blood Glucose</Text>
                <View style={styles.inputRow}>
                  <TextInput style={[styles.input, styles.flex1]} value={glucose} onChangeText={setGlucose} placeholder="100" keyboardType="numeric" placeholderTextColor={Colors.textMuted} accessibilityLabel="Blood glucose in milligrams per deciliter" />
                  <Text style={styles.unit}>mg/dL</Text>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Weight</Text>
                <View style={styles.inputRow}>
                  <TextInput style={[styles.input, styles.flex1]} value={weight} onChangeText={setWeight} placeholder="150" keyboardType="numeric" placeholderTextColor={Colors.textMuted} accessibilityLabel="Weight in pounds" />
                  <Text style={styles.unit}>lbs</Text>
                </View>
              </View>

              <TouchableOpacity style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={handleSave} disabled={saving} accessibilityLabel={saving ? 'Saving vitals' : 'Log vitals'} accessibilityHint="Saves blood pressure, glucose, and weight readings" accessibilityRole="button" accessibilityState={{ disabled: saving }}>
                <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Log Vitals'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  gradient: { flex: 1 },
  scrollView: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  contextBanner: {
    backgroundColor: 'rgba(74, 222, 128, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.15)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 20,
  },
  carePlanBanner: {
    backgroundColor: Colors.purpleFaint,
    borderColor: Colors.purpleWash,
  },
  carePlanBannerLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.violetBright,
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 4,
  },
  contextText: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  progressText: {
    fontSize: 12,
    color: Colors.textHalf,
    textAlign: 'center',
    marginTop: 4,
  },
  header: { alignItems: 'center', marginBottom: 32 },
  backButton: { alignSelf: 'flex-start', marginBottom: 16 },
  backText: { fontSize: 14, color: Colors.accent, fontWeight: '500' },
  icon: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '300', color: Colors.textPrimary, marginBottom: 8 },
  subtitle: { fontSize: 13, color: Colors.textMuted, textAlign: 'center' },
  form: { gap: 24 },
  formGroup: { gap: 8 },
  label: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary },
  input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: Colors.textPrimary },
  bpRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bpInput: { flex: 1 },
  bpSlash: { fontSize: 24, color: Colors.textMuted },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex1: { flex: 1 },
  unit: { fontSize: 13, color: Colors.textMuted, minWidth: 50 },
  saveButton: { backgroundColor: Colors.accent, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 12 },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: Colors.textPrimary, fontSize: 15, fontWeight: '600' },
});
