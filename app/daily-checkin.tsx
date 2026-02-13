// TODO: Consolidation candidate — overlaps with log-evening-wellness.tsx
// ============================================================================
// DAILY CHECK-IN FLOW
// 6-step wizard for evening check-in
// ============================================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Colors } from '../theme/theme-tokens';
import { saveDailyTracking } from '../utils/dailyTrackingStorage';
import { hapticSuccess } from '../utils/hapticFeedback';
import { logError } from '../utils/devLog';

const MOOD_OPTIONS = [
  { value: 9, emoji: '😄', label: 'Great' },
  { value: 7, emoji: '🙂', label: 'Good' },
  { value: 5, emoji: '😐', label: 'Okay' },
  { value: 3, emoji: '😟', label: 'Hard' },
  { value: 1, emoji: '😢', label: 'Very Hard' },
];

const ENERGY_OPTIONS = [
  { value: 5, label: 'Energetic' },
  { value: 4, label: 'Good' },
  { value: 3, label: 'Moderate' },
  { value: 2, label: 'Low' },
  { value: 1, label: 'Exhausted' },
];

const SYMPTOM_OPTIONS = [
  'Pain',
  'Nausea',
  'Dizziness',
  'Fatigue',
  'Anxiety',
  'Confusion',
  'None today',
];

const SLEEP_DURATION_OPTIONS = ['< 4h', '4-6h', '6-8h', '8-10h', '> 10h'];

const SLEEP_QUALITY_OPTIONS = [
  { value: 5, emoji: '😴', label: 'Excellent' },
  { value: 4, emoji: '😌', label: 'Good' },
  { value: 3, emoji: '😐', label: 'Fair' },
  { value: 2, emoji: '😕', label: 'Poor' },
  { value: 1, emoji: '😫', label: 'Very Poor' },
];

const QUICK_NOTE_TAGS = [
  'Good day',
  'Harder day',
  'Behavior change',
  'Appetite change',
  'Sleep issue',
  'Concern for Dr.',
];

export default function DailyCheckinScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Step 1: Mood
  const [mood, setMood] = useState<number | null>(null);

  // Step 2: Energy
  const [energy, setEnergy] = useState<number | null>(null);

  // Step 3: Symptoms
  const [symptoms, setSymptoms] = useState<string[]>([]);

  // Step 4: Meals & Hydration
  const [hadBreakfast, setHadBreakfast] = useState(false);
  const [hadLunch, setHadLunch] = useState(false);
  const [hadDinner, setHadDinner] = useState(false);
  const [waterGlasses, setWaterGlasses] = useState(0);

  // Step 5: Sleep
  const [sleepDuration, setSleepDuration] = useState<string | null>(null);
  const [sleepQuality, setSleepQuality] = useState<number | null>(null);

  // Step 6: Notes
  const [notes, setNotes] = useState('');
  const [noteTags, setNoteTags] = useState<string[]>([]);

  const toggleSymptom = (symptom: string) => {
    if (symptom === 'None today') {
      setSymptoms(['None today']);
    } else {
      setSymptoms((prev) => {
        const filtered = prev.filter((s) => s !== 'None today');
        return filtered.includes(symptom)
          ? filtered.filter((s) => s !== symptom)
          : [...filtered, symptom];
      });
    }
  };

  const toggleNoteTag = (tag: string) => {
    setNoteTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return mood !== null;
      case 2:
        return energy !== null;
      case 3:
        return symptoms.length > 0;
      case 4:
        return true; // Optional fields
      case 5:
        return sleepDuration !== null && sleepQuality !== null;
      case 6:
        return true; // Optional notes
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (!canProceed()) {
      Alert.alert('Complete This Step', 'Please make a selection to continue');
      return;
    }

    if (step < 6) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleComplete = async () => {
    try {
      const dateStr = new Date().toISOString().split('T')[0];
      // Parse sleep duration (e.g., "7 hours" -> 7)
      const sleepHours = sleepDuration ? parseFloat(sleepDuration.replace(/[^0-9.]/g, '')) : null;

      await saveDailyTracking(dateStr, {
        mood: mood!,
        energy: energy!,
        symptoms,
        meals: {
          breakfast: hadBreakfast,
          lunch: hadLunch,
          dinner: hadDinner,
        },
        hydration: waterGlasses,
        sleep: sleepHours,
        sleepQuality: sleepQuality,
        notes,
        tags: noteTags,
      });

      await hapticSuccess();
      router.back();
    } catch (error) {
      logError('DailyCheckinScreen.handleComplete', error);
      Alert.alert('Error', 'Failed to save check-in');
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>How are they feeling today?</Text>
            <Text style={styles.stepSubtitle}>Overall mood</Text>

            <View style={styles.moodGrid}>
              {MOOD_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.moodButton,
                    mood === option.value && styles.moodButtonSelected,
                  ]}
                  onPress={() => setMood(option.value)}
                  accessibilityLabel={`Mood: ${option.label}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: mood === option.value }}
                >
                  <Text style={styles.moodEmoji}>{option.emoji}</Text>
                  <Text
                    style={[
                      styles.moodLabel,
                      mood === option.value && styles.moodLabelSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Energy level today?</Text>
            <Text style={styles.stepSubtitle}>Physical energy</Text>

            <View style={styles.energyList}>
              {ENERGY_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.energyOption,
                    energy === option.value && styles.energyOptionSelected,
                  ]}
                  onPress={() => setEnergy(option.value)}
                  accessibilityLabel={`Energy: ${option.label}`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: energy === option.value }}
                >
                  <View
                    style={[
                      styles.radio,
                      energy === option.value && styles.radioSelected,
                    ]}
                  >
                    {energy === option.value && (
                      <View style={styles.radioDot} />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.energyLabel,
                      energy === option.value && styles.energyLabelSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Any symptoms today?</Text>
            <Text style={styles.stepSubtitle}>Select all that apply</Text>

            <View style={styles.chipGrid}>
              {SYMPTOM_OPTIONS.map((symptom) => (
                <TouchableOpacity
                  key={symptom}
                  style={[
                    styles.chip,
                    symptoms.includes(symptom) && styles.chipSelected,
                  ]}
                  onPress={() => toggleSymptom(symptom)}
                  accessibilityLabel={symptom}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: symptoms.includes(symptom) }}
                >
                  <Text
                    style={[
                      styles.chipText,
                      symptoms.includes(symptom) && styles.chipTextSelected,
                    ]}
                  >
                    {symptom}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 4:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Meals & Hydration</Text>
            <Text style={styles.stepSubtitle}>What did they have today?</Text>

            <View style={styles.mealsSection}>
              <Text style={styles.sectionLabel}>MEALS</Text>
              <TouchableOpacity
                style={styles.mealToggle}
                onPress={() => setHadBreakfast(!hadBreakfast)}
                accessibilityLabel="Breakfast"
                accessibilityRole="checkbox"
                accessibilityState={{ checked: hadBreakfast }}
              >
                <View
                  style={[
                    styles.checkbox,
                    hadBreakfast && styles.checkboxChecked,
                  ]}
                >
                  {hadBreakfast && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.mealLabel}>Breakfast</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.mealToggle}
                onPress={() => setHadLunch(!hadLunch)}
                accessibilityLabel="Lunch"
                accessibilityRole="checkbox"
                accessibilityState={{ checked: hadLunch }}
              >
                <View
                  style={[styles.checkbox, hadLunch && styles.checkboxChecked]}
                >
                  {hadLunch && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.mealLabel}>Lunch</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.mealToggle}
                onPress={() => setHadDinner(!hadDinner)}
                accessibilityLabel="Dinner"
                accessibilityRole="checkbox"
                accessibilityState={{ checked: hadDinner }}
              >
                <View
                  style={[styles.checkbox, hadDinner && styles.checkboxChecked]}
                >
                  {hadDinner && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.mealLabel}>Dinner</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.hydrationSection}>
              <Text style={styles.sectionLabel}>WATER (GLASSES)</Text>
              <View style={styles.counterRow}>
                <TouchableOpacity
                  style={styles.counterButton}
                  onPress={() => setWaterGlasses(Math.max(0, waterGlasses - 1))}
                  accessibilityLabel="Decrease water glasses"
                  accessibilityRole="button"
                >
                  <Text style={styles.counterButtonText}>−</Text>
                </TouchableOpacity>
                <View style={styles.counterDisplay}>
                  <Text style={styles.counterValue}>{waterGlasses}</Text>
                </View>
                <TouchableOpacity
                  style={styles.counterButton}
                  onPress={() => setWaterGlasses(waterGlasses + 1)}
                  accessibilityLabel="Increase water glasses"
                  accessibilityRole="button"
                >
                  <Text style={styles.counterButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );

      case 5:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>How was sleep last night?</Text>
            <Text style={styles.stepSubtitle}>Duration and quality</Text>

            <View style={styles.sleepSection}>
              <Text style={styles.sectionLabel}>DURATION</Text>
              <View style={styles.chipRow}>
                {SLEEP_DURATION_OPTIONS.map((duration) => (
                  <TouchableOpacity
                    key={duration}
                    style={[
                      styles.chip,
                      sleepDuration === duration && styles.chipSelected,
                    ]}
                    onPress={() => setSleepDuration(duration)}
                    accessibilityLabel={`Sleep duration: ${duration}`}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: sleepDuration === duration }}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        sleepDuration === duration && styles.chipTextSelected,
                      ]}
                    >
                      {duration}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.sleepSection}>
              <Text style={styles.sectionLabel}>QUALITY</Text>
              <View style={styles.sleepQualityGrid}>
                {SLEEP_QUALITY_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.sleepQualityButton,
                      sleepQuality === option.value &&
                        styles.sleepQualityButtonSelected,
                    ]}
                    onPress={() => setSleepQuality(option.value)}
                    accessibilityLabel={`Sleep quality: ${option.label}`}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: sleepQuality === option.value }}
                  >
                    <Text style={styles.sleepQualityEmoji}>
                      {option.emoji}
                    </Text>
                    <Text
                      style={[
                        styles.sleepQualityLabel,
                        sleepQuality === option.value &&
                          styles.sleepQualityLabelSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        );

      case 6:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Any notes for today?</Text>
            <Text style={styles.stepSubtitle}>Optional</Text>

            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="Anything else worth noting..."
              placeholderTextColor={Colors.textPlaceholder}
              multiline
              numberOfLines={4}
              accessibilityLabel="Daily check-in notes"
            />

            <View style={styles.tagsSection}>
              <Text style={styles.sectionLabel}>QUICK TAGS</Text>
              <View style={styles.chipGrid}>
                {QUICK_NOTE_TAGS.map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    style={[
                      styles.chip,
                      noteTags.includes(tag) && styles.chipSelected,
                    ]}
                    onPress={() => toggleNoteTag(tag)}
                    accessibilityLabel={tag}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: noteTags.includes(tag) }}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        noteTags.includes(tag) && styles.chipTextSelected,
                      ]}
                    >
                      {tag}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        );

      default:
        return null;
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
          <TouchableOpacity style={styles.backButton} onPress={handleBack} accessibilityLabel="Go back" accessibilityRole="button">
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Daily Check-In</Text>
            <Text style={styles.headerSubtitle}>
              Step {step} of 6
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Cancel check-in" accessibilityRole="button">
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View
              style={[styles.progressFill, { width: `${(step / 6) * 100}%` }]}
            />
          </View>
        </View>

        {/* Content */}
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {renderStep()}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.nextButton, !canProceed() && styles.nextButtonDisabled]}
            onPress={handleNext}
            disabled={!canProceed()}
            accessibilityLabel={step === 6 ? 'Complete check-in' : `Next step, step ${step} of 6`}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canProceed() }}
          >
            <Text style={styles.nextButtonText}>
              {step === 6 ? 'Complete Check-In' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.accentHint,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: Colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 20,
    color: Colors.textPrimary,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.textHalf,
    marginTop: 2,
  },
  cancelText: {
    fontSize: 16,
    color: Colors.textHalf,
  },

  // Progress Bar
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  progressTrack: {
    height: 4,
    backgroundColor: Colors.accentSubtle,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: 2,
  },

  // Content
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 15,
    color: Colors.textTertiary,
    marginBottom: 32,
  },

  // Step 1: Mood
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  moodButton: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: Colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: Colors.accentHint,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  moodButtonSelected: {
    backgroundColor: Colors.accentHint,
    borderColor: Colors.accent,
  },
  moodEmoji: {
    fontSize: 36,
  },
  moodLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  moodLabelSelected: {
    color: Colors.accent,
    fontWeight: '600',
  },

  // Step 2: Energy
  energyList: {
    gap: 12,
  },
  energyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: Colors.accentHint,
    borderRadius: 12,
    padding: 16,
    gap: 14,
  },
  energyOptionSelected: {
    backgroundColor: Colors.accentHint,
    borderColor: Colors.accent,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.borderStrong,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: Colors.accent,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.accent,
  },
  energyLabel: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  energyLabelSelected: {
    color: Colors.accent,
    fontWeight: '600',
  },

  // Step 3: Symptoms & Step 6: Tags (shared chip styles)
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    backgroundColor: Colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: Colors.accentHint,
    borderRadius: 20,
  },
  chipSelected: {
    backgroundColor: Colors.accentHint,
    borderColor: Colors.accent,
  },
  chipText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  chipTextSelected: {
    color: Colors.accent,
    fontWeight: '600',
  },

  // Step 4: Meals & Hydration
  mealsSection: {
    marginBottom: 32,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.5,
    color: Colors.textMuted,
    marginBottom: 12,
  },
  mealToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: Colors.accentHint,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.borderStrong,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  checkmark: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: 'bold',
  },
  mealLabel: {
    fontSize: 15,
    color: Colors.textPrimary,
  },
  hydrationSection: {
    marginBottom: 24,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  counterButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.accentLight,
    borderWidth: 1,
    borderColor: Colors.borderMedium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterButtonText: {
    fontSize: 28,
    color: Colors.accent,
    fontWeight: '600',
  },
  counterDisplay: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.accentHint,
    borderWidth: 2,
    borderColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterValue: {
    fontSize: 32,
    fontWeight: '600',
    color: Colors.accent,
  },

  // Step 5: Sleep
  sleepSection: {
    marginBottom: 32,
  },
  sleepQualityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  sleepQualityButton: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: Colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: Colors.accentHint,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  sleepQualityButtonSelected: {
    backgroundColor: Colors.accentHint,
    borderColor: Colors.accent,
  },
  sleepQualityEmoji: {
    fontSize: 28,
  },
  sleepQualityLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  sleepQualityLabelSelected: {
    color: Colors.accent,
    fontWeight: '600',
  },

  // Step 6: Notes
  notesInput: {
    backgroundColor: Colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: Colors.accentHint,
    borderRadius: 12,
    padding: 14,
    color: Colors.textPrimary,
    fontSize: 15,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 24,
  },
  tagsSection: {
    marginBottom: 24,
  },

  // Footer
  footer: {
    padding: 20,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.accentHint,
    backgroundColor: Colors.background,
  },
  nextButton: {
    paddingVertical: 16,
    backgroundColor: Colors.accent,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextButtonDisabled: {
    backgroundColor: Colors.borderStrong,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
});
