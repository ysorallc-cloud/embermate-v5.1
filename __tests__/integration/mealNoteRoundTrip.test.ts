// ============================================================================
// Meal note write→read INTEGRATION round-trip (Bug 2).
//
// The caregiver logs a meal WITH a note ("ate half the eggs"). It must reach the
// Journal / handoff. Exercises the REAL pipeline with no mocks on it:
//   saveMealsLog({ meals, description }) + logInstanceCompletion(…notes)
//   → buildCareBrief → brief.meals.meals[].description  (Meals section)
//   → LogEntry.notes                                    (Observations section)
//
// Pre-fix the note vanished: careSummaryBuilder joined the meals log on
// `m.mealType` (which log-meal never sets) so matchedMeal was always undefined,
// AND MealsDetail had no description field. logInstanceCompletion also got no
// notes, so Observations was empty too.
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveMealsLog } from '../../utils/centralStorage';
import {
  listDailyInstances, listLogsByDate, logInstanceCompletion, DEFAULT_PATIENT_ID,
} from '../../storage/carePlanRepo';
import { saveCarePlanConfig } from '../../storage/carePlanConfigRepo';
import { ensureDailyInstances, getTodayDateString } from '../../services/carePlanGenerator';
import { buildCareBrief } from '../../utils/careSummaryBuilder';
import { createDefaultCarePlanConfig, type CarePlanConfig, type MealsBucketConfig } from '../../types/carePlanConfig';

async function clearAll(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  if (keys.length > 0) await AsyncStorage.multiRemove(keys as string[]);
}

function mealsOnlyConfig(): CarePlanConfig {
  const cfg = createDefaultCarePlanConfig(DEFAULT_PATIENT_ID);
  for (const k of Object.keys(cfg) as (keyof typeof cfg)[]) {
    const b = (cfg as any)[k];
    if (b && typeof b === 'object' && 'enabled' in b && k !== 'meals') (b as any).enabled = false;
  }
  cfg.meals = { ...(cfg.meals as MealsBucketConfig), enabled: true, timesOfDay: ['morning'] } as MealsBucketConfig;
  return cfg;
}

const TODAY = getTodayDateString();
const NOTE = 'ate half the eggs, left the toast';

describe('meal note round-trip — entered note reaches the Journal/handoff', () => {
  beforeEach(async () => { await clearAll(); });

  it('saveMealsLog(description) + logInstanceCompletion(notes) → buildCareBrief surfaces both', async () => {
    await saveCarePlanConfig(mealsOnlyConfig());
    await ensureDailyInstances(DEFAULT_PATIENT_ID, TODAY);

    const breakfast = (await listDailyInstances(DEFAULT_PATIENT_ID, TODAY))
      .find(i => i.itemType === 'nutrition' && i.itemName.toLowerCase() === 'breakfast');
    expect(breakfast).toBeDefined();

    // Exactly what log-meal writes (after the fix): the description on the meals
    // log, AND the note routed into the instance completion's notes.
    await saveMealsLog({ timestamp: new Date().toISOString(), meals: ['Breakfast'], description: NOTE });
    await logInstanceCompletion(
      DEFAULT_PATIENT_ID, TODAY, breakfast!.id, 'completed',
      { type: 'nutrition', mealType: 'breakfast' } as any,
      { notes: NOTE, source: 'record' },
    );

    const brief = await buildCareBrief(TODAY);

    // (1) Meals section — the description now travels on MealsDetail.
    const briefMeal = brief.meals.meals.find(m => m.name.toLowerCase() === 'breakfast');
    expect(briefMeal).toBeDefined();
    expect(briefMeal!.description).toBe(NOTE);

    // (2) Observations section — the note is on the LogEntry.
    const logs = await listLogsByDate(DEFAULT_PATIENT_ID, TODAY);
    expect(logs.some(l => (l.notes ?? '').includes('ate half the eggs'))).toBe(true);
  });
});
