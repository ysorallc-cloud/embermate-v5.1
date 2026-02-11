// ============================================================================
// LOG MORNING WELLNESS CHECK
// Sleep quality, mood, energy level
// ============================================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Colors } from '../theme/theme-tokens';
import { useWellnessSettings } from '../hooks/useWellnessSettings';
import { saveMorningWellness, skipMorningWellness } from '../utils/wellnessCheckStorage';
import { listDailyInstances, logInstanceCompletion, DEFAULT_PATIENT_ID } from '../storage/carePlanRepo';
import { format } from 'date-fns';

const SLEEP_OPTIONS = [
  { value: 5, emoji: '😴', label: 'Excellent' },
  { value: 4, emoji: '😌', label: 'Good' },
  { value: 3, emoji: '😐', label: 'Fair' },
  { value: 2, emoji: '😕', label: 'Poor' },
  { value: 1, emoji: '😫', label: 'Very Poor' },
] as const;

const MOOD_OPTIONS = [
  { value: 'great', emoji: '😄', label: 'Great' },
  { value: 'good', emoji: '🙂', label: 'Good' },
  { value: 'managing', emoji: '😐', label: 'Managing' },
  { value: 'difficult', emoji: '😟', label: 'Difficult' },
  { value: 'struggling', emoji: '😢', label: 'Struggling' },
] as const;

const ENERGY_OPTIONS = [
  { value: 5, label: 'Energetic' },
  { value: 4, label: 'Good' },
  { value: 3, label: 'Moderate' },
  { value: 2, label: 'Low' },
  { value: 1, label: 'Exhausted' },
] as const;

const ORIENTATION_OPTIONS = [
  { value: 'alert-oriented', emoji: '🧠', label: 'Alert & Oriented' },
  { value: 'confused-responsive', emoji: '😕', label: 'Confused but Responsive' },
  { value: 'disoriented', emoji: '🌀', label: 'Disoriented' },
  { value: 'unresponsive', emoji: '😶', label: 'Unresponsive' },
] as const;

const DECISION_MAKING_OPTIONS = [
  { value: 'own-decisions', emoji: '✅', label: 'Making Own Decisions' },
  { value: 'needs-guidance', emoji: '🤝', label: 'Needs Guidance' },
  { value: 'unable-to-decide', emoji: '⚠️', label: 'Unable to Decide' },
] as const;

export default function LogMorningWellnessScreen() {
  const router = useRouter();
  const { settings } = useWellnessSettings();
  const showOrientation = settings.morning.optionalChecks?.orientation ?? false;
  const showDecisionMaking = settings.morning.optionalChecks?.decisionMaking ?? false;
  const [sleepQuality, setSleepQuality] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [mood, setMood] = useState<'struggling' | 'difficult' | 'managing' | 'good' | 'great' | null>(null);
  const [energyLevel, setEnergyLevel] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [orientation, setOrientation] = useState<'alert-oriented' | 'confused-responsive' | 'disoriented' | 'unresponsive' | null>(null);
  const [decisionMaking, setDecisionMaking] = useState<'own-decisions' | 'needs-guidance' | 'unable-to-decide' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = sleepQuality !== null && mood !== null && energyLevel !== null;

  const handleSkip = async () => {
    Alert.alert(
      'Skip Morning Wellness Check?',
      'This will mark the check as complete without logging details.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          style: 'destructive',
          onPress: async () => {
            try {
              const today = format(new Date(), 'yyyy-MM-dd');
              await skipMorningWellness(today);
              // Bridge to care plan instance
              try {
                const instances = await listDailyInstances(DEFAULT_PATIENT_ID, today);
                const inst = instances.find(i => i.itemType === 'wellness' && i.windowLabel === 'morning' && i.status === 'pending');
                if (inst) {
                  await logInstanceCompletion(DEFAULT_PATIENT_ID, today, inst.id, 'skipped');
                }
              } catch (e) {
                console.warn('Could not update care plan instance:', e);
              }
              router.back();
            } catch (error) {
              Alert.alert('Error', 'Failed to skip wellness check');
            }
          },
        },
      ]
    );
  };

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      await saveMorningWellness(today, {
        sleepQuality: sleepQuality!,
        mood: mood!,
        energyLevel: energyLevel!,
        ...(orientation && { orientation }),
        ...(decisionMaking && { decisionMaking }),
        completedAt: new Date(),
      });
      // Bridge to care plan instance
      try {
        const instances = await listDailyInstances(DEFAULT_PATIENT_ID, today);
        const inst = instances.find(i => i.itemType === 'wellness' && i.windowLabel === 'morning' && i.status === 'pending');
        if (inst) {
          await logInstanceCompletion(DEFAULT_PATIENT_ID, today, inst.id, 'completed');
        }
      } catch (e) {
        console.warn('Could not update care plan instance:', e);
      }
      router.back();
    } catch (error) {
      Alert.alert('Error', 'Failed to save wellness check');
      setIsSubmitting(false);
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
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Morning Wellness Check</Text>
          <TouchableOpacity
            onPress={handleSkip}
            accessibilityLabel="Skip morning wellness check"
            accessibilityRole="button"
          >
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Sleep Quality */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How was sleep last night?</Text>
            <View style={styles.optionGrid}>
              {SLEEP_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionButton,
                    sleepQuality === option.value && styles.optionButtonSelected,
                  ]}
                  onPress={() => setSleepQuality(option.value)}
                  accessibilityLabel={`Sleep quality: ${option.label}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: sleepQuality === option.value }}
                >
                  <Text style={styles.optionEmoji}>{option.emoji}</Text>
                  <Text
                    style={[
                      styles.optionLabel,
                      sleepQuality === option.value && styles.optionLabelSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Mood */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How are they feeling?</Text>
            <View style={styles.optionGrid}>
              {MOOD_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionButton,
                    mood === option.value && styles.optionButtonSelected,
                  ]}
                  onPress={() => setMood(option.value)}
                  accessibilityLabel={`Mood: ${option.label}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: mood === option.value }}
                >
                  <Text style={styles.optionEmoji}>{option.emoji}</Text>
                  <Text
                    style={[
                      styles.optionLabel,
                      mood === option.value && styles.optionLabelSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Energy Level */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Energy level?</Text>
            <View style={styles.energyList}>
              {ENERGY_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.energyOption,
                    energyLevel === option.value && styles.energyOptionSelected,
                  ]}
                  onPress={() => setEnergyLevel(option.value)}
                  accessibilityLabel={`Energy level: ${option.label}`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: energyLevel === option.value }}
                >
                  <View
                    style={[
                      styles.radio,
                      energyLevel === option.value && styles.radioSelected,
                    ]}
                  >
                    {energyLevel === option.value && (
                      <View style={styles.radioDot} />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.energyLabel,
                      energyLevel === option.value && styles.energyLabelSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Orientation (Optional — shown if enabled in settings) */}
          {showOrientation && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Orientation</Text>
              <Text style={styles.sectionSubtitle}>Optional</Text>
              <View style={styles.optionGrid}>
                {ORIENTATION_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.optionButton,
                      orientation === option.value && styles.optionButtonSelected,
                    ]}
                    onPress={() => setOrientation(orientation === option.value ? null : option.value)}
                    accessibilityLabel={`Orientation: ${option.label}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: orientation === option.value }}
                  >
                    <Text style={styles.optionEmoji}>{option.emoji}</Text>
                    <Text
                      style={[
                        styles.optionLabel,
                        orientation === option.value && styles.optionLabelSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Decision Making (Optional — shown if enabled in settings) */}
          {showDecisionMaking && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Decision Making</Text>
              <Text style={styles.sectionSubtitle}>Optional</Text>
              <View style={styles.optionGrid}>
                {DECISION_MAKING_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.optionButton,
                      decisionMaking === option.value && styles.optionButtonSelected,
                    ]}
                    onPress={() => setDecisionMaking(decisionMaking === option.value ? null : option.value)}
                    accessibilityLabel={`Decision making: ${option.label}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: decisionMaking === option.value }}
                  >
                    <Text style={styles.optionEmoji}>{option.emoji}</Text>
                    <Text
                      style={[
                        styles.optionLabel,
                        decisionMaking === option.value && styles.optionLabelSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            accessibilityLabel={isSubmitting ? 'Saving wellness check' : 'Complete morning wellness check'}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSubmit || isSubmitting }}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Saving...' : 'Complete Check'}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 18,
    color: Colors.textPrimary,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  skipText: {
    fontSize: 16,
    color: Colors.textMuted,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: -12,
    marginBottom: 12,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  optionButton: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  optionButtonSelected: {
    backgroundColor: 'rgba(20, 184, 166, 0.15)',
    borderColor: Colors.accent,
  },
  optionEmoji: {
    fontSize: 32,
  },
  optionLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  optionLabelSelected: {
    color: Colors.accent,
    fontWeight: '600',
  },
  energyList: {
    gap: 12,
  },
  energyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 16,
    gap: 14,
  },
  energyOptionSelected: {
    backgroundColor: 'rgba(20, 184, 166, 0.15)',
    borderColor: Colors.accent,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
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
  footer: {
    padding: 20,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  submitButton: {
    paddingVertical: 16,
    backgroundColor: Colors.accent,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: 'rgba(13, 148, 136, 0.3)',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
