// ============================================================================
// Journal middle section — missed-surfacing trust-floor (Journal rebuild S2).
//
// NON-NEGOTIABLE: the rebuilt "WHAT WAS LOGGED" middle section must still
// surface missed items (the Option-A "Still to do" floor + the meals-§2 fix,
// confirmed on-device). A pending item past its window (getCareItemStatus →
// overdue) must stamp 'missed' in the builder AND render as a missed row in
// JournalLoggedRows — never silently dropped. This pins that end-to-end
// (builder stamp → component render), across vitals + wellness + meal.
// ============================================================================

import React from 'react';
import { buildJournalLoggedRows } from '../../utils/journalLoggedRows';

const CORAL = '#e3a684';
const GOLD = '#d6ab5e';
const NEUTRAL = '#5e685f'; // textTertiary (neutral register)

jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return { ...actual, useMemo: (fn: any) => fn() };
});
jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      coral: CORAL, gold: GOLD, textTertiary: NEUTRAL, textPrimary: '#edf0ea',
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
function styleOf(n: any): Record<string, any> {
  const s = n?.props?.style;
  if (!s) return {};
  return Array.isArray(s) ? Object.assign({}, ...s.filter(Boolean)) : s;
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

// Past-window (2 days ago) → getCareItemStatus deterministically overdue.
function pastAt(h: number) { const d = new Date(Date.now() - 2 * 86400000); d.setHours(h, 0, 0, 0); return d.toISOString(); }

const instances: any[] = [
  { id: 'v', itemName: 'Check vitals', itemType: 'vitals', windowLabel: 'morning', scheduledTime: pastAt(8), status: 'pending' },
  { id: 'w', itemName: 'Morning Wellness Check-in', itemType: 'wellness', windowLabel: 'morning', scheduledTime: pastAt(7), status: 'pending' },
  { id: 'm', itemName: 'Breakfast', itemType: 'nutrition', windowLabel: 'morning', scheduledTime: pastAt(8), status: 'pending' },
  { id: 'd', itemName: 'Aspirin', itemType: 'medication', itemDosage: '81mg', scheduledTime: pastAt(7), status: 'completed' },
];

describe('buildJournalLoggedRows — status stamped once via getCareItemStatus', () => {
  const rows = buildJournalLoggedRows(instances);
  const byId = (id: string) => rows.find((r) => r.id === id)!;

  it('past-window pending vitals/wellness/meal all stamp MISSED', () => {
    expect(byId('v').status).toBe('missed');
    expect(byId('w').status).toBe('missed');
    expect(byId('m').status).toBe('missed');
  });
  it('missed rows read "Missed"; completed reads a clock time', () => {
    expect(byId('v').time).toBe('Missed');
    expect(byId('d').status).toBe('done');
    expect(byId('d').time).toMatch(/AM|PM/);
  });
});

describe('JournalLoggedRows — missed items RENDER (not silently dropped)', () => {
  const tree = JournalLoggedRows({ rows: buildJournalLoggedRows(instances) } as any) as any;
  const row = (id: string) => findAll(tree, (n) => n?.props?.testID === `journal-log-row-${id}`)[0];
  const timeStyle = (id: string) => styleOf(findAll(tree, (n) => n?.props?.testID === `journal-log-time-${id}`)[0]);

  it('missed vitals row is present and named', () => {
    expect(row('v')).toBeDefined();
    expect(textOf(row('v'))).toContain('Check vitals');
    expect(textOf(row('v'))).toContain('Missed');
  });
  it('missed wellness + meal rows are present', () => {
    expect(row('w')).toBeDefined();
    expect(row('m')).toBeDefined();
    expect(textOf(row('w'))).toContain('Missed');
  });
  it('missed time renders CORAL (the trust-floor color)', () => {
    expect(timeStyle('v').color).toBe(CORAL);
  });
  it('completed row renders neutral (not coral)', () => {
    expect(timeStyle('d').color).toBe(NEUTRAL);
    expect(timeStyle('d').color).not.toBe(CORAL);
  });
});
