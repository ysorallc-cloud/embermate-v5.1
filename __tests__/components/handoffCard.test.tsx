// ============================================================================
// HandoffCard — Journal-page bottom CTA: Share summary + Done for today.
// Phase 6 of the handoff redesign — fully replaces the legacy snapshot card.
// ============================================================================

import React from 'react';

jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return { ...actual, useMemo: (fn: any) => fn() };
});

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      accent: '#5fb88a',
      caregiverAccent: '#aa8adc',
      caregiverAccentBg: 'rgba(139, 92, 246, 0.06)',
      textPrimary: '#fff',
      textSecondary: '#9aa0a6',
      glass: '#363830',
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

import { HandoffCard } from '../../components/journal/HandoffCard';

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

const populated = {
  hasNotes: true,
  hasMissed: false,
  hasPending: false,
  hasLogged: true,
  dayComplete: false,
};

const empty = {
  hasNotes: false,
  hasMissed: false,
  hasPending: false,
  hasLogged: false,
  dayComplete: false,
};

const completed = { ...populated, dayComplete: true };

describe('HandoffCard — visibility', () => {
  it('renders when there is content for the day', () => {
    const tree = HandoffCard({ ...populated, onShare: () => {}, onDoneForToday: () => {} });
    expect(tree).not.toBeNull();
  });

  it('hides when no notes, no missed, no pending, no logged events', () => {
    expect(HandoffCard({ ...empty, onShare: () => {}, onDoneForToday: () => {} })).toBeNull();
  });

  it('hides when the day has been marked complete', () => {
    expect(HandoffCard({ ...completed, onShare: () => {}, onDoneForToday: () => {} })).toBeNull();
  });

  it('renders when only missed items exist (no notes, no logged)', () => {
    const tree = HandoffCard({
      hasNotes: false,
      hasMissed: true,
      hasPending: false,
      hasLogged: false,
      dayComplete: false,
      onShare: () => {},
      onDoneForToday: () => {},
    });
    expect(tree).not.toBeNull();
  });

  it('renders when only pending items exist', () => {
    const tree = HandoffCard({
      hasNotes: false,
      hasMissed: false,
      hasPending: true,
      hasLogged: false,
      dayComplete: false,
      onShare: () => {},
      onDoneForToday: () => {},
    });
    expect(tree).not.toBeNull();
  });
});

describe('HandoffCard — content', () => {
  it('shows the title "Ready to hand off?"', () => {
    const tree = HandoffCard({ ...populated, onShare: () => {}, onDoneForToday: () => {} });
    expect(flattenText(tree)).toContain('Ready to hand off?');
  });

  it('shows the spec subtitle', () => {
    const tree = HandoffCard({ ...populated, onShare: () => {}, onDoneForToday: () => {} });
    expect(flattenText(tree)).toContain("Share today's notes and what's pending for the next caregiver.");
  });

  it('shows both action buttons', () => {
    const tree = HandoffCard({ ...populated, onShare: () => {}, onDoneForToday: () => {} });
    const text = flattenText(tree);
    expect(text).toContain('Share summary');
    expect(text).toContain('Done for today');
  });
});

describe('HandoffCard — actions', () => {
  it('Share summary tap fires onShare', () => {
    const onShare = jest.fn();
    const onDoneForToday = jest.fn();
    const tree = HandoffCard({ ...populated, onShare, onDoneForToday });
    const buttons = findAll(tree, (n) =>
      n.type === 'TouchableOpacity' &&
      typeof n.props?.accessibilityLabel === 'string' &&
      /share/i.test(n.props.accessibilityLabel),
    );
    expect(buttons.length).toBeGreaterThan(0);
    buttons[0].props.onPress();
    expect(onShare).toHaveBeenCalledTimes(1);
    expect(onDoneForToday).not.toHaveBeenCalled();
  });

  it('Done for today tap fires onDoneForToday', () => {
    const onShare = jest.fn();
    const onDoneForToday = jest.fn();
    const tree = HandoffCard({ ...populated, onShare, onDoneForToday });
    const buttons = findAll(tree, (n) =>
      n.type === 'TouchableOpacity' &&
      typeof n.props?.accessibilityLabel === 'string' &&
      /done/i.test(n.props.accessibilityLabel),
    );
    expect(buttons.length).toBeGreaterThan(0);
    buttons[0].props.onPress();
    expect(onDoneForToday).toHaveBeenCalledTimes(1);
    expect(onShare).not.toHaveBeenCalled();
  });
});
