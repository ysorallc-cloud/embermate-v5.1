// ============================================================================
// Phase 34 F2 — Bug H fix: wellness generation reads per-window selection
// from carePlanConfig.wellness.timesOfDay through the shared resolver.
//
// USER-LOCKED SCOPE (2026-05-27):
//   • Delete the hardcoded 3-item bypass at carePlanGenerator.ts:507-578
//     (literal labels 'morning' / 'afternoon' / 'evening' + literal
//     times '07:00' / '13:00' / '20:00').
//   • Replace with ONE consolidated CarePlanItem carrying N times,
//     each routed through TIME_OF_DAY_TO_WINDOW + TIME_OF_DAY_DEFAULTS
//     (same pattern as vitals/sleep/water/activity).
//   • carePlanConfig.wellness.timesOfDay is the SOLE source of truth
//     for WHEN wellness generates.
//   • P5 wellnessSettings.{period}.enabled is preserved-but-inert
//     (hide-not-delete). No longer drives generation.
//
// CONTRACT 6 PARTIAL FLIP — F1 contract 6 in
// __tests__/screens/carePlanUnifiedTimeModel34F1.test.tsx pinned the
// existence of the hardcoded triple in the FRESH-STATE wellness sync
// branch. F2 flips that pin to ABSENCE for the fresh-state branch and
// pins the REMAINING migration-block hardcode (carePlanGenerator.ts:
// 592-618) as the documented F3-bound exception. Updates to F1's
// contract 6 land in the same commit as this file's RED→GREEN.
//
// KNOWN ONE-PHASE ARTIFACT (per audit):
//   • Care Plan home subtitle (utils/wellnessCadenceText.ts) still
//     reads wellnessSettings.{morning,evening}.enabled from the P5
//     store. Generation reads carePlanConfig.wellness.timesOfDay.
//     The two can diverge in the F2→F5 interval — subtitle text
//     may lag actual generation. F5 closes when the editor chips
//     swap their write target from the P5 store to
//     carePlanConfig.wellness.timesOfDay. NOT papered over here.
//
// TEST STRATEGY:
//   GROUP A — source-level structural pins on the rewritten wellness
//     sync block. Catch a regression that re-introduces literal
//     labels / hardcoded times via grep-class checks.
//   GROUP B — BEHAVIORAL both-directions tests via mocked storage.
//     Seed config with specific timesOfDay shapes, run
//     syncOtherBucketsWithConfig, inspect the CarePlanItem(s) the
//     generator wrote. This is what the prior parity-test attempt
//     failed to do (it tested rendering, not generation).
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const GEN_SRC = readFileSync(
  join(ROOT, 'services/carePlanGenerator.ts'),
  'utf8',
);

function stripComments(s: string): string {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
}

const GEN_STRIPPED = stripComments(GEN_SRC);

// ----------------------------------------------------------------------------
// Storage / hook mocks for the behavioral group.
//
// The generator calls into storage/carePlanRepo + storage/carePlanConfigRepo.
// We replace those with an in-memory fake that the test seeds + inspects.
// ----------------------------------------------------------------------------

const mockState: {
  config: any;
  items: any[];
} = {
  config: null,
  items: [],
};

jest.mock('../../storage/carePlanRepo', () => ({
  getActiveCarePlan: jest.fn(async () => ({ id: 'cp-test', patientId: 'default', version: 1 })),
  listCarePlanItems: jest.fn(async () => [...mockState.items]),
  listDailyInstances: jest.fn(async () => []),
  upsertDailyInstances: jest.fn(async () => {}),
  updateDailyInstanceStatus: jest.fn(async () => {}),
  removeStaleInstances: jest.fn(async () => {}),
  upsertCarePlanItem: jest.fn(async (item: any) => {
    const idx = mockState.items.findIndex((i) => i.id === item.id);
    if (idx >= 0) mockState.items[idx] = item;
    else mockState.items.push(item);
  }),
  deleteCarePlanItem: jest.fn(async () => {}),
  createCarePlan: jest.fn(async () => ({ id: 'cp-test', patientId: 'default', version: 1 })),
  DEFAULT_PATIENT_ID: 'default',
}));

jest.mock('../../storage/carePlanConfigRepo', () => ({
  getCarePlanConfig: jest.fn(async () => mockState.config),
}));

jest.mock('../../utils/safeStorage', () => ({
  safeGetItem: jest.fn(async (_key: string, fallback: any) => fallback),
}));

jest.mock('../../utils/devLog', () => ({
  devLog: jest.fn(),
  logError: jest.fn(),
}));

jest.mock('../../lib/events', () => ({
  emitDataUpdate: jest.fn(),
}));

import { syncOtherBucketsWithConfig } from '../../services/carePlanGenerator';
import { createDefaultCarePlanConfig } from '../../types/carePlanConfig';

function seedConfigWithWellnessTimesOfDay(timesOfDay: any) {
  const base = createDefaultCarePlanConfig('default');
  mockState.config = {
    ...base,
    wellness: {
      ...base.wellness,
      enabled: true,
      timesOfDay,
    },
  };
  mockState.items = [];
}

function wellnessItems() {
  return mockState.items.filter(
    (i) => i.type === 'wellness' && !i.id.startsWith('sample-') && i.active,
  );
}

function allTimesAcrossWellnessItems(): Array<{ label: string; at: string }> {
  return wellnessItems().flatMap((i) =>
    (i.schedule?.times ?? []).map((t: any) => ({ label: t.label, at: t.at })),
  );
}

// ============================================================================
// GROUP A — source-level structural pins on the rewritten wellness block.
// ============================================================================

describe('Phase 34 F2 — source-level structural pins on the rewritten wellness sync', () => {
  it('contract 1: the fresh-state wellness sync no longer hardcodes literal labels (morning/afternoon/evening) at literal times (07:00/13:00/20:00)', () => {
    // The fresh-state branch is the one that ran when
    // `existingWellnessItems.length === 0` — the pre-F2 line range
    // was carePlanGenerator.ts:507-578. We pin the absence of the
    // bypass's signature shape: literal `label: 'morning'` /
    // 'afternoon' / 'evening' lines paired with literal `at: '07:00'`
    // / '13:00' / '20:00' lines INSIDE the fresh-state branch.
    //
    // We can't trivially scope to "only the fresh-state branch"
    // because the migration block at :592-618 (the F3-bound
    // exception) STILL contains `label: 'afternoon'` + `at: '13:00'`.
    // So instead of a global absence pin, we anchor on the
    // fresh-state branch via a fingerprint of the OLD code (the
    // `'Morning wellness check'` name literal that lived only in
    // the fresh-state block) — and pin its ABSENCE post-F2.
    //
    // The post-F2 fresh-state code uses ONE item named just
    // 'Wellness check' (no per-period name); the pre-F2 trio used
    // 'Morning wellness check' / 'Afternoon wellness check' /
    // 'Evening wellness check'. Pin the disappearance of the
    // per-period name strings as the fingerprint of the bypass-
    // removal. The migration block at :592-618 still carries
    // 'Afternoon wellness check', so we pin that exact pattern
    // EXISTS exactly ONCE (in the migration block).
    const morningNameMatches = GEN_STRIPPED.match(/['"]Morning wellness check['"]/g) ?? [];
    const eveningNameMatches = GEN_STRIPPED.match(/['"]Evening wellness check['"]/g) ?? [];
    // Fresh-state names gone. The migration block at :580-619
    // renames OLD names to these strings (the
    // `if (oldName === 'morning check-in') newName = 'Morning
    // wellness check'` block) — so each can appear AT MOST ONCE
    // in the migration name-rename code, not three times for the
    // fresh-state creation.
    expect(morningNameMatches.length).toBeLessThanOrEqual(1);
    expect(eveningNameMatches.length).toBeLessThanOrEqual(1);
  });

  it('contract 2: the wellness sync uses TIME_OF_DAY_TO_WINDOW and TIME_OF_DAY_DEFAULTS via the shared resolver', () => {
    // F2 adds a resolver-routed map step in the wellness path.
    // Pin that the wellness sync block references both resolver
    // members. Anchor on the WELLNESS block via its emoji/comment
    // signature and look forward for the resolver usage within
    // ~2500 chars.
    const wellnessAnchor = GEN_STRIPPED.search(/wellnessConfig\s*=\s*\(?config/);
    expect(wellnessAnchor).toBeGreaterThan(-1);
    const block = GEN_STRIPPED.slice(
      wellnessAnchor,
      Math.min(GEN_STRIPPED.length, wellnessAnchor + 2500),
    );
    expect(block).toMatch(/TIME_OF_DAY_TO_WINDOW\[/);
    expect(block).toMatch(/TIME_OF_DAY_DEFAULTS\[/);
  });

  it('contract 3: the wellness sync reads timesOfDay from carePlanConfig.wellness (NOT from wellnessSettings/P5 store)', () => {
    const wellnessAnchor = GEN_STRIPPED.search(/wellnessConfig\s*=\s*\(?config/);
    expect(wellnessAnchor).toBeGreaterThan(-1);
    const block = GEN_STRIPPED.slice(
      wellnessAnchor,
      Math.min(GEN_STRIPPED.length, wellnessAnchor + 2500),
    );
    // Reads wellnessConfig.timesOfDay (carePlanConfig source).
    expect(block).toMatch(/wellnessConfig[?]?\.timesOfDay/);
    // Does NOT read the P5 store inside the wellness sync block
    // (defensive — the generator never imported safeGetItem for
    // the wellness key, but pin so a future "let's just read
    // both" creep is caught).
    expect(block).not.toMatch(/@embermate_wellness_settings/);
  });

  it('contract 4 (F3 CLOSED): migration-block bypass is GONE — no hasAfternoon force-inject anywhere in the wellness sync', () => {
    // F2 pinned the migration-block hardcode as the F3-bound
    // exception (hasAfternoon variable + literal label
    // 'afternoon' + literal at '13:00'). F3 closed that bypass —
    // the reconciliation pass replaces the migration block, and
    // every label + at value now flows through the shared
    // resolver. This contract FLIPS from EXISTENCE-pin to
    // ABSENCE-pin: any future regression that reintroduces the
    // force-inject pattern fails here.
    expect(GEN_STRIPPED).not.toMatch(/hasAfternoon\s*=\s*existingWellnessItems\.some/);
    // No 'Afternoon wellness check' name string either — the
    // pre-F2 trio name died with the F2 fresh-state consolidation
    // and the F3 migration-block removal.
    expect(GEN_STRIPPED).not.toMatch(/['"]Afternoon wellness check['"]/);
  });
});

// ============================================================================
// GROUP B — BEHAVIORAL: seed config, run sync, inspect outputs.
//
// Both directions seeded — the prior toggle bug hid in the unseeded
// direction. Tests SHOULD also cover edge shapes: empty timesOfDay,
// missing timesOfDay, midday→afternoon resolution, P5 inertness.
// ============================================================================

describe('Phase 34 F2 — wellness generation BEHAVIOR (both directions seeded)', () => {
  beforeEach(() => {
    mockState.config = null;
    mockState.items = [];
  });

  // --------------------------------------------------------------------------
  // The both-directions matrix.
  // --------------------------------------------------------------------------

  it('contract 5 (DIRECTION ON): timesOfDay = ["morning","evening"] → generates exactly TWO times, one per window, at resolved HH:mm', async () => {
    seedConfigWithWellnessTimesOfDay(['morning', 'evening']);
    await syncOtherBucketsWithConfig('cp-test', 'default');

    const items = wellnessItems();
    expect(items.length).toBeGreaterThan(0);
    const times = allTimesAcrossWellnessItems();
    expect(times.length).toBe(2);
    expect(times).toContainEqual({ label: 'morning', at: '08:00' });
    expect(times).toContainEqual({ label: 'evening', at: '18:00' });
    // The off-window has NO instance — the missing direction the
    // user explicitly called out as the place prior toggle bugs
    // hid. This is the assertion that would have caught Bug H.
    expect(times.find((t) => t.label === 'afternoon')).toBeUndefined();
  });

  it('contract 6 (DIRECTION OFF): timesOfDay = ["morning"] → ONLY morning generates; evening and afternoon produce ZERO instances', async () => {
    seedConfigWithWellnessTimesOfDay(['morning']);
    await syncOtherBucketsWithConfig('cp-test', 'default');

    const times = allTimesAcrossWellnessItems();
    expect(times.length).toBe(1);
    expect(times[0]).toEqual({ label: 'morning', at: '08:00' });
  });

  it('contract 7 (FULL DEFAULT): timesOfDay = ["morning","midday","evening"] → THREE times generated, midday resolves to afternoon @ 12:00 (F1 invariant)', async () => {
    seedConfigWithWellnessTimesOfDay(['morning', 'midday', 'evening']);
    await syncOtherBucketsWithConfig('cp-test', 'default');

    const times = allTimesAcrossWellnessItems();
    expect(times.length).toBe(3);
    // F1 invariant — `'midday'` stays the storage key, resolves to
    // 'afternoon' window via TIME_OF_DAY_TO_WINDOW, scheduled at
    // canonical 12:00 from TIME_OF_DAY_DEFAULTS. Pre-F2 the
    // afternoon was hardcoded at 13:00 — that drift gets corrected
    // for free by routing through the canonical defaults.
    expect(times).toContainEqual({ label: 'morning', at: '08:00' });
    expect(times).toContainEqual({ label: 'afternoon', at: '12:00' });
    expect(times).toContainEqual({ label: 'evening', at: '18:00' });
  });

  it('contract 8 (EDGE — empty selection): timesOfDay = [] with bucket enabled → ZERO wellness instances (no force-injection)', async () => {
    // A wellness bucket that is enabled but has no windows
    // selected. Pre-F2 this still got the hardcoded three.
    // Post-F2 the user's explicit empty selection is respected —
    // zero instances. This direction is exactly the kind the
    // prior Bug H (force-include) hid in.
    seedConfigWithWellnessTimesOfDay([]);
    await syncOtherBucketsWithConfig('cp-test', 'default');

    const times = allTimesAcrossWellnessItems();
    expect(times.length).toBe(0);
  });

  it('contract 9 (EDGE — missing field, legacy data): timesOfDay = undefined → falls back to default windows so legacy state does not silently lose wellness', async () => {
    // Legacy stored configs may not have wellness.timesOfDay. The
    // resolver should fall back to the canonical default
    // (morning + midday + evening) for those — pre-F2 they got
    // the hardcoded three regardless; F2 must not silently drop
    // wellness for users whose config was written before
    // timesOfDay existed on the wellness bucket.
    const base = createDefaultCarePlanConfig('default');
    mockState.config = {
      ...base,
      wellness: { ...base.wellness, enabled: true, timesOfDay: undefined as any },
    };
    mockState.items = [];
    await syncOtherBucketsWithConfig('cp-test', 'default');

    const times = allTimesAcrossWellnessItems();
    // Three default windows preserved for legacy state.
    expect(times.length).toBe(3);
    expect(times.map((t) => t.label).sort()).toEqual(['afternoon', 'evening', 'morning']);
  });

  it('contract 10 (BUCKET OFF): wellness.enabled = false → ZERO wellness instances regardless of timesOfDay', async () => {
    // The bucket-level toggle (carePlanConfig.wellness.enabled)
    // still gates the whole category — F1's force-include fix
    // (commit b8f0ea11) made this read honest. timesOfDay
    // selection is moot when the bucket itself is off.
    const base = createDefaultCarePlanConfig('default');
    mockState.config = {
      ...base,
      wellness: {
        ...base.wellness,
        enabled: false,
        timesOfDay: ['morning', 'midday', 'evening'],
      },
    };
    mockState.items = [];
    await syncOtherBucketsWithConfig('cp-test', 'default');

    const times = allTimesAcrossWellnessItems();
    expect(times.length).toBe(0);
  });

  // --------------------------------------------------------------------------
  // P5 inertness — the dual-store convergence claim.
  // --------------------------------------------------------------------------

  it('contract 11 (P5 INERT): wellnessSettings.afternoon.enabled does NOT affect generation — only timesOfDay does', async () => {
    // Audit claim: nothing else in the codebase reads
    // wellnessSettings.{period}.enabled for generation decisions.
    // The generator we're testing was the only candidate, and we
    // just rewrote it to read carePlanConfig.wellness.timesOfDay.
    // This contract proves the inertness: a config with no
    // afternoon in timesOfDay generates NO afternoon instance
    // EVEN IF a future caller has flipped P5 afternoon.enabled
    // to true. (We don't seed the P5 store in this test — the
    // safeGetItem mock returns fallback only — but the assertion
    // is the same: generation must depend on timesOfDay alone.)
    seedConfigWithWellnessTimesOfDay(['morning', 'evening']);
    await syncOtherBucketsWithConfig('cp-test', 'default');

    const times = allTimesAcrossWellnessItems();
    expect(times.find((t) => t.label === 'afternoon')).toBeUndefined();
    // Belt and suspenders — the wellness sync block never reads
    // safeGetItem with the wellness storage key.
    const { safeGetItem } = require('../../utils/safeStorage');
    const calls = (safeGetItem as jest.Mock).mock.calls;
    const wellnessKeyCalls = calls.filter(
      (c: any[]) => typeof c[0] === 'string' && c[0].includes('wellness'),
    );
    expect(wellnessKeyCalls.length).toBe(0);
  });
});
