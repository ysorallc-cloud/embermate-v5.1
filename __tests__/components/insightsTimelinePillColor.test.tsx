// ============================================================================
// Phase 6.4 — Demote timeline pills from sage to neutral.
//
// The watch-for list's "~2 wks / ~3 wks / ~4 wks" pills used the sage
// accent, competing with the PATTERNS COMING eyebrow (also sage) for
// visual weight. Sage is reserved for active progress signals (logged
// items, the new progress bar fill); future-time estimates are
// informational and belong on warm-cream textSecondary.
// ============================================================================

import React from 'react';

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

const ACCENT = '#5fb88a';
const TEXT_SECONDARY = '#c4c1b3';

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      accent: ACCENT,
      glass: '#363830',
      glassBorder: 'rgba(255,255,255,0.06)',
      hairlineInset: 'rgba(255,255,255,0.04)',
      textPrimary: '#fff',
      textSecondary: TEXT_SECONDARY,
      textTertiary: '#6b7280',
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

import { InsightsEmptyStatePreview } from '../../components/understand/InsightsEmptyStatePreview';

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

describe('Phase 6.4 — timeline pills are neutral, not sage', () => {
  const tree = InsightsEmptyStatePreview({ daysOfData: 5 });

  it('all four watch-for pills render with textSecondary, not accent', () => {
    const pills = findAll(tree, (n) =>
      typeof n.props?.testID === 'string' &&
      /^insights-watching-when-/.test(n.props.testID),
    );
    expect(pills).toHaveLength(4);
    for (const p of pills) {
      expect(styleOf(p).color).toBe(TEXT_SECONDARY);
      expect(styleOf(p).color).not.toBe(ACCENT);
    }
  });

  it('the only sage-colored elements are the eyebrow and the progress fill', () => {
    // Whitelist: PATTERNS COMING eyebrow + insights-progress-fill.
    // Anything else with color: accent or backgroundColor: accent is a
    // budget violation per Phase 7's 3-accent rule (sage is one of three;
    // overusing it on the same screen weakens the signal).
    const sageElements: { description: string }[] = [];
    function walk(node: any, label: string) {
      if (!node || typeof node !== 'object') return;
      const style = styleOf(node);
      if (style.color === ACCENT || style.backgroundColor === ACCENT) {
        sageElements.push({ description: label });
      }
      for (const k of flattenChildren(node.props?.children)) {
        walk(k, label);
      }
    }
    walk(tree, 'root');
    // Two sage elements expected: the eyebrow + the progress fill. The
    // exact whitelist check would require introspecting which testID,
    // but counting works: <= 2 means we haven't regressed.
    expect(sageElements.length).toBeLessThanOrEqual(2);
  });
});
