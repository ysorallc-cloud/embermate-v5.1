// ============================================================================
// Phase 32A F7 — Wellness drawer (HIGHEST-RISK SLICE).
//
// Brief + P4/P5 locks:
//   • P4 — KEEP morning AND evening fields (deliberate clinical surface;
//     the live 14-field shape is authoritative). 14 chips = morning core
//     (sleep/mood/energy) + morning optional (orientation/decisionMaking)
//     + evening core (mood/meals/dayRating/notes) + evening optional
//     (painLevel/alertness/bowelMovement/bathingStatus/mobilityStatus).
//   • P5 — BRIDGE to the existing wellness store
//     (@embermate_wellness_settings). NO migration; drawer reads + writes
//     that store via useWellnessSettings exactly as the retiring
//     wellness subscreen did.
//
// Test coverage MUST include a storage round-trip (set a field → writes
// to @embermate_wellness_settings → reload → persists). Source-level +
// render-level pins guard the surface; the round-trip pin guards the
// data path that the brief & live code disagree about most.
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

// Phase 34 F3.1 — WellnessDrawer now reads carePlanConfig.wellness
// .timesOfDay for the CHECK-IN TIMES chips. Mock useCarePlanConfig
// with a fixture covering all four canonical windows. updateBucket
// is a no-op spy here — the 32A contracts that survived F3.1 only
// exercise the WHAT layer (chip checks + reminder toggles) which
// still writes through useWellnessSettings; the WHEN layer's
// own round-trip is pinned in the F3.1 file.
jest.mock('../../hooks/useCarePlanConfig', () => ({
  useCarePlanConfig: () => ({
    config: { wellness: { enabled: true, timesOfDay: ['morning', 'midday', 'evening', 'night'] } },
    updateBucket: jest.fn(async () => {}),
  }),
}));

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      glass: '#363830', glassBorder: 'rgba(255,255,255,0.06)', glassFaint: '#222',
      glassStrong: '#444', accent: '#5fb88a', accentDim: 'rgba(95,184,138,0.1)',
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

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

const ROOT = join(__dirname, '../..');
const INDEX_SRC = readFileSync(join(ROOT, 'app/care-plan/index.tsx'), 'utf8');
const DRAWER_PATH = join(ROOT, 'components/careplan/drawers/WellnessDrawer.tsx');

import { WellnessDrawer } from '../../components/careplan/drawers/WellnessDrawer';
import { StorageKeys } from '../../utils/storageKeys';
import {
  DEFAULT_WELLNESS_SETTINGS,
  type WellnessSettings,
} from '../../types/wellnessSettings';

function findAll(
  root: TestRenderer.ReactTestInstance,
  predicate: (n: TestRenderer.ReactTestInstance) => boolean,
): TestRenderer.ReactTestInstance[] {
  return root.findAll((n: any) => {
    try { return predicate(n); } catch { return false; }
  });
}

function findChips(tree: TestRenderer.ReactTestRenderer) {
  return findAll(tree.root, (n: any) =>
    n.type === 'TouchableOpacity' &&
    n.props?.accessibilityRole === 'checkbox',
  );
}

async function flush() {
  await act(async () => { await Promise.resolve(); });
  await act(async () => { await Promise.resolve(); });
  await act(async () => { await Promise.resolve(); });
}

describe('Phase 32A F7 — Wellness drawer (source + render + round-trip)', () => {
  beforeEach(async () => {
    store.clear();
  });

  // ----------------------------------------------------------------------
  // Source / wiring contracts
  // ----------------------------------------------------------------------

  it('contract 1: WellnessDrawer file exists', () => {
    expect(existsSync(DRAWER_PATH)).toBe(true);
  });

  it('contract 2: care-plan/index.tsx imports + mounts <WellnessDrawer />', () => {
    expect(INDEX_SRC).toMatch(/import\s*\{[^}]*\bWellnessDrawer\b[^}]*\}\s*from\s*['"][^'"]*drawers\/WellnessDrawer['"]/);
    expect(INDEX_SRC).toMatch(/<WellnessDrawer\b/);
  });

  it('contract 3 (F3.1 REFRAME): WellnessDrawer bridges to BOTH stores — useWellnessSettings (P5 WHAT) + useCarePlanConfig (carePlanConfig WHEN)', () => {
    // Pre-F3.1: this contract pinned exclusive P5 bridging
    // (P5 lock, no useCarePlanConfig). Phase 34 F3.1 closed the
    // dual-store divergence by moving the WHEN layer
    // (timesOfDay) to carePlanConfig.wellness — the source the
    // F2/F3 generator reads. The drawer now bridges BOTH:
    //   • useWellnessSettings — WHAT layer (checks /
    //     optionalChecks / reminderEnabled) — unchanged.
    //   • useCarePlanConfig — WHEN layer (timesOfDay) — new
    //     read+write path for the CHECK-IN TIMES chips.
    // Both reads expected to be present in the drawer source.
    const src = readFileSync(DRAWER_PATH, 'utf8');
    const stripped = src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/[^\n]*/g, '');
    expect(stripped).toMatch(/useWellnessSettings/);
    expect(stripped).toMatch(/useCarePlanConfig/);
  });

  it('contract 4: all 14 P4-locked field labels surface in the drawer source', () => {
    const src = readFileSync(DRAWER_PATH, 'utf8');
    // Morning CORE (3)
    expect(src).toMatch(/Sleep quality/);
    expect(src).toMatch(/Mood/);
    expect(src).toMatch(/Energy/);
    // Morning OPTIONAL (2)
    expect(src).toMatch(/Orientation/);
    expect(src).toMatch(/Decision making/);
    // Evening CORE (4) — mood already pinned; meals/dayRating/notes
    expect(src).toMatch(/Meals tracked/);
    expect(src).toMatch(/Day rating/);
    expect(src).toMatch(/Highlights & concerns/);
    // Evening OPTIONAL (5)
    expect(src).toMatch(/Pain level/);
    expect(src).toMatch(/Alertness/);
    expect(src).toMatch(/Bowel movement/);
    expect(src).toMatch(/Bathing/);
    expect(src).toMatch(/Mobility/);
  });

  it('contract 5: named export present', () => {
    const src = readFileSync(DRAWER_PATH, 'utf8');
    expect(src).toMatch(/export\s+(function|const)\s+WellnessDrawer\b/);
  });

  // ----------------------------------------------------------------------
  // Render — drawer mounts and surfaces enough chips for both periods
  // ----------------------------------------------------------------------

  it('contract 6 (Phase 33 F7 reframe): renders the CORE chip set (clinical OPTIONAL fields hidden)', async () => {
    // Pre-F7: pinned ≥14 field chips (3 morning core + 2 morning
    // optional + 4 evening core + 5 evening optional). Phase 33 F7
    // v1-hides both OPTIONAL sets — clinical features (Orientation,
    // Decision making, Pain level, Alertness, Bowel movement,
    // Bathing, Mobility) are RENDER-FILTERED for v1, not deleted.
    // Constants stay in source; storage values for any pre-existing
    // selections survive untouched (F7 contract 4 pins that).
    //
    // The v1-visible field set is morning CORE (3) + evening CORE (4)
    // = 7 field chips. Plus the 2 period-toggle chips at the top
    // (Morning / Evening) → ≥7 floor accepts both shapes.
    await import('../../utils/safeStorage').then(({ safeSetItem }) =>
      safeSetItem(StorageKeys.WELLNESS_SETTINGS, DEFAULT_WELLNESS_SETTINGS),
    );

    let tree!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = TestRenderer.create(React.createElement(WellnessDrawer));
    });
    await flush();

    const chips = findChips(tree);
    expect(chips.length).toBeGreaterThanOrEqual(7);
  });

  // ----------------------------------------------------------------------
  // Round-trip — the bridge actually persists changes (P5 lock)
  // ----------------------------------------------------------------------

  it('contract 7 (ROUND-TRIP — P5 lock, Phase 33 F7 reframe): tapping an evening CORE chip writes to @embermate_wellness_settings; reload sees the new value', async () => {
    // Pre-F7: tapped the "Pain level" chip (an OPTIONAL field) and
    // asserted optionalChecks.painLevel persisted. Phase 33 F7 v1-
    // hides Pain level (clinical-tier option). The P5 bridge is the
    // invariant — not the specific chip tapped — so the round-trip
    // target moves to a v1-visible CORE chip ("Day rating", key
    // 'dayRating'). CORE chips write to cfg.checks (string[]), not
    // cfg.optionalChecks; assertion shape updates accordingly.
    //
    // The optionalChecks data-preservation guarantee (an F7 lock —
    // stored values for hidden keys survive untouched) is pinned in
    // wellnessDrawerDeclutter33F7.test.tsx contract 4; this file
    // covers the storage round-trip in general.
    const { safeSetItem, safeGetItem } = await import('../../utils/safeStorage');
    // DEFAULT_WELLNESS_SETTINGS pre-selects evening.checks =
    // ['mood', 'meals', 'dayRating', 'notes']. Seed a version with
    // 'dayRating' DROPPED so the chip tap adds it — verifies the
    // toggle-on write path through the bridge, which is the P5
    // round-trip the contract pins.
    const seed: WellnessSettings = {
      ...DEFAULT_WELLNESS_SETTINGS,
      evening: {
        ...DEFAULT_WELLNESS_SETTINGS.evening,
        checks: DEFAULT_WELLNESS_SETTINGS.evening.checks.filter((k) => k !== 'dayRating'),
      },
    };
    await safeSetItem(StorageKeys.WELLNESS_SETTINGS, seed);

    let tree!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = TestRenderer.create(React.createElement(WellnessDrawer));
    });
    await flush();

    const dayRatingChip = findAll(tree.root, (n: any) =>
      n.type === 'TouchableOpacity' &&
      typeof n.props?.accessibilityLabel === 'string' &&
      /day rating/i.test(n.props.accessibilityLabel),
    )[0];
    expect(dayRatingChip).toBeDefined();

    await act(async () => {
      await dayRatingChip.props.onPress();
    });
    await flush();

    // Storage now reflects dayRating ∈ evening.checks.
    const persisted = await safeGetItem<WellnessSettings | null>(
      StorageKeys.WELLNESS_SETTINGS,
      null,
    );
    expect(persisted).not.toBeNull();
    expect(persisted!.evening.checks).toContain('dayRating');

    // Second mount (simulating app reload) — chip state reflects the
    // persisted value.
    let tree2!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      tree2 = TestRenderer.create(React.createElement(WellnessDrawer));
    });
    await flush();

    const dayRatingChip2 = findAll(tree2.root, (n: any) =>
      n.type === 'TouchableOpacity' &&
      typeof n.props?.accessibilityLabel === 'string' &&
      /day rating/i.test(n.props.accessibilityLabel),
    )[0];
    expect(dayRatingChip2).toBeDefined();
    expect(dayRatingChip2.props.accessibilityState?.checked).toBe(true);
  });

  it('contract 8 (ROUND-TRIP — reminder toggle persists too)', async () => {
    const { safeSetItem, safeGetItem } = await import('../../utils/safeStorage');
    // Seed defaults — morning.reminderEnabled = true. Toggle OFF then
    // assert it persisted as false and re-mount picks up false.
    await safeSetItem(StorageKeys.WELLNESS_SETTINGS, DEFAULT_WELLNESS_SETTINGS);

    let tree!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = TestRenderer.create(React.createElement(WellnessDrawer));
    });
    await flush();

    const morningReminder = findAll(tree.root, (n: any) =>
      n.type === 'Switch' &&
      typeof n.props?.accessibilityLabel === 'string' &&
      /morning reminder/i.test(n.props.accessibilityLabel),
    )[0];
    expect(morningReminder).toBeDefined();

    await act(async () => {
      await morningReminder.props.onValueChange(false);
    });
    await flush();

    const persisted = await safeGetItem<WellnessSettings | null>(
      StorageKeys.WELLNESS_SETTINGS,
      null,
    );
    expect(persisted!.morning.reminderEnabled).toBe(false);
  });
});
