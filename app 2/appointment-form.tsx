// ============================================================================
// APPOINTMENT FORM SCREEN
// Add or edit appointments (Step 0: Plan)
// Accessed from appointments screen
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
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius } from './_theme/theme-tokens';
import { 
  addAppointment, 
  updateAppointment, 
  getAppointments, 
  Appointment 
} from '../utils/appointmentStorage';

export default function AppointmentFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const apptId = params.id as string | undefined;
  const isEditing = !!apptId;

  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [provider, setProvider] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isEditing) {
      loadAppointment();
    } else {
      // Set default date to today
      const today = new Date().toISOString().split('T')[0];
      setDate(today);
      setTime('09:00');
    }
  }, [apptId]);

  const loadAppointment = async () => {
    if (!apptId) return;
    try {
      const appts = await getAppointments();
      const appt = appts.find(a => a.id === apptId);
      if (appt) {
        setDate(appt.date);
        setTime(appt.time);
        setProvider(appt.provider);
        setSpecialty(appt.specialty);
        setLocation(appt.location);
        setNotes(appt.notes || '');
      }
    } catch (error) {
      console.error('Error loading appointment:', error);
    }
  };

  const handleSave = async () => {
    // Validate date
    if (!date.trim()) {
      Alert.alert('Required Field', 'Please enter an appointment date');
      return;
    }

    // Validate date format (YYYY-MM-DD)
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(date.trim())) {
      Alert.alert('Invalid Date', 'Date must be in YYYY-MM-DD format (e.g., 2025-01-15)');
      return;
    }

    // Validate date is valid
    const appointmentDate = new Date(date.trim());
    if (isNaN(appointmentDate.getTime())) {
      Alert.alert('Invalid Date', 'Please enter a valid date');
      return;
    }

    // Warn if appointment is in the past (unless editing)
    if (!isEditing) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (appointmentDate < today) {
        Alert.alert(
          'Past Date',
          'This appointment date is in the past. Do you want to continue?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Continue', onPress: () => proceedWithSave() }
          ]
        );
        return;
      }
    }

    await proceedWithSave();
  };

  const proceedWithSave = async () => {
    // Validate time
    if (!time.trim()) {
      Alert.alert('Required Field', 'Please enter appointment time');
      return;
    }

    // Validate time format (HH:MM)
    const timePattern = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timePattern.test(time.trim())) {
      Alert.alert('Invalid Time', 'Time must be in HH:MM format (e.g., 09:30, 14:00)');
      return;
    }

    // Validate provider name
    if (!provider.trim()) {
      Alert.alert('Required Field', 'Please enter the provider or doctor name');
      return;
    }

    if (provider.trim().length < 2) {
      Alert.alert('Invalid Provider', 'Provider name must be at least 2 characters');
      return;
    }

    // Validate specialty
    if (!specialty.trim()) {
      Alert.alert('Required Field', 'Please enter the specialty or appointment type');
      return;
    }

    if (specialty.trim().length < 2) {
      Alert.alert('Invalid Specialty', 'Specialty must be at least 2 characters');
      return;
    }

    try {
      const apptData: Partial<Appointment> = {
        date: date.trim(),
        time: time.trim(),
        provider: provider.trim(),
        specialty: specialty.trim(),
        location: location.trim() || 'Not specified',
        notes: notes.trim(),
        completed: false,
        cancelled: false,
      };

      if (isEditing && apptId) {
        await updateAppointment(apptId, apptData);
      } else {
        await addAppointment(apptData as Omit<Appointment, 'id'>);
      }

      router.back();
    } catch (error) {
      console.error('Error saving appointment:', error);
      Alert.alert('Error', 'Failed to save appointment');
    }
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
          <Text style={styles.headerLabel}>
            {isEditing ? 'EDIT APPOINTMENT' : 'ADD APPOINTMENT'}
          </Text>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>
            {isEditing ? 'Edit Appointment' : 'Schedule Appointment'}
          </Text>

          {/* Date */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Date *</Text>
            <TextInput
              style={styles.input}
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.textMuted}
            />
            <Text style={styles.helpText}>Format: YYYY-MM-DD (e.g., 2025-01-15)</Text>
          </View>

          {/* Time */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Time *</Text>
            <TextInput
              style={styles.input}
              value={time}
              onChangeText={setTime}
              placeholder="HH:MM"
              placeholderTextColor={Colors.textMuted}
            />
            <Text style={styles.helpText}>24-hour format (e.g., 09:00, 14:30)</Text>
          </View>

          {/* Provider */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Provider Name *</Text>
            <TextInput
              style={styles.input}
              value={provider}
              onChangeText={setProvider}
              placeholder="e.g., Dr. Sarah Johnson"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="words"
            />
          </View>

          {/* Specialty */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Specialty / Type *</Text>
            <TextInput
              style={styles.input}
              value={specialty}
              onChangeText={setSpecialty}
              placeholder="e.g., Cardiology, Primary Care"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="words"
            />
          </View>

          {/* Location */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Location</Text>
            <TextInput
              style={styles.input}
              value={location}
              onChangeText={setLocation}
              placeholder="e.g., Medical Center Downtown"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="words"
            />
          </View>

          {/* Notes */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Notes (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g., Bring medication list, fasting required"
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={3}
            />
          </View>

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
    marginBottom: Spacing.xxl,
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
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  helpText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
  },
});
