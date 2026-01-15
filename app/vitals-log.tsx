// ============================================================================
// VITALS LOG SCREEN
// Quick numeric entry for vital signs (Step 2: Confirm)
// BP, HR, O2, glucose, temp, weight
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius } from './_theme/theme-tokens';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hapticSuccess } from '../utils/hapticFeedback';

interface VitalLog {
  id: string;
  timestamp: string;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  oxygenSaturation?: number;
  glucose?: number;
  temperature?: number;
  weight?: number;
  notes?: string;
}

const VITALS_KEY = '@EmberMate:vitals';
const VITALS_REMINDER_KEY = '@EmberMate:vitals_reminder_enabled';

export default function VitalsLogScreen() {
  const router = useRouter();

  const [bpSystolic, setBpSystolic] = useState('');
  const [bpDiastolic, setBpDiastolic] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [o2Sat, setO2Sat] = useState('');
  const [glucose, setGlucose] = useState('');
  const [temperature, setTemperature] = useState('');
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(false);

  useEffect(() => {
    loadReminderSetting();
  }, []);

  const loadReminderSetting = async () => {
    try {
      const saved = await AsyncStorage.getItem(VITALS_REMINDER_KEY);
      if (saved !== null) {
        setReminderEnabled(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading reminder setting:', error);
    }
  };

  const handleReminderToggle = async (value: boolean) => {
    try {
      setReminderEnabled(value);
      await AsyncStorage.setItem(VITALS_REMINDER_KEY, JSON.stringify(value));
    } catch (error) {
      console.error('Error saving reminder setting:', error);
    }
  };

  const handleSave = async () => {
    // Check if at least one vital is entered
    const hasData = bpSystolic || bpDiastolic || heartRate || o2Sat || glucose || temperature || weight;
    
    if (!hasData) {
      Alert.alert('No Data', 'Please enter at least one vital sign');
      return;
    }

    try {
      const vitalLog: VitalLog = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        bloodPressureSystolic: bpSystolic ? parseInt(bpSystolic) : undefined,
        bloodPressureDiastolic: bpDiastolic ? parseInt(bpDiastolic) : undefined,
        heartRate: heartRate ? parseInt(heartRate) : undefined,
        oxygenSaturation: o2Sat ? parseInt(o2Sat) : undefined,
        glucose: glucose ? parseInt(glucose) : undefined,
        temperature: temperature ? parseFloat(temperature) : undefined,
        weight: weight ? parseFloat(weight) : undefined,
        notes: notes.trim() || undefined,
      };

      // Save to storage
      const existingData = await AsyncStorage.getItem(VITALS_KEY);
      const vitals: VitalLog[] = existingData ? JSON.parse(existingData) : [];
      vitals.unshift(vitalLog);
      
      // Keep last 100 entries
      const trimmedVitals = vitals.slice(0, 100);
      await AsyncStorage.setItem(VITALS_KEY, JSON.stringify(trimmedVitals));

      await hapticSuccess();
      
      Alert.alert(
        'Vitals Logged',
        'Vital signs have been recorded',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Error saving vitals:', error);
      Alert.alert('Error', 'Failed to save vitals');
    }
  };

  const handleClear = () => {
    setBpSystolic('');
    setBpDiastolic('');
    setHeartRate('');
    setO2Sat('');
    setGlucose('');
    setTemperature('');
    setWeight('');
    setNotes('');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerLabel}>LOG VITALS</Text>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Log Vital Signs</Text>
          <Text style={styles.subtitle}>Enter current readings (skip any not taken)</Text>

          {/* Blood Pressure */}
          <View style={styles.vitalCard}>
            <View style={styles.vitalHeader}>
              <Ionicons name="heart" size={20} color={Colors.error} />
              <Text style={styles.vitalLabel}>Blood Pressure</Text>
            </View>
            <View style={styles.bpInputRow}>
              <View style={styles.bpInput}>
                <TextInput
                  style={styles.input}
                  value={bpSystolic}
                  onChangeText={setBpSystolic}
                  placeholder="120"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numeric"
                  maxLength={3}
                />
                <Text style={styles.inputLabel}>Systolic</Text>
              </View>
              <Text style={styles.bpSlash}>/</Text>
              <View style={styles.bpInput}>
                <TextInput
                  style={styles.input}
                  value={bpDiastolic}
                  onChangeText={setBpDiastolic}
                  placeholder="80"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numeric"
                  maxLength={3}
                />
                <Text style={styles.inputLabel}>Diastolic</Text>
              </View>
            </View>
            <Text style={styles.helpText}>mmHg</Text>
          </View>

          {/* Heart Rate */}
          <View style={styles.vitalCard}>
            <View style={styles.vitalHeader}>
              <Ionicons name="pulse" size={20} color={Colors.error} />
              <Text style={styles.vitalLabel}>Heart Rate</Text>
            </View>
            <TextInput
              style={styles.input}
              value={heartRate}
              onChangeText={setHeartRate}
              placeholder="72"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
              maxLength={3}
            />
            <Text style={styles.helpText}>bpm</Text>
          </View>

          {/* Oxygen Saturation */}
          <View style={styles.vitalCard}>
            <View style={styles.vitalHeader}>
              <Ionicons name="fitness" size={20} color={Colors.accent} />
              <Text style={styles.vitalLabel}>Oxygen Saturation (SpO2)</Text>
            </View>
            <TextInput
              style={styles.input}
              value={o2Sat}
              onChangeText={setO2Sat}
              placeholder="98"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
              maxLength={3}
            />
            <Text style={styles.helpText}>%</Text>
          </View>

          {/* Glucose */}
          <View style={styles.vitalCard}>
            <View style={styles.vitalHeader}>
              <Ionicons name="water" size={20} color={Colors.warning} />
              <Text style={styles.vitalLabel}>Blood Glucose</Text>
            </View>
            <TextInput
              style={styles.input}
              value={glucose}
              onChangeText={setGlucose}
              placeholder="100"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
              maxLength={3}
            />
            <Text style={styles.helpText}>mg/dL</Text>
          </View>

          {/* Temperature */}
          <View style={styles.vitalCard}>
            <View style={styles.vitalHeader}>
              <Ionicons name="thermometer" size={20} color={Colors.error} />
              <Text style={styles.vitalLabel}>Temperature</Text>
            </View>
            <TextInput
              style={styles.input}
              value={temperature}
              onChangeText={setTemperature}
              placeholder="98.6"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
              maxLength={5}
            />
            <Text style={styles.helpText}>°F</Text>
          </View>

          {/* Weight */}
          <View style={styles.vitalCard}>
            <View style={styles.vitalHeader}>
              <Ionicons name="scale" size={20} color={Colors.textSecondary} />
              <Text style={styles.vitalLabel}>Weight</Text>
            </View>
            <TextInput
              style={styles.input}
              value={weight}
              onChangeText={setWeight}
              placeholder="150.5"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
              maxLength={6}
            />
            <Text style={styles.helpText}>lbs</Text>
          </View>

          {/* Notes */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Notes (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Any observations..."
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={2}
            />
          </View>

          {/* Daily Reminder Toggle */}
          <View style={styles.formGroup}>
            <View style={styles.reminderRow}>
              <View style={styles.reminderInfo}>
                <Text style={styles.label}>Daily Vitals Reminder</Text>
                <Text style={styles.helpText}>
                  Remind me to log vitals each morning at 9:00 AM
                </Text>
              </View>
              <Switch
                value={reminderEnabled}
                onValueChange={handleReminderToggle}
                trackColor={{ false: Colors.textMuted, true: Colors.accent }}
                thumbColor={Colors.surface}
              />
            </View>
          </View>

          {/* Clear Button */}
          <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
            <Text style={styles.clearButtonText}>Clear All</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Platform.OS === 'android' ? 20 : 0,
    paddingBottom: Spacing.md,
  },
    backButton: {
    width: 44,
    height: 44,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: Colors.textPrimary,
  },
  headerLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 1,
    fontWeight: '600',
  },
  saveButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  saveButtonText: {
    fontSize: 16,
    color: Colors.accent,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: '300',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.xxl,
  },

  // Vital Cards
  vitalCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  vitalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  vitalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 18,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  helpText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
  },

  // Blood Pressure
  bpInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  bpInput: {
    flex: 1,
  },
  bpSlash: {
    fontSize: 24,
    color: Colors.textMuted,
    fontWeight: '300',
  },
  inputLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },

  // Form
  formGroup: {
    marginBottom: Spacing.xl,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },

  // Clear Button
  clearButton: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  clearButtonText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },

  // Reminder Toggle
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
  },
  reminderInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
});
