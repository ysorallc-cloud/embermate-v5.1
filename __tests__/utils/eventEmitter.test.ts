import {
  emitCareEvent,
  emitMedicationEvent,
  emitVitalsEvent,
  emitMealEvent,
  emitMoodEvent,
} from '../../utils/eventEmitter';
import { getEventsByDate } from '../../storage/eventRepo';

const PATIENT = 'default';

function todayDate(): string {
  return new Date().toISOString().split('T')[0];
}

describe('eventEmitter', () => {
  it("emitMedicationEvent() creates event with type 'medication_taken'", async () => {
    await emitMedicationEvent('med-1', 'Metformin', 'taken', { dosage: '500mg' });

    const events = await getEventsByDate(todayDate(), PATIENT);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('medication_taken');
    expect(events[0].status).toBe('completed');
    expect(events[0].metadata).toEqual(
      expect.objectContaining({ medicationId: 'med-1', medicationName: 'Metformin', dosage: '500mg' })
    );
  });

  it("emitMedicationEvent() creates event with type 'medication_skipped'", async () => {
    await emitMedicationEvent('med-2', 'Lisinopril', 'skipped');

    const events = await getEventsByDate(todayDate(), PATIENT);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('medication_skipped');
    expect(events[0].status).toBe('skipped');
  });

  it("emitVitalsEvent() creates event with type 'vitals_recorded' and metadata", async () => {
    await emitVitalsEvent({ systolic: 120, diastolic: 80, heartRate: 72, type: 'bp' });

    const events = await getEventsByDate(todayDate(), PATIENT);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('vitals_recorded');
    expect(events[0].metadata).toEqual(
      expect.objectContaining({ systolic: 120, diastolic: 80, heartRate: 72 })
    );
  });

  it("emitMealEvent() creates event with type 'meal_logged'", async () => {
    await emitMealEvent('breakfast', { quality: 'good', notes: 'Ate well' });

    const events = await getEventsByDate(todayDate(), PATIENT);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('meal_logged');
    expect(events[0].metadata).toEqual(expect.objectContaining({ mealType: 'breakfast', quality: 'good' }));
    expect(events[0].notes).toBe('Ate well');
  });

  it('emitMoodEvent() creates event with type mood_logged with score and label', async () => {
    await emitMoodEvent(4, 'Good');

    const events = await getEventsByDate(todayDate(), PATIENT);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('mood_logged');
    expect(events[0].value).toBe(4);
    expect(events[0].metadata).toEqual(expect.objectContaining({ score: 4, label: 'Good' }));
  });

  it('emitCareEvent() is the generic entry point that accepts any EventType', async () => {
    await emitCareEvent('sleep_logged', { value: 7, metadata: { hours: 7, quality: 'good' } });

    const events = await getEventsByDate(todayDate(), PATIENT);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('sleep_logged');
    expect(events[0].value).toBe(7);
  });

  it('all emitters are non-blocking (catch errors, do not throw)', async () => {
    // Mock saveEvent to throw
    const eventRepo = require('../../storage/eventRepo');
    const originalSave = eventRepo.saveEvent;
    eventRepo.saveEvent = jest.fn().mockRejectedValue(new Error('Storage full'));

    // Should NOT throw
    await expect(emitCareEvent('note_added', { notes: 'test' })).resolves.toBeUndefined();
    await expect(emitMedicationEvent('m1', 'Test', 'taken')).resolves.toBeUndefined();
    await expect(emitVitalsEvent({ bp: '120/80' })).resolves.toBeUndefined();
    await expect(emitMealEvent('lunch')).resolves.toBeUndefined();
    await expect(emitMoodEvent(3, 'Okay')).resolves.toBeUndefined();

    // Restore
    eventRepo.saveEvent = originalSave;
  });
});
