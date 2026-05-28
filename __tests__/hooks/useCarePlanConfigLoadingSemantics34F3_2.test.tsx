// ============================================================================
// Phase 34 F3.2 — useCarePlanConfig loading-flag semantics.
//
// WALK FAILURE: tapping a wellness chip on Care Plan scrolls the screen
// back to the top. Trace: updateBucket() → setConfig + emit CARE_PLAN_
// CONFIG → useDataListener fires loadConfig() → setLoading(true) →
// Care Plan home's `if (loading) return <spinner>` early-return unmounts
// the ScrollView → next render mounts a fresh ScrollView at scrollTop=0.
//
// SAME CLASS-OF-BUG affects every consumer that reads `loading` as a
// spinner gate — confirmed: today-scope OR's configLoading into its
// composite loading flag. Care Plan home is the surface that walked it;
// the bug is hook-layer.
//
// USER-LOCKED SEMANTICS:
//   • loading semantic = "no config available," NOT "reading storage
//     again." Initial mount (config === null) sets loading=true while
//     the first storage read runs.
//   • Subsequent reloads triggered by EVENT.CARE_PLAN_CONFIG (or any
//     other listener event) MUST NOT toggle loading when a config is
//     already in state — the screen has data to render; this is a
//     background refresh.
//   • No `refreshing` flag added — not needed by any current consumer
//     (audit-confirmed across all 4 hook consumers reading `loading`:
//     care-plan home, today-scope, now.tsx dead-destructure,
//     BucketCarePlanPanel orphan).
//
// WALK-ONLY HONESTY: on-device scroll preservation is layout/scroll
// behavior the test environment can't faithfully prove. What this
// test CAN prove is the loading-flag SEMANTIC; the scroll outcome
// rides on the semantic + the home's existing early-return gate.
// Amber's walk confirms the rendered behavior.
// ============================================================================

// In-memory storage backing so loadConfig has real round-trip behavior.
const store: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((k: string) => Promise.resolve(store[k] ?? null)),
    setItem: jest.fn((k: string, v: string) => {
      store[k] = v;
      return Promise.resolve();
    }),
    removeItem: jest.fn((k: string) => {
      delete store[k];
      return Promise.resolve();
    }),
  },
}));

jest.mock('../../utils/safeStorage', () => ({
  safeGetItem: async <T,>(key: string, fallback: T): Promise<T> => {
    const raw = store[key];
    if (raw == null) return fallback;
    try { return JSON.parse(raw) as T; } catch { return fallback; }
  },
  safeSetItem: async (key: string, value: any): Promise<boolean> => {
    store[key] = JSON.stringify(value);
    return true;
  },
}));

jest.mock('../../utils/devLog', () => ({ devLog: () => {}, logError: () => {} }));

// Real events module — we exercise the listener path end-to-end.
import React, { useEffect, useRef } from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { useCarePlanConfig } from '../../hooks/useCarePlanConfig';
import { emitDataUpdate } from '../../lib/events';
import { EVENT } from '../../lib/eventNames';
import {
  createDefaultCarePlanConfig,
  type CarePlanConfig,
} from '../../types/carePlanConfig';

// Capture every loading + config-presence transition the hook produces
// across the test's lifetime. Each render appends to the trace; the
// test inspects the sequence.
type Frame = { loading: boolean; hasConfig: boolean };
function HookProbe({ trace }: { trace: Frame[] }) {
  const { loading, config } = useCarePlanConfig();
  trace.push({ loading, hasConfig: !!config });
  return null;
}

function flush(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

async function seedStoredConfig(): Promise<CarePlanConfig> {
  const cfg = createDefaultCarePlanConfig('default');
  // Storage key shape used by storage/carePlanConfigRepo. The
  // safeSetItem mock just JSON-serializes; the real read path
  // returns the parsed object via getCarePlanConfig.
  const { safeSetItem } = require('../../utils/safeStorage');
  // Storage key shape from storage/carePlanConfigRepo.ts:27:
  //   `@embermate_careplan_config_v1:${patientId}`
  await safeSetItem('@embermate_careplan_config_v1:default', cfg);
  return cfg;
}

beforeEach(() => {
  Object.keys(store).forEach((k) => delete store[k]);
});

describe('Phase 34 F3.2 — useCarePlanConfig loading-flag semantics', () => {
  // --------------------------------------------------------------------------
  // INITIAL LOAD — loading flips true → false (correct semantic; no change).
  // --------------------------------------------------------------------------

  it('contract 1 (INITIAL LOAD): no config in storage → loading goes true then false', async () => {
    const trace: Frame[] = [];
    let tree!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = TestRenderer.create(React.createElement(HookProbe, { trace }));
    });
    await act(async () => { await flush(); });
    await act(async () => { await flush(); });

    // First frame: loading=true, config=null (initial state before
    // the load effect resolves).
    expect(trace[0].loading).toBe(true);
    expect(trace[0].hasConfig).toBe(false);

    // After load resolves: loading=false. Whether config ends up
    // truthy depends on the storage path; we just pin the loading
    // semantic.
    const lastFrame = trace[trace.length - 1];
    expect(lastFrame.loading).toBe(false);
  });

  it('contract 2 (INITIAL LOAD WITH STORED CONFIG): loading still flips true → false on first mount (config null at hook init)', async () => {
    await seedStoredConfig();
    const trace: Frame[] = [];
    await act(async () => {
      TestRenderer.create(React.createElement(HookProbe, { trace }));
    });
    await act(async () => { await flush(); });
    await act(async () => { await flush(); });

    expect(trace[0].loading).toBe(true);
    expect(trace[0].hasConfig).toBe(false);
    const last = trace[trace.length - 1];
    expect(last.loading).toBe(false);
    expect(last.hasConfig).toBe(true);
  });

  // --------------------------------------------------------------------------
  // BACKGROUND REFRESH — the bug class. With config already in state,
  // a CARE_PLAN_CONFIG emit MUST NOT toggle loading back to true.
  // --------------------------------------------------------------------------

  it('contract 3 (BACKGROUND REFRESH): config already in state + CARE_PLAN_CONFIG emit → loading STAYS false throughout', async () => {
    await seedStoredConfig();
    const trace: Frame[] = [];
    let tree!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = TestRenderer.create(React.createElement(HookProbe, { trace }));
    });
    await act(async () => { await flush(); });
    await act(async () => { await flush(); });

    // Wait until initial load settled — config in state, loading false.
    const settledIdx = trace.length;
    expect(trace[settledIdx - 1].loading).toBe(false);
    expect(trace[settledIdx - 1].hasConfig).toBe(true);

    // Emit the event that the listener consumes. This was the bug
    // trigger — pre-fix it caused setLoading(true) followed by
    // setLoading(false). Post-fix loading stays false for the
    // entire reload.
    await act(async () => {
      emitDataUpdate(EVENT.CARE_PLAN_CONFIG);
    });
    await act(async () => { await flush(); });
    await act(async () => { await flush(); });

    // Inspect every frame AFTER the initial-load settle: every
    // loading value must be false. No flicker to true. THIS is
    // the assertion that pre-fix would RED.
    const postEmitFrames = trace.slice(settledIdx);
    expect(postEmitFrames.length).toBeGreaterThan(0);
    for (const f of postEmitFrames) {
      expect(f.loading).toBe(false);
    }
  });

  it('contract 4 (REPEATED REFRESHES): N back-to-back emits → loading stays false the whole time', async () => {
    // The real-device scenario for the wellness walk: every chip
    // tap fires another emit. None should re-flicker loading.
    await seedStoredConfig();
    const trace: Frame[] = [];
    await act(async () => {
      TestRenderer.create(React.createElement(HookProbe, { trace }));
    });
    await act(async () => { await flush(); });
    await act(async () => { await flush(); });

    const settledIdx = trace.length;
    expect(trace[settledIdx - 1].loading).toBe(false);

    // Five emits in quick succession.
    for (let i = 0; i < 5; i++) {
      await act(async () => {
        emitDataUpdate(EVENT.CARE_PLAN_CONFIG);
      });
      await act(async () => { await flush(); });
    }
    await act(async () => { await flush(); });

    const postFrames = trace.slice(settledIdx);
    for (const f of postFrames) {
      expect(f.loading).toBe(false);
    }
  });

  // --------------------------------------------------------------------------
  // No new `refreshing` flag added (user preference).
  // --------------------------------------------------------------------------

  it('contract 5 (NO REFRESHING FLAG): the hook return shape contains NO `refreshing` field', () => {
    // The fix is "don't overload loading"; the alternative was to
    // add a `refreshing` field. Per user lock: don't add it unless
    // a consumer needs one. Nothing does today. Pin the absence
    // so a future maintainer doesn't quietly add it without a
    // surfaced need.
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.join(__dirname, '../..', 'hooks/useCarePlanConfig.ts'),
      'utf8',
    );
    const stripped = src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/[^\n]*/g, '');
    // No `refreshing:` field declared on the return type or in
    // the return statement. Catch both shapes.
    expect(stripped).not.toMatch(/\brefreshing\s*:\s*boolean\b/);
    expect(stripped).not.toMatch(/\bsetRefreshing\b/);
  });

  // --------------------------------------------------------------------------
  // Source-level pin: loadConfig's setLoading(true) is gated on the
  // initial-load condition (no config in state yet).
  // --------------------------------------------------------------------------

  it('contract 6 (SOURCE-LEVEL): loadConfig sets loading=true ONLY when no config is in state (gated entry)', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.join(__dirname, '../..', 'hooks/useCarePlanConfig.ts'),
      'utf8',
    );
    const stripped = src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/[^\n]*/g, '');

    // Locate the loadConfig function body. Anchor on the `loadConfig
    // = useCallback(async` opening.
    const idx = stripped.search(/loadConfig\s*=\s*useCallback\s*\(\s*async/);
    expect(idx).toBeGreaterThan(-1);
    // Window of 600 chars after the opening — the function body
    // is small and contained.
    const window = stripped.slice(idx, Math.min(stripped.length, idx + 600));

    // Pin: the setLoading(true) call lives inside a guard that
    // checks whether config is already in state. Accept either
    // `if (!config)` style or a ternary; reject an unconditional
    // setLoading(true) like the pre-F3.2 shape.
    //
    // The unconditional pre-F3.2 shape was:
    //   try {
    //     setLoading(true);
    //     setError(null);
    //     ...
    //   }
    // i.e. setLoading(true) appeared right after the `try {` with no
    // surrounding conditional. Pin its absence.
    expect(window).not.toMatch(/try\s*\{\s*setLoading\s*\(\s*true\s*\)/);

    // Constructive — setLoading(true) appears inside an if-guard
    // that references the existing config state (or a similar
    // "no config yet" check).
    expect(window).toMatch(/if\s*\([^)]*!?\s*config[^)]*\)\s*\{?\s*setLoading\s*\(\s*true\s*\)/);
  });
});
