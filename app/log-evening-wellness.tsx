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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Colors } from '../theme/theme-tokens';
import { saveEveningWellness, skipEveningWellness } from '../utils/wellnessCheckStorage';
import { format } from 'date-fns';

const MOOD_OPTIONS = [
  { value: 'great', emoji: '😄', label: 'Great' },
  { value: 'good', emoji: '🙂', label: 'Good' },
  { value: 'managing', emoji: '😐', label: 'Managing' },
  { value: 'difficult', emoji: '😟', label: 'Difficult' },
  { value: 'struggling', emoji: '😢', label: 'Struggling' },
] as const;

const DAY_RATING_OPTIONS = [
  { value: 5, emoji: '⭐⭐⭐⭐⭐', label: 'Excellent' },
  { value: 4, emoji: '⭐⭐⭐⭐', label: 'Good' },
  { value: 3, emoji: '⭐⭐⭐', label: 'Okay' },
  { value: 2, emoji: '⭐⭐', label: 'Difficult' },
  { value: 1, emoji: '⭐', label: 'Very Hard' },
] as const;

export default function LogEveningWellnessScreen() {
  const router = useRouter();
  const [mood, setMood] = useState<'struggling' | 'difficult' | 'managing' | 'good' | 'great' | null>(null);
  const [mealsLogged, setMealsLogged] = useState(false);
  const [dayRating, setDayRating] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [highlights, setHighlights] = useState('');
  const [concerns, setConcerns] = useState('');
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
              const today = format(new Date(), 'yyyy-MM-dd');
              await skipEveningWellness(today);
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
      await saveEveningWellness(today, {
        mood: mood!,
        mealsLogged,
        dayRating: dayRating!,
        highlights: highlights || undefined,
        concerns: concerns || undefined,
        completedAt: new Date(),
      });
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
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Evening Wellness Check</Text>
          <TouchableOpacity onPress={handleSkip}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>

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
            />
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit || isSubmitting}
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
    color: '#FFFFFF',
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
    backgroundColor: 'rgba(20, 184, 166, 0.15)',
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
