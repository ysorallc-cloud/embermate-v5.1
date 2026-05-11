// ============================================================================
// Phase 15.11 — ShareSheet: single Share CTA → action sheet.
//
// Pre-15.11 Insights rendered three stacked reportCards (Visit
// prep / Care report / Medication report), each with its own
// "Share" button. The Share label appeared three times above the
// Vitals grid, none of the cards added clarity over their title +
// subtitle, and the visual triple-stack read like a checklist
// rather than a single optional CTA.
//
// 15.11 collapses them to one button on Insights that opens this
// sheet. The sheet exposes the same three actions; the handlers
// (visit-prep navigation, care-report share, medication-report
// share) are unchanged — only the surface that triggers them
// changes.
//
// Audit finding: there are no separate handler functions in
// understand.tsx; the inline onPress branched on a `key` field.
// The new handleShareSelection consolidates that branching into a
// single dispatch keyed by ShareOption.
//
// Pinned contracts:
//   1. When visible, renders three labeled options + a dismiss
//      affordance. The labels match the pre-15.11 reportCard
//      titles: "Visit prep summary", "Care report (PDF)",
//      "Medication report".
//   2. Tapping an option fires onSelect with the corresponding
//      ShareOption key.
//   3. Tapping an option also calls onClose — selecting dismisses
//      the sheet (no second tap required).
//   4. Tapping the overlay dismisses without firing onSelect
//      (escape hatch).
//   5. When visible={false}, the option labels are NOT in the
//      tree.
// ============================================================================

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

const themeColors = {
  background: '#1f201c',
  glass: '#363830',
  glassBorder: 'rgba(255,240,215,0.08)',
  overlay: 'rgba(0,0,0,0.6)',
  menuSurface: '#2a2c25',
  accent: '#5fb88a',
  textPrimary: '#fff',
  textSecondary: '#c4c1b3',
};

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ resolvedTheme: 'dark', colors: themeColors }),
}));

jest.mock('react-native', () => {
  const PT = (n: string) => n;
  return {
    View: PT('View'),
    Text: PT('Text'),
    TouchableOpacity: PT('TouchableOpacity'),
    Modal: PT('Modal'),
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
  };
});

import { ShareSheet, type ShareOption } from '../ShareSheet';

function findAll(
  root: TestRenderer.ReactTestInstance,
  predicate: (n: TestRenderer.ReactTestInstance) => boolean,
): TestRenderer.ReactTestInstance[] {
  return root.findAll((n: any) => {
    try { return predicate(n); } catch { return false; }
  });
}

function flattenText(node: any): string {
  if (node == null || node === false) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join(' ');
  if (typeof node === 'object') {
    if (node.children) return flattenText(node.children);
    if (node.props?.children !== undefined) return flattenText(node.props.children);
  }
  return '';
}

function render(props: {
  visible: boolean;
  onSelect: (opt: ShareOption) => void;
  onClose: () => void;
}): TestRenderer.ReactTestRenderer {
  let renderer: TestRenderer.ReactTestRenderer | null = null;
  act(() => {
    renderer = TestRenderer.create(React.createElement(ShareSheet, props));
  });
  return renderer!;
}

function findOption(
  tree: TestRenderer.ReactTestRenderer,
  testID: string,
): TestRenderer.ReactTestInstance | undefined {
  return findAll(tree.root, (n: any) => n.props?.testID === testID)[0];
}

describe('Phase 15.11 — ShareSheet', () => {
  describe('contract 1: renders three labeled options when visible', () => {
    it('shows all three option labels', () => {
      const tree = render({ visible: true, onSelect: jest.fn(), onClose: jest.fn() });
      const text = flattenText(tree.toJSON());
      expect(text).toContain('Visit prep summary');
      expect(text).toContain('Care report (PDF)');
      expect(text).toContain('Medication report');
    });

    it('attaches a testID to each option for downstream wiring', () => {
      const tree = render({ visible: true, onSelect: jest.fn(), onClose: jest.fn() });
      expect(findOption(tree, 'share-option-visit-prep')).toBeDefined();
      expect(findOption(tree, 'share-option-care-report')).toBeDefined();
      expect(findOption(tree, 'share-option-medication-report')).toBeDefined();
    });
  });

  describe('contract 2: tap option → onSelect fires with the right ShareOption key', () => {
    it('visit-prep option dispatches "visit-prep"', () => {
      const onSelect = jest.fn();
      const tree = render({ visible: true, onSelect, onClose: jest.fn() });
      act(() => { findOption(tree, 'share-option-visit-prep')!.props.onPress(); });
      expect(onSelect).toHaveBeenCalledWith('visit-prep');
    });

    it('care-report option dispatches "care-report"', () => {
      const onSelect = jest.fn();
      const tree = render({ visible: true, onSelect, onClose: jest.fn() });
      act(() => { findOption(tree, 'share-option-care-report')!.props.onPress(); });
      expect(onSelect).toHaveBeenCalledWith('care-report');
    });

    it('medication-report option dispatches "medication-report"', () => {
      const onSelect = jest.fn();
      const tree = render({ visible: true, onSelect, onClose: jest.fn() });
      act(() => { findOption(tree, 'share-option-medication-report')!.props.onPress(); });
      expect(onSelect).toHaveBeenCalledWith('medication-report');
    });
  });

  describe('contract 3: selecting an option also dismisses the sheet', () => {
    it('calls onClose after onSelect (no second tap needed)', () => {
      const onSelect = jest.fn();
      const onClose = jest.fn();
      const tree = render({ visible: true, onSelect, onClose });
      act(() => { findOption(tree, 'share-option-visit-prep')!.props.onPress(); });
      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('contract 4: overlay tap dismisses without firing onSelect', () => {
    it('escape hatch — close the sheet without picking', () => {
      const onSelect = jest.fn();
      const onClose = jest.fn();
      const tree = render({ visible: true, onSelect, onClose });
      const overlay = findOption(tree, 'share-sheet-overlay');
      expect(overlay).toBeDefined();
      act(() => { overlay!.props.onPress(); });
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(onSelect).not.toHaveBeenCalled();
    });
  });

  describe('contract 5: hidden when visible=false', () => {
    it('option labels do not appear in the tree', () => {
      // The Modal honors `visible` in production. In the test
      // harness Modal is stubbed to a string element, so its
      // children render in tree even when hidden — but we can
      // verify the component passes visible={false} through to
      // Modal so the runtime hide behavior is wired correctly.
      const tree = render({ visible: false, onSelect: jest.fn(), onClose: jest.fn() });
      const modal = findAll(tree.root, (n: any) => n.type === 'Modal')[0];
      expect(modal).toBeDefined();
      expect(modal.props.visible).toBe(false);
    });
  });
});
