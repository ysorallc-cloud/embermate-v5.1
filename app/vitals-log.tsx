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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius } from '../theme/theme-tokens';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hapticSuccess } from '../utils/hapticFeedback';
import { SimplifiedReminderCard } from '../components/SimplifiedReminderCard';
import { saveVital } from '../utils/vitalsStorage';

const VITALS_REMINDER_KEY = '@EmberMate:vitals_reminder_enabled';
const VITALS_REMINDER_TIME_KEY = '@EmberMate:vitals_reminder_time';

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
  const [reminderTime, setReminderTime] = useState('morning');

  useEffect(() => {
    loadReminderSetting();
  }, []);

  const loadReminderSetting = async () => {
    try {
      const savedEnabled = await AsyncStorage.getItem(VITALS_REMINDER_KEY);
      const savedTime = await AsyncStorage.getItem(VITALS_REMINDER_TIME_KEY);

      if (savedEnabled !== null) {
        setReminderEnabled(JSON.parse(savedEnabled));
      }
      if (savedTime !== null) {
        setReminderTime(savedTime);
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

  const handleReminderTimeChange = async (time: string) => {
    try {
      setReminderTime(time);
      await AsyncStorage.setItem(VITALS_REMINDER_TIME_KEY, time);
    } catch (error) {
      console.error('Error saving reminder time:', error);
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
      const timestamp = new Date().toISOString();
      const vitalNotes = notes.trim() || undefined;

      // Save each vital reading individually using the vitalsStorage utility
      if (bpSystolic) {
        await saveVital({
          type: 'systolic',
          value: parseInt(bpSystolic),
          timestamp,
          unit: 'mmHg',
          notes: vitalNotes,
        });
      }

      if (bpDiastolic) {
        await saveVital({
          type: 'diastolic',
          value: parseInt(bpDiastolic),
          timestamp,
          unit: 'mmHg',
          notes: vitalNotes,
        });
      }

      if (heartRate) {
        await saveVital({
          type: 'heartRate',
          value: parseInt(heartRate),
          timestamp,
          unit: 'bpm',
          notes: vitalNotes,
        });
      }

      if (o2Sat) {
        await saveVital({
          type: 'oxygen',
          value: parseInt(o2Sat),
          timestamp,
          unit: '%',
          notes: vitalNotes,
        });
      }

      if (glucose) {
        await saveVital({
          type: 'glucose',
          value: parseInt(glucose),
          timestamp,
          unit: 'mg/dL',
          notes: vitalNotes,
        });
      }

      if (temperature) {
        await saveVital({
          type: 'temperature',
          value: parseFloat(temperature),
          timestamp,
          unit: '°F',
          notes: vitalNotes,
        });
      }

      if (weight) {
        await saveVital({
          type: 'weight',
          value: parseFloat(weight),
          timestamp,
          unit: 'lbs',
          notes: vitalNotes,
        });
      }

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
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Log Vital Signs</Text>
            <Text style={styles.subtitle}>Enter current readings (skip any not taken)</Text>
          </View>

          {/* Blood Pressure Row */}
          <View style={styles.vitalRow}>
            <Text style={styles.vitalIcon}>❤️</Text>
            <Text style={styles.vitalRowLabel}>Blood Pressure</Text>
            <View style={styles.bpInputContainer}>
              <TextInput
                style={styles.bpInputField}
                value={bpSystolic}
                onChangeText={setBpSystolic}
                placeholder="120"
                placeholderTextColor={Colors.textMuted}
                keyboardType="numeric"
                maxLength={3}
              />
              <Text style={styles.bpSlash}>/</Text>
              <TextInput
                style={styles.bpInputField}
                value={bpDiastolic}
                onChangeText={setBpDiastolic}
                placeholder="80"
                placeholderTextColor={Colors.textMuted}
                keyboardType="numeric"
                maxLength={3}
              />
            </View>
            <Text style={styles.vitalUnit}>mmHg</Text>
          </View>

          {/* Heart Rate Row */}
          <View style={styles.vitalRow}>
            <Text style={styles.vitalIcon}>💓</Text>
            <Text style={styles.vitalRowLabel}>Heart Rate</Text>
            <TextInput
              style={[styles.vitalInput, { width: 70 }]}
              value={heartRate}
              onChangeText={setHeartRate}
              placeholder="—"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
              maxLength={3}
            />
            <Text style={styles.vitalUnit}>bpm</Text>
          </View>

          {/* Oxygen Saturation Row */}
          <View style={styles.vitalRow}>
            <Text style={styles.vitalIcon}>🫁</Text>
            <Text style={styles.vitalRowLabel}>SpO2</Text>
            <TextInput
              style={[styles.vitalInput, { width: 60 }]}
              value={o2Sat}
              onChangeText={setO2Sat}
              placeholder="—"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
              maxLength={3}
            />
            <Text style={styles.vitalUnit}>%</Text>
          </View>

          {/* Blood Glucose Row */}
          <View style={styles.vitalRow}>
            <Text style={styles.vitalIcon}>🩸</Text>
            <Text style={styles.vitalRowLabel}>Blood Glucose</Text>
            <TextInput
              style={[styles.vitalInput, { width: 70 }]}
              value={glucose}
              onChangeText={setGlucose}
              placeholder="—"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
              maxLength={3}
            />
            <Text style={styles.vitalUnit}>mg/dL</Text>
          </View>

          {/* Temperature Row */}
          <View style={styles.vitalRow}>
            <Text style={styles.vitalIcon}>🌡️</Text>
            <Text style={styles.vitalRowLabel}>Temperature</Text>
            <TextInput
              style={[styles.vitalInput, { width: 70 }]}
              value={temperature}
              onChangeText={setTemperature}
              placeholder="—"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
              maxLength={5}
            />
            <Text style={styles.vitalUnit}>°F</Text>
          </View>

          {/* Weight Row */}
          <View style={styles.vitalRow}>
            <Text style={styles.vitalIcon}>⚖️</Text>
            <Text style={styles.vitalRowLabel}>Weight</Text>
            <TextInput
              style={[styles.vitalInput, { width: 70 }]}
              value={weight}
              onChangeText={setWeight}
              placeholder="—"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
              maxLength={6}
            />
            <Text style={styles.vitalUnit}>lbs</Text>
          </View>

          {/* Notes Section */}
          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>NOTES (OPTIONAL)</Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="Any additional notes..."
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={2}
            />
          </View>

          {/* Simplified Reminder Card */}
          <View style={{ marginBottom: Spacing.xl }}>
            <SimplifiedReminderCard
              enabled={reminderEnabled}
              onToggle={handleReminderToggle}
              selectedTime={reminderTime}
              onTimeSelect={handleReminderTimeChange}
            />
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
  titleContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '300',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textMuted,
  },

  // Minimal Vital Rows
  vitalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  vitalIcon: {
    fontSize: 20,
    width: 32,
  },
  vitalRowLabel: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  vitalInput: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    backgroundColor: 'transparent',
    borderBottomWidth: 2,
    borderBottomColor: Colors.border,
    color: Colors.textPrimary,
    fontSize: 18,
    textAlign: 'center',
  },
  vitalUnit: {
    fontSize: 12,
    color: Colors.textMuted,
    width: 50,
    textAlign: 'right',
  },

  // Blood Pressure Specific
  bpInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bpInputField: {
    width: 50,
    paddingVertical: 8,
    paddingHorizontal: 4,
    backgroundColor: 'transparent',
    borderBottomWidth: 2,
    borderBottomColor: Colors.border,
    color: Colors.textPrimary,
    fontSize: 18,
    textAlign: 'center',
  },
  bpSlash: {
    fontSize: 18,
    color: Colors.textMuted,
    marginHorizontal: 6,
  },

  // Notes
  notesSection: {
    marginTop: 20,
    marginBottom: 16,
  },
  notesLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 1,
    fontWeight: '600',
    marginBottom: 10,
  },
  notesInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    color: Colors.textPrimary,
    fontSize: 14,
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
});
