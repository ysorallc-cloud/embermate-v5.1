// ============================================================================
// Journal §2/§4 pending-vs-missed coherence — same canonical helper.
//
// After missed meals were surfaced in §2's meal narrative (f0d1f6fb), the
// SAME overdue meal also appeared in §4 "Still pending" — because
// formatStillPendingTonight filtered on PERSISTED status === 'pending', a
// signal that never flips to missed. Net: the breakfast read "missed" in §2
// and "still pending" in §4 on one screen.
//
// Fix routes §4's meal pending-vs-missed through getCareItemStatus (the same
// helper §2 already uses): an overdue meal is missed, not still-pending, so it
// leaves §4 and shows only in §2.
//
// SCOPE GUARD (pinned here): the routing is nutrition-ONLY. Meds/vitals/
// wellness keep their existing persisted-pending behavior — an overdue MED
// still appears in §4. (Generalizing that is PART B, not this fix.)
// ============================================================================

import React from 'react';
import type { DailyCareInstance } from '../../types/carePlan';
import { getCareItemStatus } from '../../utils/careItemStatus';
import { formatStillPendingTonight } from '../../utils/stillPendingFormat';

// ── §2 render harness (MealsNarrative) ──
jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return { ...actual, useMemo: (fn: any) => fn() };
});
jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      textPrimary: '#fff', textSecondary: '#c4c1b3', amber: '#e5b04a',
      glassHover: 'rgba(255,255,255,0.025)', border: 'rgba(255,255,255,0.08)',
    },
  }),
}));
jest.mock('react-native', () => {
  const PT = (n: string) => n;
  return { View: PT('View'), Text: PT('Text'), StyleSheet: { create: (s: any) => s, flatten: (s: any) => s } };
});

import { MealsNarrative } from '../../components/journal/MealsNarrative';
import type { MealsDetail } from '../../utils/careSummaryBuilder';

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

// Past breakfast (2 days ago, 08:00) — deterministically overdue.
const pastBreakfast = new Date(Date.now() - 2 * 86400000); pastBreakfast.setHours(8, 0, 0, 0);
const breakfastISO = pastBreakfast.toISOString();
// Past med (2 days ago, 09:00) — overdue, but NON-nutrition → stays in §4.
const pastMed = new Date(Date.now() - 2 * 86400000); pastMed.setHours(9, 0, 0, 0);
const medISO = pastMed.toISOString();
// Future dinner (tomorrow, 18:00) — NOT overdue → stays in §4.
const futureDinner = new Date(Date.now() + 86400000); futureDinner.setHours(18, 0, 0, 0);
const dinnerISO = futureDinner.toISOString();

function inst(over: Partial<DailyCareInstance>): DailyCareInstance {
  return {
    id: 'x', itemName: 'X', itemType: 'nutrition', scheduledTime: breakfastISO,
    status: 'pending', windowLabel: 'morning', ...over,
  } as unknown as DailyCareInstance;
}

describe('Journal §2/§4 pending-vs-missed coherence', () => {
  const breakfast = inst({ id: 'b', itemName: 'Breakfast', itemType: 'nutrition', windowLabel: 'morning', scheduledTime: breakfastISO });
  const dinner = inst({ id: 'd', itemName: 'Dinner', itemType: 'nutrition', windowLabel: 'evening', scheduledTime: dinnerISO });
  const med = inst({ id: 'm', itemName: 'Aspirin', itemType: 'medication', windowLabel: undefined, scheduledTime: medISO });

  it('helper: the past breakfast is overdue; the future dinner is not', () => {
    expect(getCareItemStatus(breakfast)).toBe('overdue');
    expect(getCareItemStatus(dinner)).not.toBe('overdue');
  });

  it('§4: overdue breakfast is ABSENT from "still pending"', () => {
    const rows = formatStillPendingTonight([breakfast, dinner, med]);
    const names = rows.map((r) => r.name);
    expect(names).not.toContain('Breakfast'); // missed → §2 only
    expect(names).toContain('Dinner');        // not yet overdue → still pending
  });

  it('§4 SCOPE GUARD: an overdue MED still appears (nutrition-only routing)', () => {
    const rows = formatStillPendingTonight([breakfast, med]);
    expect(rows.map((r) => r.name)).toContain('Aspirin');
  });

  it('§2: the same overdue breakfast shows as missed in the meal narrative', () => {
    const meals: MealsDetail = {
      total: 2,
      meals: [
        { name: 'Breakfast', status: 'missed', scheduledTime: breakfastISO },
        { name: 'Lunch', status: 'completed', scheduledTime: breakfastISO },
      ],
    };
    const text = textOf(MealsNarrative({ meals, bare: true, loggedOnly: true } as any));
    expect(text).toContain('Breakfast');
    expect(text.toLowerCase()).toContain('missed');
  });
});
