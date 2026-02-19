// ============================================================================
// LOG EVENING WELLNESS CHECK
// Mood, meals logged, day rating, highlights/concerns
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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Colors } from '../theme/theme-tokens';
import { useWellnessSettings } from '../hooks/useWellnessSettings';
import { saveEveningWellness, skipEveningWellness } from '../utils/wellnessCheckStorage';
import { listDailyInstances, logInstanceCompletion, DEFAULT_PATIENT_ID } from '../storage/carePlanRepo';
import { getTodayDateString } from '../services/carePlanGenerator';

const MOOD_OPTIONS = [
  { value: 5, emoji: '😄', label: 'Great' },
  { value: 4, emoji: '🙂', label: 'Good' },
  { value: 3, emoji: '😐', label: 'Managing' },
  { value: 2, emoji: '😟', label: 'Difficult' },
  { value: 1, emoji: '😢', label: 'Struggling' },
] as const;

const DAY_RATING_OPTIONS = [
  { value: 5, emoji: '⭐⭐⭐⭐⭐', label: 'Excellent' },
  { value: 4, emoji: '⭐⭐⭐⭐', label: 'Good' },
  { value: 3, emoji: '⭐⭐⭐', label: 'Okay' },
  { value: 2, emoji: '⭐⭐', label: 'Difficult' },
  { value: 1, emoji: '⭐', label: 'Very Hard' },
] as const;

const PAIN_LEVEL_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'mild', label: 'Mild' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'severe', label: 'Severe' },
] as const;

const ALERTNESS_OPTIONS = [
  { value: 'alert', label: 'Alert' },
  { value: 'confused', label: 'Confused' },
  { value: 'drowsy', label: 'Drowsy' },
  { value: 'unresponsive', label: 'Unresponsive' },
] as const;

const BOWEL_OPTIONS = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'unknown', label: 'Unknown' },
] as const;

const BATHING_OPTIONS = [
  { value: 'independent', label: 'Independent' },
  { value: 'partial-assist', label: 'Partial Assist' },
  { value: 'full-assist', label: 'Full Assist' },
  { value: 'not-today', label: 'Not Today' },
] as const;

const MOBILITY_OPTIONS = [
  { value: 'independent', label: 'Independent' },
  { value: 'walker', label: 'Walker' },
  { value: 'cane', label: 'Cane' },
  { value: 'wheelchair', label: 'Wheelchair' },
  { value: 'bed-bound', label: 'Bed-bound' },
] as const;

export default function LogEveningWellnessScreen() {
  const router = useRouter();
  const { settings } = useWellnessSettings();
  const eveningOptional = settings.evening.optionalChecks ?? {};
  const hasAnyOptionalEnabled = Object.values(eveningOptional).some(Boolean);
  const [mood, setMood] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [mealsLogged, setMealsLogged] = useState(false);
  const [dayRating, setDayRating] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [highlights, setHighlights] = useState('');
  const [concerns, setConcerns] = useState('');
  const [showCareDetails, setShowCareDetails] = useState(false);
  const [painLevel, setPainLevel] = useState<'none' | 'mild' | 'moderate' | 'severe' | null>(null);
  const [alertness, setAlertness] = useState<'alert' | 'confused' | 'drowsy' | 'unresponsive' | null>(null);
  const [bowelMovement, setBowelMovement] = useState<'yes' | 'no' | 'unknown' | null>(null);
  const [bathingStatus, setBathingStatus] = useState<'independent' | 'partial-assist' | 'full-assist' | 'not-today' | null>(null);
  const [mobilityStatus, setMobilityStatus] = useState<'independent' | 'walker' | 'cane' | 'wheelchair' | 'bed-bound' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = mood !== null && dayRating !== null;

  const handleSkip = async () => {
    Alert.alert(
      'Skip Evening Wellness Check?',
      'This will mark the check as complete without logging details.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          style: 'destructive',
          onPress: async () => {
            try {
              const today = getTodayDateString();
              await skipEveningWellness(today);
              // Bridge to care plan instance
              try {
                const instances = await listDailyInstances(DEFAULT_PATIENT_ID, today);
                const inst = instances.find(i => i.itemType === 'wellness' && i.windowLabel === 'evening' && i.status === 'pending');
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
      const today = getTodayDateString();
      await saveEveningWellness(today, {
        mood: mood!,
        mealsLogged,
        dayRating: dayRating!,
        highlights: highlights || undefined,
        concerns: concerns || undefined,
        ...(painLevel && { painLevel }),
        ...(alertness && { alertness }),
        ...(bowelMovement && { bowelMovement }),
        ...(bathingStatus && { bathingStatus }),
        ...(mobilityStatus && { mobilityStatus }),
        completedAt: new Date(),
      });
      // Bridge to care plan instance
      try {
        const instances = await listDailyInstances(DEFAULT_PATIENT_ID, today);
        const inst = instances.find(i => i.itemType === 'wellness' && i.windowLabel === 'evening' && i.status === 'pending');
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
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} accessibilityLabel="Go back" accessibilityRole="button">
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Evening Wellness Check</Text>
          <TouchableOpacity onPress={handleSkip} accessibilityLabel="Skip evening wellness check" accessibilityRole="button">
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }} keyboardVerticalOffset={100}>
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Mood */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How are they feeling now?</Text>
            <View style={styles.optionGrid}>
              {MOOD_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionButton,
                    mood === option.value && styles.optionButtonSelected,
                  ]}
                  onPress={() => setMood(option.value)}
                  accessibilityLabel={option.label}
                  accessibilityRole="radio"
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

          {/* Meals Logged */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Meals tracked today?</Text>
            <TouchableOpacity
              style={styles.toggleRow}
              onPress={() => setMealsLogged(!mealsLogged)}
              accessibilityLabel="Meals were logged today"
              accessibilityRole="checkbox"
              accessibilityState={{ checked: mealsLogged }}
            >
              <View
                style={[
                  styles.checkbox,
                  mealsLogged && styles.checkboxChecked,
                ]}
              >
                {mealsLogged && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.toggleLabel}>
                Yes, meals were logged in Quick Log
              </Text>
            </TouchableOpacity>
          </View>

          {/* Day Rating */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How was the day overall?</Text>
            <View style={styles.ratingList}>
              {DAY_RATING_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.ratingOption,
                    dayRating === option.value && styles.ratingOptionSelected,
                  ]}
                  onPress={() => setDayRating(option.value)}
                  accessibilityLabel={option.label}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: dayRating === option.value }}
                >
                  <Text style={styles.ratingEmoji}>{option.emoji}</Text>
                  <Text
                    style={[
                      styles.ratingLabel,
                      dayRating === option.value && styles.ratingLabelSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                  <View
                    style={[
                      styles.radio,
                      dayRating === option.value && styles.radioSelected,
                    ]}
                  >
                    {dayRating === option.value && (
                      <View style={styles.radioDot} />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Highlights (Optional) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Any highlights today?</Text>
            <Text style={styles.sectionSubtitle}>Optional</Text>
            <TextInput
              style={styles.textInput}
              value={highlights}
              onChangeText={setHighlights}
              placeholder="Good moments, wins, positives..."
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={3}
              accessibilityLabel="Today's highlights"
            />
          </View>

          {/* Concerns (Optional) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Any concerns?</Text>
            <Text style={styles.sectionSubtitle}>Optional</Text>
            <TextInput
              style={styles.textInput}
              value={concerns}
              onChangeText={setConcerns}
              placeholder="Things to watch, issues to discuss..."
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={3}
              accessibilityLabel="Today's concerns"
            />
          </View>

          {/* Care Details (collapsible, only shown if any optional field is enabled) */}
          {hasAnyOptionalEnabled && (
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.careDetailsToggle}
                onPress={() => setShowCareDetails(!showCareDetails)}
                accessibilityLabel="Add care details"
                accessibilityRole="button"
                accessibilityState={{ expanded: showCareDetails }}
              >
                <Text style={styles.careDetailsToggleText}>
                  Add care details (optional)
                </Text>
                <Text style={styles.careDetailsToggleArrow}>
                  {showCareDetails ? '▲' : '▼'}
                </Text>
              </TouchableOpacity>

              {showCareDetails && (
                <View style={styles.careDetailsContent}>
                  {/* Pain Level */}
                  {(eveningOptional.painLevel ?? false) && (
                    <View style={styles.careDetailGroup}>
                      <Text style={styles.careDetailLabel}>Pain Level</Text>
                      <View style={styles.chipRow}>
                        {PAIN_LEVEL_OPTIONS.map((option) => (
                          <TouchableOpacity
                            key={option.value}
                            style={[
                              styles.chip,
                              painLevel === option.value && styles.chipSelected,
                            ]}
                            onPress={() => setPainLevel(painLevel === option.value ? null : option.value)}
                            accessibilityLabel={option.label}
                            accessibilityRole="radio"
                            accessibilityState={{ selected: painLevel === option.value }}
                          >
                            <Text
                              style={[
                                styles.chipText,
                                painLevel === option.value && styles.chipTextSelected,
                              ]}
                            >
                              {option.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Alertness */}
                  {(eveningOptional.alertness ?? false) && (
                    <View style={styles.careDetailGroup}>
                      <Text style={styles.careDetailLabel}>Alertness</Text>
                      <View style={styles.chipRow}>
                        {ALERTNESS_OPTIONS.map((option) => (
                          <TouchableOpacity
                            key={option.value}
                            style={[
                              styles.chip,
                              alertness === option.value && styles.chipSelected,
                            ]}
                            onPress={() => setAlertness(alertness === option.value ? null : option.value)}
                            accessibilityLabel={option.label}
                            accessibilityRole="radio"
                            accessibilityState={{ selected: alertness === option.value }}
                          >
                            <Text
                              style={[
                                styles.chipText,
                                alertness === option.value && styles.chipTextSelected,
                              ]}
                            >
                              {option.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Bowel Movement */}
                  {(eveningOptional.bowelMovement ?? false) && (
                    <View style={styles.careDetailGroup}>
                      <Text style={styles.careDetailLabel}>Bowel Movement</Text>
                      <View style={styles.chipRow}>
                        {BOWEL_OPTIONS.map((option) => (
                          <TouchableOpacity
                            key={option.value}
                            style={[
                              styles.chip,
                              bowelMovement === option.value && styles.chipSelected,
                            ]}
                            onPress={() => setBowelMovement(bowelMovement === option.value ? null : option.value)}
                            accessibilityLabel={option.label}
                            accessibilityRole="radio"
                            accessibilityState={{ selected: bowelMovement === option.value }}
                          >
                            <Text
                              style={[
                                styles.chipText,
                                bowelMovement === option.value && styles.chipTextSelected,
                              ]}
                            >
                              {option.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Bathing */}
                  {(eveningOptional.bathingStatus ?? false) && (
                    <View style={styles.careDetailGroup}>
                      <Text style={styles.careDetailLabel}>Bathing</Text>
                      <View style={styles.chipRow}>
                        {BATHING_OPTIONS.map((option) => (
                          <TouchableOpacity
                            key={option.value}
                            style={[
                              styles.chip,
                              bathingStatus === option.value && styles.chipSelected,
                            ]}
                            onPress={() => setBathingStatus(bathingStatus === option.value ? null : option.value)}
                            accessibilityLabel={option.label}
                            accessibilityRole="radio"
                            accessibilityState={{ selected: bathingStatus === option.value }}
                          >
                            <Text
                              style={[
                                styles.chipText,
                                bathingStatus === option.value && styles.chipTextSelected,
                              ]}
                            >
                              {option.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Mobility */}
                  {(eveningOptional.mobilityStatus ?? false) && (
                    <View style={styles.careDetailGroup}>
                      <Text style={styles.careDetailLabel}>Mobility</Text>
                      <View style={styles.chipRow}>
                        {MOBILITY_OPTIONS.map((option) => (
                          <TouchableOpacity
                            key={option.value}
                            style={[
                              styles.chip,
                              mobilityStatus === option.value && styles.chipSelected,
                            ]}
                            onPress={() => setMobilityStatus(mobilityStatus === option.value ? null : option.value)}
                            accessibilityLabel={option.label}
                            accessibilityRole="radio"
                            accessibilityState={{ selected: mobilityStatus === option.value }}
                          >
                            <Text
                              style={[
                                styles.chipText,
                                mobilityStatus === option.value && styles.chipTextSelected,
                              ]}
                            >
                              {option.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}
        </ScrollView>
        </KeyboardAvoidingView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            accessibilityLabel={isSubmitting ? 'Saving evening wellness check' : 'Complete evening wellness check'}
            accessibilityHint="Saves evening wellness check answers"
            accessibilityRole="button"
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
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 12,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
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
    backgroundColor: Colors.accentHint,
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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginTop: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
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
  toggleLabel: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  ratingList: {
    gap: 12,
    marginTop: 12,
  },
  ratingOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  ratingOptionSelected: {
    backgroundColor: Colors.accentHint,
    borderColor: Colors.accent,
  },
  ratingEmoji: {
    fontSize: 20,
  },
  ratingLabel: {
    flex: 1,
    fontSize: 15,
    color: Colors.textSecondary,
  },
  ratingLabelSelected: {
    color: Colors.accent,
    fontWeight: '600',
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
  textInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
    color: Colors.textPrimary,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top',
    marginTop: 12,
  },
  // Care Details collapsible section
  careDetailsToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
  },
  careDetailsToggleText: {
    fontSize: 15,
    color: Colors.textMuted,
  },
  careDetailsToggleArrow: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  careDetailsContent: {
    marginTop: 16,
    gap: 20,
  },
  careDetailGroup: {
    gap: 8,
  },
  careDetailLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
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
    backgroundColor: Colors.borderStrong,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
});
