// ============================================================================
// Phase 33 F7 follow-up — chip-parity guard.
//
// STOP-walk report (2026-05-26): Wellness drawer evening-track chips
// (Mood, Meals tracked, Day rating, Highlights & concerns) render as
// plain text with no chip fill, while morning-track chips (Sleep
// quality, Mood, Energy) correctly show the soft-sage chipSelected
// fill. Two appearances for what should be the same selected state.
//
// PURPOSE: pin that BOTH groups resolve to the same chipSelected
// fill (c.accentChipFill) under the default-seeded state. Both go
// through the SAME renderChip helper, so any divergence here would
// expose a render-path asymmetry. If the test passes against
// defaults, the device-observed bug is stored-data drift, not a
// render bug — contract 3 then pins what that drift looks like.
// ============================================================================

const store = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((k: string) =>
      Promise.resolve(store.has(k) ? store.get(k)! : null),
    ),
    setItem: jest.fn((k: string, v: string) => {
      store.set(k, v);
      return Promise.resolve();
    }),
    removeItem: jest.fn((k: string) => {
      store.delete(k);
      return Promise.resolve();
    }),
  },
}));

jest.mock('../../utils/safeStorage', () => ({
  safeGetItem: async <T,>(key: string, fallback: T): Promise<T> => {
    const raw = store.get(key);
    if (raw == null) return fallback;
    try { return JSON.parse(raw) as T; } catch { return fallback; }
  },
  safeSetItem: async (key: string, value: any): Promise<boolean> => {
    store.set(key, JSON.stringify(value));
    return true;
  },
}));

jest.mock('../../lib/events', () => ({ emitDataUpdate: jest.fn() }));
jest.mock('../../utils/devLog', () => ({ logError: () => {}, devLog: () => {} }));

// Phase 34 F3.1 — WellnessDrawer now reads carePlanConfig.wellness.timesOfDay
// for the CHECK-IN TIMES chips. Mock useCarePlanConfig with a stub that
// returns a wellness bucket having all four windows in timesOfDay (matching
// the F3.1 default for fresh state); chip-PARITY behavior tested here is
// orthogonal to which chips are selected, so a populated default suffices.
jest.mock('../../hooks/useCarePlanConfig', () => ({
  useCarePlanConfig: () => ({
    config: { wellness: { enabled: true, timesOfDay: ['morning', 'midday', 'evening', 'night'] } },
    updateBucket: jest.fn(async () => {}),
  }),
}));

// Resolved-value mock for the theme tokens this drawer reads. The
// pinned accentChipFill literal here matches the production token
// (theme-tokens.ts:accentChipFill = rgba(95,184,138,0.16)) so the
// resolved-style assertion lands on what RN actually paints.
const ACCENT_CHIP_FILL = 'rgba(95, 184, 138, 0.16)';

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      glass: '#363830', glassBorder: 'rgba(255,255,255,0.06)', glassFaint: '#222',
      glassStrong: '#444', accent: '#5fb88a', accentDim: 'rgba(95,184,138,0.1)',
      accentMuted: 'rgba(95,184,138,0.5)',
      accentChipFill: 'rgba(95, 184, 138, 0.16)',
      textPrimary: '#fff', textSecondary: '#9aa0a6', textTertiary: '#6b7280',
      switchThumbOff: '#888',
    },
  }),
}));

jest.mock('react-native', () => {
  const React = require('react');
  const PT = (n: string) => ({ children, ...props }: any) =>
    React.createElement(n, props, children);
  return {
    View: PT('View'),
    Text: PT('Text'),
    TouchableOpacity: PT('TouchableOpacity'),
    Switch: PT('Switch'),
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
  };
});

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { WellnessDrawer } from '../../components/careplan/drawers/WellnessDrawer';
import { StorageKeys } from '../../utils/storageKeys';
import {
  DEFAULT_WELLNESS_SETTINGS,
  type WellnessSettings,
} from '../../types/wellnessSettings';

function flush(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

function findAll(
  root: TestRenderer.ReactTestInstance,
  predicate: (n: TestRenderer.ReactTestInstance) => boolean,
): TestRenderer.ReactTestInstance[] {
  return root.findAll((n: any) => {
    try { return predicate(n); } catch { return false; }
  });
}

function chipsForPeriod(
  tree: TestRenderer.ReactTestRenderer,
  period: 'morning' | 'evening',
): TestRenderer.ReactTestInstance[] {
  const prefix = period === 'morning' ? 'Morning' : 'Evening';
  return findAll(tree.root, (n: any) =>
    n.type === 'TouchableOpacity' &&
    typeof n.props?.accessibilityLabel === 'string' &&
    n.props.accessibilityLabel.startsWith(prefix) &&
    // Filter out the period-toggle "Morning check-in" / "Evening
    // check-in" chip in the CHECK-IN TIMES row — its label has no
    // " — " separator. The CORE chips use "Morning — Field" form.
    /\s+—\s+/.test(n.props.accessibilityLabel),
  );
}

// Resolved backgroundColor from a `style={[...]}` prop. The
// renderChip pattern is `[styles.chip, isSelected && styles.chipSelected]`
// — when isSelected=true, chipSelected wins (later entries take
// precedence); when false, only chip applies. styles.chip carries no
// backgroundColor post-F7, so unselected reads as undefined.
function resolvedBackground(styleProp: any): string | undefined {
  if (!styleProp) return undefined;
  if (Array.isArray(styleProp)) {
    let result: string | undefined;
    for (const s of styleProp) {
      if (!s || typeof s !== 'object') continue;
      if (s.backgroundColor !== undefined) result = s.backgroundColor;
    }
    return result;
  }
  if (typeof styleProp === 'object') return styleProp.backgroundColor;
  return undefined;
}

describe('Phase 33 F7 chip parity — morning + evening CORE chips resolve to the same fill', () => {
  beforeEach(async () => {
    store.clear();
    const { safeSetItem } = await import('../../utils/safeStorage');
    await safeSetItem(StorageKeys.WELLNESS_SETTINGS, DEFAULT_WELLNESS_SETTINGS);
  });

  it('contract 1: under DEFAULT seed, all 3 morning CORE chips render with c.accentChipFill backgroundColor', async () => {
    let tree!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = TestRenderer.create(React.createElement(WellnessDrawer));
    });
    await act(async () => { await flush(); });
    await act(async () => { await flush(); });

    const morningChips = chipsForPeriod(tree, 'morning');
    // 3 CORE chips after F7's v1-trim (Sleep quality / Mood / Energy).
    expect(morningChips.length).toBe(3);
    for (const chip of morningChips) {
      expect(resolvedBackground(chip.props.style)).toBe(ACCENT_CHIP_FILL);
    }
  });

  it('contract 2 (PARITY): under DEFAULT seed, all 4 evening CORE chips render with the SAME c.accentChipFill backgroundColor as morning', async () => {
    // Default seed has all 4 evening CORE keys in evening.checks
    // (['mood', 'meals', 'dayRating', 'notes']), so isSelected → true
    // for all 4 → chipSelected style applies → backgroundColor =
    // accentChipFill. Any divergence here exposes the render
    // asymmetry the user reported.
    let tree!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = TestRenderer.create(React.createElement(WellnessDrawer));
    });
    await act(async () => { await flush(); });
    await act(async () => { await flush(); });

    const eveningChips = chipsForPeriod(tree, 'evening');
    // 4 CORE chips after F7's v1-trim.
    expect(eveningChips.length).toBe(4);
    for (const chip of eveningChips) {
      expect(resolvedBackground(chip.props.style)).toBe(ACCENT_CHIP_FILL);
    }
  });

  it('contract 3 (NEGATIVE DIAGNOSTIC): with evening.checks emptied, evening chips have NO fill — pins the bug-report visual as data-driven', async () => {
    // If contracts 1 + 2 both pass, the render path is symmetric.
    // This contract then names the actual cause of the bug-report
    // screenshot: a stored evening.checks that doesn't include the
    // CORE keys → isSelected=false → chipSelected branch falls
    // through → no fill. Forward guard: if a future maintainer
    // re-breaks the parity, this contract still describes what the
    // visual SHOULD look like under unselected state.
    const { safeSetItem } = await import('../../utils/safeStorage');
    const seed: WellnessSettings = {
      ...DEFAULT_WELLNESS_SETTINGS,
      evening: { ...DEFAULT_WELLNESS_SETTINGS.evening, checks: [] },
    };
    await safeSetItem(StorageKeys.WELLNESS_SETTINGS, seed);

    let tree!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = TestRenderer.create(React.createElement(WellnessDrawer));
    });
    await act(async () => { await flush(); });
    await act(async () => { await flush(); });

    const eveningChips = chipsForPeriod(tree, 'evening');
    expect(eveningChips.length).toBe(4);
    for (const chip of eveningChips) {
      // chipSelected branch is false; only styles.chip applies;
      // styles.chip carries no backgroundColor post-F7 → undefined.
      expect(resolvedBackground(chip.props.style)).not.toBe(ACCENT_CHIP_FILL);
    }
  });
});
