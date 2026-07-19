// ============================================================================
// MedicationsScreen (onboarding enrichment Piece 2) — UI contract.
//   • Autocomplete is a convenience: a known med (Lisinopril) suggests.
//   • Free-text works fully: an unknown med (Eliquis) types + adds.
//   • Add builds a list; Continue hands up the entered meds; Skip hands up none.
// ============================================================================

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#dbe5dc', textPrimary: '#111', textSecondary: '#555', textMuted: '#999',
      accent: '#3f7d57', accentBorder: '#3f7d5733', accentChipFill: '#3f7d5711',
      glass: '#fff', glassBorder: '#0001',
    },
  }),
}));
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  return {
    SafeAreaView: ({ children }: any) => React.createElement('View', null, children),
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 34, left: 0 }),
  };
});
jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  return { LinearGradient: ({ children }: any) => React.createElement('View', null, children) };
});
jest.mock('../../app/(onboarding)/components/StaticAuroraBackground', () => ({ StaticAuroraBackground: () => null }));
jest.mock('react-native', () => {
  const React = require('react');
  const PT = (n: string) => ({ children, ...props }: any) => React.createElement(n, props, children);
  return {
    View: PT('View'), Text: PT('Text'), TextInput: PT('TextInput'),
    Pressable: PT('Pressable'), ScrollView: PT('ScrollView'),
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
  };
});

import { MedicationsScreen } from '../../app/(onboarding)/screens/MedicationsScreen';

function byId(root: TestRenderer.ReactTestInstance, id: string) {
  return root.findAll((n: any) => { try { return n.props?.testID === id; } catch { return false; } })[0];
}
function render(props: any) {
  let tree!: TestRenderer.ReactTestRenderer;
  act(() => { tree = TestRenderer.create(React.createElement(MedicationsScreen as any, props)); });
  return tree;
}
function type(tree: TestRenderer.ReactTestRenderer, id: string, text: string) {
  act(() => { byId(tree.root, id).props.onChangeText(text); });
}
function press(tree: TestRenderer.ReactTestRenderer, id: string) {
  act(() => { byId(tree.root, id).props.onPress(); });
}

describe('MedicationsScreen — onboarding med-step', () => {
  it('uses the patient name in the heading', () => {
    const tree = render({ patientName: 'Dad', onContinue: jest.fn(), onSkip: jest.fn() });
    const text = tree.root.findAll((n: any) => typeof n.props?.children === 'string').map((n: any) => n.props.children).join(' ');
    expect(text).toContain('What does Dad take?');
  });

  it('AUTOCOMPLETE: a known med suggests as you type (convenience)', () => {
    const tree = render({ patientName: 'Dad', onContinue: jest.fn(), onSkip: jest.fn() });
    type(tree, 'onboarding-med-name', 'Lisin');
    expect(byId(tree.root, 'onboarding-med-suggestion-Lisinopril')).toBeDefined();
    // Tapping the suggestion fills the name; dose chips for that med appear.
    press(tree, 'onboarding-med-suggestion-Lisinopril');
    expect(byId(tree.root, 'onboarding-med-dose-10mg')).toBeDefined();
  });

  it('FREE-TEXT: an unknown med (Eliquis) has no suggestion but still adds', () => {
    const tree = render({ patientName: 'Dad', onContinue: jest.fn(), onSkip: jest.fn() });
    type(tree, 'onboarding-med-name', 'Eliquis');
    expect(byId(tree.root, 'onboarding-med-suggestion-Eliquis')).toBeUndefined(); // not in the list
    press(tree, 'onboarding-med-add');
    expect(byId(tree.root, 'onboarding-med-added-Eliquis')).toBeDefined();
  });

  it('adds two meds and Continue hands them up', () => {
    const onContinue = jest.fn();
    const tree = render({ patientName: 'Dad', onContinue, onSkip: jest.fn() });

    type(tree, 'onboarding-med-name', 'Lisinopril');
    type(tree, 'onboarding-med-dose', '10mg');
    press(tree, 'onboarding-med-add');

    type(tree, 'onboarding-med-name', 'Warfarin');
    press(tree, 'onboarding-med-slot-evening');
    press(tree, 'onboarding-med-add');

    press(tree, 'onboarding-med-continue');

    expect(onContinue).toHaveBeenCalledTimes(1);
    const meds = onContinue.mock.calls[0][0];
    expect(meds).toEqual([
      { name: 'Lisinopril', dose: '10mg', timeSlot: 'morning' },
      { name: 'Warfarin', dose: '', timeSlot: 'evening' },
    ]);
  });

  it('Continue folds in a typed-but-not-added entry (not lost)', () => {
    const onContinue = jest.fn();
    const tree = render({ patientName: 'Dad', onContinue, onSkip: jest.fn() });
    type(tree, 'onboarding-med-name', 'Metformin');
    type(tree, 'onboarding-med-dose', '500mg');
    press(tree, 'onboarding-med-continue');
    expect(onContinue.mock.calls[0][0]).toEqual([{ name: 'Metformin', dose: '500mg', timeSlot: 'morning' }]);
  });

  it('Skip hands up nothing', () => {
    const onSkip = jest.fn();
    const onContinue = jest.fn();
    const tree = render({ patientName: 'Dad', onContinue, onSkip });
    press(tree, 'onboarding-med-skip');
    expect(onSkip).toHaveBeenCalledTimes(1);
    expect(onContinue).not.toHaveBeenCalled();
  });
});
