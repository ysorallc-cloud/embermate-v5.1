// ============================================================================
// Phase 15.2 — NowGreeting subtitle is the formatted date, not state-derived.
//
// Pre-15.2 the subtitle composed `{TIME_EMOJI[tod]} ${greeting.subtitle}`
// where greeting.subtitle was state-derived ("Next meds: 8:00 AM",
// "All done. Nice work.", etc.). The subtitle's job in v6 is grounding —
// the same ambient context the date carries on its own. Replacing
// the state-derived line with the date keeps the header calmer and
// removes the redundancy with the StatRings + timeline below.
//
// Pinned contracts:
//   1. Subtitle renders in `EEEE, MMMM d` format ("Sunday, May 10").
//   2. Subtitle does NOT include "Next meds:", "on track", or any
//      other state-derived phrase.
//   3. Subtitle is independent of stats and nextScheduledTime — passing
//      null/empty for both still renders a date.
//   4. Time-of-day emoji prefix is dropped (the date carries grounding
//      alone; emoji + date together reads busy).
// ============================================================================

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

const themeColors = {
  background: '#1f201c',
  textPrimary: '#fff',
  textSecondary: '#c4c1b3',
};

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ resolvedTheme: 'dark', colors: themeColors }),
}));

jest.mock('react-native', () => {
  const PT = (n: string) => n;
  return {
    View: PT('View'),
    Text: PT('Text'),
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
  };
});

import { NowGreeting } from '../NowGreeting';
import type { TodayStats } from '../../../utils/nowHelpers';
import { format } from 'date-fns';

const NEUTRAL_STATS: TodayStats = {
  meds: { completed: 0, total: 0 },
  vitals: { completed: 0, total: 0 },
  meals: { completed: 0, total: 0 },
} as TodayStats;

function flattenText(n: TestRenderer.ReactTestInstance): string {
  const out: string[] = [];
  function walk(node: any) {
    if (node == null) return;
    if (typeof node === 'string') { out.push(node); return; }
    if (typeof node === 'number') { out.push(String(node)); return; }
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (node.children !== undefined) walk(node.children);
    if (node.props?.children !== undefined) walk(node.props.children);
  }
  walk(n);
  return out.join('');
}

function render(props: any): TestRenderer.ReactTestRenderer {
  let root: TestRenderer.ReactTestRenderer | null = null;
  act(() => {
    root = TestRenderer.create(React.createElement(NowGreeting as any, props));
  });
  return root!;
}

describe('Phase 15.2 — NowGreeting subtitle = formatted date', () => {
  it('contract 1: subtitle renders in `EEEE, MMMM d` format', () => {
    const tree = render({
      stats: NEUTRAL_STATS,
      patientName: 'Mom',
      nextScheduledTime: '8:00 AM',
    });
    const expected = format(new Date(), 'EEEE, MMMM d');
    const texts = tree.root.findAll((n: any) => n.type === 'Text');
    const all = texts.map(flattenText).join(' | ');
    expect(all).toContain(expected);
  });

  it('contract 2: subtitle does NOT include "Next meds:", "on track", or other state-derived phrasing', () => {
    const tree = render({
      stats: NEUTRAL_STATS,
      patientName: 'Mom',
      nextScheduledTime: '8:00 AM',
    });
    const texts = tree.root.findAll((n: any) => n.type === 'Text');
    const all = texts.map(flattenText).join(' | ');
    expect(all).not.toMatch(/Next meds:/i);
    expect(all).not.toMatch(/on track/i);
    expect(all).not.toMatch(/all done/i);
    expect(all).not.toMatch(/still pending/i);
    expect(all).not.toMatch(/done so far/i);
    expect(all).not.toMatch(/morning's done/i);
  });

  it('contract 3: subtitle is independent of stats and nextScheduledTime (null both still renders date)', () => {
    const tree = render({
      stats: NEUTRAL_STATS,
      patientName: 'Mom',
      nextScheduledTime: null,
    });
    const expected = format(new Date(), 'EEEE, MMMM d');
    const texts = tree.root.findAll((n: any) => n.type === 'Text');
    const all = texts.map(flattenText).join(' | ');
    expect(all).toContain(expected);
  });

  it('contract 3: works regardless of which stats slice is populated', () => {
    const populatedStats: TodayStats = {
      meds: { completed: 5, total: 5 },
      vitals: { completed: 1, total: 1 },
      meals: { completed: 3, total: 3 },
    } as TodayStats;
    const tree = render({
      stats: populatedStats,
      patientName: 'Mom',
      nextScheduledTime: '8:00 AM',
    });
    const expected = format(new Date(), 'EEEE, MMMM d');
    const texts = tree.root.findAll((n: any) => n.type === 'Text');
    const all = texts.map(flattenText).join(' | ');
    expect(all).toContain(expected);
  });

  it('contract 4: time-of-day emoji prefix is dropped from the subtitle', () => {
    const tree = render({
      stats: NEUTRAL_STATS,
      patientName: 'Mom',
      nextScheduledTime: '8:00 AM',
    });
    const texts = tree.root.findAll((n: any) => n.type === 'Text');
    const all = texts.map(flattenText).join(' | ');
    // The four TIME_EMOJI candidates from pre-15.2: ☀ (morning), ⛅ (midday),
    // ☾ (evening + night). Dropped in 15.2 — none should appear in any
    // rendered text.
    expect(all).not.toContain('☀');
    expect(all).not.toContain('⛅');
    expect(all).not.toContain('☾');
  });
});
