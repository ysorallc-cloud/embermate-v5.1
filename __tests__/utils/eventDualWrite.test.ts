// ============================================================================
// Event Dual Write — Verify existing save functions also create CareEvents
// ============================================================================

import { getEventsByDate } from '../../storage/eventRepo';
import { saveVitalsLog, saveMoodLog, saveSleepLog, saveMealsLog } from '../../utils/centralStorage';
import { saveNote } from '../../utils/noteStorage';

const PATIENT = 'default';

function todayDate(): string {
  return new Date().toISOString().split('T')[0];
}

describe('Event dual-write', () => {
  it('saving vitals also creates a vitals_recorded CareEvent', async () => {
    await saveVitalsLog({
      timestamp: new Date().toISOString(),
      systolic: 120,
      diastolic: 80,
      heartRate: 72,
    });

    const events = await getEventsByDate(todayDate(), PATIENT);
    const vitalsEvents = events.filter(e => e.type === 'vitals_recorded');
    expect(vitalsEvents.length).toBeGreaterThanOrEqual(1);
  });

  it('saving a mood log also creates a mood_logged CareEvent', async () => {
    await saveMoodLog({
      timestamp: new Date().toISOString(),
      mood: 4,
      energy: 3,
      pain: 1,
    });

    const events = await getEventsByDate(todayDate(), PATIENT);
    const moodEvents = events.filter(e => e.type === 'mood_logged');
    expect(moodEvents.length).toBeGreaterThanOrEqual(1);
  });

  it('saving a sleep log also creates a sleep_logged CareEvent', async () => {
    await saveSleepLog({
      timestamp: new Date().toISOString(),
      hours: 7.5,
      quality: 4,
    });

    const events = await getEventsByDate(todayDate(), PATIENT);
    const sleepEvents = events.filter(e => e.type === 'sleep_logged');
    expect(sleepEvents.length).toBeGreaterThanOrEqual(1);
  });

  it('saving a meal log also creates a meal_logged CareEvent', async () => {
    await saveMealsLog({
      timestamp: new Date().toISOString(),
      mealType: 'breakfast',
      items: ['oatmeal'],
    } as any);

    const events = await getEventsByDate(todayDate(), PATIENT);
    const mealEvents = events.filter(e => e.type === 'meal_logged');
    expect(mealEvents.length).toBeGreaterThanOrEqual(1);
  });

  it('saving a note also creates a note_added CareEvent', async () => {
    await saveNote({
      content: 'Patient seemed tired today',
      timestamp: new Date().toISOString(),
      date: todayDate(),
    });

    const events = await getEventsByDate(todayDate(), PATIENT);
    const noteEvents = events.filter(e => e.type === 'note_added');
    expect(noteEvents.length).toBeGreaterThanOrEqual(1);
  });

  it('if emitCareEvent throws, the original save still succeeds', async () => {
    // Mock the eventRepo.saveEvent to throw
    const eventRepo = require('../../storage/eventRepo');
    const originalSave = eventRepo.saveEvent;
    eventRepo.saveEvent = jest.fn().mockRejectedValue(new Error('Event store full'));

    // Original save should still succeed (not throw)
    await expect(saveVitalsLog({
      timestamp: new Date().toISOString(),
      systolic: 130,
      diastolic: 85,
    })).resolves.not.toThrow();

    // Restore
    eventRepo.saveEvent = originalSave;
  });

  it('event source field is set to dedicated_screen for full-screen logs', async () => {
    await saveNote({
      content: 'Testing source field',
      timestamp: new Date().toISOString(),
      date: todayDate(),
    });

    const events = await getEventsByDate(todayDate(), PATIENT);
    const noteEvents = events.filter(e => e.type === 'note_added');
    expect(noteEvents.length).toBeGreaterThanOrEqual(1);
    expect(noteEvents[noteEvents.length - 1].source).toBe('dedicated_screen');
  });
});
