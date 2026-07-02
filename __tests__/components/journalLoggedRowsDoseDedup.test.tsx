// ============================================================================
// Journal log row — dose de-dup (P1: "Aspirin 81mg 81mg").
//
// Medication CarePlanItem.name is persisted WITH the dose baked in, and
// itemDosage is stored separately (see utils/medDisplay for the full context).
// The Journal middle-section row must render the med line ONCE ("Aspirin 81mg"),
// not doubled ("Aspirin 81mg 81mg"). Routed through formatMedDisplay.
// ============================================================================

import React from 'react';
import { buildJournalLoggedRows } from '../../utils/journalLoggedRows';

jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return { ...actual, useMemo: (fn: any) => fn() };
});
jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      coral: '#e3a684', gold: '#d6ab5e', textTertiary: '#5e685f', textPrimary: '#edf0ea',
      hairlineInset: 'rgba(255,255,255,0.06)',
    },
  }),
}));
jest.mock('react-native', () => {
  const PT = (n: string) => n;
  return { View: PT('View'), Text: PT('Text'), StyleSheet: { create: (s: any) => s, flatten: (s: any) => s } };
});

import { JournalLoggedRows } from '../../components/journal/JournalLoggedRows';

function flatten(kids: any): any[] {
  if (kids == null) return [];
  if (Array.isArray(kids)) return kids.flatMap(flatten);
  return [kids];
}
function findAll(node: any, pred: (n: any) => boolean): any[] {
  if (!node || typeof node !== 'object') return [];
  const out: any[] = [];
  if (pred(node)) out.push(node);
  for (const k of flatten(node.props?.children)) out.push(...findAll(k, pred));
  return out;
}
function textOf(node: any): string {
  const out: string[] = [];
  (function w(n: any) {
    if (n == null || n === false) return;
    if (typeof n === 'string' || typeof n === 'number') { out.push(String(n)); return; }
    if (Array.isArray(n)) { n.forEach(w); return; }
    if (n?.props?.children !== undefined) w(n.props.children);
  })(node);
  return out.join('');
}

function todayAt(h: number) { const d = new Date(); d.setHours(h, 0, 0, 0); return d.toISOString(); }

// The P1 case: stored med name already contains the dose ("Aspirin 81mg"),
// and itemDosage carries it again ("81mg").
const p1Med: any = {
  id: 'p1', itemName: 'Aspirin 81mg', itemType: 'medication',
  itemDosage: '81mg', scheduledTime: todayAt(8), status: 'completed',
};

describe('Journal log row — dose de-dup (P1)', () => {
  const tree = JournalLoggedRows({ rows: buildJournalLoggedRows([p1Med]) } as any) as any;
  const row = findAll(tree, (n) => n?.props?.testID === 'journal-log-row-p1')[0];

  it('renders the med line ONCE — "Aspirin 81mg", not doubled', () => {
    expect(row).toBeDefined();
    const t = textOf(row);
    expect(t).toContain('Aspirin 81mg');
    expect(t).not.toContain('81mg 81mg');
  });

  it('a clean name + dose still shows the dose once', () => {
    const clean: any = { ...p1Med, id: 'clean', itemName: 'Aspirin' };
    const t2 = textOf(
      findAll(
        JournalLoggedRows({ rows: buildJournalLoggedRows([clean]) } as any) as any,
        (n) => n?.props?.testID === 'journal-log-row-clean',
      )[0],
    );
    expect(t2).toContain('Aspirin 81mg');
    expect(t2).not.toContain('81mg 81mg');
  });
});
