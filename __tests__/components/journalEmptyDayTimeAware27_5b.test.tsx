// ============================================================================
// Phase 27.5b F8 — JournalEmptyDay time-aware copy.
//
// Pre-27.5b the hero rendered the same retrospective copy regardless
// of time of day:
//   title: "A quiet day in the record."
//   body:  "No events were logged on this day. That doesn't mean
//          nothing happened — it just means the record is blank."
//
// On an active mid-day today this reads broken — the body's past-
// tense framing ("were logged", "nothing happened", "the record is
// blank") describes a CLOSED PAST DAY, but JournalEmptyDay actually
// only mounts on TODAY (the shouldRenderJournalEmptyDay gate short-
// circuits past days at journalEmptyDayCheck.ts:51). The copy was
// never time-aware.
//
// Per F8 spec the today-only render forks copy by hour bucket using
// the smartDefaultsEngine convention (morning 5-11 / afternoon 12-16
// / evening 17+; overnight 0-4 falls into morning as a v1.0
// simplification):
//   • Morning   → "Today is just starting. Nothing logged yet."
//   • Afternoon → "Nothing logged this morning. The day is still open."
//   • Evening   → "Nothing logged yet today."
//
// heroBody retires entirely. Each bucket's title carries the full
// observation in a single sentence-pair (or single sentence for
// evening).
//
// Pinned contracts:
//   1. Morning hour (e.g. 9 AM)   → hero title is the morning copy.
//   2. Afternoon hour (e.g. 2 PM) → hero title is the afternoon copy.
//   3. Evening hour (e.g. 8 PM)   → hero title is the evening copy.
//   4. Overnight hour (e.g. 3 AM) → falls into morning bucket per D3.
//   5. Boundary at hour=12 — afternoon copy fires (afternoon is the
//      [12, 17) half-open interval per smartDefaultsEngine).
//   6. Boundary at hour=17 — evening copy fires.
//   7. The legacy retrospective body string "That doesn't mean
//      nothing happened" no longer renders, in any bucket.
//   8. The legacy title "A quiet day in the record." no longer
//      renders, in any bucket.
// ============================================================================

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

const themeColors = {
  accent: '#5fb88a',
  caregiverAccent: '#aa8adc',
  glass: 'rgba(255, 245, 220, 0.04)',
  glassBorder: 'rgba(255, 240, 215, 0.10)',
  textPrimary: '#fff',
  textSecondary: '#c4c1b3',
};

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({ resolvedTheme: 'dark', colors: themeColors }),
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

// Stub nearby-days hook — returns empty so the test focuses on the
// hero copy alone.
jest.mock('../../hooks/useNearbyDaysWithRecords', () => ({
  useNearbyDaysWithRecords: () => [],
}));

import { JournalEmptyDay } from '../../components/journal/JournalEmptyDay';

function findAll(
  root: TestRenderer.ReactTestInstance,
  predicate: (n: any) => boolean,
): TestRenderer.ReactTestInstance[] {
  return root.findAll((n: any) => {
    try { return predicate(n); } catch { return false; }
  });
}

function flattenText(n: TestRenderer.ReactTestInstance): string {
  const out: string[] = [];
  function walk(node: any) {
    if (node == null) return;
    if (typeof node === 'string' || typeof node === 'number') { out.push(String(node)); return; }
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (node?.props?.children !== undefined) walk(node.props.children);
  }
  walk(n);
  return out.join('');
}

// FakeDate pattern — same shape used by endOfShiftCard.test.tsx for
// time-gated render assertions.
function withHour<T>(hour: number, fn: () => T): T {
  const RealDate = Date;
  class FakeDate extends RealDate {
    getHours() { return hour; }
  }
  (global as any).Date = FakeDate as DateConstructor;
  try {
    return fn();
  } finally {
    (global as any).Date = RealDate;
  }
}

function renderAtHour(hour: number): TestRenderer.ReactTestRenderer {
  let root: TestRenderer.ReactTestRenderer | null = null;
  withHour(hour, () => {
    act(() => {
      const props: any = {
        dateKey: '2026-05-15',
        onAddNote: jest.fn(),
        onSelectDay: jest.fn(),
      };
      root = TestRenderer.create(
        React.createElement(JournalEmptyDay as any, props),
      );
    });
  });
  return root!;
}

function allText(tree: TestRenderer.ReactTestRenderer): string {
  return findAll(tree.root, (n) => n.type === 'Text')
    .map(flattenText)
    .join(' | ');
}

const MORNING_COPY = 'Today is just starting. Nothing logged yet.';
const AFTERNOON_COPY = 'Nothing logged this morning. The day is still open.';
const EVENING_COPY = 'Nothing logged yet today.';

describe('Phase 27.5b F8 — JournalEmptyDay time-aware hero copy', () => {
  it('contract 1: morning (hour=9) renders the morning copy', () => {
    const tree = renderAtHour(9);
    const text = allText(tree);
    expect(text).toContain(MORNING_COPY);
    expect(text).not.toContain(AFTERNOON_COPY);
    expect(text).not.toContain(EVENING_COPY);
  });

  it('contract 2: afternoon (hour=14) renders the afternoon copy', () => {
    const tree = renderAtHour(14);
    const text = allText(tree);
    expect(text).toContain(AFTERNOON_COPY);
    expect(text).not.toContain(MORNING_COPY);
    expect(text).not.toContain(EVENING_COPY);
  });

  it('contract 3: evening (hour=20) renders the evening copy', () => {
    const tree = renderAtHour(20);
    const text = allText(tree);
    expect(text).toContain(EVENING_COPY);
    expect(text).not.toContain(MORNING_COPY);
    expect(text).not.toContain(AFTERNOON_COPY);
  });

  it('contract 4: overnight (hour=3) falls into the morning bucket per D3', () => {
    const tree = renderAtHour(3);
    const text = allText(tree);
    expect(text).toContain(MORNING_COPY);
  });

  it('contract 5: boundary hour=12 — afternoon copy fires (smartDefaults [12, 17))', () => {
    const tree = renderAtHour(12);
    const text = allText(tree);
    expect(text).toContain(AFTERNOON_COPY);
    expect(text).not.toContain(MORNING_COPY);
  });

  it('contract 6: boundary hour=17 — evening copy fires', () => {
    const tree = renderAtHour(17);
    const text = allText(tree);
    expect(text).toContain(EVENING_COPY);
    expect(text).not.toContain(AFTERNOON_COPY);
  });

  it('contract 7: legacy retrospective body "That doesn\'t mean nothing happened" no longer renders, any bucket', () => {
    for (const hour of [3, 9, 12, 14, 17, 20, 23]) {
      const tree = renderAtHour(hour);
      const text = allText(tree);
      expect(text).not.toContain("That doesn't mean nothing happened");
      expect(text).not.toContain('it just means the record is blank');
      expect(text).not.toContain('No events were logged on this day');
    }
  });

  it('contract 8: legacy title "A quiet day in the record." no longer renders, any bucket', () => {
    for (const hour of [3, 9, 12, 14, 17, 20, 23]) {
      const tree = renderAtHour(hour);
      const text = allText(tree);
      expect(text).not.toContain('A quiet day in the record');
    }
  });
});
