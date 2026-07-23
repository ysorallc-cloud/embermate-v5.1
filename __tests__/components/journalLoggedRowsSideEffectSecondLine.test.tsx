// ============================================================================
// Journal log row — med side-effects render on their OWN secondary line.
//
// Device check (branch v7-scope-down): med rows with side-effects rendered the
// detail appended INTO the one-line `name` field (`${name} ${detail}`,
// numberOfLines={1}), so a med + side-effects clipped mid-list ("Metformin ·
// Dizzy, …", "· Other, …"). Fix (Option A): the med name keeps its clean
// single line; the side-effect detail moves to a dimmer secondary line below it
// (numberOfLines={2}), so it wraps instead of being swallowed by the name clip.
//
// The BUILDER is untouched (detail still `· Nausea, Tired`) — this is a pure
// layout change in the component. The leading "· " glyph is stripped for the
// standalone line.
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
      coral: '#e3a684', gold: '#d6ab5e', textTertiary: '#5e685f',
      textSecondary: '#949e94', textPrimary: '#edf0ea',
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
function isTextEl(n: any): boolean { return n?.type === 'Text'; }

function todayAt(h: number) { const d = new Date(); d.setHours(h, 0, 0, 0); return d.toISOString(); }

// A med instance with a completion LogEntry carrying two side-effects — the
// canonical MedicationLogData shape buildJournalLoggedRows reads.
const medInst: any = {
  id: 'med1', itemName: 'Metformin', itemType: 'medication', itemDosage: '500mg',
  scheduledTime: todayAt(8), status: 'completed', logId: 'log1',
};
const medLog: any = { id: 'log1', data: { type: 'medication', sideEffects: ['nausea', 'tired'] } };

const rows = buildJournalLoggedRows([medInst], [medLog]);
const tree = JournalLoggedRows({ rows } as any) as any;
const row = findAll(tree, (n) => n?.props?.testID === 'journal-log-row-med1')[0];

describe('Journal log row — side-effects on a secondary line', () => {
  it('the builder still produces the "· Nausea, Tired" detail (untouched)', () => {
    const r = rows.find((x) => x.id === 'med1');
    expect(r!.detail).toBe('· Nausea, Tired');
  });

  it('renders the side-effects in their OWN Text node, "· " stripped', () => {
    expect(row).toBeDefined();
    const detail = findAll(row, (n) => n?.props?.testID === 'journal-log-detail-med1')[0];
    expect(detail).toBeDefined();
    expect(textOf(detail)).toBe('Nausea, Tired');
    expect(detail.props.numberOfLines).toBe(2);
  });

  it('the name line carries ONLY the med name — side-effects are NOT appended into it', () => {
    // Find the single-line name node (numberOfLines===1). It must read the med
    // name and must NOT swallow the side-effect text (the pre-fix clip bug).
    const nameNode = findAll(row, (n) => isTextEl(n) && n?.props?.numberOfLines === 1)[0];
    expect(nameNode).toBeDefined();
    expect(textOf(nameNode)).toContain('Metformin 500mg');
    expect(textOf(nameNode)).not.toContain('Nausea');
    expect(textOf(nameNode)).not.toContain('·');
  });

  it('a med with NO side-effects renders no secondary detail line', () => {
    const plain: any = { ...medInst, id: 'plain', logId: undefined };
    const plainRows = buildJournalLoggedRows([plain]);
    const plainTree = JournalLoggedRows({ rows: plainRows } as any) as any;
    const plainRow = findAll(plainTree, (n) => n?.props?.testID === 'journal-log-row-plain')[0];
    expect(findAll(plainRow, (n) => n?.props?.testID === 'journal-log-detail-plain')).toHaveLength(0);
  });
});
