// ============================================================================
// LOG MORNING WELLNESS CHECK
// Step-by-step wizard: one question per step, auto-advance on tap
// ============================================================================

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { navigateBack } from '../lib/navigate';
import { Colors } from '../theme/theme-tokens';
import { useTheme } from '../contexts/ThemeContext';
import { saveMorningWellness, skipMorningWellness } from '../utils/wellnessCheckStorage';
import { listDailyInstances, logInstanceCompletion, DEFAULT_PATIENT_ID } from '../storage/carePlanRepo';
import { getTodayDateString } from '../services/carePlanGenerator';
import { emitDataUpdate } from '../lib/events';
import { hapticSuccess } from '../utils/hapticFeedback';
import { EVENT } from '../lib/eventNames';

const SLEEP_OPTIONS = [
  { value: 5, emoji: '😴', label: 'Excellent' },
  { value: 4, emoji: '😌', label: 'Good' },
  { value: 3, emoji: '😐', label: 'Fair' },
  { value: 2, emoji: '😕', label: 'Poor' },
  { value: 1, emoji: '😫', label: 'Very Poor' },
] as const;

const MOOD_OPTIONS = [
  { value: 5, emoji: '😄', label: 'Great' },
  { value: 4, emoji: '🙂', label: 'Good' },
  { value: 3, emoji: '😐', label: 'Managing' },
  { value: 2, emoji: '😟', label: 'Difficult' },
  { value: 1, emoji: '😢', label: 'Struggling' },
] as const;

const ENERGY_OPTIONS = [
  { value: 5, emoji: '⚡', label: 'Energetic' },
  { value: 4, emoji: '👍', label: 'Good' },
  { value: 3, emoji: '😐', label: 'Moderate' },
  { value: 2, emoji: '📉', label: 'Low' },
  { value: 1, emoji: '😴', label: 'Exhausted' },
] as const;

const ORIENTATION_OPTIONS = [
  { value: 'alert-oriented', emoji: '🧠', label: 'Alert' },
  { value: 'confused-responsive', emoji: '😕', label: 'Confused' },
  { value: 'disoriented', emoji: '🌀', label: 'Disoriented' },
  { value: 'unresponsive', emoji: '😶', label: 'Unresponsive' },
] as const;

const DECISION_MAKING_OPTIONS = [
  { value: 'own-decisions', emoji: '✅', label: 'Independent' },
  { value: 'needs-guidance', emoji: '🤝', label: 'Needs Guidance' },
  { value: 'unable-to-decide', emoji: '⚠️', label: 'Unable to Decide' },
] as const;

const STEPS = [
  { key: 'sleep', title: 'How did she sleep?', required: true },
  { key: 'mood', title: "How's her mood?", required: true },
  { key: 'energy', title: 'Energy level?', required: false },
  { key: 'orientation', title: 'Orientation', required: false },
  { key: 'decision', title: 'Decision making', required: false },
] as const;

export default function LogMorningWellnessScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { instanceId: routeInstanceId } = useLocalSearchParams<{ instanceId?: string }>();
  const [sleepQuality, setSleepQuality] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [mood, setMood] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [energyLevel, setEnergyLevel] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [orientation, setOrientation] = useState<'alert-oriented' | 'confused-responsive' | 'disoriented' | 'unresponsive' | null>(null);
  const [decisionMaking, setDecisionMaking] = useState<'own-decisions' | 'needs-guidance' | 'unable-to-decide' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

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
              const today = getTodayDateString();
              await skipMorningWellness(today);
              try {
                const instances = await listDailyInstances(DEFAULT_PATIENT_ID, today);
                const inst = routeInstanceId
                  ? instances.find(i => i.id === routeInstanceId)
                  : instances.find(i => i.itemType === 'wellness' && i.windowLabel === 'morning' && i.status === 'pending');
                if (inst) {
                  await logInstanceCompletion(DEFAULT_PATIENT_ID, today, inst.id, 'skipped');
                  emitDataUpdate(EVENT.DAILY_INSTANCES);
                }
              } catch (e) {
                console.warn('Could not update care plan instance:', e);
              }
              emitDataUpdate(EVENT.WELLNESS);
              await hapticSuccess();
              navigateBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to skip wellness check');
            }
          },
        },
      ]
    );
  };

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) {
      if (!canSubmit) {
        Alert.alert('Missing info', 'Please answer sleep, mood, and energy to save.');
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const today = getTodayDateString();
      await saveMorningWellness(today, {
        sleepQuality: sleepQuality!,
        mood: mood!,
        energyLevel: energyLevel!,
        ...(orientation && { orientation }),
        ...(decisionMaking && { decisionMaking }),
        completedAt: new Date(),
      });
      try {
        const instances = await listDailyInstances(DEFAULT_PATIENT_ID, today);
        const inst = routeInstanceId
          ? instances.find(i => i.id === routeInstanceId)
          : instances.find(i => i.itemType === 'wellness' && i.windowLabel === 'morning' && i.status === 'pending');
        if (inst) {
          await logInstanceCompletion(DEFAULT_PATIENT_ID, today, inst.id, 'completed');
          emitDataUpdate(EVENT.DAILY_INSTANCES);
        }
      } catch (e) {
        console.warn('Could not update care plan instance:', e);
      }
      emitDataUpdate(EVENT.WELLNESS);
      await hapticSuccess();
      navigateBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to save wellness check');
      setIsSubmitting(false);
    }
  };

  const advanceStep = useCallback(() => {
    setCurrentStep(prev => {
      if (prev < STEPS.length - 1) {
        return prev + 1;
      }
      // Last step — trigger save
      handleSubmit();
      return prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sleepQuality, mood, energyLevel, orientation, decisionMaking, isSubmitting]);

  const goBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    } else {
      navigateBack();
    }
  }, [currentStep]);

  const renderEmojiRow = <T extends string | number>(
    options: ReadonlyArray<{ value: T; emoji: string; label: string }>,
    selected: T | null,
    onSelect: (value: T) => void,
    labelPrefix: string,
  ) => (
    <View style={styles.emojiWizardRow}>
      {options.map((option) => {
        const isSelected = selected === option.value;
        return (
          <TouchableOpacity
            key={String(option.value)}
            style={styles.emojiWizardItem}
            onPress={() => {
              onSelect(option.value);
              setTimeout(advanceStep, 300);
            }}
            accessibilityLabel={`${labelPrefix}: ${option.label}`}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
          >
            <View style={[styles.emojiCircle, isSelected && styles.emojiCircleSelected]}>
              <Text style={styles.emojiIcon}>{option.emoji}</Text>
            </View>
            <Text style={styles.emojiLabel}>{option.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderSleepStep = () =>
    renderEmojiRow(SLEEP_OPTIONS, sleepQuality, (v) => setSleepQuality(v), 'Sleep quality');

  const renderMoodStep = () =>
    renderEmojiRow(MOOD_OPTIONS, mood, (v) => setMood(v), 'Mood');

  const renderEnergyStep = () =>
    renderEmojiRow(ENERGY_OPTIONS, energyLevel, (v) => setEnergyLevel(v), 'Energy level');

  const renderOrientationStep = () =>
    renderEmojiRow(ORIENTATION_OPTIONS, orientation, (v) => setOrientation(v), 'Orientation');

  const renderDecisionStep = () =>
    renderEmojiRow(DECISION_MAKING_OPTIONS, decisionMaking, (v) => setDecisionMaking(v), 'Decision making');

  const step = STEPS[currentStep];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[colors.backgroundGradientStart, colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={goBack}
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
            <Text style={styles.headerSkipText}>Skip</Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }} keyboardVerticalOffset={100}>
          {/* Segmented progress bar */}
          <View style={styles.progressBar}>
            {STEPS.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.progressSegment,
                  i <= currentStep && styles.progressSegmentActive,
                ]}
              />
            ))}
          </View>

          {/* Active step */}
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>{step.title}</Text>
            <Text style={styles.stepHint}>
              {step.required ? 'Tap one' : 'Optional — tap or skip'}
            </Text>

            {currentStep === 0 && renderSleepStep()}
            {currentStep === 1 && renderMoodStep()}
            {currentStep === 2 && renderEnergyStep()}
            {currentStep === 3 && renderOrientationStep()}
            {currentStep === 4 && renderDecisionStep()}

            {!step.required && (
              <TouchableOpacity
                style={styles.skipButton}
                onPress={advanceStep}
                accessibilityLabel="Skip this step"
                accessibilityRole="button"
              >
                <Text style={styles.skipStepText}>Skip this step →</Text>
              </TouchableOpacity>
            )}

            {isSubmitting && (
              <Text style={styles.savingText}>Saving...</Text>
            )}
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
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
    borderBottomColor: c.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 18,
    color: c.textPrimary,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: c.textPrimary,
  },
  headerSkipText: {
    fontSize: 16,
    color: c.textMuted,
  },

  // Segmented progress bar
  progressBar: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 20,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  progressSegment: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 2,
  },
  progressSegmentActive: {
    backgroundColor: c.accent,
  },

  // Step container
  stepContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 20,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '300',
    color: c.textWarmPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  stepHint: {
    fontSize: 13,
    color: c.textWarmHint,
    marginBottom: 32,
    textAlign: 'center',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 24,
  },
  skipStepText: {
    fontSize: 13,
    color: c.textWarmHint,
  },
  savingText: {
    marginTop: 24,
    fontSize: 13,
    color: c.textWarmHint,
  },

  // Wizard emoji row (circular tap targets)
  emojiWizardRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  emojiWizardItem: {
    alignItems: 'center',
    marginHorizontal: 4,
    marginVertical: 8,
    width: 72,
  },
  emojiCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: c.warmSurface,
    borderWidth: 1,
    borderColor: c.warmSurfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiCircleSelected: {
    backgroundColor: 'rgba(52, 211, 153, 0.08)',
    borderColor: 'rgba(52, 211, 153, 0.3)',
    borderWidth: 1.5,
  },
  emojiIcon: {
    fontSize: 26,
  },
  emojiLabel: {
    fontSize: 10,
    color: c.textWarmHint,
    marginTop: 6,
    textAlign: 'center',
  },
});
