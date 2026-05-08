// ============================================================================
// Phase 5.12.4a — day-level change detection.
//
// Exercises each per-category pure-function detector and the orchestrator
// that combines them. The service consumes a `CareEvent[]` array (already
// fetched by the caller over the 14-day baseline window) and a target
// date — every detector is tested without I/O.
//
// Every detector must return null when:
//   • The target day has no event of that category, OR
//   • The baseline depth (distinct days carrying category events in the
//     prior window) is below BASELINE_REQUIREMENTS.minDays.
//
// Symptoms is the lone exception — minDays: 0, novelty is a presence check.
// ============================================================================

import { detectDayLevelChanges } from '../../services/dayLevelChanges';
import {
  detectVitalsChange,
  detectMealsChange,
  detectMoodChange,
  detectSymptomsChange,
  detectSleepChange,
} from '../../services/dayLevelChanges';
import type { CareEvent, EventType } from '../../types/event';

// Mock the AsyncStorage-backed event repo so the orchestrator test path
// stays in-memory.
let mockEvents: CareEvent[] = [];
jest.mock('../../storage/eventRepo', () => ({
  getEventsByDateRange: jest.fn(async () => mockEvents),
}));

jest.mock('../../storage/patientRegistry', () => ({
  getActivePatientId: jest.fn(async () => 'default'),
}));

jest.mock('../../utils/devLog', () => ({ logError: () => {} }));

const TARGET = '2026-05-06';

function evt(
  type: EventType,
  daysAgo: number,
  metadata: Record<string, unknown> = {},
  hour = 9,
): CareEvent {
  // Build an ISO timestamp `daysAgo` days before TARGET at the given hour.
  const target = new Date(`${TARGET}T${String(hour).padStart(2, '0')}:00:00Z`);
  target.setUTCDate(target.getUTCDate() - daysAgo);
  return {
    id: `${type}-${daysAgo}-${hour}`,
    type,
    timestamp: target.toISOString(),
    patientId: 'default',
    metadata,
    createdAt: target.toISOString(),
  };
}

// ── Vitals ────────────────────────────────────────────────────────────

describe('detectVitalsChange — BP/HR > 15% above baseline', () => {
  it('flags a today-vitals reading more than 15% above the 14-day baseline', () => {
    const baseline: CareEvent[] = [];
    for (let d = 1; d <= 10; d++) {
      baseline.push(evt('vitals_recorded', d, { systolic: 120, diastolic: 80 }));
    }
    const today = evt('vitals_recorded', 0, { systolic: 156, diastolic: 92 });
    const change = detectVitalsChange([...baseline, today], TARGET);
    expect(change).not.toBeNull();
    expect(change!.category).toBe('vitals');
    expect(change!.severity).toBe('flag');
    expect(change!.observation).toMatch(/156\/92/);
  });

  it('returns null when today is within 15% of baseline', () => {
    const baseline: CareEvent[] = [];
    for (let d = 1; d <= 10; d++) {
      baseline.push(evt('vitals_recorded', d, { systolic: 120, diastolic: 80 }));
    }
    const today = evt('vitals_recorded', 0, { systolic: 130, diastolic: 84 });
    expect(detectVitalsChange([...baseline, today], TARGET)).toBeNull();
  });

  it('returns null when fewer than 7 distinct baseline days exist', () => {
    const baseline: CareEvent[] = [];
    for (let d = 1; d <= 5; d++) {
      baseline.push(evt('vitals_recorded', d, { systolic: 120, diastolic: 80 }));
    }
    const today = evt('vitals_recorded', 0, { systolic: 156, diastolic: 92 });
    expect(detectVitalsChange([...baseline, today], TARGET)).toBeNull();
  });

  it('returns null when no vitals reading exists today', () => {
    const baseline: CareEvent[] = [];
    for (let d = 1; d <= 10; d++) {
      baseline.push(evt('vitals_recorded', d, { systolic: 120, diastolic: 80 }));
    }
    expect(detectVitalsChange(baseline, TARGET)).toBeNull();
  });
});

// ── Meals ─────────────────────────────────────────────────────────────

describe('detectMealsChange — refusal in a 7-day gap', () => {
  it('flags a refused meal today when no refusal in the prior 7 days', () => {
    const baseline: CareEvent[] = [];
    for (let d = 1; d <= 5; d++) {
      baseline.push(evt('meal_logged', d, { mealType: 'breakfast', refused: false }));
    }
    const today = evt('meal_logged', 0, { mealType: 'breakfast', refused: true });
    const change = detectMealsChange([...baseline, today], TARGET);
    expect(change).not.toBeNull();
    expect(change!.category).toBe('meals');
    expect(change!.severity).toBe('flag');
    expect(change!.observation).toMatch(/refused|first time/i);
  });

  it('returns null when refusals occurred recently (no gap)', () => {
    const baseline: CareEvent[] = [
      evt('meal_logged', 2, { mealType: 'lunch', refused: true }),
      evt('meal_logged', 1, { mealType: 'breakfast', refused: false }),
      evt('meal_logged', 3, { mealType: 'dinner', refused: false }),
      evt('meal_logged', 4, { mealType: 'breakfast', refused: false }),
    ];
    const today = evt('meal_logged', 0, { mealType: 'breakfast', refused: true });
    expect(detectMealsChange([...baseline, today], TARGET)).toBeNull();
  });

  it('returns null when fewer than 4 baseline meal days exist', () => {
    const baseline = [
      evt('meal_logged', 1, { mealType: 'breakfast', refused: false }),
      evt('meal_logged', 2, { mealType: 'lunch', refused: false }),
    ];
    const today = evt('meal_logged', 0, { mealType: 'breakfast', refused: true });
    expect(detectMealsChange([...baseline, today], TARGET)).toBeNull();
  });

  it('returns null when no meals are logged today', () => {
    const baseline: CareEvent[] = [];
    for (let d = 1; d <= 5; d++) {
      baseline.push(evt('meal_logged', d, { mealType: 'breakfast', refused: false }));
    }
    expect(detectMealsChange(baseline, TARGET)).toBeNull();
  });
});

// ── Mood ──────────────────────────────────────────────────────────────

describe('detectMoodChange — drop ≥ 2 points from baseline', () => {
  it('flags a mood drop ≥ 2 points from the 7-day average', () => {
    const baseline: CareEvent[] = [];
    for (let d = 1; d <= 5; d++) {
      baseline.push(evt('mood_logged', d, { score: 4, label: 'Good' }));
    }
    const today = evt('mood_logged', 0, { score: 2, label: 'Difficult' });
    const change = detectMoodChange([...baseline, today], TARGET);
    expect(change).not.toBeNull();
    expect(change!.category).toBe('mood');
    expect(change!.severity).toBe('flag');
  });

  it('returns null when today matches the baseline', () => {
    const baseline: CareEvent[] = [];
    for (let d = 1; d <= 5; d++) {
      baseline.push(evt('mood_logged', d, { score: 4 }));
    }
    const today = evt('mood_logged', 0, { score: 4 });
    expect(detectMoodChange([...baseline, today], TARGET)).toBeNull();
  });

  it('returns null when baseline has fewer than 4 mood-logged days', () => {
    const baseline = [
      evt('mood_logged', 1, { score: 4 }),
      evt('mood_logged', 2, { score: 4 }),
    ];
    const today = evt('mood_logged', 0, { score: 1 });
    expect(detectMoodChange([...baseline, today], TARGET)).toBeNull();
  });
});

// ── Symptoms ──────────────────────────────────────────────────────────

describe('detectSymptomsChange — novelty within 14 days', () => {
  it('flags a symptom not seen in the prior 14 days', () => {
    const baseline = [
      evt('symptom_reported', 5, { symptomName: 'headache' }),
      evt('symptom_reported', 8, { symptomName: 'fatigue' }),
    ];
    const today = evt('symptom_reported', 0, { symptomName: 'agitation' });
    const change = detectSymptomsChange([...baseline, today], TARGET);
    expect(change).not.toBeNull();
    expect(change!.category).toBe('symptoms');
    expect(change!.severity).toBe('flag');
    expect(change!.observation).toMatch(/agitation/i);
  });

  it('returns null when today\'s symptom appeared in the baseline window', () => {
    const baseline = [evt('symptom_reported', 3, { symptomName: 'headache' })];
    const today = evt('symptom_reported', 0, { symptomName: 'headache' });
    expect(detectSymptomsChange([...baseline, today], TARGET)).toBeNull();
  });

  it('does NOT require a baseline (novelty applies even on day 1)', () => {
    // Symptoms minDays: 0 — a brand new install with one symptom today
    // and zero baseline still produces a novelty flag.
    const today = evt('symptom_reported', 0, { symptomName: 'pain' });
    const change = detectSymptomsChange([today], TARGET);
    expect(change).not.toBeNull();
  });

  it('returns null when no symptom is reported today', () => {
    const baseline = [evt('symptom_reported', 5, { symptomName: 'headache' })];
    expect(detectSymptomsChange(baseline, TARGET)).toBeNull();
  });
});

// ── Sleep ─────────────────────────────────────────────────────────────

describe('detectSleepChange — ≥ 2hr below baseline', () => {
  it('emits a note when sleep is ≥ 2hr below the 14-day average', () => {
    const baseline: CareEvent[] = [];
    for (let d = 1; d <= 10; d++) {
      baseline.push(evt('sleep_logged', d, { hours: 8 }));
    }
    const today = evt('sleep_logged', 0, { hours: 5 });
    const change = detectSleepChange([...baseline, today], TARGET);
    expect(change).not.toBeNull();
    expect(change!.category).toBe('sleep');
    expect(change!.severity).toBe('note');
  });

  it('returns null when today is within 2hr of baseline', () => {
    const baseline: CareEvent[] = [];
    for (let d = 1; d <= 10; d++) {
      baseline.push(evt('sleep_logged', d, { hours: 8 }));
    }
    const today = evt('sleep_logged', 0, { hours: 7 });
    expect(detectSleepChange([...baseline, today], TARGET)).toBeNull();
  });

  it('returns null when baseline has fewer than 7 sleep-logged days', () => {
    const baseline: CareEvent[] = [];
    for (let d = 1; d <= 4; d++) {
      baseline.push(evt('sleep_logged', d, { hours: 8 }));
    }
    const today = evt('sleep_logged', 0, { hours: 4 });
    expect(detectSleepChange([...baseline, today], TARGET)).toBeNull();
  });
});

// ── Orchestrator ──────────────────────────────────────────────────────

describe('detectDayLevelChanges — orchestrator', () => {
  beforeEach(() => {
    mockEvents = [];
  });

  it('returns the union of changes from all categories', async () => {
    const events: CareEvent[] = [];
    for (let d = 1; d <= 10; d++) {
      events.push(evt('vitals_recorded', d, { systolic: 120, diastolic: 80 }));
      events.push(evt('mood_logged', d, { score: 4 }));
    }
    events.push(evt('vitals_recorded', 0, { systolic: 156, diastolic: 92 }));
    events.push(evt('mood_logged', 0, { score: 1 }));
    mockEvents = events;
    const result = await detectDayLevelChanges(TARGET);
    expect(result.changes.length).toBeGreaterThanOrEqual(2);
    expect(result.hasSignificantChange).toBe(true);
  });

  it('hasSignificantChange is true when any flag-severity change is present', async () => {
    const events: CareEvent[] = [];
    for (let d = 1; d <= 10; d++) {
      events.push(evt('vitals_recorded', d, { systolic: 120, diastolic: 80 }));
    }
    events.push(evt('vitals_recorded', 0, { systolic: 156, diastolic: 92 }));
    mockEvents = events;
    const result = await detectDayLevelChanges(TARGET);
    expect(result.hasSignificantChange).toBe(true);
    expect(result.changes.every((c) => c.severity === 'flag')).toBe(true);
  });

  it('hasSignificantChange is false when only notes are present', async () => {
    const events: CareEvent[] = [];
    for (let d = 1; d <= 10; d++) {
      events.push(evt('sleep_logged', d, { hours: 8 }));
    }
    events.push(evt('sleep_logged', 0, { hours: 5 }));
    mockEvents = events;
    const result = await detectDayLevelChanges(TARGET);
    expect(result.changes.length).toBe(1);
    expect(result.changes[0].severity).toBe('note');
    expect(result.hasSignificantChange).toBe(false);
  });

  it('returns an empty changes list on a day with no notable deltas', async () => {
    const events: CareEvent[] = [];
    for (let d = 1; d <= 10; d++) {
      events.push(evt('vitals_recorded', d, { systolic: 120, diastolic: 80 }));
    }
    events.push(evt('vitals_recorded', 0, { systolic: 122, diastolic: 80 }));
    mockEvents = events;
    const result = await detectDayLevelChanges(TARGET);
    expect(result.changes).toEqual([]);
    expect(result.hasSignificantChange).toBe(false);
  });
});
