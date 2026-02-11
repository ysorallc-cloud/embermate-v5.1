// ============================================================================
// LOG MEAL SCREEN
// Individual meal logging with meal type and optional description
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors, BorderRadius, Spacing } from '../theme/theme-tokens';
import { saveDailyTracking, getDailyTracking } from '../utils/dailyTrackingStorage';
import { saveMealsLog, getTodayMealsLog, MealsLog } from '../utils/centralStorage';
import { hapticSuccess } from '../utils/hapticFeedback';
import { getTodayProgress, TodayProgress } from '../utils/rhythmStorage';
import { parseCarePlanContext, getCarePlanBannerText, getPreSelectionHints } from '../utils/carePlanRouting';
import { trackCarePlanProgress } from '../utils/carePlanStorage';

const MEAL_TYPES = [
  { id: 'breakfast', label: 'Breakfast', icon: '🌅' },
  { id: 'lunch', label: 'Lunch', icon: '☀️' },
  { id: 'dinner', label: 'Dinner', icon: '🌙' },
  { id: 'snack', label: 'Snack', icon: '🍎' },
];

export default function LogMeal() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Parse CarePlan context from navigation params
  const carePlanContext = parseCarePlanContext(params as Record<string, string>);
  const isFromCarePlan = carePlanContext !== null;
  const preSelectionHints = carePlanContext ? getPreSelectionHints(carePlanContext) : null;

  const [selectedMeals, setSelectedMeals] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<TodayProgress | null>(null);

  const today = new Date().toISOString().split('T')[0];

  // Load rhythm progress on mount
  useEffect(() => {
    const loadProgress = async () => {
      const progressData = await getTodayProgress();
      setProgress(progressData);
    };
    loadProgress();
  }, []);

  // Pre-select meal type if passed via params or CarePlan context
  useEffect(() => {
    // First priority: explicit mealType param
    if (params.mealType) {
      setSelectedMeals([params.mealType as string]);
    }
    // Second priority: CarePlan context hints
    else if (preSelectionHints?.mealType) {
      const mealId = preSelectionHints.mealType.toLowerCase();
      if (MEAL_TYPES.some(m => m.id === mealId)) {
        setSelectedMeals([mealId]);
      }
    }
    loadExistingData();
  }, []);

  const loadExistingData = async () => {
    try {
      const existing = await getDailyTracking(today);
      if (existing?.meals) {
        const existingMeals: string[] = [];
        if (existing.meals.breakfast) existingMeals.push('breakfast');
        if (existing.meals.lunch) existingMeals.push('lunch');
        if (existing.meals.dinner) existingMeals.push('dinner');
        // Note: snack not stored in DailyTrackingLog.meals, but we still show it
        if (existingMeals.length > 0 && !params.mealType) {
          // Don't override if user came with a specific meal type
          setSelectedMeals(existingMeals);
        }
      }
    } catch (error) {
      console.error('Error loading existing meal data:', error);
    }
  };

  const toggleMealType = (mealId: string) => {
    setSelectedMeals((prev) =>
      prev.includes(mealId)
        ? prev.filter((id) => id !== mealId)
        : [...prev, mealId]
    );
  };

  const handleSave = async () => {
    if (selectedMeals.length === 0) {
      Alert.alert('Select Meal', 'Please select at least one meal type');
      return;
    }

    setLoading(true);
    try {
      // Build meals object for dailyTrackingStorage
      const meals = {
        breakfast: selectedMeals.includes('breakfast'),
        lunch: selectedMeals.includes('lunch'),
        dinner: selectedMeals.includes('dinner'),
      };

      // If there's a description, we could save it to notes
      // For now, just save the meal tracking
      const updateData: { meals: typeof meals; notes?: string } = { meals };

      // Optionally append meal description to notes
      if (description.trim()) {
        const existing = await getDailyTracking(today);
        const existingNotes = existing?.notes || '';
        const mealNote = `[Meal] ${selectedMeals.join(', ')}: ${description}`;
        updateData.notes = existingNotes
          ? `${existingNotes}\n${mealNote}`
          : mealNote;
      }

      // Save to dailyTrackingStorage (legacy)
      await saveDailyTracking(today, updateData);

      // Also save to centralStorage for Now page sync
      // Convert meal IDs to display labels
      const mealLabels = selectedMeals.map(id => {
        const meal = MEAL_TYPES.find(m => m.id === id);
        return meal ? meal.label : id;
      });

      await saveMealsLog({
        timestamp: new Date().toISOString(),
        meals: mealLabels,
        description: description.trim() || undefined,
      });

      // Track CarePlan progress if navigated from CarePlan
      if (carePlanContext) {
        await trackCarePlanProgress(
          carePlanContext.routineId,
          carePlanContext.carePlanItemId,
          { logType: 'meals' }
        );
      }

      await hapticSuccess();
      router.back();
    } catch (error) {
      console.error('Error saving meal:', error);
      Alert.alert('Error', 'Failed to save meal data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
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
              <Text style={styles.title}>Log Meal</Text>
              <View style={{ width: 44 }} />
            </View>

            {/* CarePlan context banner */}
            {isFromCarePlan && carePlanContext && (
              <View style={[styles.contextBanner, styles.carePlanBanner]}>
                <Text style={styles.carePlanBannerLabel}>FROM CARE PLAN</Text>
                <Text style={styles.contextText}>
                  {getCarePlanBannerText(carePlanContext)}
                </Text>
              </View>
            )}

            {/* Rhythm context banner (fallback when not from CarePlan) */}
            {!isFromCarePlan && progress && progress.meals.expected > 0 && (
              <View style={styles.contextBanner}>
                <Text style={styles.contextText}>
                  {progress.meals.completed} of {progress.meals.expected} meals logged today
                </Text>
              </View>
            )}

            {/* Meal Type Selection */}
            <View style={styles.section}>
              <Text style={styles.label}>Meal Type</Text>
              <View style={styles.mealGrid}>
                {MEAL_TYPES.map((meal) => (
                  <TouchableOpacity
                    key={meal.id}
                    style={[
                      styles.mealCard,
                      selectedMeals.includes(meal.id) && styles.mealCardSelected,
                    ]}
                    onPress={() => toggleMealType(meal.id)}
                    accessibilityLabel={`${meal.label}, ${selectedMeals.includes(meal.id) ? 'selected' : 'not selected'}`}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selectedMeals.includes(meal.id) }}
                  >
                    <Text style={styles.mealIcon}>{meal.icon}</Text>
                    <Text
                      style={[
                        styles.mealLabel,
                        selectedMeals.includes(meal.id) && styles.mealLabelSelected,
                      ]}
                    >
                      {meal.label}
                    </Text>
                    {selectedMeals.includes(meal.id) && (
                      <View style={styles.checkBadge}>
                        <Text style={styles.checkBadgeText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.hint}>Tap to select one or more meals</Text>
            </View>

            {/* Description (Optional) */}
            <View style={styles.section}>
              <Text style={styles.label}>What did you eat? (optional)</Text>
              <TextInput
                style={styles.descriptionInput}
                placeholder="Oatmeal with berries and coffee..."
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={4}
                value={description}
                onChangeText={setDescription}
                textAlignVertical="top"
                accessibilityLabel="Meal description"
              />
            </View>

            <View style={{ height: 100 }} />
          </ScrollView>

          {/* Footer Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.saveButton,
                loading && styles.saveButtonDisabled,
                selectedMeals.length === 0 && styles.saveButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={loading || selectedMeals.length === 0}
              accessibilityLabel={loading ? 'Saving meal' : 'Log meal'}
              accessibilityRole="button"
              accessibilityState={{ disabled: loading || selectedMeals.length === 0 }}
            >
              <Text style={styles.saveButtonText}>
                {loading ? 'Saving...' : 'Log Meal'}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
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
  scrollView: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(13, 148, 136, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 20,
    color: Colors.textPrimary,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textPrimary,
  },

  // Rhythm context banner
  contextBanner: {
    backgroundColor: 'rgba(74, 222, 128, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.15)',
    borderRadius: 10,
    padding: 10,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
  },
  carePlanBanner: {
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  carePlanBannerLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(167, 139, 250, 0.9)',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 4,
  },
  contextText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },

  // Section
  section: {
    padding: Spacing.xl,
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.accent,
    marginBottom: Spacing.lg,
  },
  hint: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: Spacing.md,
    textAlign: 'center',
  },

  // Meal Grid
  mealGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  mealCard: {
    width: '47%',
    backgroundColor: 'rgba(13, 148, 136, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.15)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    position: 'relative',
  },
  mealCardSelected: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: Colors.green,
  },
  mealIcon: {
    fontSize: 32,
    marginBottom: Spacing.sm,
  },
  mealLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  mealLabelSelected: {
    color: Colors.green,
    fontWeight: '600',
  },
  checkBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBadgeText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: 'bold',
  },

  // Description Input
  descriptionInput: {
    backgroundColor: 'rgba(13, 148, 136, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.15)',
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    color: Colors.textPrimary,
    fontSize: 15,
    minHeight: 120,
  },

  // Footer
  footer: {
    padding: Spacing.xl,
    paddingBottom: Spacing.xxl,
    borderTopWidth: 1,
    borderTopColor: 'rgba(20, 184, 166, 0.15)',
    backgroundColor: Colors.background,
  },
  saveButton: {
    backgroundColor: Colors.orange,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});
