// ============================================================================
// ThemeContext — HC override migration (Phase 2.5).
//
// v6.7 retired the high-contrast Settings toggle but left the HC code path
// in place. Devices that had `highContrast: 'true'` saved before the toggle
// retired had no UI path back to off, leaving them stuck on the HC override
// (which hardcodes background to #000000 — the on-device "page near-black"
// symptom that surfaced after the Phase 0 lockstep lift made the cards
// noticeably brighter than the page).
//
// The migration: ThemeProvider's hydration effect now force-clears any
// stale `'true'` HC value back to `'false'` and never feeds it into state.
// The HC code path stays callable for a future accessibility re-enable;
// only the read+propagate from storage is short-circuited.
//
// This test exercises the real ThemeContext (no module mock) with a mocked
// safeStorage layer pre-populated to the bad state.
// ============================================================================

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

const HC_KEY = '@embermate_high_contrast';

// Mock safeStorage with a controllable in-memory map.
const storage = new Map<string, string>();
const safeSetItem = jest.fn(async (key: string, value: any) => {
  storage.set(key, String(value));
});
const safeGetItem = jest.fn(async (key: string, _fallback: any) => {
  return storage.has(key) ? storage.get(key) : null;
});
jest.mock('../utils/safeStorage', () => ({
  safeGetItem: (key: string, fallback: any) => safeGetItem(key, fallback),
  safeSetItem: (key: string, value: any) => safeSetItem(key, value),
}));

// Bare-bones React Native mocks — enough for ThemeProvider + a child probe.
jest.mock('react-native', () => ({
  StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
}));

import { ThemeProvider, useTheme } from '../contexts/ThemeContext';

function ColorProbe({ onResolve }: { onResolve: (bg: string) => void }) {
  const { colors } = useTheme();
  React.useEffect(() => {
    onResolve(colors.background);
  }, [colors.background, onResolve]);
  return null;
}

async function flushHydrate() {
  // Two micro-task ticks: one for the Promise.all chain in the hydration
  // effect, one for the safeSetItem write completing.
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(() => {
  storage.clear();
  safeSetItem.mockClear();
  safeGetItem.mockClear();
});

describe('Phase 2.5 — HC override migration', () => {
  it('clears stale "true" HC value to "false" on first hydrate', async () => {
    storage.set(HC_KEY, 'true');

    const colors: string[] = [];
    let tree: TestRenderer.ReactTestRenderer | null = null;
    await act(async () => {
      tree = TestRenderer.create(
        <ThemeProvider>
          <ColorProbe onResolve={(bg) => colors.push(bg)} />
        </ThemeProvider>,
      );
    });
    await flushHydrate();

    // The migration must have written 'false' back to the HC key.
    const writes = safeSetItem.mock.calls.filter((c) => c[0] === HC_KEY);
    expect(writes.length).toBeGreaterThanOrEqual(1);
    expect(writes[writes.length - 1][1]).toBe('false');

    (tree as any)?.unmount();
  });

  it('renders colors.background as the website source-of-truth #1a1612, NOT the HC #000', async () => {
    storage.set(HC_KEY, 'true');

    let resolved = '';
    let tree: TestRenderer.ReactTestRenderer | null = null;
    await act(async () => {
      tree = TestRenderer.create(
        <ThemeProvider>
          <ColorProbe onResolve={(bg) => { resolved = bg; }} />
        </ThemeProvider>,
      );
    });
    await flushHydrate();

    // The HC override must NOT win — page bg is the Phase 33 F1a value
    // (website source-of-truth #1a1612, realigned from Phase 0's #1f201c).
    expect(resolved).toBe('#1a1612');
    expect(resolved).not.toBe('#000000');

    (tree as any)?.unmount();
  });

  it('does NOT write to the HC key when storage is already null/false', async () => {
    // No storage entry — fresh install case.
    let tree: TestRenderer.ReactTestRenderer | null = null;
    await act(async () => {
      tree = TestRenderer.create(
        <ThemeProvider>
          <ColorProbe onResolve={() => {}} />
        </ThemeProvider>,
      );
    });
    await flushHydrate();

    const writes = safeSetItem.mock.calls.filter((c) => c[0] === HC_KEY);
    expect(writes.length).toBe(0);

    (tree as any)?.unmount();
  });

  it('also does NOT write to the HC key when storage already says "false"', async () => {
    storage.set(HC_KEY, 'false');

    let tree: TestRenderer.ReactTestRenderer | null = null;
    await act(async () => {
      tree = TestRenderer.create(
        <ThemeProvider>
          <ColorProbe onResolve={() => {}} />
        </ThemeProvider>,
      );
    });
    await flushHydrate();

    const writes = safeSetItem.mock.calls.filter((c) => c[0] === HC_KEY);
    expect(writes.length).toBe(0);

    (tree as any)?.unmount();
  });
});
