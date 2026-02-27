// ============================================================================
// LOG MORNING WELLNESS CHECK
// Consolidated compact layout: horizontal emoji rows + 2-column grids
// ============================================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Colors } from '../theme/theme-tokens';
import { saveMorningWellness, skipMorningWellness } from '../utils/wellnessCheckStorage';
import { listDailyInstances, logInstanceCompletion, DEFAULT_PATIENT_ID } from '../storage/carePlanRepo';
import { getTodayDateString } from '../services/carePlanGenerator';
import { emitDataUpdate } from '../lib/events';

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

// Progress dots: 5 sections total (sleep, mood, energy, orientation, decision)
const TOTAL_SECTIONS = 5;

export default function LogMorningWellnessScreen() {
  const router = useRouter();
  const [sleepQuality, setSleepQuality] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [mood, setMood] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [energyLevel, setEnergyLevel] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [orientation, setOrientation] = useState<'alert-oriented' | 'confused-responsive' | 'disoriented' | 'unresponsive' | null>(null);
  const [decisionMaking, setDecisionMaking] = useState<'own-decisions' | 'needs-guidance' | 'unable-to-decide' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = sleepQuality !== null && mood !== null && energyLevel !== null;

  // Count filled sections for progress dots
  const filledCount =
    (sleepQuality !== null ? 1 : 0) +
    (mood !== null ? 1 : 0) +
    (energyLevel !== null ? 1 : 0) +
    (orientation !== null ? 1 : 0) +
    (decisionMaking !== null ? 1 : 0);

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
                const inst = instances.find(i => i.itemType === 'wellness' && i.windowLabel === 'morning' && i.status === 'pending');
                if (inst) {
                  await logInstanceCompletion(DEFAULT_PATIENT_ID, today, inst.id, 'skipped');
                  emitDataUpdate('dailyInstances');
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
        const inst = instances.find(i => i.itemType === 'wellness' && i.windowLabel === 'morning' && i.status === 'pending');
        if (inst) {
          await logInstanceCompletion(DEFAULT_PATIENT_ID, today, inst.id, 'completed');
          emitDataUpdate('dailyInstances');
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

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }} keyboardVerticalOffset={100}>
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Progress Dots */}
          <View style={styles.progressRow}>
            {Array.from({ length: TOTAL_SECTIONS }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.progressDot,
                  i < filledCount && styles.progressDotActive,
                ]}
              />
            ))}
          </View>

          {/* Sleep Quality — compact card, horizontal emoji row */}
          <View style={styles.compactCard}>
            <View style={styles.compactHeader}>
              <Text style={styles.compactTitle}>Sleep quality</Text>
              <View style={styles.requiredBadge}>
                <Text style={styles.requiredBadgeText}>Required</Text>
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.emojiRow}>
                {SLEEP_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.emojiOption,
                      sleepQuality === option.value && styles.emojiOptionSelected,
                    ]}
                    onPress={() => setSleepQuality(option.value)}
                    accessibilityLabel={`Sleep quality: ${option.label}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: sleepQuality === option.value }}
                  >
                    <Text style={styles.emojiIcon}>{option.emoji}</Text>
                    <Text style={[
                      styles.emojiLabel,
                      sleepQuality === option.value && styles.emojiLabelSelected,
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Mood — compact card, horizontal emoji row */}
          <View style={styles.compactCard}>
            <View style={styles.compactHeader}>
              <Text style={styles.compactTitle}>How are they feeling?</Text>
              <View style={styles.requiredBadge}>
                <Text style={styles.requiredBadgeText}>Required</Text>
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.emojiRow}>
                {MOOD_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.emojiOption,
                      mood === option.value && styles.emojiOptionSelected,
                    ]}
                    onPress={() => setMood(option.value)}
                    accessibilityLabel={`Mood: ${option.label}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: mood === option.value }}
                  >
                    <Text style={styles.emojiIcon}>{option.emoji}</Text>
                    <Text style={[
                      styles.emojiLabel,
                      mood === option.value && styles.emojiLabelSelected,
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Energy Level — compact card, 2-column grid */}
          <View style={styles.compactCard}>
            <View style={styles.compactHeader}>
              <Text style={styles.compactTitle}>Energy level</Text>
              <View style={styles.requiredBadge}>
                <Text style={styles.requiredBadgeText}>Required</Text>
              </View>
            </View>
            <View style={styles.radioGrid}>
              {ENERGY_OPTIONS.map((option, i) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.radioOption,
                    energyLevel === option.value && styles.radioOptionSelected,
                    // Last odd item spans 2 columns
                    i === ENERGY_OPTIONS.length - 1 && ENERGY_OPTIONS.length % 2 !== 0 && styles.radioOptionSpan,
                  ]}
                  onPress={() => setEnergyLevel(option.value)}
                  accessibilityLabel={`Energy level: ${option.label}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: energyLevel === option.value }}
                >
                  <Text style={[
                    styles.radioText,
                    energyLevel === option.value && styles.radioTextSelected,
                  ]}>
                    {option.emoji} {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Orientation — always visible, Optional badge */}
          <View style={styles.compactCard}>
            <View style={styles.compactHeader}>
              <Text style={styles.compactTitle}>Orientation</Text>
              <View style={styles.optionalBadge}>
                <Text style={styles.optionalBadgeText}>Optional</Text>
              </View>
            </View>
            <View style={styles.radioGrid}>
              {ORIENTATION_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.radioOption,
                    orientation === option.value && styles.radioOptionSelected,
                  ]}
                  onPress={() => setOrientation(orientation === option.value ? null : option.value)}
                  accessibilityLabel={`Orientation: ${option.label}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: orientation === option.value }}
                >
                  <Text style={[
                    styles.radioText,
                    orientation === option.value && styles.radioTextSelected,
                  ]}>
                    {option.emoji} {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Decision Making — always visible, Optional badge */}
          <View style={styles.compactCard}>
            <View style={styles.compactHeader}>
              <Text style={styles.compactTitle}>Decision making</Text>
              <View style={styles.optionalBadge}>
                <Text style={styles.optionalBadgeText}>Optional</Text>
              </View>
            </View>
            <View style={styles.radioGrid}>
              {DECISION_MAKING_OPTIONS.map((option, i) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.radioOption,
                    decisionMaking === option.value && styles.radioOptionSelected,
                    // Last odd item spans 2 columns
                    i === DECISION_MAKING_OPTIONS.length - 1 && DECISION_MAKING_OPTIONS.length % 2 !== 0 && styles.radioOptionSpan,
                  ]}
                  onPress={() => setDecisionMaking(decisionMaking === option.value ? null : option.value)}
                  accessibilityLabel={`Decision making: ${option.label}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: decisionMaking === option.value }}
                >
                  <Text style={[
                    styles.radioText,
                    decisionMaking === option.value && styles.radioTextSelected,
                  ]}>
                    {option.emoji} {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
        </KeyboardAvoidingView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            accessibilityLabel={isSubmitting ? 'Saving wellness check' : 'Complete morning wellness check'}
            accessibilityHint="Saves morning wellness check answers"
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
    fontSize: 20,
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
    padding: 16,
  },

  // Progress dots
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 16,
  },
  progressDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  progressDotActive: {
    width: 20,
    borderRadius: 3,
    backgroundColor: Colors.accent,
  },

  // Compact card sections
  compactCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  compactTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  requiredBadge: {
    backgroundColor: 'rgba(251,191,36,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  requiredBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FBBF24',
    textTransform: 'uppercase',
  },
  optionalBadge: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  optionalBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
  },

  // Horizontal emoji row
  emojiRow: {
    flexDirection: 'row',
    gap: 8,
  },
  emojiOption: {
    minWidth: 60,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  emojiOptionSelected: {
    backgroundColor: 'rgba(20,184,166,0.2)',
    borderColor: Colors.accent,
  },
  emojiIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  emojiLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
  },
  emojiLabelSelected: {
    color: Colors.accent,
    fontWeight: '600',
  },

  // 2-column radio grid
  radioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  radioOption: {
    width: '48.5%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  radioOptionSelected: {
    backgroundColor: 'rgba(20,184,166,0.2)',
    borderColor: Colors.accent,
  },
  radioOptionSpan: {
    width: '100%',
  },
  radioText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
  },
  radioTextSelected: {
    color: Colors.accent,
    fontWeight: '600',
  },

  // Footer
  footer: {
    padding: 20,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  submitButton: {
    paddingVertical: 16,
    backgroundColor: Colors.accent,
    borderRadius: 14,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: Colors.borderStrong,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
});
