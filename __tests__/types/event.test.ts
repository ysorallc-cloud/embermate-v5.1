import type { CareEvent, EventType, EventQuery, EventSummary } from '../../types/event';

describe('CareEvent type system', () => {
  const ALL_EVENT_TYPES: EventType[] = [
    'medication_taken',
    'medication_skipped',
    'meal_logged',
    'hydration_logged',
    'symptom_reported',
    'vitals_recorded',
    'bathroom_event',
    'sleep_logged',
    'activity_logged',
    'wellness_check',
    'note_added',
    'mood_logged',
    'appointment_logged',
  ];

  it('CareEvent interface accepts all required fields', () => {
    const event: CareEvent = {
      id: 'evt-001',
      type: 'medication_taken',
      timestamp: '2026-03-24T08:00:00.000Z',
      patientId: 'default',
      createdAt: '2026-03-24T08:00:00.000Z',
    };

    expect(event.id).toBe('evt-001');
    expect(event.type).toBe('medication_taken');
    expect(event.timestamp).toBeDefined();
    expect(event.patientId).toBe('default');
    expect(event.createdAt).toBeDefined();
  });

  it('CareEvent accepts all optional fields', () => {
    const event: CareEvent = {
      id: 'evt-002',
      type: 'vitals_recorded',
      timestamp: '2026-03-24T09:00:00.000Z',
      patientId: 'default',
      value: '120/80',
      notes: 'After breakfast',
      status: 'completed',
      metadata: { systolic: 120, diastolic: 80, heartRate: 72, type: 'bp' },
      source: 'dedicated_screen',
      createdAt: '2026-03-24T09:00:00.000Z',
    };

    expect(event.value).toBe('120/80');
    expect(event.notes).toBe('After breakfast');
    expect(event.status).toBe('completed');
    expect(event.metadata).toBeDefined();
    expect(event.source).toBe('dedicated_screen');
  });

  it('EventType union includes all 13 required types', () => {
    expect(ALL_EVENT_TYPES).toHaveLength(13);

    // Verify each type can be assigned to a CareEvent
    ALL_EVENT_TYPES.forEach((eventType) => {
      const event: CareEvent = {
        id: `evt-${eventType}`,
        type: eventType,
        timestamp: new Date().toISOString(),
        patientId: 'default',
        createdAt: new Date().toISOString(),
      };
      expect(event.type).toBe(eventType);
    });
  });

  it('EventType includes medication_taken', () => {
    const t: EventType = 'medication_taken';
    expect(t).toBe('medication_taken');
  });

  it('EventType includes medication_skipped', () => {
    const t: EventType = 'medication_skipped';
    expect(t).toBe('medication_skipped');
  });

  it('EventType includes meal_logged', () => {
    const t: EventType = 'meal_logged';
    expect(t).toBe('meal_logged');
  });

  it('EventType includes hydration_logged', () => {
    const t: EventType = 'hydration_logged';
    expect(t).toBe('hydration_logged');
  });

  it('EventType includes symptom_reported', () => {
    const t: EventType = 'symptom_reported';
    expect(t).toBe('symptom_reported');
  });

  it('EventType includes vitals_recorded', () => {
    const t: EventType = 'vitals_recorded';
    expect(t).toBe('vitals_recorded');
  });

  it('EventType includes bathroom_event', () => {
    const t: EventType = 'bathroom_event';
    expect(t).toBe('bathroom_event');
  });

  it('EventType includes sleep_logged', () => {
    const t: EventType = 'sleep_logged';
    expect(t).toBe('sleep_logged');
  });

  it('EventType includes activity_logged', () => {
    const t: EventType = 'activity_logged';
    expect(t).toBe('activity_logged');
  });

  it('EventType includes wellness_check', () => {
    const t: EventType = 'wellness_check';
    expect(t).toBe('wellness_check');
  });

  it('EventType includes note_added', () => {
    const t: EventType = 'note_added';
    expect(t).toBe('note_added');
  });

  it('EventType includes mood_logged', () => {
    const t: EventType = 'mood_logged';
    expect(t).toBe('mood_logged');
  });

  it('EventType includes appointment_logged', () => {
    const t: EventType = 'appointment_logged';
    expect(t).toBe('appointment_logged');
  });

  it('EventQuery interface compiles with optional fields', () => {
    // Minimal query — only required field
    const minQuery: EventQuery = {
      patientId: 'default',
    };
    expect(minQuery.patientId).toBe('default');
    expect(minQuery.date).toBeUndefined();
    expect(minQuery.startDate).toBeUndefined();
    expect(minQuery.endDate).toBeUndefined();
    expect(minQuery.types).toBeUndefined();
    expect(minQuery.limit).toBeUndefined();

    // Full query — all optional fields
    const fullQuery: EventQuery = {
      patientId: 'default',
      date: '2026-03-24',
      startDate: '2026-03-01',
      endDate: '2026-03-31',
      types: ['medication_taken', 'vitals_recorded'],
      limit: 50,
    };
    expect(fullQuery.date).toBe('2026-03-24');
    expect(fullQuery.types).toHaveLength(2);
    expect(fullQuery.limit).toBe(50);
  });

  it('EventSummary interface compiles correctly', () => {
    const summary: EventSummary = {
      date: '2026-03-24',
      totalEvents: 8,
      byType: {
        medication_taken: 3,
        meal_logged: 2,
        hydration_logged: 1,
        vitals_recorded: 2,
      },
    };

    expect(summary.date).toBe('2026-03-24');
    expect(summary.totalEvents).toBe(8);
    expect(summary.byType.medication_taken).toBe(3);
    // Partial<Record<...>> means missing keys are allowed
    expect(summary.byType.sleep_logged).toBeUndefined();
  });
});
