// ============================================================================
// Phase 5.12.i — Journal disclaimer footer (Layer 1 legal hygiene).
//
// Persistent line at the very bottom of the page, never dismissable. Calm
// type, textTertiary, italic — must not compete with the care narrative.
// ============================================================================

import React from 'react';

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
      textTertiary: TEXT_TERTIARY,
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

import { JournalDisclaimer } from '../../components/journal/JournalDisclaimer';

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

describe('JournalDisclaimer — Layer 1 legal hygiene', () => {
  it('renders the canonical disclaimer copy', () => {
    const tree = JournalDisclaimer();
    expect(textOf(tree)).toMatch(/Journal is your record/);
    expect(textOf(tree)).toMatch(/Not a medical record/);
    expect(textOf(tree)).toMatch(/Cross-reference/);
  });

  it('renders in textTertiary at calm font size with italic + center alignment', () => {
    const tree = JournalDisclaimer();
    const text = findAll(tree, (n) => n.type === 'Text')[0];
    const merged = styleOf(text);
    expect(merged.color).toBe(TEXT_TERTIARY);
    expect(merged.fontStyle).toBe('italic');
    expect(merged.textAlign).toBe('center');
    expect(merged.fontSize).toBeLessThanOrEqual(11);
  });

  it('exposes no dismiss affordance (no TouchableOpacity, no onPress)', () => {
    const tree = JournalDisclaimer();
    const tappables = findAll(tree, (n) => n.type === 'TouchableOpacity');
    expect(tappables).toHaveLength(0);
    const withOnPress = findAll(tree, (n) => n.props?.onPress !== undefined);
    expect(withOnPress).toHaveLength(0);
  });
});

describe('JournalDisclaimer — Journal mounting', () => {
  const { readFileSync } = require('fs');
  const { join } = require('path');
  const journalSrc = readFileSync(
    join(__dirname, '../..', 'app/(tabs)/journal.tsx'),
    'utf8',
  );

  it('Journal imports JournalDisclaimer', () => {
    expect(journalSrc).toMatch(
      /import\s+\{\s*JournalDisclaimer\s*\}\s+from\s+['"][^'"]+JournalDisclaimer['"]/,
    );
  });

  it('Journal renders <JournalDisclaimer />', () => {
    expect(journalSrc).toMatch(/<JournalDisclaimer\b/);
  });

  it('the disclaimer renders unconditionally (no isViewingPast / addNoteMode guard)', () => {
    // The component must sit OUTSIDE the past/today/empty conditionals
    // so it appears on every state of the page.
    const idx = journalSrc.indexOf('<JournalDisclaimer');
    expect(idx).toBeGreaterThan(-1);
    // Look at the immediate JSX neighborhood — the line before should
    // not be a `&& (` short-circuit guard or a conditional ternary.
    const before = journalSrc.slice(Math.max(0, idx - 200), idx);
    expect(before).not.toMatch(/isViewingPast\s*\?\s*$|isViewingPast\s*&&\s*$|addNoteMode\s*&&\s*$/);
  });
});
