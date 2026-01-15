// ============================================================================
// MEDICATION FORM SCREEN
// Add or edit medication schedules (Step 0: Plan)
// Accessed from medication-schedule screen
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius } from './_theme/theme-tokens';
import {
  createMedication,
  updateMedication,
  getMedications,
  Medication
} from '../utils/medicationStorage';

type TimeSlot = 'morning' | 'afternoon' | 'evening' | 'bedtime';

// Common medications database for autocomplete
const COMMON_MEDICATIONS = [
  { name: 'Amlodipine', commonDosages: ['2.5mg', '5mg', '10mg'] },
  { name: 'Aspirin', commonDosages: ['81mg', '325mg'] },
  { name: 'Atorvastatin', commonDosages: ['10mg', '20mg', '40mg', '80mg'] },
  { name: 'Acetaminophen', commonDosages: ['325mg', '500mg', '650mg'] },
  { name: 'Clopidogrel', commonDosages: ['75mg'] },
  { name: 'Furosemide', commonDosages: ['20mg', '40mg', '80mg'] },
  { name: 'Gabapentin', commonDosages: ['100mg', '300mg', '600mg'] },
  { name: 'Hydrochlorothiazide', commonDosages: ['12.5mg', '25mg', '50mg'] },
  { name: 'Ibuprofen', commonDosages: ['200mg', '400mg', '600mg', '800mg'] },
  { name: 'Insulin', commonDosages: ['10 units', '15 units', '20 units'] },
  { name: 'Levothyroxine', commonDosages: ['25mcg', '50mcg', '75mcg', '100mcg', '125mcg'] },
  { name: 'Lisinopril', commonDosages: ['5mg', '10mg', '20mg', '40mg'] },
  { name: 'Losartan', commonDosages: ['25mg', '50mg', '100mg'] },
  { name: 'Metformin', commonDosages: ['500mg', '850mg', '1000mg'] },
  { name: 'Metoprolol', commonDosages: ['25mg', '50mg', '100mg'] },
  { name: 'Omeprazole', commonDosages: ['20mg', '40mg'] },
  { name: 'Prednisone', commonDosages: ['5mg', '10mg', '20mg', '50mg'] },
  { name: 'Warfarin', commonDosages: ['1mg', '2mg', '2.5mg', '5mg', '10mg'] },
].sort((a, b) => a.name.localeCompare(b.name));

// Helper function to convert 24-hour to 12-hour format
const convertTo12Hour = (time24: string): string => {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
};

// Helper function to convert 12-hour to 24-hour format
const convertTo24Hour = (time12: string): string => {
  const match = time12.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return time12; // Return as-is if not valid format
  
  let [, hours, minutes, period] = match;
  let hour = parseInt(hours);
  
  if (period.toUpperCase() === 'PM' && hour !== 12) hour += 12;
  if (period.toUpperCase() === 'AM' && hour === 12) hour = 0;
  
  return `${hour.toString().padStart(2, '0')}:${minutes}`;
};

const TIME_SLOTS: { key: TimeSlot; label: string; defaultTime: string; displayTime: string }[] = [
  { key: 'morning', label: 'Morning', defaultTime: '08:00', displayTime: '8:00 AM' },
  { key: 'afternoon', label: 'Afternoon', defaultTime: '13:00', displayTime: '1:00 PM' },
  { key: 'evening', label: 'Evening', defaultTime: '18:00', displayTime: '6:00 PM' },
  { key: 'bedtime', label: 'Bedtime', defaultTime: '22:00', displayTime: '10:00 PM' },
];

export default function MedicationFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const medId = params.id as string | undefined;
  const isEditing = !!medId;

  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot>('morning');
  const [customTime, setCustomTime] = useState('8:00 AM');
  const [customTimeDisplay, setCustomTimeDisplay] = useState('8:00 AM');
  const [notes, setNotes] = useState('');
  const [daysSupply, setDaysSupply] = useState('30');
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderMinutesBefore, setReminderMinutesBefore] = useState(0);
  const [showMedSuggestions, setShowMedSuggestions] = useState(false);
  const [showDosageSuggestions, setShowDosageSuggestions] = useState(false);
  const [medSuggestions, setMedSuggestions] = useState<typeof COMMON_MEDICATIONS>([]);
  const [dosageSuggestions, setDosageSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (isEditing) {
      loadMedication();
    }
  }, [medId]);

  const loadMedication = async () => {
    if (!medId) return;
    try {
      const meds = await getMedications();
      const med = meds.find(m => m.id === medId);
      if (med) {
        setName(med.name);
        setDosage(med.dosage);
        const displayTime = convertTo12Hour(med.time);
        setCustomTime(med.time);
        setCustomTimeDisplay(displayTime);
        setNotes(med.notes || '');
        setDaysSupply(med.daysSupply?.toString() || '30');
        setReminderEnabled(med.reminderEnabled !== false); // Default to true
        setReminderMinutesBefore(med.reminderMinutesBefore || 0);

        // Determine time slot from time
        const timeSlot = TIME_SLOTS.find(slot => slot.defaultTime === med.time);
        if (timeSlot) {
          setSelectedTimeSlot(timeSlot.key);
        }
      }
    } catch (error) {
      console.error('Error loading medication:', error);
    }
  };

  const handleMedicationNameChange = (text: string) => {
    setName(text);

    if (text.length >= 1) {
      // Show medications that start with the text OR contain the text
      const matches = COMMON_MEDICATIONS.filter(med =>
        med.name.toLowerCase().includes(text.toLowerCase())
      );
      setMedSuggestions(matches);
      setShowMedSuggestions(matches.length > 0);
    } else {
      setShowMedSuggestions(false);
    }
  };

  const handleSelectMedication = (medication: typeof COMMON_MEDICATIONS[0]) => {
    setName(medication.name);
    setShowMedSuggestions(false);
    // Show dosage suggestions for this medication
    setDosageSuggestions(medication.commonDosages);
    setShowDosageSuggestions(true);
  };

  const handleDosageChange = (text: string) => {
    setDosage(text);
    
    // If we have dosage suggestions, filter them
    if (dosageSuggestions.length > 0) {
      const matches = dosageSuggestions.filter(d => 
        d.toLowerCase().includes(text.toLowerCase())
      );
      setShowDosageSuggestions(matches.length > 0 && text.length > 0);
    }
  };

  const handleSelectDosage = (selectedDosage: string) => {
    setDosage(selectedDosage);
    setShowDosageSuggestions(false);
  };

  const handleTimeSlotSelect = (slot: TimeSlot) => {
    setSelectedTimeSlot(slot);
    const selectedSlot = TIME_SLOTS.find(s => s.key === slot);
    if (selectedSlot) {
      setCustomTime(selectedSlot.defaultTime);
      setCustomTimeDisplay(selectedSlot.displayTime);
    }
  };

  const handleCustomTimeChange = (text: string) => {
    setCustomTimeDisplay(text);
    // Try to convert to 24-hour for storage
    const time24 = convertTo24Hour(text);
    setCustomTime(time24);
  };

  const handleSave = async () => {
    // Validate medication name
    if (!name.trim()) {
      Alert.alert('Required Field', 'Please enter a medication name');
      return;
    }

    if (name.trim().length < 2) {
      Alert.alert('Invalid Name', 'Medication name must be at least 2 characters');
      return;
    }

    // Validate dosage
    if (!dosage.trim()) {
      Alert.alert('Required Field', 'Please enter the dosage (e.g., 10mg, 500mcg)');
      return;
    }

    // Validate dosage format - should contain a number
    const dosagePattern = /\d+/;
    if (!dosagePattern.test(dosage)) {
      Alert.alert('Invalid Dosage', 'Dosage must include a number (e.g., 10mg, 500mcg)');
      return;
    }

    // Validate days supply
    const supplyDays = parseInt(daysSupply);
    if (isNaN(supplyDays) || supplyDays < 1 || supplyDays > 365) {
      Alert.alert('Invalid Supply', 'Days supply must be between 1 and 365');
      return;
    }

    // Validate time format
    if (!customTime || customTime.length === 0) {
      Alert.alert('Invalid Time', 'Please select a valid time');
      return;
    }

    try {
      const medData: Omit<Medication, 'id' | 'createdAt'> = {
        name: name.trim(),
        dosage: dosage.trim(),
        time: customTime,
        timeSlot: selectedTimeSlot,
        notes: notes.trim(),
        daysSupply: parseInt(daysSupply) || 30,
        reminderEnabled: reminderEnabled,
        reminderMinutesBefore: reminderEnabled ? reminderMinutesBefore : undefined,
        active: true,
        taken: false,
      };

      if (isEditing && medId) {
        await updateMedication(medId, medData as Partial<Medication>);
      } else {
        await createMedication(medData);
      }

      router.back();
    } catch (error) {
      console.error('Error saving medication:', error);
      Alert.alert('Error', 'Failed to save medication');
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
            {isEditing ? 'EDIT MEDICATION' : 'ADD MEDICATION'}
          </Text>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>{isEditing ? 'Edit Medication' : 'Add Medication'}</Text>

          {/* Medication Name */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Medication Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={handleMedicationNameChange}
              onFocus={() => {
                // Show suggestions if there's already text
                if (name.length >= 1) {
                  const matches = COMMON_MEDICATIONS.filter(med =>
                    med.name.toLowerCase().includes(name.toLowerCase())
                  );
                  setMedSuggestions(matches);
                  setShowMedSuggestions(matches.length > 0);
                }
              }}
              placeholder="e.g., Lisinopril"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="words"
              autoCorrect={false}
            />
            {showMedSuggestions && medSuggestions.length > 0 && (
              <ScrollView
                style={styles.suggestionsContainer}
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="handled"
              >
                {medSuggestions.slice(0, 8).map((med, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.suggestionItem}
                    onPress={() => handleSelectMedication(med)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.suggestionText}>{med.name}</Text>
                    <Text style={styles.suggestionSubtext}>
                      Common: {med.commonDosages.join(', ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Dosage */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Dosage *</Text>
            <TextInput
              style={styles.input}
              value={dosage}
              onChangeText={handleDosageChange}
              placeholder="e.g., 10mg"
              placeholderTextColor={Colors.textMuted}
              autoCorrect={false}
            />
            {showDosageSuggestions && dosageSuggestions.length > 0 && (
              <ScrollView
                style={styles.suggestionsContainer}
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="handled"
              >
                {dosageSuggestions.map((dose, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.suggestionItem}
                    onPress={() => handleSelectDosage(dose)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.suggestionText}>{dose}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Time Slot Selection */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Time of Day *</Text>
            <View style={styles.timeSlotContainer}>
              {TIME_SLOTS.map(slot => (
                <TouchableOpacity
                  key={slot.key}
                  style={[
                    styles.timeSlot,
                    selectedTimeSlot === slot.key && styles.timeSlotSelected
                  ]}
                  onPress={() => handleTimeSlotSelect(slot.key)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.timeSlotText,
                    selectedTimeSlot === slot.key && styles.timeSlotTextSelected
                  ]}>
                    {slot.label}
                  </Text>
                  <Text style={[
                    styles.timeSlotTime,
                    selectedTimeSlot === slot.key && styles.timeSlotTimeSelected
                  ]}>
                    {slot.displayTime}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Custom Time (Optional) */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Custom Time (Optional)</Text>
            <TextInput
              style={styles.input}
              value={customTimeDisplay}
              onChangeText={handleCustomTimeChange}
              placeholder="e.g., 8:00 AM"
              placeholderTextColor={Colors.textMuted}
            />
            <Text style={styles.helpText}>Enter time in 12-hour format (e.g., 8:00 AM, 1:30 PM, 8:00 PM)</Text>
          </View>

          {/* Days Supply */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Days Supply</Text>
            <TextInput
              style={styles.input}
              value={daysSupply}
              onChangeText={setDaysSupply}
              placeholder="30"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
            />
            <Text style={styles.helpText}>
              Alerts when supply drops below 7 days
            </Text>
          </View>

          {/* Expandable Reminder Controls */}
          <View style={[
            styles.reminderContainer,
            reminderEnabled && styles.reminderContainerActive
          ]}>
            {/* Toggle Row */}
            <TouchableOpacity
              style={styles.reminderToggleRow}
              onPress={() => setReminderEnabled(!reminderEnabled)}
              activeOpacity={0.7}
            >
              <View style={styles.reminderToggleLeft}>
                <Text style={styles.reminderIcon}>🔔</Text>
                <View style={styles.reminderToggleInfo}>
                  <Text style={styles.reminderToggleLabel}>Reminder</Text>
                  <Text style={styles.reminderToggleDesc}>
                    {reminderEnabled ? 'Notifications enabled' : 'Get notified when due'}
                  </Text>
                </View>
              </View>
              <Switch
                value={reminderEnabled}
                onValueChange={setReminderEnabled}
                trackColor={{ false: Colors.textMuted, true: '#F59E0B' }}
                thumbColor={Colors.surface}
                ios_backgroundColor={Colors.textMuted}
              />
            </TouchableOpacity>

            {/* Expandable Time Picker */}
            {reminderEnabled && (
              <View style={styles.reminderExpandedSection}>
                <Text style={styles.reminderExpandedLabel}>NOTIFY ME</Text>
                <View style={styles.reminderTimeOptions}>
                  {[
                    { label: 'At scheduled time', value: 0 },
                    { label: '5 min before', value: 5 },
                    { label: '10 min before', value: 10 },
                    { label: '15 min before', value: 15 },
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.reminderTimeOption,
                        reminderMinutesBefore === option.value && styles.reminderTimeOptionSelected
                      ]}
                      onPress={() => setReminderMinutesBefore(option.value)}
                    >
                      <Text style={[
                        styles.reminderTimeOptionText,
                        reminderMinutesBefore === option.value && styles.reminderTimeOptionTextSelected
                      ]}>
                        {option.label}
                      </Text>
                      {reminderMinutesBefore === option.value && (
                        <Ionicons name="checkmark-circle" size={18} color="#F59E0B" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* Notes */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Notes (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g., Take with food, avoid grapefruit"
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
    backgroundColor: '#0d332e',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
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
    position: 'relative',
    zIndex: 1,
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

  // Time Slots
  timeSlotContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  timeSlot: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  timeSlotSelected: {
    backgroundColor: Colors.accentLight,
    borderColor: Colors.accent,
  },
  timeSlotText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  timeSlotTextSelected: {
    color: Colors.accent,
  },
  timeSlotTime: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  timeSlotTimeSelected: {
    color: Colors.accent,
  },
  
  // SUGGESTION DROPDOWNS
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    backgroundColor: '#0d332e',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    maxHeight: 200,
    zIndex: 1000,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  suggestionItem: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  suggestionText: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  suggestionSubtext: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },

  // Expandable Reminder Controls
  reminderContainer: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
    overflow: 'hidden',
  },
  reminderContainerActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  reminderToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
  },
  reminderToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  reminderIcon: {
    fontSize: 20,
  },
  reminderToggleInfo: {
    flex: 1,
  },
  reminderToggleLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  reminderToggleDesc: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  reminderExpandedSection: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(245, 158, 11, 0.2)',
  },
  reminderExpandedLabel: {
    fontSize: 10,
    color: '#F59E0B',
    fontWeight: '600',
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },
  reminderTimeOptions: {
    gap: Spacing.xs,
  },
  reminderTimeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  reminderTimeOptionSelected: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: '#F59E0B',
  },
  reminderTimeOptionText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  reminderTimeOptionTextSelected: {
    color: Colors.textPrimary,
    fontWeight: '500',
  },
});
