// __tests__/gates/gateC_noInteractionSafetySignal.test.ts
// ---------------------------------------------------------------------------
// SAFETY GATE C: the app must not present an affirmative drug-interaction
// safety signal. A "High Risk: 0" count from a 22-pair exact-match list falsely
// reassures a caregiver whose real dangerous combination (e.g. Coumadin +
// Advil, which the list never matches) shows as clean.
//
// Decision: the interactions feature is FLAGGED OFF for v1 (kept in the tree,
// not surfaced). This gate enforces both layers:
//   1. the feature flag defaults OFF, and
//   2. even if re-enabled, the affirmative count/severity summary is gone.
//
// Reproduces today (RED):
//   - medication-interactions.tsx renders {highRisk.length} labeled "High Risk"
//     (lines ~117-118) -> the content scan fails.
//   - there is no off-by-default flag yet -> the flag test fails.
//
// TODO(claude-code): set FLAG_KEY to the real flag once created.
// ---------------------------------------------------------------------------

import * as fs from 'fs';
import * as path from 'path';

const ROOT = process.cwd();
const INTERACTIONS_SCREEN = 'app/medication-interactions.tsx';

// TODO(claude-code): real feature-flag accessor.
import { isFeatureEnabled } from '../../utils/featureFlags';
const FLAG_KEY = 'drugInteractions';

describe('Gate C: no affirmative interaction safety signal', () => {
  it('the drug-interactions feature is disabled by default', () => {
    expect(isFeatureEnabled(FLAG_KEY)).toBe(false);
  });

  it('the interactions screen no longer renders a High Risk count', () => {
    const abs = path.join(ROOT, INTERACTIONS_SCREEN);
    if (!fs.existsSync(abs)) return; // screen may have been relocated
    const src = fs.readFileSync(abs, 'utf8');

    // Banned: an affirmative numeric safety verdict.
    const offenders = src
      .split('\n')
      .map((line, i) => ({ line, n: i + 1 }))
      .filter(({ line }) =>
        /highRisk\.length|High Risk|0 (High Risk|interactions|risks)|No interactions found/i.test(line)
      )
      .map(({ line, n }) => `${INTERACTIONS_SCREEN}:${n}  ${line.trim()}`);

    expect(offenders).toEqual([]);
  });
});
