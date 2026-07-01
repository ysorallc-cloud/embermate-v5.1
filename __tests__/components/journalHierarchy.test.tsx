// ============================================================================
// Journal hierarchy — visual-consistency Phase 3.
//
// Outcomes is the more important block; Notes is a compact card. Assertions
// stay at the declared-style level (fontSize, minHeight, child counts) since
// jest-node has no layout engine.
// ============================================================================

import React from 'react';

const themeColors = {
  background: '#1f201c',
  glass: '#26302a',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
  hairlineInset: 'rgba(255, 255, 255, 0.06)',
  accent: '#9ccfa6',
  caregiverAccent: '#aa8adc',
  warning: '#d6ab5e',
  criticalAlert: '#e3a684',
  coral: '#e89a7a',
  error: '#e3a684',
  textPrimary: '#fff',
  textSecondary: '#949e94',
  textTertiary: '#5e685f',
};

jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return {
    ...actual,
    useMemo: (fn: any) => fn(),
    useState: (initial: any) => {
      const value = typeof initial === 'function' ? initial() : initial;
      return [value, jest.fn()];
    },
    useEffect: (_fn: any) => {},
    useCallback: (fn: any) => fn,
    useRef: (initial: any) => ({ current: initial }),
  };
});

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({ resolvedTheme: 'dark', colors: themeColors }),
}));

jest.mock('react-native', () => {
  const PT = (n: string) => n;
  return {
    View: PT('View'),
    Text: PT('Text'),
    TouchableOpacity: PT('TouchableOpacity'),
    TextInput: PT('TextInput'),
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
  };
});

jest.mock('../../utils/text/primitives', () => ({
  formatTime: () => '8:30 AM',
}));

jest.mock('../../utils/dailyOutcomes', () => ({
  formatOutcomeDetail: (items: any[]) =>
    items.map((i) => i.name || i.label || 'item').join(', '),
}));

import { TodayOutcomes } from '../../components/journal/TodayOutcomes';
import { JournalNotesCard } from '../../components/journal/JournalNotesCard';

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

const styleOf = (node: any) => {
  const styleProp = node.props.style;
  const styles = Array.isArray(styleProp) ? styleProp : [styleProp];
  return Object.assign({}, ...styles.filter(Boolean));
};

const outcomesProps = (notLoggedCount = 9) => ({
  outcomes: {
    missed: {
      count: notLoggedCount,
      names: ['Metformin 8a', 'Lisinopril 8a', 'BP', 'Lunch'],
      items: undefined,
    },
    pending: { count: 0, names: [], items: undefined },
    logged: { count: 0, names: [], summary: '' },
  } as any,
  asOf: new Date('2026-04-30T20:00:00'),
});

describe('TodayOutcomes — promoted hierarchy', () => {
  it('count Text uses fontSize >= 18 and fontWeight 500', () => {
    const tree = (TodayOutcomes as any)(outcomesProps(9));
    const counts = findAll(tree, (n) => {
      if (n.type !== 'Text') return false;
      const text = n.props?.children;
      if (typeof text !== 'number' && typeof text !== 'string') return false;
      return String(text) === '9';
    });
    expect(counts.length).toBeGreaterThan(0);
    const merged = styleOf(counts[0]);
    expect(merged.fontSize).toBeGreaterThanOrEqual(18);
    expect(merged.fontWeight).toBe('500');
  });

  it('"not logged" / missed row uses 34pt circle with criticalAlert glyph', () => {
    const tree = (TodayOutcomes as any)(outcomesProps(9));
    const circle = findAll(tree, (n) => n.props?.testID === 'outcome-icon-missed')[0];
    expect(circle).toBeDefined();
    const merged = styleOf(circle);
    expect(merged.width).toBe(34);
    expect(merged.height).toBe(34);
    // Pins hardcoded coral LITERALS in the component (766-family, not tokens)
    // — stay at the pre-sage value until the literals migrate in Phase 1.
    // F7 leaves these old (they are not token pins).
    expect(merged.backgroundColor).toBe('rgba(230, 119, 110, 0.14)');
    expect(merged.borderColor).toBe('rgba(230, 119, 110, 0.4)');
  });

  it('does NOT use the deprecated electric-red rgba(248, 113, 113, ...) for the missed icon bg', () => {
    const tree = (TodayOutcomes as any)(outcomesProps(9));
    const circle = findAll(tree, (n) => n.props?.testID === 'outcome-icon-missed')[0];
    const merged = styleOf(circle);
    expect(merged.backgroundColor).not.toMatch(/248,\s*113,\s*113/);
  });
});

describe('JournalNotesCard — compact', () => {
  const notesProps = {
    date: '2026-04-30',
    onSave: jest.fn(),
  };

  it('TextInput uses minHeight <= 80 (Phase 27 F6 raised the floor from 36 to 60)', () => {
    // Pre-Phase-27 the bound was minHeight <= 36 (a Phase 4 compaction).
    // Phase 27 F6 raised the floor to 60pt (3 lines × 20pt lineHeight)
    // because the SOAP restructure moved the notes block into Section
    // 4's lavender card. The ceiling stays under 80pt — the field
    // should still grow naturally with content past the floor, not
    // start as a giant block. journalPhase4 carries the exact-60 pin.
    const tree = (JournalNotesCard as any)(notesProps);
    const inputs = findAll(tree, (n) => n.type === 'TextInput');
    expect(inputs.length).toBeGreaterThan(0);
    const merged = styleOf(inputs[0]);
    expect(merged.minHeight).toBeLessThanOrEqual(80);
  });

  it('renders a visible serif italic prompt above the input', () => {
    // Phase 33 F7 — Georgia literal swept to Fonts.serifItalic token,
    // which resolves at runtime to 'Poppins_300Light_Italic'.
    const tree = (JournalNotesCard as any)(notesProps);
    const prompt = findAll(tree, (n) => n.props?.testID === 'notes-prompt')[0];
    expect(prompt).toBeDefined();
    const merged = styleOf(prompt);
    expect(merged.fontStyle).toBe('italic');
    expect(merged.fontFamily).toBe('Poppins_300Light_Italic');
  });

  it('Save button (saved/idle) uses outlined sage border at 0.5 opacity, sage text', () => {
    // The fresh-state save button is outlined sage; we probe its style.
    const tree = (JournalNotesCard as any)({ ...notesProps, savedText: '' });
    const save = findAll(tree, (n) =>
      n.type === 'TouchableOpacity' &&
      n.props?.accessibilityRole === 'button' &&
      typeof n.props?.accessibilityLabel === 'string' &&
      /Save|Saving|Saved/.test(n.props.accessibilityLabel),
    )[0];
    expect(save).toBeDefined();
    const merged = styleOf(save);
    // Hardcoded sage LITERAL in JournalNotesCard's saveButton (766-family, not
    // a token) — stays pre-sage until the literal migrates in Phase 1.
    expect(merged.borderColor).toBe('rgba(95, 184, 138, 0.5)');
  });
});

describe('Visual-weight proxy — outcomes outweighs notes', () => {
  it('Outcomes body renders more direct rows than Notes body renders elements', () => {
    // Use a fuller outcomes shape (missed + pending + logged) so the body
    // renders 3 rows. Same screen reality: a typical day has multiple
    // outcome variants present.
    const fullOutcomes = {
      outcomes: {
        missed:  { count: 9, names: ['Metformin', 'BP', 'Lunch'], items: undefined },
        pending: { count: 2, names: ['Evening meds'], items: undefined },
        logged:  { count: 5, names: [], summary: 'Breakfast, mood, water' },
      } as any,
      asOf: new Date('2026-04-30T20:00:00'),
    };
    const o = (TodayOutcomes as any)(fullOutcomes);
    const n = (JournalNotesCard as any)({ date: '2026-04-30', onSave: jest.fn() });

    const oBody = findAll(o, (x) => x.props?.testID === 'outcomes-body')[0];
    const nBody = findAll(n, (x) => x.props?.testID === 'notes-body')[0];
    expect(oBody).toBeDefined();
    expect(nBody).toBeDefined();
    const oChildren = flattenChildren(oBody.props.children).filter(Boolean);
    const nChildren = flattenChildren(nBody.props.children).filter(Boolean);
    expect(oChildren.length).toBeGreaterThan(nChildren.length);
  });
});
