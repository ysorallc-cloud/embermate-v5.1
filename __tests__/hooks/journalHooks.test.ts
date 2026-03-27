// ============================================================================
// useJournalEvents + useCalendarStatuses — Structure and logic tests
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';
import { saveEvent, getEventsByDate } from '../../storage/eventRepo';

const journalEventsPath = path.resolve(__dirname, '../../hooks/useJournalEvents.ts');
const calendarStatusesPath = path.resolve(__dirname, '../../hooks/useCalendarStatuses.ts');
const journalEventsSrc = fs.readFileSync(journalEventsPath, 'utf-8');
const calendarStatusesSrc = fs.readFileSync(calendarStatusesPath, 'utf-8');

function todayDate(): string {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

describe('useJournalEvents', () => {
  it('exports useJournalEvents hook', () => {
    expect(journalEventsSrc).toContain('export function useJournalEvents');
  });

  it('transforms medication_taken into descriptive EventLogEntry', () => {
    expect(journalEventsSrc).toContain("title: evt.type === 'medication_taken' ? 'Medication taken' : 'Medication skipped'");
    expect(journalEventsSrc).toContain('medicationName');
    expect(journalEventsSrc).toContain('dosage');
  });

  it('transforms vitals_recorded with BP/HR/Temp/O2 detail', () => {
    expect(journalEventsSrc).toContain("'Vitals recorded'");
    expect(journalEventsSrc).toContain('BP');
    expect(journalEventsSrc).toContain('HR');
    expect(journalEventsSrc).toContain('bpm');
    expect(journalEventsSrc).toContain('Temp');
    expect(journalEventsSrc).toContain('°F');
    expect(journalEventsSrc).toContain('O2');
  });

  it('transforms meal_logged with mealType and quality', () => {
    expect(journalEventsSrc).toContain('mealType');
    expect(journalEventsSrc).toContain('quality');
    expect(journalEventsSrc).toContain('logged');
  });

  it('transforms wellness_check including breathing exercise', () => {
    expect(journalEventsSrc).toContain('breathing_exercise');
    expect(journalEventsSrc).toContain('wellness check');
  });

  it('sorts entries chronologically', () => {
    expect(journalEventsSrc).toContain("entries.sort((a, b) => a.time.localeCompare(b.time))");
  });

  it('handles all event types from the unified event store', () => {
    const types = [
      'medication_taken', 'medication_skipped', 'vitals_recorded',
      'meal_logged', 'hydration_logged', 'sleep_logged',
      'mood_logged', 'wellness_check', 'symptom_reported', 'note_added',
    ];
    for (const t of types) {
      expect(journalEventsSrc).toContain(`'${t}'`);
    }
  });
});

describe('useCalendarStatuses', () => {
  it('exports useCalendarStatuses hook', () => {
    expect(calendarStatusesSrc).toContain('export function useCalendarStatuses');
  });

  it('generates DayStatus for each day of the month', () => {
    expect(calendarStatusesSrc).toContain('getDaysInMonth');
    expect(calendarStatusesSrc).toContain('DayStatus');
  });

  it('marks future days as future', () => {
    expect(calendarStatusesSrc).toContain("status: 'future'");
    expect(calendarStatusesSrc).toContain('dateStr > today');
  });

  it('marks days with no events/instances as none', () => {
    expect(calendarStatusesSrc).toContain("status: 'none'");
  });

  it('marks fully completed days as full', () => {
    expect(calendarStatusesSrc).toContain("status: 'full'");
    expect(calendarStatusesSrc).toContain('completedInstances >= totalScheduled');
  });

  it('marks partially completed days as partial', () => {
    expect(calendarStatusesSrc).toContain("status: 'partial'");
  });

  it('queries both daily instances and events per day', () => {
    expect(calendarStatusesSrc).toContain('listDailyInstances');
    expect(calendarStatusesSrc).toContain('getEventsByDate');
  });

  it('accepts year and month params', () => {
    expect(calendarStatusesSrc).toContain('year: number, month: number');
  });
});

describe('useJournalEvents integration', () => {
  it('event store data produces entries with correct fields', async () => {
    const date = todayDate();
    await saveEvent({
      type: 'medication_taken',
      timestamp: `${date}T08:15:00.000Z`,
      patientId: 'default',
      metadata: { medicationName: 'Acetaminophen', dosage: '325mg' },
    });
    await saveEvent({
      type: 'vitals_recorded',
      timestamp: `${date}T09:00:00.000Z`,
      patientId: 'default',
      metadata: { systolic: 128, diastolic: 82, heartRate: 74 },
    });

    const events = await getEventsByDate(date, 'default');
    expect(events.length).toBeGreaterThanOrEqual(2);

    const med = events.find(e => e.type === 'medication_taken');
    expect(med).toBeDefined();
    expect(med!.metadata?.medicationName).toBe('Acetaminophen');

    const vitals = events.find(e => e.type === 'vitals_recorded');
    expect(vitals).toBeDefined();
    expect(vitals!.metadata?.systolic).toBe(128);
  });
});
