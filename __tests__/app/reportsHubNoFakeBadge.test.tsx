// ============================================================================
// Reports Hub — no fake adherence badge (Wave-1 fakes/dead-code deletion).
//
// The clinical-report rows carry STATIC config badges ("Coming soon",
// "View patterns") — none are live data. The Medication Adherence row
// carried a hardcoded "94%" that read as a real metric (flagged DIVERGENT/
// fake in the single-source data audit: app/hub/reports/index.tsx:42, a
// literal masking whether the authoritative DailyCareInstance adherence
// landed). This pins the fake GONE while the real report stays reachable.
//
// Behavior pinned (mount, not source-regex):
//   • The screen mounts and the Medication Adherence row renders.
//   • No "94%" — and no "%" badge at all — appears in the tree (no fake
//     number, no placeholder number).
//   • The row still navigates to /hub/reports/medication (the real
//     per-report computation is untouched; only the hub preview badge
//     is removed).
// ============================================================================

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

jest.mock('react-native', () => {
  const ReactLocal = require('react');
  const make = (name: string) =>
    ReactLocal.forwardRef((props: any, ref: any) =>
      ReactLocal.createElement(name, { ...props, ref }, props.children),
    );
  return {
    View: make('View'),
    Text: make('Text'),
    ScrollView: make('ScrollView'),
    TouchableOpacity: make('TouchableOpacity'),
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
    Alert: { alert: jest.fn() },
  };
});

jest.mock('react-native-safe-area-context', () => {
  const ReactLocal = require('react');
  return {
    SafeAreaView: ({ children }: any) => ReactLocal.createElement('SafeAreaView', null, children),
    useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
    SafeAreaProvider: ({ children }: any) => children,
  };
});

jest.mock('../../lib/navigate', () => ({ navigate: jest.fn() }));

jest.mock('../../components/aurora/AuroraBackground', () => ({ AuroraBackground: () => null }));
jest.mock('../../components/aurora/GlassCard', () => {
  const ReactLocal = require('react');
  return { GlassCard: ({ children }: any) => ReactLocal.createElement('GlassCard', null, children) };
});
jest.mock('../../components/aurora/SectionHeader', () => {
  const ReactLocal = require('react');
  return { SectionHeader: ({ title }: any) => ReactLocal.createElement('Text', null, title) };
});
jest.mock('../../components/SubScreenHeader', () => {
  const ReactLocal = require('react');
  return { SubScreenHeader: ({ title }: any) => ReactLocal.createElement('Text', null, title) };
});

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: require('../../theme/theme-tokens').Colors }),
}));

jest.mock('../../hooks/useCarePlanConfig', () => ({
  useEnabledBuckets: () => ({ enabledBuckets: ['meds', 'vitals', 'wellness', 'meals', 'water', 'sleep'] }),
}));

import ReportsHub from '../../app/hub/reports/index';
import { navigate } from '../../lib/navigate';

function collectText(node: any, out: string[]): void {
  if (node == null) return;
  if (typeof node === 'string' || typeof node === 'number') { out.push(String(node)); return; }
  if (Array.isArray(node)) { node.forEach((n) => collectText(n, out)); return; }
  // react-test-renderer toJSON nodes carry rendered children on `.children`.
  if (node.children !== undefined) collectText(node.children, out);
}

function allText(tree: TestRenderer.ReactTestRenderer): string {
  const out: string[] = [];
  collectText(tree.toJSON(), out);
  return out.join(' ');
}

describe('Reports Hub — no fake adherence badge', () => {
  let tree!: TestRenderer.ReactTestRenderer;
  beforeEach(() => {
    (navigate as jest.Mock).mockClear();
    act(() => { tree = TestRenderer.create(React.createElement(ReportsHub)); });
  });
  afterEach(() => { tree.unmount(); });

  it('mounts and renders the Medication Adherence row', () => {
    expect(allText(tree)).toContain('Medication Adherence');
  });

  it('shows no fake number — neither "94%" nor any "%" badge', () => {
    const text = allText(tree);
    expect(text).not.toContain('94%');
    expect(text).not.toMatch(/%/); // no placeholder/percent metric anywhere in the hub
  });

  it('the Medication Adherence row still navigates to the real per-report computation', () => {
    const row = tree.root.findAll((n: any) =>
      n.type === 'TouchableOpacity' &&
      typeof n.props?.accessibilityLabel === 'string' &&
      /Medication Adherence/.test(n.props.accessibilityLabel),
    )[0];
    expect(row).toBeDefined();
    act(() => { row.props.onPress(); });
    expect(navigate).toHaveBeenCalledWith('/hub/reports/medication');
  });
});
