// ============================================================================
// Phase 5.12.e — events timeline (flat prose, no card chrome).
//
// Read-only time-anchored row pattern. No borders, no taps. Each row
// shows time + text. When a row's event matches a flag-severity entry
// in dayLevelChanges (per category mapping), the row text colours coral.
// Overflow past the first 5 rows collapses to a single muted summary
// line ("+ N wellness items" / "+ N more").
// ============================================================================

import React from 'react';
import type { CareEvent, EventType } from '../../types/event';
import type { DayLevelChange } from '../../services/dayLevelChanges';

const ACCENT = '#5fb88a';
const CRITICAL = '#e6776e';
const TEXT_PRIMARY = '#fff';
const TEXT_SECONDARY = '#c4c1b3';
const TEXT_TERTIARY = '#6b7280';

jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return {
    ...actual,
    useMemo: (fn: any) => fn(),
    useState: (init: any) => [typeof init === 'function' ? init() : init, () => {}],
    useEffect: () => {},
    useCallback: (fn: any) => fn,
  };
});

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      accent: ACCENT,
      criticalAlert: CRITICAL,
      error: CRITICAL,
      textPrimary: TEXT_PRIMARY,
      textSecondary: TEXT_SECONDARY,
      textTertiary: TEXT_TERTIARY,
    },
  }),
}));

jest.mock('react-native', () => {
  const PT = (n: string) => n;
  return {
    View: PT('View'),
    Text: PT('Text'),
    TouchableOpacity: PT('TouchableOpacity'),
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
  };
});

import { EventsTimeline } from '../../components/journal/EventsTimeline';

function flattenChildren(kids: any): any[] {
  if (kids == null) return [];
  if (Array.isArray(kids)) {
    const out: any[] = [];
    for (const k of kids) out.push(...flattenChildren(k));
    return out;
  }
  return [kids];
}
function findAll(node: any, predicate: (n: any) => boolean): any[] {
  if (!node || typeof node !== 'object') return [];
  const out: any[] = [];
  if (predicate(node)) out.push(node);
  for (const k of flattenChildren(node.props?.children)) {
    out.push(...findAll(k, predicate));
  }
  return out;
}
function styleOf(node: any): Record<string, any> {
  const s = node?.props?.style;
  if (!s) return {};
  if (Array.isArray(s)) return Object.assign({}, ...s.filter(Boolean));
  return s;
}

const mkEvent = (
  type: EventType,
  hour: number,
  metadata: Record<string, unknown> = {},
): CareEvent => ({
  id: `${type}-${hour}`,
  type,
  timestamp: `2026-05-06T${String(hour).padStart(2, '0')}:00:00Z`,
  patientId: 'default',
  metadata,
  createdAt: `2026-05-06T${String(hour).padStart(2, '0')}:00:00Z`,
});

describe('EventsTimeline — basic rendering', () => {
  it('renders one row per event with a time column and a text column', () => {
    const events: CareEvent[] = [
      mkEvent('medication_taken', 9, { medicationName: 'Amlodipine', dosage: '2.5mg' }),
      mkEvent('vitals_recorded', 10, { systolic: 138, diastolic: 85 }),
      mkEvent('meal_logged', 12, { mealType: 'lunch' }),
      mkEvent('note_added', 15),
      mkEvent('medication_taken', 19, { medicationName: 'Acetaminophen' }),
    ];
    const tree = EventsTimeline({ events, dayLevelChanges: [] });
    const rows = findAll(tree, (n) =>
      typeof n.props?.testID === 'string' && /^timeline-row-\d+$/.test(n.props.testID),
    );
    expect(rows).toHaveLength(5);
    for (const r of rows) {
      const time = findAll(r, (n) => n.props?.testID === 'timeline-row-time')[0];
      const text = findAll(r, (n) => n.props?.testID === 'timeline-row-text')[0];
      expect(time).toBeDefined();
      expect(text).toBeDefined();
    }
  });

  it('renders nothing when given no events', () => {
    expect(EventsTimeline({ events: [], dayLevelChanges: [] })).toBeNull();
  });

  it('renders a "+ N wellness items" overflow line when more than 5 events exist', () => {
    const events: CareEvent[] = [];
    for (let h = 6; h < 14; h++) events.push(mkEvent('wellness_check', h));
    const tree = EventsTimeline({ events, dayLevelChanges: [] });
    const rows = findAll(tree, (n) =>
      typeof n.props?.testID === 'string' && /^timeline-row-\d+$/.test(n.props.testID),
    );
    expect(rows).toHaveLength(5);
    const overflow = findAll(tree, (n) => n.props?.testID === 'timeline-overflow')[0];
    expect(overflow).toBeDefined();
    const merged = (
      findAll(overflow, (n) => n.props?.children !== undefined)
        .map((n) => n.props.children)
        .filter((c) => typeof c === 'string')
        .join(' ')
    );
    expect(merged).toMatch(/\+\s*3\b/);
  });
});

describe('EventsTimeline — read-only contract', () => {
  it('no row is wrapped in a TouchableOpacity (no logging from Journal)', () => {
    const events: CareEvent[] = [
      mkEvent('medication_taken', 9, { medicationName: 'Amlodipine' }),
    ];
    const tree = EventsTimeline({ events, dayLevelChanges: [] });
    const tappables = findAll(tree, (n) => n.type === 'TouchableOpacity');
    expect(tappables).toHaveLength(0);
  });

  it('no row carries an onPress prop', () => {
    const events: CareEvent[] = [
      mkEvent('vitals_recorded', 10, { systolic: 138, diastolic: 85 }),
    ];
    const tree = EventsTimeline({ events, dayLevelChanges: [] });
    const withOnPress = findAll(tree, (n) => n.props?.onPress !== undefined);
    expect(withOnPress).toHaveLength(0);
  });
});

describe('EventsTimeline — cross-section flag linkage', () => {
  const flagVitals: DayLevelChange = {
    category: 'vitals',
    observation: 'BP 156/92 — 18 points above the rolling average',
    severity: 'flag',
  };
  const flagMeals: DayLevelChange = {
    category: 'meals',
    observation: 'Refused a meal — first time in the past week',
    severity: 'flag',
  };
  const flagMood: DayLevelChange = {
    category: 'mood',
    observation: 'Mood drop of 2 points from the rolling average',
    severity: 'flag',
  };
  const flagSymptoms: DayLevelChange = {
    category: 'symptoms',
    observation: 'New symptom: agitation — not seen in 14 days',
    severity: 'flag',
  };
  const noteSleep: DayLevelChange = {
    category: 'sleep',
    observation: 'Sleep 5h — 3h below the rolling average',
    severity: 'note',
  };

  it('vitals_recorded row colours coral when a vitals flag is present', () => {
    const events: CareEvent[] = [
      mkEvent('vitals_recorded', 10, { systolic: 156, diastolic: 92 }),
    ];
    const tree = EventsTimeline({ events, dayLevelChanges: [flagVitals] });
    const text = findAll(tree, (n) => n.props?.testID === 'timeline-row-text')[0];
    expect(styleOf(text).color).toBe(CRITICAL);
  });

  it('only refused meal_logged events colour coral when a meals flag is present', () => {
    const events: CareEvent[] = [
      mkEvent('meal_logged', 8, { mealType: 'breakfast', refused: true }),
      mkEvent('meal_logged', 12, { mealType: 'lunch' }),
    ];
    const tree = EventsTimeline({ events, dayLevelChanges: [flagMeals] });
    const rows = findAll(tree, (n) =>
      typeof n.props?.testID === 'string' && /^timeline-row-\d+$/.test(n.props.testID),
    );
    const colors = rows.map((r) => {
      const text = findAll(r, (n) => n.props?.testID === 'timeline-row-text')[0];
      return styleOf(text).color;
    });
    expect(colors).toContain(CRITICAL);
    expect(colors).toContain(TEXT_PRIMARY);
  });

  it('mood_logged row colours coral when a mood flag is present', () => {
    const events: CareEvent[] = [mkEvent('mood_logged', 11, { score: 2 })];
    const tree = EventsTimeline({ events, dayLevelChanges: [flagMood] });
    const text = findAll(tree, (n) => n.props?.testID === 'timeline-row-text')[0];
    expect(styleOf(text).color).toBe(CRITICAL);
  });

  it('symptom_reported rows colour coral when a symptoms flag is present (date-only fallback)', () => {
    // Symptom names are free-text in metadata; matcher falls back to
    // any symptom_reported event on the change date.
    const events: CareEvent[] = [
      mkEvent('symptom_reported', 14, { symptomName: 'agitation' }),
    ];
    const tree = EventsTimeline({ events, dayLevelChanges: [flagSymptoms] });
    const text = findAll(tree, (n) => n.props?.testID === 'timeline-row-text')[0];
    expect(styleOf(text).color).toBe(CRITICAL);
  });

  it('sleep flag-severity is suppressed (note-only) — row stays neutral', () => {
    // The eyebrow/row coral signal is reserved for 'flag' severity. Sleep
    // changes emit 'note' severity, so the timeline row must not promote.
    const events: CareEvent[] = [mkEvent('sleep_logged', 22, { hours: 5 })];
    const tree = EventsTimeline({ events, dayLevelChanges: [noteSleep] });
    const text = findAll(tree, (n) => n.props?.testID === 'timeline-row-text')[0];
    expect(styleOf(text).color).not.toBe(CRITICAL);
  });

  it('unrelated events stay neutral when an unrelated flag is present', () => {
    const events: CareEvent[] = [
      mkEvent('medication_taken', 9, { medicationName: 'Amlodipine' }),
    ];
    const tree = EventsTimeline({ events, dayLevelChanges: [flagVitals] });
    const text = findAll(tree, (n) => n.props?.testID === 'timeline-row-text')[0];
    expect(styleOf(text).color).not.toBe(CRITICAL);
  });
});

describe('EventsTimeline — Journal mounting', () => {
  const { readFileSync } = require('fs');
  const { join } = require('path');
  const journalSrc = readFileSync(
    join(__dirname, '../..', 'app/(tabs)/journal.tsx'),
    'utf8',
  );

  it('Journal imports EventsTimeline', () => {
    expect(journalSrc).toMatch(
      /import\s+\{\s*EventsTimeline\s*\}\s+from\s+['"][^'"]+EventsTimeline['"]/,
    );
  });

  it('Journal renders EventsTimeline below WhatChangedToday and above JournalNotesCard', () => {
    const whatChanged = journalSrc.indexOf('<WhatChangedToday');
    const timeline = journalSrc.indexOf('<EventsTimeline');
    const notes = journalSrc.indexOf('<JournalNotesCard');
    expect(whatChanged).toBeGreaterThan(-1);
    expect(timeline).toBeGreaterThan(whatChanged);
    expect(notes).toBeGreaterThan(timeline);
  });
});
