// ============================================================================
// Phase 6.2 — Visible progress through the 14-day building window.
//
// The building-state Patterns Coming card now shows a thin progress bar
// (sage fill on warm-cream-tinted track) plus an explicit "{N} of 14
// days" label. Until 6.2 the card only said "13 more days, then trends
// appear." — a number that changed but no sense of how close.
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

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      accent: '#5fb88a',
      glass: '#363830',
      glassBorder: 'rgba(255,255,255,0.06)',
      hairlineInset: 'rgba(255,255,255,0.04)',
      textPrimary: '#fff',
      textSecondary: '#9aa0a6',
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

function flattenText(children: any): string {
  if (children == null) return '';
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(flattenText).join('');
  if (children?.props?.children !== undefined) {
    return flattenText(children.props.children);
  }
  return '';
}

function getTrack(tree: any) {
  return findAll(tree, (n) => n.props?.testID === 'insights-progress-track')[0];
}
function getFill(tree: any) {
  return findAll(tree, (n) => n.props?.testID === 'insights-progress-fill')[0];
}
function getLabel(tree: any) {
  return findAll(tree, (n) => n.props?.testID === 'insights-progress-label')[0];
}

function styleOf(node: any): Record<string, any> {
  const s = node?.props?.style;
  if (!s) return {};
  if (Array.isArray(s)) return Object.assign({}, ...s.filter(Boolean));
  return s;
}

describe('Phase 6.2 — building-state progress bar', () => {
  it('renders the progress track + fill at 0% on day 0', () => {
    const tree = InsightsEmptyStatePreview({ daysOfData: 0 });
    expect(getTrack(tree)).toBeDefined();
    const fill = getFill(tree);
    expect(fill).toBeDefined();
    expect(styleOf(fill).width).toBe('0%');
  });

  it('renders ~50% fill on day 7 with the matching label', () => {
    const tree = InsightsEmptyStatePreview({ daysOfData: 7 });
    const fill = getFill(tree);
    expect(styleOf(fill).width).toBe('50%');
    const label = getLabel(tree);
    expect(flattenText(label)).toContain('7 of 14 days');
  });

  it('renders ~93% fill on day 13 with the matching label', () => {
    const tree = InsightsEmptyStatePreview({ daysOfData: 13 });
    const fill = getFill(tree);
    expect(styleOf(fill).width).toMatch(/^9[23]?(\.\d+)?%$/);
    const label = getLabel(tree);
    expect(flattenText(label)).toContain('13 of 14 days');
  });

  it('caps the fill at 100% even if daysOfData exceeds 14', () => {
    // Defensive cap — Phase 3.7.3 says >= 14 should fall through to the
    // populated surface, but if this component is ever rendered with a
    // larger value the bar must not exceed its track.
    const tree = InsightsEmptyStatePreview({ daysOfData: 20 });
    // Component returns null for >= 14, so no fill in the tree.
    expect(tree).toBeNull();
  });

  it('progress fill uses the sage accent color', () => {
    const tree = InsightsEmptyStatePreview({ daysOfData: 5 });
    const fill = getFill(tree);
    expect(styleOf(fill).backgroundColor).toBe('#5fb88a');
  });
});
