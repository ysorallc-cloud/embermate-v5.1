import {
  getWaterCountFromEvents,
  getMoodFromEvents,
  getVitalsFromEvents,
  getMealsFromEvents,
} from '../../utils/eventAdapters';
import { saveEvent } from '../../storage/eventRepo';

const PATIENT = 'default';
const DATE = '2026-03-24';

describe('eventAdapters', () => {
  it('getWaterCountFromEvents() returns 0 when no events exist', async () => {
    const count = await getWaterCountFromEvents(DATE);
    expect(count).toBe(0);
  });

  it('getWaterCountFromEvents() returns latest hydration value', async () => {
    await saveEvent({
      type: 'hydration_logged',
      timestamp: `${DATE}T08:00:00.000Z`,
      patientId: PATIENT,
      value: 2,
      metadata: { glasses: 2 },
    });
    await saveEvent({
      type: 'hydration_logged',
      timestamp: `${DATE}T12:00:00.000Z`,
      patientId: PATIENT,
      value: 5,
      metadata: { glasses: 5 },
    });

    const count = await getWaterCountFromEvents(DATE);
    expect(count).toBe(5);
  });

  it('getMoodFromEvents() returns null when no mood logged', async () => {
    const mood = await getMoodFromEvents(DATE);
    expect(mood).toBeNull();
  });

  it('getMoodFromEvents() returns score and label from latest event', async () => {
    await saveEvent({
      type: 'mood_logged',
      timestamp: `${DATE}T09:00:00.000Z`,
      patientId: PATIENT,
      value: 2,
      metadata: { score: 2, label: 'Struggling' },
    });
    await saveEvent({
      type: 'mood_logged',
      timestamp: `${DATE}T15:00:00.000Z`,
      patientId: PATIENT,
      value: 4,
      metadata: { score: 4, label: 'Good' },
    });

    const mood = await getMoodFromEvents(DATE);
    expect(mood).not.toBeNull();
    expect(mood!.score).toBe(4);
    expect(mood!.label).toBe('Good');
  });

  it('getVitalsFromEvents() returns array of vitals events for date', async () => {
    await saveEvent({
      type: 'vitals_recorded',
      timestamp: `${DATE}T08:00:00.000Z`,
      patientId: PATIENT,
      metadata: { systolic: 120, diastolic: 80, type: 'bp' },
    });
    await saveEvent({
      type: 'vitals_recorded',
      timestamp: `${DATE}T16:00:00.000Z`,
      patientId: PATIENT,
      metadata: { systolic: 130, diastolic: 85, type: 'bp' },
    });
    // Non-vitals event — should not be included
    await saveEvent({
      type: 'meal_logged',
      timestamp: `${DATE}T12:00:00.000Z`,
      patientId: PATIENT,
    });

    const vitals = await getVitalsFromEvents(DATE);
    expect(vitals).toHaveLength(2);
    expect(vitals[0].type).toBe('vitals_recorded');
    expect(vitals[1].type).toBe('vitals_recorded');
  });

  it('getMealsFromEvents() returns array of meal events for date', async () => {
    await saveEvent({
      type: 'meal_logged',
      timestamp: `${DATE}T08:00:00.000Z`,
      patientId: PATIENT,
      metadata: { mealType: 'breakfast', quality: 'good' },
    });
    await saveEvent({
      type: 'meal_logged',
      timestamp: `${DATE}T12:00:00.000Z`,
      patientId: PATIENT,
      metadata: { mealType: 'lunch', quality: 'fair' },
    });
    // Non-meal event
    await saveEvent({
      type: 'medication_taken',
      timestamp: `${DATE}T09:00:00.000Z`,
      patientId: PATIENT,
    });

    const meals = await getMealsFromEvents(DATE);
    expect(meals).toHaveLength(2);
    expect(meals[0].metadata?.mealType).toBe('breakfast');
    expect(meals[1].metadata?.mealType).toBe('lunch');
  });
});
