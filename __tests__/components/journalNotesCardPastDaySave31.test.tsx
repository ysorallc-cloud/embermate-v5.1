// ============================================================================
// Phase 31 F3 follow-up — past-day notes Save affordance in BARE mode.
//
// F3 made bare-mode past-day notes EDITABLE (caregivers recall things
// later and need to amend the day the recollection belongs to). The
// TextInput dropped its `editable={!readOnly}` gate in bare mode so the
// input is always writable. But the Save pill kept the original
// `!readOnly` gate, so typing into a past day produced unsavable text.
// This contract pins the bug-fix: in bare mode the Save pill renders
// regardless of `readOnly`. The non-bare path's read-only contract is
// unchanged (covered by journalPastDateView.test.tsx).
//
// Pinned contracts:
//   1. bare={true} + readOnly={true} — the Save TouchableOpacity is
//      present in the rendered tree.
//   2. bare={true} + readOnly={false} — Save TouchableOpacity is also
//      present (parity, regression guard).
//   3. bare={false} + readOnly={true} — Save TouchableOpacity is NOT
//      rendered (the non-bare consumer's read-only contract still
//      hides the pill; only bare mode overrides).
// ============================================================================

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

const themeColors = {
  glass: 'rgba(255, 245, 220, 0.04)',
  glassBorder: 'rgba(255, 240, 215, 0.10)',
  glassFaint: 'rgba(255, 245, 220, 0.03)',
  textPrimary: '#fff',
  textSecondary: '#c4c1b3',
  textTertiary: '#9aa0a6',
  caregiverAccent: '#aa8adc',
  accent: '#5fb88a',
  amber: '#e5b04a',
  green: '#5fb88a',
  greenTint: 'rgba(95, 184, 138, 0.10)',
};

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({ resolvedTheme: 'dark', colors: themeColors }),
}));

jest.mock('react-native', () => {
  const PT = (n: string) => n;
  return {
    View: PT('View'),
    Text: PT('Text'),
    TextInput: PT('TextInput'),
    TouchableOpacity: PT('TouchableOpacity'),
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
  };
});

jest.mock('../../utils/text/primitives', () => ({
  formatTime: () => '8:00 AM',
}));

import { JournalNotesCard } from '../../components/journal/JournalNotesCard';

function findAll(
  root: TestRenderer.ReactTestInstance,
  predicate: (n: TestRenderer.ReactTestInstance) => boolean,
): TestRenderer.ReactTestInstance[] {
  return root.findAll((n: any) => {
    try { return predicate(n); } catch { return false; }
  });
}

function render(props: any): TestRenderer.ReactTestRenderer {
  let root: TestRenderer.ReactTestRenderer | null = null;
  act(() => {
    root = TestRenderer.create(
      React.createElement(JournalNotesCard as any, props),
    );
  });
  return root!;
}

const baseProps = {
  date: '2026-05-19',
  onSave: jest.fn().mockResolvedValue(undefined),
  caregiverName: 'Amber',
  providerName: 'Dr. Torres',
};

function findSaveButtons(tree: TestRenderer.ReactTestRenderer) {
  return findAll(tree.root, (n: any) =>
    n.type === 'TouchableOpacity' &&
    typeof n.props?.accessibilityLabel === 'string' &&
    /save/i.test(n.props.accessibilityLabel),
  );
}

describe('Phase 31 F3 follow-up — past-day Save pill in bare mode', () => {
  it('contract 1: bare={true} + readOnly={true} renders the Save TouchableOpacity', () => {
    const tree = render({
      ...baseProps,
      bare: true,
      readOnly: true,
      savedText: 'Dad seemed off this morning.',
      savedAt: '2026-05-19T20:30:00Z',
    });
    expect(findSaveButtons(tree).length).toBe(1);
  });

  it('contract 2: bare={true} + readOnly={false} also renders the Save TouchableOpacity (today parity)', () => {
    const tree = render({
      ...baseProps,
      bare: true,
      readOnly: false,
    });
    expect(findSaveButtons(tree).length).toBe(1);
  });

  it('contract 3: bare={false} + readOnly={true} does NOT render the Save TouchableOpacity (non-bare contract preserved)', () => {
    const tree = render({
      ...baseProps,
      bare: false,
      readOnly: true,
      savedText: 'Some past prose.',
    });
    expect(findSaveButtons(tree).length).toBe(0);
  });
});
