// ============================================================================
// Phase 15.3 — MorningMedsBanner behavioral pin (lift to now.tsx).
//
// 15.3 lifts the banner from inside NowTimeline.tsx (where it sat
// atop the populated section card) up to now.tsx, between the
// content-View and StatRings. This file pins the component's
// behavioural contract independent of where it's mounted:
//
//   • Returns null when pendingCount === 0 (the internal medsDueNow
//     gate carries forward — caller can render the banner
//     unconditionally and it self-suppresses).
//   • Returns null after onConfirmAll resolves (one-shot — pressing
//     "Confirm All" hides the banner for the rest of the session).
//   • Fires onConfirmAll with the pendingInstanceIds when the
//     button is pressed.
//   • Renders an identifiable testID so the source-level ordering
//     audit in nowMorningMedsBannerLift.test.ts can position-check
//     the banner against StatRings.
// ============================================================================

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

const themeColors = {
  warmSurfaceAlert: '#3a2f1c',
  warmSurfaceAlertBorder: 'rgba(224, 168, 78, 0.4)',
  textAlertPrimary: '#fff',
  textAlertSecondary: '#c4c1b3',
  textAlertLabel: '#e0a84e',
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
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
  };
});

import { MorningMedsBanner } from '../MorningMedsBanner';

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
    root = TestRenderer.create(React.createElement(MorningMedsBanner as any, props));
  });
  return root!;
}

describe('Phase 15.3 — MorningMedsBanner', () => {
  it('contract: returns null when pendingCount === 0 (internal medsDueNow gate)', () => {
    const tree = render({
      pendingCount: 0,
      pendingInstanceIds: [],
      onConfirmAll: jest.fn(),
    });
    // null root — nothing rendered.
    expect(tree.toJSON()).toBeNull();
  });

  it('contract: renders the banner with a discoverable testID when pendingCount > 0', () => {
    const tree = render({
      pendingCount: 3,
      pendingInstanceIds: ['inst-1', 'inst-2', 'inst-3'],
      onConfirmAll: jest.fn(),
    });
    const banner = findAll(
      tree.root,
      (n) => n.props?.testID === 'morning-meds-banner',
    );
    expect(banner.length).toBeGreaterThanOrEqual(1);
  });

  it('contract: fires onConfirmAll(pendingInstanceIds) when "Confirm All" is pressed', async () => {
    const onConfirmAll = jest.fn().mockResolvedValue(undefined);
    const ids = ['inst-1', 'inst-2'];
    const tree = render({
      pendingCount: 2,
      pendingInstanceIds: ids,
      onConfirmAll,
    });
    const button = findAll(
      tree.root,
      (n) => n.props?.accessibilityLabel?.startsWith?.('Confirm all'),
    )[0];
    expect(button).toBeDefined();
    await act(async () => {
      await button.props.onPress();
    });
    expect(onConfirmAll).toHaveBeenCalledTimes(1);
    expect(onConfirmAll).toHaveBeenCalledWith(ids);
  });

  it('contract: returns null after onConfirmAll resolves (one-shot)', async () => {
    const onConfirmAll = jest.fn().mockResolvedValue(undefined);
    const tree = render({
      pendingCount: 1,
      pendingInstanceIds: ['inst-1'],
      onConfirmAll,
    });
    const button = findAll(
      tree.root,
      (n) => n.props?.accessibilityLabel?.startsWith?.('Confirm all'),
    )[0];
    await act(async () => {
      await button.props.onPress();
    });
    // Re-walk the tree post-state-update; banner should self-suppress.
    expect(tree.toJSON()).toBeNull();
  });
});
