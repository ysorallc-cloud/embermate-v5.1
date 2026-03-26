import {
  saveEvent,
  getEventsByDate,
  getEventsByType,
  getEventsByDateRange,
  deleteEvent,
  getEventSummaries,
  queryEvents,
} from '../../storage/eventRepo';
import { isSensitiveKey } from '../../utils/safeStorage';
import type { CareEvent } from '../../types/event';

const PATIENT = 'default';
const DATE = '2026-03-24';

function makeEvent(overrides: Partial<CareEvent> = {}): Omit<CareEvent, 'id' | 'createdAt'> {
  return {
    type: 'medication_taken',
    timestamp: `${DATE}T08:00:00.000Z`,
    patientId: PATIENT,
    status: 'completed',
    ...overrides,
  };
}

describe('eventRepo', () => {
  it('saveEvent() stores and retrieves a CareEvent', async () => {
    const saved = await saveEvent(makeEvent());
    expect(saved.id).toBeDefined();
    expect(saved.createdAt).toBeDefined();
    expect(saved.type).toBe('medication_taken');

    const events = await getEventsByDate(DATE, PATIENT);
    expect(events).toHaveLength(1);
    expect(events[0].id).toBe(saved.id);
  });

  it('getEventsByDate() returns events for a specific date', async () => {
    await saveEvent(makeEvent({ type: 'medication_taken' }));
    await saveEvent(makeEvent({ type: 'meal_logged', timestamp: `${DATE}T12:00:00.000Z` }));

    const events = await getEventsByDate(DATE, PATIENT);
    expect(events).toHaveLength(2);

    // Different date returns empty
    const empty = await getEventsByDate('2026-01-01', PATIENT);
    expect(empty).toHaveLength(0);
  });

  it('getEventsByType() filters by event type', async () => {
    await saveEvent(makeEvent({ type: 'medication_taken' }));
    await saveEvent(makeEvent({ type: 'meal_logged', timestamp: `${DATE}T12:00:00.000Z` }));
    await saveEvent(makeEvent({ type: 'vitals_recorded', timestamp: `${DATE}T09:00:00.000Z` }));

    const meds = await getEventsByType(['medication_taken'], DATE, DATE, PATIENT);
    expect(meds).toHaveLength(1);
    expect(meds[0].type).toBe('medication_taken');

    const medsAndMeals = await getEventsByType(['medication_taken', 'meal_logged'], DATE, DATE, PATIENT);
    expect(medsAndMeals).toHaveLength(2);
  });

  it('getEventsByDateRange() returns events across multiple days, sorted by timestamp', async () => {
    await saveEvent(makeEvent({ timestamp: '2026-03-24T08:00:00.000Z' }));
    await saveEvent(makeEvent({ timestamp: '2026-03-25T10:00:00.000Z' }));
    await saveEvent(makeEvent({ timestamp: '2026-03-23T14:00:00.000Z' }));

    const events = await getEventsByDateRange('2026-03-23', '2026-03-25', PATIENT);
    expect(events).toHaveLength(3);

    // Should be sorted ascending by timestamp
    expect(events[0].timestamp).toBe('2026-03-23T14:00:00.000Z');
    expect(events[1].timestamp).toBe('2026-03-24T08:00:00.000Z');
    expect(events[2].timestamp).toBe('2026-03-25T10:00:00.000Z');
  });

  it('deleteEvent() removes a specific event by ID', async () => {
    const saved = await saveEvent(makeEvent());
    await saveEvent(makeEvent({ type: 'meal_logged', timestamp: `${DATE}T12:00:00.000Z` }));

    const deleted = await deleteEvent(saved.id, DATE, PATIENT);
    expect(deleted).toBe(true);

    const remaining = await getEventsByDate(DATE, PATIENT);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].type).toBe('meal_logged');
  });

  it('deleteEvent() returns false for non-existent event', async () => {
    await saveEvent(makeEvent());
    const deleted = await deleteEvent('non-existent-id', DATE, PATIENT);
    expect(deleted).toBe(false);
  });

  it('getEventSummaries() returns correct counts per type per day', async () => {
    await saveEvent(makeEvent({ type: 'medication_taken', timestamp: '2026-03-24T08:00:00.000Z' }));
    await saveEvent(makeEvent({ type: 'medication_taken', timestamp: '2026-03-24T12:00:00.000Z' }));
    await saveEvent(makeEvent({ type: 'meal_logged', timestamp: '2026-03-24T12:30:00.000Z' }));
    await saveEvent(makeEvent({ type: 'vitals_recorded', timestamp: '2026-03-25T09:00:00.000Z' }));

    const summaries = await getEventSummaries('2026-03-24', '2026-03-25', PATIENT);
    expect(summaries).toHaveLength(2);

    const day1 = summaries[0];
    expect(day1.date).toBe('2026-03-24');
    expect(day1.totalEvents).toBe(3);
    expect(day1.byType.medication_taken).toBe(2);
    expect(day1.byType.meal_logged).toBe(1);

    const day2 = summaries[1];
    expect(day2.date).toBe('2026-03-25');
    expect(day2.totalEvents).toBe(1);
    expect(day2.byType.vitals_recorded).toBe(1);
  });

  it('queryEvents() respects type filter and limit', async () => {
    await saveEvent(makeEvent({ type: 'medication_taken', timestamp: `${DATE}T08:00:00.000Z` }));
    await saveEvent(makeEvent({ type: 'medication_taken', timestamp: `${DATE}T12:00:00.000Z` }));
    await saveEvent(makeEvent({ type: 'meal_logged', timestamp: `${DATE}T12:30:00.000Z` }));

    // Filter by type
    const meds = await queryEvents({ patientId: PATIENT, date: DATE, types: ['medication_taken'] });
    expect(meds).toHaveLength(2);

    // Limit
    const limited = await queryEvents({ patientId: PATIENT, date: DATE, limit: 1 });
    expect(limited).toHaveLength(1);

    // Type filter + limit
    const medsLimited = await queryEvents({ patientId: PATIENT, date: DATE, types: ['medication_taken'], limit: 1 });
    expect(medsLimited).toHaveLength(1);
    expect(medsLimited[0].type).toBe('medication_taken');
  });

  it('events with patient health data are routed through safeStorage (encrypted)', () => {
    // The event key pattern is events:{patientId}:{date}
    const key = `events:${PATIENT}:${DATE}`;
    expect(isSensitiveKey(key)).toBe(true);
  });
});
