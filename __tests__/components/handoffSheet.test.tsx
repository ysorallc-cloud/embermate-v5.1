// ============================================================================
// HandoffSheet — Phase 7 of the Journal handoff redesign.
// Bottom sheet with a clean, non-duplicative preview pane + four actions.
// ============================================================================

import React from 'react';

const mockSetString = jest.fn();
const mockShareHandoff = jest.fn().mockResolvedValue(true);
const mockOpenURL = jest.fn();

jest.mock('expo-clipboard', () => ({
  setStringAsync: (...args: any[]) => mockSetString(...args),
}));
jest.mock('../../services/handoffPdf', () => ({
  generateAndShareHandoff: (...args: any[]) => mockShareHandoff(...args),
}));
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
      menuSurface: '#1a1f2b',
      glassBorder: 'rgba(255,255,255,0.06)',
      glass: '#363830',
      glassDim: '#161b25',
      accent: '#5fb88a',
      caregiverAccent: '#aa8adc',
      textPrimary: '#fff',
      textSecondary: '#9aa0a6',
      textTertiary: '#6b7280',
      overlay: 'rgba(0,0,0,0.6)',
      border: 'rgba(255,255,255,0.08)',
    },
  }),
}));

jest.mock('../../components/SectionEyebrow', () => ({
  SectionEyebrow: ({ text }: any) => ({
    type: 'Text',
    props: { children: text.toUpperCase(), accessibilityRole: 'header' },
  }),
}));

jest.mock('react-native', () => {
  const PT = (n: string) => n;
  return {
    View: PT('View'),
    Text: PT('Text'),
    TouchableOpacity: PT('TouchableOpacity'),
    Modal: PT('Modal'),
    ScrollView: PT('ScrollView'),
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
    Linking: { openURL: (...args: any[]) => mockOpenURL(...args) },
  };
});

import { HandoffSheet } from '../../components/journal/HandoffSheet';
import type { DailyOutcomes } from '../../utils/text/types';

function expand(node: any): any {
  // Inline-invoke function components so the test can walk their output.
  if (node && typeof node === 'object' && typeof node.type === 'function') {
    try {
      return node.type(node.props || {});
    } catch {
      return null;
    }
  }
  return node;
}

function findAll(node: any, predicate: (n: any) => boolean): any[] {
  const expanded = expand(node);
  if (!expanded || typeof expanded !== 'object') return [];
  const out: any[] = [];
  if (predicate(expanded)) out.push(expanded);
  const kids = expanded.props?.children;
  const arr = Array.isArray(kids) ? kids : kids != null ? [kids] : [];
  for (const k of arr) out.push(...findAll(k, predicate));
  return out;
}

function flattenText(children: any): string {
  const expanded = expand(children);
  if (expanded == null) return '';
  if (typeof expanded === 'string' || typeof expanded === 'number') return String(expanded);
  if (Array.isArray(expanded)) return expanded.map(flattenText).join('');
  if (expanded?.props?.children !== undefined) return flattenText(expanded.props.children);
  return '';
}

const richOutcomes: DailyOutcomes = {
  logged: { count: 4, summary: '3 meals, 1 morning check-in' },
  missed: { count: 2, names: ['Acetaminophen 325mg', 'Amlodipine 2.5mg'] },
  pending: { count: 1, names: ['Evening wellness check'] },
};

const baseProps = {
  visible: true,
  onClose: jest.fn(),
  patientName: 'Mom',
  date: new Date('2026-04-26T22:30:00'),
  outcomes: richOutcomes,
  notes: '',
  events: [] as Array<{ time: Date; label: string }>,
};

beforeEach(() => {
  mockSetString.mockReset();
  mockShareHandoff.mockReset();
  mockShareHandoff.mockResolvedValue(true);
  mockOpenURL.mockReset();
});

describe('HandoffSheet — header', () => {
  it('shows the resolved patient name (not literal "Patient")', () => {
    const tree = HandoffSheet({ ...baseProps, patientName: 'Mom' });
    const text = flattenText(tree);
    expect(text).toContain('Mom');
    expect(text).not.toMatch(/Patient: Patient/);
  });

  it('falls back to "Your loved one" when patient name is empty', () => {
    const tree = HandoffSheet({ ...baseProps, patientName: '' });
    expect(flattenText(tree)).toContain('Your loved one');
  });

  it('shows the day, date, and time chips', () => {
    const tree = HandoffSheet({ ...baseProps });
    const text = flattenText(tree);
    expect(text).toMatch(/Sunday/);
    expect(text).toMatch(/Apr/);
    expect(text).toMatch(/10:30 PM|22:30/);
  });

  it('title reads "Hand off to next caregiver"', () => {
    const tree = HandoffSheet({ ...baseProps });
    expect(flattenText(tree)).toContain('Hand off to next caregiver');
  });
});

describe('HandoffSheet — outcomes section', () => {
  it('renders the TODAY\'S OUTCOMES eyebrow', () => {
    const tree = HandoffSheet({ ...baseProps });
    expect(flattenText(tree)).toContain("TODAY'S OUTCOMES");
  });

  it('lists missed items by name with their count prefix', () => {
    const tree = HandoffSheet({ ...baseProps });
    const text = flattenText(tree);
    expect(text).toContain('2 not logged today: Acetaminophen 325mg, Amlodipine 2.5mg');
  });

  it('lists pending items', () => {
    const tree = HandoffSheet({ ...baseProps });
    expect(flattenText(tree)).toContain('1 still to check: Evening wellness check');
  });

  it('shows the logged categorical summary, not enumerated names', () => {
    const tree = HandoffSheet({ ...baseProps });
    expect(flattenText(tree)).toContain('4 logged: 3 meals, 1 morning check-in');
  });
});

describe('HandoffSheet — handoff notes section', () => {
  it('omits the entire section when no notes exist', () => {
    const tree = HandoffSheet({ ...baseProps, notes: '' });
    expect(flattenText(tree)).not.toContain('HANDOFF NOTES');
  });

  it('renders the section + eyebrow + body when notes exist', () => {
    const tree = HandoffSheet({ ...baseProps, notes: 'Slept poorly. Skipped the walk.' });
    const text = flattenText(tree);
    expect(text).toContain('HANDOFF NOTES');
    expect(text).toContain('Slept poorly. Skipped the walk.');
  });
});

describe('HandoffSheet — events section', () => {
  it('omits when no events provided', () => {
    const tree = HandoffSheet({ ...baseProps, events: [] });
    expect(flattenText(tree)).not.toContain("TODAY'S EVENTS");
  });

  it('renders chronological list with timestamps when events provided', () => {
    const tree = HandoffSheet({
      ...baseProps,
      events: [
        { time: new Date('2026-04-26T08:00:00'), label: 'Breakfast logged' },
        { time: new Date('2026-04-26T20:00:00'), label: 'Evening meds taken' },
      ],
    });
    const text = flattenText(tree);
    expect(text).toContain("TODAY'S EVENTS");
    expect(text).toContain('Breakfast logged');
    expect(text).toContain('Evening meds taken');
  });
});

describe('HandoffSheet — deprecated sections must NOT render', () => {
  it('does NOT include the "Day at a Glance" heading', () => {
    const tree = HandoffSheet({ ...baseProps });
    expect(flattenText(tree)).not.toContain('Day at a Glance');
  });

  it('does NOT include a Guidance section', () => {
    const tree = HandoffSheet({ ...baseProps });
    expect(flattenText(tree)).not.toMatch(/^Guidance/m);
    expect(flattenText(tree)).not.toContain('GUIDANCE');
  });

  it('does NOT include a top alert-summary paragraph that duplicates outcomes', () => {
    // Old surface had a prose lead like "Acetaminophen, Amlodipine were
    // skipped — review before hand-off." That must not coexist with the
    // structured "2 missed: …" list.
    const tree = HandoffSheet({ ...baseProps });
    expect(flattenText(tree)).not.toMatch(/were skipped/);
  });
});

describe('HandoffSheet — bottom actions', () => {
  it('exposes Copy as text, Share as PDF, Send via Messages, and Cancel', () => {
    const tree = HandoffSheet({ ...baseProps });
    const text = flattenText(tree);
    expect(text).toContain('Copy as text');
    expect(text).toContain('Share as PDF');
    expect(text).toContain('Send via Messages');
    expect(text).toContain('Cancel');
  });

  it('Copy as text writes the preview to the clipboard', async () => {
    const tree = HandoffSheet({ ...baseProps });
    const button = findAll(tree, (n) =>
      n.type === 'TouchableOpacity' &&
      typeof n.props?.accessibilityLabel === 'string' &&
      /copy/i.test(n.props.accessibilityLabel),
    )[0];
    await button.props.onPress();
    expect(mockSetString).toHaveBeenCalledTimes(1);
    const arg = mockSetString.mock.calls[0][0];
    expect(arg).toContain('Mom');
    expect(arg).toContain('2 not logged today');
  });

  it('Share as PDF generates and shares a handoff PDF', async () => {
    const tree = HandoffSheet({ ...baseProps });
    const button = findAll(tree, (n) =>
      n.type === 'TouchableOpacity' &&
      typeof n.props?.accessibilityLabel === 'string' &&
      /pdf/i.test(n.props.accessibilityLabel),
    )[0];
    await button.props.onPress();
    expect(mockShareHandoff).toHaveBeenCalledTimes(1);
    const data = mockShareHandoff.mock.calls[0][0];
    expect(data.patientName).toBe('Mom');
    expect(data.outcomesLines).toEqual(
      expect.arrayContaining([
        expect.stringContaining('2 not logged today'),
        expect.stringContaining('1 still to check'),
        expect.stringContaining('4 logged'),
      ]),
    );
  });

  it('Send via Messages opens an SMS deep link prefilled with the preview', async () => {
    const tree = HandoffSheet({ ...baseProps });
    const button = findAll(tree, (n) =>
      n.type === 'TouchableOpacity' &&
      typeof n.props?.accessibilityLabel === 'string' &&
      /messages/i.test(n.props.accessibilityLabel),
    )[0];
    await button.props.onPress();
    expect(mockOpenURL).toHaveBeenCalledTimes(1);
    expect(mockOpenURL.mock.calls[0][0]).toMatch(/^sms:/);
  });

  it('Cancel calls onClose', () => {
    const onClose = jest.fn();
    const tree = HandoffSheet({ ...baseProps, onClose });
    const button = findAll(tree, (n) =>
      n.type === 'TouchableOpacity' &&
      typeof n.props?.accessibilityLabel === 'string' &&
      /cancel/i.test(n.props.accessibilityLabel),
    )[0];
    button.props.onPress();
    expect(onClose).toHaveBeenCalled();
  });
});
