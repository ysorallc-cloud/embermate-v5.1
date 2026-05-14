// ============================================================================
// Phase 11.3 — You-tab footer witness wiring + multi-pipeline refresh.
//
// Phase 26 F5 RETIRED the footer SURFACE. The witness fetch + multi-
// pipeline refresh contracts (3–7) still hold; the footer-rendering
// contracts (1, 2) flipped to absence pins because the entire footer
// View was removed.
//
// support.tsx now owns the single witness fetch and passes the result
// to the AffirmationHeader (Phase 11.2 wiring, still in place).
// Re-fetches fire only when one of the witness builder's read
// pipelines emits an event; unrelated events stay quiet. The footer
// rendering it ALSO drove pre-26 is gone, so witness.footerLine is
// produced by the builder but consumed by no surface on this screen
// (left intact for v1.1 cleanup, see WitnessSignal.footerLine comment
// in caregiverWitnessBuilder.ts).
//
// Pinned contracts:
//   1. Witness footer does NOT render (retired, Phase 26 F5).
//   2. Generic footer fallback does NOT render (retired alongside).
//   3. Single fetch per mount (no double-fetch via the header).
//   4. Re-fetch on EVENT.DAILY_INSTANCES.
//   5. Re-fetch on EVENT.LOGS.
//   6. Re-fetch on EVENT.MEDICATION.
//   7. No re-fetch on irrelevant events (EVENT.APPOINTMENTS).
// ============================================================================

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

const themeColors = {
  background: '#1f201c',
  textPrimary: '#fff',
  textSecondary: '#c4c1b3',
  textTertiary: '#8a8a82',
  textMuted: '#9aa0a6',
  glass: '#363830',
  glassDim: 'rgba(255, 240, 215, 0.04)',
  glassHover: 'rgba(255, 245, 220, 0.06)',
  glassBorder: 'rgba(255, 240, 215, 0.08)',
  accent: '#5fb88a',
};

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({ resolvedTheme: 'dark', colors: themeColors }),
}));

jest.mock('react-native', () => {
  const PT = (n: string) => n;
  return {
    View: PT('View'),
    Text: PT('Text'),
    TouchableOpacity: PT('TouchableOpacity'),
    ScrollView: PT('ScrollView'),
    RefreshControl: PT('RefreshControl'),
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
    Linking: { openURL: jest.fn(() => Promise.resolve()) },
  };
});

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, style }: any) =>
    require('react').createElement('SafeAreaView', { style }, children),
}));

jest.mock('../../lib/navigate', () => ({ navigate: jest.fn() }));

// Stub the heavier child components — we're testing footer + header
// witness wiring, not the rest of the screen composition.
jest.mock('../../components/support/ReflectionCard', () => ({
  ReflectionCard: () => null,
}));
jest.mock('../../components/support/QuickResetPills', () => ({
  QuickResetPills: () => null,
}));
jest.mock('../../components/support/BreathingExercise', () => ({
  BreathingExercise: () => null,
}));
jest.mock('../../components/support/ResourcesList', () => ({
  ResourcesList: () => null,
}));
jest.mock('../../components/support/AffirmationHeader', () => ({
  AffirmationHeader: () => null,
}));

// Witness builder mock — drives test scenarios.
const mockBuildCaregiverWitness = jest.fn();
jest.mock('../../utils/caregiverWitnessBuilder', () => ({
  __esModule: true,
  buildCaregiverWitness: (...args: any[]) => mockBuildCaregiverWitness(...args),
}));

// Import the actual events module so emitDataUpdate routes through
// the same listener registry support.tsx subscribes to.
import { emitDataUpdate } from '../../lib/events';
import { EVENT } from '../../lib/eventNames';
import SupportScreen from '../../app/(tabs)/support';

function findAll(
  root: TestRenderer.ReactTestInstance,
  predicate: (n: TestRenderer.ReactTestInstance) => boolean,
): TestRenderer.ReactTestInstance[] {
  return root.findAll((n: any) => {
    try { return predicate(n); } catch { return false; }
  });
}

function flattenText(n: TestRenderer.ReactTestInstance): string {
  const out: string[] = [];
  function walk(node: any) {
    if (node == null) return;
    if (typeof node === 'string') { out.push(node); return; }
    if (typeof node === 'number') { out.push(String(node)); return; }
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (node.children !== undefined) walk(node.children);
    if (node.props?.children !== undefined) walk(node.props.children);
  }
  walk(n);
  return out.join('');
}

// Track the active renderer so afterEach can unmount it. Without
// unmount the useDataListener cleanup never runs and listeners
// accumulate across tests, causing every subsequent emit to multiply.
let activeTree: TestRenderer.ReactTestRenderer | null = null;

async function renderAndSettle(): Promise<TestRenderer.ReactTestRenderer> {
  let root: TestRenderer.ReactTestRenderer | null = null;
  await act(async () => {
    root = TestRenderer.create(React.createElement(SupportScreen as any));
  });
  // Allow the mount-effect's async fetch to resolve.
  await act(async () => { await Promise.resolve(); });
  activeTree = root;
  return root!;
}

beforeEach(() => {
  mockBuildCaregiverWitness.mockReset();
});

afterEach(() => {
  if (activeTree) {
    act(() => { activeTree!.unmount(); });
    activeTree = null;
  }
});

describe('Phase 11.3 — You-tab footer witness wiring (post-26 F5 retirement)', () => {
  it('contract 1 (retired): witness.footerLine does NOT render on this screen', async () => {
    // Phase 26 F5 dropped the footer surface that consumed
    // witness.footerLine. The builder still emits the field; this
    // screen no longer renders it. The pin flipped from a positive
    // contract ("renders X") to an absence contract ("renders no
    // text containing the footerLine pattern").
    mockBuildCaregiverWitness.mockResolvedValue({
      line: 'You showed up 6 of 7 mornings this week',
      footerLine: '6 mornings this week.\nMost people never see what that takes.',
      source: 'morning_streak',
    });
    const tree = await renderAndSettle();
    const allText = findAll(tree.root, (n) => n.type === 'Text')
      .map(flattenText)
      .join(' | ');
    expect(allText).not.toContain(
      '6 mornings this week.\nMost people never see what that takes.',
    );
    // The pre-witness hardcoded fallback string also must not appear —
    // it was the same footer's null branch, retired with the rest.
    expect(allText).not.toContain("You're doing something\nmost people never see.");
  });

  it('contract 2 (retired): the generic footer fallback string does NOT render when builder returns null', async () => {
    // Pre-26 the generic fallback "You're doing something / most
    // people never see." rendered whenever the builder produced no
    // witness. Phase 26 F5 retired both the witness footer and the
    // generic fallback alongside it.
    mockBuildCaregiverWitness.mockResolvedValue(null);
    const tree = await renderAndSettle();
    const allText = findAll(tree.root, (n) => n.type === 'Text')
      .map(flattenText)
      .join(' | ');
    expect(allText).not.toContain("You're doing something\nmost people never see.");
    expect(allText).not.toContain("You're doing something");
  });

  it('contract 3: single fetch on mount (no double-fetch via header)', async () => {
    mockBuildCaregiverWitness.mockResolvedValue(null);
    await renderAndSettle();
    expect(mockBuildCaregiverWitness).toHaveBeenCalledTimes(1);
  });

  it('contract 4: re-fetches on EVENT.DAILY_INSTANCES', async () => {
    mockBuildCaregiverWitness.mockResolvedValue(null);
    await renderAndSettle();
    expect(mockBuildCaregiverWitness).toHaveBeenCalledTimes(1);
    await act(async () => {
      emitDataUpdate(EVENT.DAILY_INSTANCES);
      await Promise.resolve();
    });
    expect(mockBuildCaregiverWitness).toHaveBeenCalledTimes(2);
  });

  it('contract 5: re-fetches on EVENT.LOGS', async () => {
    mockBuildCaregiverWitness.mockResolvedValue(null);
    await renderAndSettle();
    expect(mockBuildCaregiverWitness).toHaveBeenCalledTimes(1);
    await act(async () => {
      emitDataUpdate(EVENT.LOGS);
      await Promise.resolve();
    });
    expect(mockBuildCaregiverWitness).toHaveBeenCalledTimes(2);
  });

  it('contract 6: re-fetches on EVENT.MEDICATION', async () => {
    mockBuildCaregiverWitness.mockResolvedValue(null);
    await renderAndSettle();
    expect(mockBuildCaregiverWitness).toHaveBeenCalledTimes(1);
    await act(async () => {
      emitDataUpdate(EVENT.MEDICATION);
      await Promise.resolve();
    });
    expect(mockBuildCaregiverWitness).toHaveBeenCalledTimes(2);
  });

  it('contract 6 extension: re-fetches on EVENT.LOG_EVENTS and EVENT.WELLNESS too', async () => {
    mockBuildCaregiverWitness.mockResolvedValue(null);
    await renderAndSettle();
    expect(mockBuildCaregiverWitness).toHaveBeenCalledTimes(1);
    await act(async () => {
      emitDataUpdate(EVENT.LOG_EVENTS);
      await Promise.resolve();
    });
    expect(mockBuildCaregiverWitness).toHaveBeenCalledTimes(2);
    await act(async () => {
      emitDataUpdate(EVENT.WELLNESS);
      await Promise.resolve();
    });
    expect(mockBuildCaregiverWitness).toHaveBeenCalledTimes(3);
  });

  it('contract 7: does NOT re-fetch on irrelevant events (EVENT.APPOINTMENTS)', async () => {
    mockBuildCaregiverWitness.mockResolvedValue(null);
    await renderAndSettle();
    expect(mockBuildCaregiverWitness).toHaveBeenCalledTimes(1);
    await act(async () => {
      emitDataUpdate(EVENT.APPOINTMENTS);
      await Promise.resolve();
    });
    // Still 1 — appointments aren't part of the witness read pipeline.
    expect(mockBuildCaregiverWitness).toHaveBeenCalledTimes(1);
  });

  it('contract 7 extension: ignores other unrelated events too', async () => {
    mockBuildCaregiverWitness.mockResolvedValue(null);
    await renderAndSettle();
    expect(mockBuildCaregiverWitness).toHaveBeenCalledTimes(1);
    await act(async () => {
      emitDataUpdate(EVENT.NOTIFICATIONS);
      emitDataUpdate(EVENT.SUBSCRIPTION);
      emitDataUpdate(EVENT.PATIENT);
      await Promise.resolve();
    });
    expect(mockBuildCaregiverWitness).toHaveBeenCalledTimes(1);
  });
});
