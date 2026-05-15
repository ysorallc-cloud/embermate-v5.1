// ============================================================================
// Phase 5.12.h — Journal empty-day state.
//
// When the user lands on a day with no events, no notes, and no tone, the
// page renders a restorative empty-state composition — a calm centered
// hero, lightweight continuity context (up to 2 nearby days with records),
// and a single "Add a note" affordance.
//
// No sticky share CTA on empty days; the existing 5.12.g visibility logic
// handles that.
// ============================================================================

import React from 'react';

const CAREGIVER = '#aa8adc';
const ACCENT = '#5fb88a';
const TEXT_PRIMARY = '#fff';
const TEXT_SECONDARY = '#c4c1b3';

let mockNearbyDays: { dateKey: string; summary: string }[] = [];

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
      caregiverAccent: CAREGIVER,
      textPrimary: TEXT_PRIMARY,
      textSecondary: TEXT_SECONDARY,
      textTertiary: '#6b7280',
      glass: '#363830',
      glassBorder: 'rgba(255,255,255,0.06)',
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

jest.mock('../../hooks/useNearbyDaysWithRecords', () => ({
  useNearbyDaysWithRecords: () => mockNearbyDays,
}));

import { JournalEmptyDay } from '../../components/journal/JournalEmptyDay';

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
function textOf(node: any): string {
  const out: string[] = [];
  function walk(n: any) {
    if (n == null) return;
    if (typeof n === 'string') { out.push(n); return; }
    if (typeof n === 'number') { out.push(String(n)); return; }
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (n.props?.children !== undefined) walk(n.props.children);
  }
  walk(node);
  return out.join('');
}

beforeEach(() => {
  mockNearbyDays = [];
});

describe('JournalEmptyDay — restorative hero (Phase 27.5b F8 reframe)', () => {
  it('renders the time-aware hero copy (one of the three buckets)', () => {
    // Phase 27.5b F8 — the pre-F8 hero copy ("A quiet day in the
    // record. No events were logged on this day...") was retrospective
    // framing that read broken on an active mid-day today. F8 forks
    // the title into one of three time-aware bucket strings; the
    // heroBody Text retires entirely. journalEmptyDayTimeAware27_5b
    // pins the per-hour bucket assertions. This contract verifies the
    // restorative hero still renders SOME bucket copy and the legacy
    // strings are gone.
    const tree = JournalEmptyDay({
      dateKey: '2026-05-06',
      onAddNote: () => {},
      onSelectDay: () => {},
    });
    const text = textOf(tree);
    // One of the three bucket strings is present (which one depends on
    // when the test runs).
    const bucketMatched =
      /Today is just starting\. Nothing logged yet\./.test(text)
      || /Nothing logged this morning\. The day is still open\./.test(text)
      || /Nothing logged yet today\./.test(text);
    expect(bucketMatched).toBe(true);
    // The retired strings must not appear.
    expect(text).not.toMatch(/A quiet day in the record/);
    expect(text).not.toMatch(/No events were logged on this day/);
  });
});

describe('JournalEmptyDay — Add a note affordance', () => {
  it('exposes a tappable "+ Add a note for this day" link in lavender', () => {
    const onAddNote = jest.fn();
    const tree = JournalEmptyDay({
      dateKey: '2026-05-06',
      onAddNote,
      onSelectDay: () => {},
    });
    const link = findAll(tree, (n) => n.props?.testID === 'empty-day-add-note')[0];
    expect(link).toBeDefined();
    expect(textOf(link)).toMatch(/Add a note/);
    const labelText = findAll(link, (n) => n.props?.testID === 'empty-day-add-note-label')[0];
    expect(labelText).toBeDefined();
    expect(styleOf(labelText).color).toBe(CAREGIVER);
  });

  it('tapping the affordance fires the onAddNote callback', () => {
    const onAddNote = jest.fn();
    const tree = JournalEmptyDay({
      dateKey: '2026-05-06',
      onAddNote,
      onSelectDay: () => {},
    });
    const link = findAll(tree, (n) => n.props?.testID === 'empty-day-add-note')[0];
    link.props.onPress();
    expect(onAddNote).toHaveBeenCalledTimes(1);
  });
});

describe('JournalEmptyDay — nearby-days continuity', () => {
  it('renders the "NEARBY DAYS WITH RECORDS" eyebrow when nearby days exist', () => {
    mockNearbyDays = [
      { dateKey: '2026-05-05', summary: '3 medications · Vitals' },
      { dateKey: '2026-05-04', summary: '2 medications' },
    ];
    const tree = JournalEmptyDay({
      dateKey: '2026-05-06',
      onAddNote: () => {},
      onSelectDay: () => {},
    });
    expect(textOf(tree)).toMatch(/NEARBY DAYS WITH RECORDS/);
  });

  it('renders one card per nearby day (capped at 2)', () => {
    mockNearbyDays = [
      { dateKey: '2026-05-05', summary: '3 medications · Vitals' },
      { dateKey: '2026-05-04', summary: '2 medications' },
    ];
    const tree = JournalEmptyDay({
      dateKey: '2026-05-06',
      onAddNote: () => {},
      onSelectDay: () => {},
    });
    const cards = findAll(tree, (n) =>
      typeof n.props?.testID === 'string' && /^empty-day-nearby-\d+$/.test(n.props.testID),
    );
    expect(cards).toHaveLength(2);
  });

  it('omits the eyebrow + cards when there are no nearby days', () => {
    mockNearbyDays = [];
    const tree = JournalEmptyDay({
      dateKey: '2026-05-06',
      onAddNote: () => {},
      onSelectDay: () => {},
    });
    expect(textOf(tree)).not.toMatch(/NEARBY DAYS WITH RECORDS/);
    const cards = findAll(tree, (n) =>
      typeof n.props?.testID === 'string' && /^empty-day-nearby-\d+$/.test(n.props.testID),
    );
    expect(cards).toHaveLength(0);
  });

  it('tapping a nearby card fires onSelectDay with that dateKey', () => {
    mockNearbyDays = [
      { dateKey: '2026-05-05', summary: '3 medications · Vitals' },
    ];
    const onSelectDay = jest.fn();
    const tree = JournalEmptyDay({
      dateKey: '2026-05-06',
      onAddNote: () => {},
      onSelectDay,
    });
    const card = findAll(tree, (n) => n.props?.testID === 'empty-day-nearby-0')[0];
    card.props.onPress();
    expect(onSelectDay).toHaveBeenCalledWith('2026-05-05');
  });
});

describe('JournalEmptyDay — Journal mounting', () => {
  const { readFileSync } = require('fs');
  const { join } = require('path');
  const journalSrc = readFileSync(
    join(__dirname, '../..', 'app/(tabs)/journal.tsx'),
    'utf8',
  );

  it('Journal imports JournalEmptyDay', () => {
    expect(journalSrc).toMatch(
      /import\s+\{\s*JournalEmptyDay\s*\}\s+from\s+['"][^'"]+JournalEmptyDay['"]/,
    );
  });

  it('Journal renders JournalEmptyDay on today + empty content (no events, no notes, no tone)', () => {
    // The render guard must reference all three signals so the empty
    // composition only appears when the day truly has nothing to surface.
    const idx = journalSrc.indexOf('<JournalEmptyDay');
    expect(idx).toBeGreaterThan(-1);
    const before = journalSrc.slice(Math.max(0, idx - 800), idx);
    expect(before).toMatch(/dayEvents/);
    expect(before).toMatch(/reflection/);
    expect(before).toMatch(/handoffTone/);
  });
});
