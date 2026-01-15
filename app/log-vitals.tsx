// Functional vitals logging
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Colors } from './_theme/theme-tokens';
import { saveVital } from '../utils/vitalsStorage';

export default function LogVitalsScreen() {
  const router = useRouter();
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [glucose, setGlucose] = useState('');
  const [weight, setWeight] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!systolic && !diastolic && !glucose && !weight) {
      Alert.alert('Required', 'Please enter at least one vital sign');
      return;
    }

    setSaving(true);
    try {
      const now = new Date();
      
      if (systolic && diastolic) {
        await saveVital({ type: 'systolic', value: parseFloat(systolic), unit: 'mmHg', timestamp: now.toISOString() });
        await saveVital({ type: 'diastolic', value: parseFloat(diastolic), unit: 'mmHg', timestamp: now.toISOString() });
      }
      if (glucose) await saveVital({ type: 'glucose', value: parseFloat(glucose), unit: 'mg/dL', timestamp: now.toISOString() });
      if (weight) await saveVital({ type: 'weight', value: parseFloat(weight), unit: 'lbs', timestamp: now.toISOString() });

      Alert.alert('Success', 'Vitals logged successfully', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (error) {
      Alert.alert('Error', 'Failed to log vitals');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]} style={styles.gradient}>
        <ScrollView style={styles.scrollView}>
          <View style={styles.content}>
            <View style={styles.header}>
              <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                <Text style={styles.backText}>← Back</Text>
              </TouchableOpacity>
              <Text style={styles.icon}>❤️</Text>
              <Text style={styles.title}>Log Vitals</Text>
              <Text style={styles.subtitle}>Track blood pressure, glucose, weight, and more</Text>
            </View>

            <View style={styles.form}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Blood Pressure</Text>
                <View style={styles.bpRow}>
                  <TextInput style={[styles.input, styles.bpInput]} value={systolic} onChangeText={setSystolic} placeholder="120" keyboardType="numeric" placeholderTextColor={Colors.textMuted} />
                  <Text style={styles.bpSlash}>/</Text>
                  <TextInput style={[styles.input, styles.bpInput]} value={diastolic} onChangeText={setDiastolic} placeholder="80" keyboardType="numeric" placeholderTextColor={Colors.textMuted} />
                  <Text style={styles.unit}>mmHg</Text>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Blood Glucose</Text>
                <View style={styles.inputRow}>
                  <TextInput style={[styles.input, styles.flex1]} value={glucose} onChangeText={setGlucose} placeholder="100" keyboardType="numeric" placeholderTextColor={Colors.textMuted} />
                  <Text style={styles.unit}>mg/dL</Text>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Weight</Text>
                <View style={styles.inputRow}>
                  <TextInput style={[styles.input, styles.flex1]} value={weight} onChangeText={setWeight} placeholder="150" keyboardType="numeric" placeholderTextColor={Colors.textMuted} />
                  <Text style={styles.unit}>lbs</Text>
                </View>
              </View>

              <TouchableOpacity style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={handleSave} disabled={saving}>
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
  saveButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});
