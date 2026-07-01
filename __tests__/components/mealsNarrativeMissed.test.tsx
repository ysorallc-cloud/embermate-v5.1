// ============================================================================
// MealsNarrative — missed-meal surfacing (build-65 silent-drop bug).
//
// Bug: a genuinely missed meal (un-logged, past its window+120) was NOT
// surfaced in Journal's meal narrative — a care item silently dropped from
// the next caregiver's handoff. Diagnosis: case 2. careSummaryBuilder already
// maps an overdue un-logged meal to status 'missed' (via getCareItemStatus,
// the canonical helper — pinned here), but MealsNarrative bucketed meals into
// ONLY completed + pending, so a 'missed' meal fell through both and rendered
// in neither. (MedicationsNarrative already renders missed; meals never did.)
//
// This is the render/integration guard the helper-only coverage missed: it
// renders the actual component the way journal.tsx calls it (bare, loggedOnly)
// and asserts the missed meal reaches the narrative text.
// ============================================================================

import React from 'react';
import { getCareItemStatus } from '../../utils/careItemStatus';
import type { MealsDetail } from '../../utils/careSummaryBuilder';

jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return { ...actual, useMemo: (fn: any) => fn() };
});

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      textPrimary: '#fff',
      textSecondary: '#c4c1b3',
      amber: '#e5b04a',
      glassHover: 'rgba(255,255,255,0.025)',
      border: 'rgba(255,255,255,0.08)',
    },
  }),
}));

jest.mock('react-native', () => {
  const PT = (n: string) => n;
  return {
    View: PT('View'),
    Text: PT('Text'),
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
  };
});

import { MealsNarrative } from '../../components/journal/MealsNarrative';

function textOf(node: any): string {
  const out: string[] = [];
  (function walk(n: any) {
    if (n == null || n === false) return;
    if (typeof n === 'string') { out.push(n); return; }
    if (typeof n === 'number') { out.push(String(n)); return; }
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (n?.props?.children !== undefined) walk(n.props.children);
  })(node);
  return out.join('');
}

// A breakfast scheduled two days ago at 08:00 — deterministically past its
// window+120 regardless of when the suite runs.
const past = new Date(Date.now() - 2 * 86400000);
past.setHours(8, 0, 0, 0);
const breakfastISO = past.toISOString();
const lunchPast = new Date(Date.now() - 2 * 86400000);
lunchPast.setHours(12, 0, 0, 0);
const lunchISO = lunchPast.toISOString();

describe('MealsNarrative — missed meal surfacing', () => {
  it('the helper computes a past-window un-logged breakfast as overdue (→ missed)', () => {
    const status = getCareItemStatus({
      itemType: 'nutrition',
      windowLabel: 'morning',
      scheduledTime: breakfastISO,
      status: 'pending',
    });
    expect(status).toBe('overdue');
  });

  it('surfaces a missed breakfast alongside a logged lunch (loggedOnly, as journal calls it)', () => {
    const meals: MealsDetail = {
      total: 2,
      meals: [
        { name: 'Breakfast', status: 'missed', scheduledTime: breakfastISO },
        { name: 'Lunch', status: 'completed', scheduledTime: lunchISO },
      ],
    };
    const text = textOf(MealsNarrative({ meals, bare: true, loggedOnly: true } as any));
    expect(text).toContain('Lunch');       // logged meal still shows
    expect(text).toContain('Breakfast');    // RED before fix: dropped
    expect(text.toLowerCase()).toContain('missed');
  });

  it('names the missed meal even when it is the only meal (none completed)', () => {
    const meals: MealsDetail = {
      total: 1,
      meals: [{ name: 'Breakfast', status: 'missed', scheduledTime: breakfastISO }],
    };
    const text = textOf(MealsNarrative({ meals, bare: true, loggedOnly: true } as any));
    // RED before fix: returns null (loggedOnly + noneCompleted) → empty string.
    expect(text).toContain('Breakfast');
    expect(text.toLowerCase()).toContain('missed');
  });
});
