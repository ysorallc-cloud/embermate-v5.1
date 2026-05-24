// ============================================================================
// Phase 32A F15 — ProgressRings canonical CORE_BUCKETS fix (additive).
//
// Bundled into 32A per the user's explicit additive-scope decision
// (same drift class as commit 506fc49c which canonicalized CORE_BUCKETS
// to ['meds', 'vitals']; ProgressRings.tsx was missed by that sweep
// and still declared its own local
// CORE_BUCKETS = ['meds', 'vitals', 'wellness', 'meals']).
//
// After F15:
//   • ProgressRings.tsx imports CORE_BUCKETS from types/carePlanConfig
//     (canonical source).
//   • No local re-declaration of CORE_BUCKETS in the file.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const SRC = readFileSync(join(ROOT, 'components/now/ProgressRings.tsx'), 'utf8');

describe('Phase 32A F15 — ProgressRings on canonical CORE_BUCKETS', () => {
  it('imports CORE_BUCKETS from the canonical types/carePlanConfig export', () => {
    expect(SRC).toMatch(
      /import\s*\{[^}]*\bCORE_BUCKETS\b[^}]*\}\s*from\s*['"][^'"]*carePlanConfig['"]/,
    );
  });

  it('NO local CORE_BUCKETS declaration (the drift bug F15 fixes)', () => {
    // Pre-F15 the file declared `const CORE_BUCKETS: BucketType[] =
    // ['meds', 'vitals', 'wellness', 'meals'];` at the top. After F15
    // the canonical import replaces it.
    expect(SRC).not.toMatch(/\bconst\s+CORE_BUCKETS\b\s*[:=]/);
  });
});
