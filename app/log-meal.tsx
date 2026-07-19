// ============================================================================
// LOG MEAL — Phase 9.3 migration to LogScreen.
//
// Pre-9.3:
//   • 2x2 grid of 180pt-tall emoji-first meal-type cards.
//   • Mid-screen "She ate" sage CTA + bottom orange "Log Meal" CTA — two
//     competing primary actions plus a palette violation (c.orange =
//     #FB923C, the sole consumer of the orange token outside theme).
//   • Progress chip read getTodayProgress.meals from the legacy
//     getTodayMealsLog source path (units consistent but stale post-5.13.5
//     against the wizard-driven instance pipeline).
//
// Post-9.3:
//   • Wraps in <LogScreen> — single sage CTA, ghost cancel, compact header.
//   • Title "Meal", subtitle derived directly from listDailyInstances
//     filtered to itemType === 'nutrition' — same canonical pattern 9.2
//     established for vitals.
//   • Meal types render as a 2-column pill grid; pills < 100pt tall, no
//     emojis. Multi-select preserved (caregivers can log breakfast +
//     lunch in one save).
//   • Quick-foods filtered by selected meal type render as compact pills
//     (no emojis, sage-tinted selected state) between meal pills and the
//     time-taken row. Per-meal-type filter preserved.
//   • "Add details" expander mirrors 9.2's "More fields" pattern:
//     Pressable + chevron + conditional textarea below.
//   • Time-taken row: Just now (default) / 15 min ago / Earlier. Same
//     Phase 9 follow-up note for inline DateTimePicker.
//   • Medical disclaimer at the top of the input zone, single italic
//     textTertiary line.
//
// Dropped vs spec:
//   • Portion picker — no portion field exists in the meal data model.
//     Tracked product question; a UI-only stub or description-text
//     workaround was rejected in 9.3.0 scope discussion.
//   • "Use last meal" affordance — meal type is time-bound (auto-detect
//     from hour); a last-meal fill at 8 AM after a 7 PM dinner save
//     would be wrong. The existing getDefaultMealType() time-of-day
//     default already does the smart-default work.
//   • The mid-screen "She ate" CTA — the meal-type selection state IS
//     "she ate," conveyed by the selected pill plus the single Save CTA.
// ============================================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { navigateBack } from '../lib/navigate';
import { Colors } from '../theme/theme-tokens';
import { useTheme } from '../contexts/ThemeContext';
import { saveDailyTracking, getDailyTracking } from '../utils/dailyTrackingStorage';
import { saveMealsLog } from '../utils/centralStorage';
import { hapticSuccess } from '../utils/hapticFeedback';
import { parseCarePlanContext, getCarePlanBannerText, getPreSelectionHints } from '../utils/carePlanRouting';
import { trackCarePlanProgress } from '../utils/carePlanStorage';
import {
  logInstanceCompletion,
  listDailyInstances,
  DEFAULT_PATIENT_ID,
} from '../storage/carePlanRepo';
import { emitDataUpdate } from '../lib/events';
import { EVENT } from '../lib/eventNames';
import { logError } from '../utils/devLog';
import { getTodayDateString } from '../services/carePlanGenerator';
import { LogScreen } from '../components/logging/LogScreen';

// Auto-detect meal type from time of day. Used as the third fallback
// after `params.mealType` and CarePlan pre-selection hints. This is the
// reason "Use last meal" doesn't fit the data model (Q1 in 9.3.0).
function getDefaultMealType(): string {
  const hour = new Date().getHours();
  if (hour < 10) return 'breakfast';
  if (hour < 14) return 'lunch';
  if (hour < 19) return 'dinner';
  return 'snack';
}

const MEAL_TYPES: { id: string; label: string }[] = [
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'lunch',     label: 'Lunch' },
  { id: 'dinner',    label: 'Dinner' },
  { id: 'snack',     label: 'Snack' },
];

const QUICK_FOODS: Record<string, string[]> = {
  breakfast: ['Eggs & Toast', 'Oatmeal', 'Cereal', 'Yogurt & Fruit', 'Smoothie'],
  lunch:     ['Sandwich', 'Salad', 'Soup', 'Leftovers', 'Fast Food'],
  dinner:    ['Chicken & Veggies', 'Pasta', 'Rice & Protein', 'Takeout', 'Soup & Bread'],
  snack:     ['Fruit', 'Nuts', 'Crackers', 'Protein Bar', 'Veggies & Dip'],
};

type TimeTaken = 'now' | '15m' | 'earlier';

export default function LogMeal() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const params = useLocalSearchParams();

  const carePlanContext = parseCarePlanContext(params as Record<string, string>);
  const preSelectionHints = carePlanContext ? getPreSelectionHints(carePlanContext) : null;

  const [selectedMeals, setSelectedMeals] = useState<string[]>([]);
  const [selectedFoods, setSelectedFoods] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [timeTaken, setTimeTaken] = useState<TimeTaken>('now');
  const [mealsCompleted, setMealsCompleted] = useState(0);
  const [mealsExpected, setMealsExpected] = useState(0);

  const today = getTodayDateString();

  // Phase 9.3 — count subtitle reads from listDailyInstances directly,
  // matching 9.2's pattern. Sidesteps the legacy getTodayProgress source
  // path; getTodayProgress retires by attrition.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const instances = await listDailyInstances(DEFAULT_PATIENT_ID, today);
        if (cancelled) return;
        const nutritionInstances = instances.filter(i => i.itemType === 'nutrition');
        setMealsExpected(nutritionInstances.length);
        setMealsCompleted(nutritionInstances.filter(i => i.status === 'completed').length);
      } catch (err) {
        logError('LogMeal.loadInstances', err);
      }
    })();
    return () => { cancelled = true; };
  }, [today]);

  // Pre-select meal type and load any same-day entries.
  useEffect(() => {
    if (params.mealType) {
      setSelectedMeals([params.mealType as string]);
    } else if (preSelectionHints?.mealType) {
      const mealId = preSelectionHints.mealType.toLowerCase();
      if (MEAL_TYPES.some(m => m.id === mealId)) {
        setSelectedMeals([mealId]);
      } else {
        setSelectedMeals([getDefaultMealType()]);
      }
    } else {
      setSelectedMeals([getDefaultMealType()]);
    }
    loadExistingData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadExistingData = async () => {
    try {
      const existing = await getDailyTracking(today);
      if (existing?.meals) {
        const existingMeals: string[] = [];
        if (existing.meals.breakfast) existingMeals.push('breakfast');
        if (existing.meals.lunch) existingMeals.push('lunch');
        if (existing.meals.dinner) existingMeals.push('dinner');
        if (existingMeals.length > 0 && !params.mealType) {
          setSelectedMeals(existingMeals);
        }
      }
    } catch (error) {
      logError('LogMeal.loadExistingData', error);
    }
  };

  const toggleMealType = useCallback((mealId: string) => {
    setSelectedMeals((prev) =>
      prev.includes(mealId) ? prev.filter((id) => id !== mealId) : [...prev, mealId],
    );
  }, []);

  const toggleFood = useCallback((foodLabel: string) => {
    setSelectedFoods((prev) =>
      prev.includes(foodLabel) ? prev.filter((f) => f !== foodLabel) : [...prev, foodLabel],
    );
  }, []);

  const getFullDescription = (): string => {
    const parts: string[] = [];
    if (selectedFoods.length > 0) parts.push(selectedFoods.join(', '));
    if (description.trim()) parts.push(description.trim());
    return parts.join(' — ');
  };

  // Quick-foods row filters by selected meal types — preserves the pre-9.3
  // per-meal-type filter logic (Q3 decision).
  const relevantFoods = useMemo<string[]>(() => {
    if (selectedMeals.length === 0) return [];
    const set = new Set<string>();
    for (const m of selectedMeals) {
      for (const f of QUICK_FOODS[m] ?? []) set.add(f);
    }
    return Array.from(set);
  }, [selectedMeals]);

  const computeTimestamp = useCallback((): string => {
    const now = new Date();
    if (timeTaken === '15m') return new Date(now.getTime() - 15 * 60 * 1000).toISOString();
    if (timeTaken === 'earlier') {
      // Phase 9 follow-up: inline DateTimePicker (pattern in
      // app/appointment-form.tsx). 60-min-ago placeholder for now.
      return new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    }
    return now.toISOString();
  }, [timeTaken]);

  const canSave = selectedMeals.length > 0 && !loading;

  const handleSave = async () => {
    if (!canSave) {
      if (selectedMeals.length === 0) {
        Alert.alert('Select Meal', 'Please select at least one meal type');
      }
      return;
    }
    setLoading(true);
    try {
      const ts = computeTimestamp();
      const meals = {
        breakfast: selectedMeals.includes('breakfast'),
        lunch: selectedMeals.includes('lunch'),
        dinner: selectedMeals.includes('dinner'),
      };
      const updateData: { meals: typeof meals; notes?: string } = { meals };
      const fullDescription = getFullDescription();
      if (fullDescription) {
        const existing = await getDailyTracking(today);
        const existingNotes = existing?.notes || '';
        const mealNote = `[Meal] ${selectedMeals.join(', ')}: ${fullDescription}`;
        updateData.notes = existingNotes ? `${existingNotes}\n${mealNote}` : mealNote;
      }
      await saveDailyTracking(today, updateData);

      const mealLabels = selectedMeals.map(id => {
        const meal = MEAL_TYPES.find(m => m.id === id);
        return meal ? meal.label : id;
      });
      await saveMealsLog({
        timestamp: ts,
        meals: mealLabels,
        description: fullDescription || undefined,
      });

      if (carePlanContext) {
        await trackCarePlanProgress(
          carePlanContext.routineId,
          carePlanContext.carePlanItemId,
          { logType: 'meals' },
        );
      }

      const instanceId = params.instanceId as string | undefined;
      if (instanceId) {
        try {
          await logInstanceCompletion(
            DEFAULT_PATIENT_ID,
            today,
            instanceId,
            'completed',
            { type: 'nutrition', mealType: selectedMeals.join(', ') },
            // Route the meal note into LogEntry.notes so the Journal's
            // Observations section (which reads LogEntry.notes) surfaces it too —
            // the meal narrative reads it separately via mealsLog.description.
            { notes: fullDescription || undefined, source: 'record' },
          );
          emitDataUpdate(EVENT.DAILY_INSTANCES);
        } catch (err) {
          logError('LogMeal.completeInstance', err);
        }
      }

      await hapticSuccess();
      navigateBack();
    } catch (error) {
      logError('LogMeal.handleSave', error);
      Alert.alert('Error', 'Failed to save meal data');
    } finally {
      setLoading(false);
    }
  };

  const countSubtitle = mealsExpected > 0
    ? `${mealsCompleted} of ${mealsExpected} today`
    : undefined;

  return (
    <LogScreen
      title="Meal"
      countSubtitle={countSubtitle}
      onBack={navigateBack}
      primaryAction={{
        label: loading ? 'Saving…' : 'Save meal',
        onPress: handleSave,
        disabled: !canSave,
      }}
    >
      {/* Phase 9.3 — KAV inside children for keyboardAvoidance audit;
          primitive-level KAV is a tracked Phase 9 follow-up. */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <Text testID="log-meal-disclaimer" style={styles.disclaimer}>
          For caregiver record-keeping. Not medical advice or nutrition tracking.
        </Text>

        {/* Meal type — 2-col pill grid, no emojis, multi-select */}
        <Text style={styles.label}>Meal Type</Text>
        <View testID="log-meal-grid" style={styles.grid}>
          {MEAL_TYPES.map((meal) => {
            const selected = selectedMeals.includes(meal.id);
            return (
              <Pressable
                key={meal.id}
                testID={`log-meal-pill-${meal.id}`}
                style={[styles.pill, selected && styles.pillSelected]}
                onPress={() => toggleMealType(meal.id)}
                accessibilityRole="checkbox"
                accessibilityLabel={meal.label}
                accessibilityState={{ selected, checked: selected }}
              >
                <Text style={[styles.pillLabel, selected && styles.pillLabelSelected]}>
                  {meal.label}
                </Text>
                {selected && <Text style={styles.pillCheck}>✓</Text>}
              </Pressable>
            );
          })}
        </View>

        {/* Quick-foods row — filtered by selected meal type. Q3 preserved. */}
        {relevantFoods.length > 0 && (
          <View style={styles.quickFoodsSection}>
            <Text style={styles.label}>Quick foods</Text>
            <View style={styles.quickFoodsGrid}>
              {relevantFoods.map((food) => {
                const selected = selectedFoods.includes(food);
                return (
                  <Pressable
                    key={food}
                    testID={`log-meal-quick-${food}`}
                    style={[styles.quickFood, selected && styles.quickFoodSelected]}
                    onPress={() => toggleFood(food)}
                    accessibilityRole="checkbox"
                    accessibilityLabel={food}
                    accessibilityState={{ selected, checked: selected }}
                  >
                    <Text style={[styles.quickFoodLabel, selected && styles.quickFoodLabelSelected]}>
                      {food}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Add details expander — Q4 mirrors 9.2's "More fields" pattern */}
        <Pressable
          testID="log-meal-expander"
          style={styles.expander}
          onPress={() => setDetailsExpanded((v) => !v)}
          accessibilityRole="button"
          accessibilityState={{ expanded: detailsExpanded }}
          accessibilityLabel={detailsExpanded ? 'Hide details' : 'Add details'}
        >
          <View style={styles.expanderTextBlock}>
            <Text testID="log-meal-expander-label" style={styles.expanderLabel}>
              Add details
            </Text>
            <Text testID="log-meal-expander-subtitle" style={styles.expanderSubtitle}>
              Free-text note
            </Text>
          </View>
          <Text style={styles.expanderChevron}>{detailsExpanded ? '▴' : '▾'}</Text>
        </Pressable>

        {detailsExpanded && (
          <TextInput
            testID="log-meal-description"
            style={styles.descriptionInput}
            placeholder="Oatmeal with berries and coffee…"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
            textAlignVertical="top"
            accessibilityLabel="Meal description"
          />
        )}

        {/* Time-taken row — same shape as 9.2 */}
        <View style={styles.timeRow}>
          <Pressable
            testID="log-meal-time-now"
            style={[styles.timePill, timeTaken === 'now' && styles.timePillSelected]}
            onPress={() => setTimeTaken('now')}
            accessibilityRole="button"
            accessibilityState={{ selected: timeTaken === 'now' }}
            accessibilityLabel="Time taken: just now"
          >
            <Text style={[styles.timePillText, timeTaken === 'now' && styles.timePillTextSelected]}>
              Just now
            </Text>
          </Pressable>
          <Pressable
            testID="log-meal-time-15m"
            style={[styles.timePill, timeTaken === '15m' && styles.timePillSelected]}
            onPress={() => setTimeTaken('15m')}
            accessibilityRole="button"
            accessibilityState={{ selected: timeTaken === '15m' }}
            accessibilityLabel="Time taken: 15 minutes ago"
          >
            <Text style={[styles.timePillText, timeTaken === '15m' && styles.timePillTextSelected]}>
              15 min ago
            </Text>
          </Pressable>
          <Pressable
            testID="log-meal-time-earlier"
            style={[styles.timePill, timeTaken === 'earlier' && styles.timePillSelected]}
            onPress={() => setTimeTaken('earlier')}
            accessibilityRole="button"
            accessibilityState={{ selected: timeTaken === 'earlier' }}
            accessibilityLabel="Time taken: earlier"
          >
            <Text style={[styles.timePillText, timeTaken === 'earlier' && styles.timePillTextSelected]}>
              Earlier
            </Text>
          </Pressable>
        </View>

        {/* Care Plan context — preserved when reached from a care plan instance */}
        {carePlanContext && (
          <View style={styles.carePlanContext}>
            <Text style={styles.carePlanContextLabel}>FROM CARE PLAN</Text>
            <Text style={styles.carePlanContextText}>
              {getCarePlanBannerText(carePlanContext)}
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </LogScreen>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  kav: {
    flex: 1,
  },
  disclaimer: {
    fontSize: 12,
    fontStyle: 'italic',
    color: c.textTertiary,
    marginBottom: 16,
  },
  label: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: c.textTertiary,
    marginBottom: 8,
  },
  // 2-col pill grid: row + wrap, each pill ~48% width to give a 2-up
  // layout with a small gap between columns.
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  pill: {
    flexBasis: '48%',
    flexGrow: 1,
    minHeight: 48, // tap-target floor; explicit cap is the < 100 contract
    paddingVertical: 12, // allow: tap-target padding (Apple HIG ≥44pt)
    paddingHorizontal: 14, // allow: tap-target padding (Apple HIG ≥44pt)
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: c.glassBorder,
    backgroundColor: c.surfaceElevated,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pillSelected: {
    backgroundColor: c.accentLight,
    borderColor: c.accentBorder,
  },
  pillLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: c.textPrimary,
  },
  pillLabelSelected: {
    // Phase 9.3 — selected state keeps label color at textPrimary
    // (selectionListContrast audit). Selection conveyed by the pill's
    // accentLight background + accentBorder + the trailing checkmark.
    fontWeight: '600',
  },
  pillCheck: {
    fontSize: 14,
    fontWeight: '600',
    color: c.accent,
  },
  quickFoodsSection: {
    marginBottom: 16,
  },
  quickFoodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickFood: {
    paddingVertical: 8,
    paddingHorizontal: 14, // allow: tap-target padding (Apple HIG ≥44pt)
    borderRadius: 999,
    borderWidth: 0.5,
    borderColor: c.glassBorder,
    backgroundColor: c.surfaceElevated,
  },
  quickFoodSelected: {
    backgroundColor: c.accentLight,
    borderColor: c.accentBorder,
  },
  quickFoodLabel: {
    fontSize: 13,
    color: c.textPrimary,
  },
  quickFoodLabelSelected: {
    // selectionListContrast audit: keep label at textPrimary; selection
    // is carried by the pill background change.
    fontWeight: '500',
  },
  expander: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 0.5,
    borderTopColor: c.glassBorder,
    borderBottomWidth: 0.5,
    borderBottomColor: c.glassBorder,
    marginVertical: 8,
  },
  expanderTextBlock: {
    flex: 1,
  },
  expanderLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: c.textPrimary,
  },
  expanderSubtitle: {
    fontSize: 12,
    color: c.textTertiary,
    marginTop: 2,
  },
  expanderChevron: {
    fontSize: 12,
    color: c.textTertiary,
  },
  descriptionInput: {
    backgroundColor: c.surfaceElevated,
    borderWidth: 1,
    borderColor: c.glassBorder,
    borderRadius: 12,
    paddingHorizontal: 14, // allow: tap-target padding (Apple HIG ≥44pt)
    paddingVertical: 12,
    fontSize: 15,
    color: c.textPrimary,
    minHeight: 88,
    marginTop: 8,
    marginBottom: 16,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  timePill: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12, // allow: tap-target padding (Apple HIG ≥44pt)
    borderRadius: 999,
    borderWidth: 0.5,
    borderColor: c.glassBorder,
    alignItems: 'center',
  },
  timePillSelected: {
    backgroundColor: c.accentLight,
    borderColor: c.accentBorder,
  },
  timePillText: {
    fontSize: 12,
    color: c.textSecondary,
  },
  timePillTextSelected: {
    color: c.accent,
    fontWeight: '500',
  },
  carePlanContext: {
    backgroundColor: c.accentFaint,
    borderRadius: 10,
    padding: 12, // allow: tap-target padding (Apple HIG ≥44pt)
    marginTop: 16,
  },
  carePlanContextLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: c.accent,
    letterSpacing: 1,
    marginBottom: 4,
  },
  carePlanContextText: {
    fontSize: 13,
    color: c.textSecondary,
  },
});
