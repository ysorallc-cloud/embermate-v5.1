// ============================================================================
// RecentWindowCard — single tappable card pointing at the Insights tab.
// Phase 4 of the Journal handoff redesign — replaces the heavier Patterns
// paragraph with a one-line acknowledgement.
// ============================================================================

import React from 'react';

const mockNavigate = jest.fn();
jest.mock('../../lib/navigate', () => ({ navigate: (...args: any[]) => mockNavigate(...args) }));

jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return { ...actual, useMemo: (fn: any) => fn() };
});

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      caregiverAccent: '#aa8adc',
      caregiverAccentText: '#d4baff',
      textPrimary: '#fff',
      textSecondary: '#9aa0a6',
    },
  }),
}));

jest.mock('react-native', () => {
  const PT = (n: string) => n;
  return {
    View: PT('View'),
    Text: PT('Text'),
    TouchableOpacity: PT('TouchableOpacity'),
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
  };
});

import { RecentWindowCard } from '../../components/understand/RecentWindowCard';

function findAll(node: any, predicate: (n: any) => boolean): any[] {
  if (!node || typeof node !== 'object') return [];
  const out: any[] = [];
  if (predicate(node)) out.push(node);
  const kids = node.props?.children;
  const arr = Array.isArray(kids) ? kids : kids != null ? [kids] : [];
  for (const k of arr) out.push(...findAll(k, predicate));
  return out;
}

function flattenText(children: any): string {
  if (children == null) return '';
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(flattenText).join('');
  if (children?.props?.children !== undefined) return flattenText(children.props.children);
  return '';
}

const samplePattern = {
  id: 'med-adherence',
  title: 'Med adherence is low',
  // Context's first sentence is the headline — matches the spec example
  // ("Med adherence is low. View in Insights.").
  context: 'Med adherence is low. Dad missed 3 doses this week.',
};

beforeEach(() => {
  mockNavigate.mockReset();
});

describe('RecentWindowCard — visibility', () => {
  it('renders nothing when no patterns are passed', () => {
    expect(RecentWindowCard({ topPattern: null })).toBeNull();
  });

  it('renders the card when a pattern exists', () => {
    const tree = RecentWindowCard({ topPattern: samplePattern });
    expect(tree).not.toBeNull();
  });
});

describe('RecentWindowCard — content', () => {
  it('shows the tightened static title "This week"', () => {
    // v6.7: shortened from "This week's pattern" → "This week" so the
    // pattern engine's headline carries the full meaning in the subtitle.
    const tree = RecentWindowCard({ topPattern: samplePattern });
    expect(flattenText(tree)).toContain('This week');
    expect(flattenText(tree)).not.toContain("This week's pattern");
  });

  it('shows the pattern\'s headline sentence as the subtitle', () => {
    const tree = RecentWindowCard({ topPattern: samplePattern });
    expect(flattenText(tree)).toContain('Med adherence is low');
  });

  it('takes only the first sentence of a multi-sentence pattern context', () => {
    const tree = RecentWindowCard({
      topPattern: {
        id: 'p1',
        title: 'Sleep is variable',
        context: 'Sleep duration ranged from 4h to 9h this week. Variance suggests stress. View in Insights.',
      },
    });
    const text = flattenText(tree);
    expect(text).toContain('Sleep duration ranged from 4h to 9h this week');
    expect(text).not.toContain('Variance suggests stress');
  });

  it('falls back to the pattern title when no context is provided', () => {
    const tree = RecentWindowCard({
      topPattern: { id: 'p1', title: 'Mood dipped on Tuesday', context: '' },
    });
    expect(flattenText(tree)).toContain('Mood dipped on Tuesday');
  });

  it('renders the chevron affordance', () => {
    const tree = RecentWindowCard({ topPattern: samplePattern });
    expect(flattenText(tree)).toMatch(/›|→/);
  });
});

describe('RecentWindowCard — navigation', () => {
  it('tapping the card navigates to the Insights tab with the scrollTo param', () => {
    const tree = RecentWindowCard({ topPattern: samplePattern });
    const button = findAll(tree, (n) => n.type === 'TouchableOpacity')[0];
    expect(button).toBeDefined();
    button.props.onPress();
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/(tabs)/understand?scrollTo=med-adherence');
  });

  it('exposes a button accessibility role + descriptive label', () => {
    const tree = RecentWindowCard({ topPattern: samplePattern });
    const button = findAll(tree, (n) => n.type === 'TouchableOpacity')[0];
    expect(button.props.accessibilityRole).toBe('button');
    expect(button.props.accessibilityLabel).toMatch(/pattern|insights/i);
  });
});
