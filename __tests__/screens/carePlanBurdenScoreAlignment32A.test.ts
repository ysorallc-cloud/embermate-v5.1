// ============================================================================
// Phase 32A — burden-score alignment (brief-named launch pin).
//
// Brief test discipline:
//   "carePlanBurdenScoreAlignment32A.test.ts pins:
//     - Bucket toggled on via Care Plan main has priority='recommended'
//       set silently in the config
//     - Burden score calculation still works with the new flow"
//
// The Priority three-card picker retired from the UI in 32A (P-lock).
// Priority is preserved as a hidden field in the data model; toggle-on
// inherits DEFAULT_BUCKET_CONFIG.priority='recommended' silently. The
// burden-score formula in services/insightsService.ts must keep
// required=3 / recommended=2 / optional=1 so newly-toggled-on buckets
// contribute as recommended without any UI surface.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const CONFIG_SRC = readFileSync(join(ROOT, 'types/carePlanConfig.ts'), 'utf8');
const HOME_SRC = readFileSync(join(ROOT, 'app/care-plan/index.tsx'), 'utf8');
const INSIGHTS_SRC = readFileSync(join(ROOT, 'services/insightsService.ts'), 'utf8');

function stripComments(s: string): string {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
}

describe('Phase 32A — burden-score alignment (brief-named pin)', () => {
  // --------------------------------------------------------------------------
  // Silent-default priority — toggle-on inherits 'recommended'
  // --------------------------------------------------------------------------

  it("contract 1: DEFAULT_BUCKET_CONFIG.priority is 'recommended' (silent-default source)", () => {
    const stripped = stripComments(CONFIG_SRC);
    const m = stripped.match(/DEFAULT_BUCKET_CONFIG[^=]*=\s*\{[\s\S]*?priority:\s*['"]([^'"]+)['"]/);
    expect(m).not.toBeNull();
    expect(m![1]).toBe('recommended');
  });

  it('contract 2: Care Plan home handleToggleBucket calls toggleBucket — does NOT explicitly write priority', () => {
    // F2's handleToggleBucket writes ONLY the enabled flag (via the
    // toggleBucket hook). Priority is inherited from the bucket's
    // existing config (which was seeded from DEFAULT_BUCKET_CONFIG).
    // Pin that the toggle path doesn't override priority — if a future
    // edit added `priority: 'required'` (or anything else) inside the
    // toggle handler, that would silently violate the P-lock.
    const stripped = stripComments(HOME_SRC);
    const m = stripped.match(/async\s+function\s+handleToggleBucket[\s\S]*?\{[\s\S]*?\n\s*\}\s*,/);
    // Locate the handleToggleBucket body by searching for its declaration.
    const declIdx = stripped.search(/handleToggleBucket\s*=\s*useCallback/);
    expect(declIdx).toBeGreaterThan(-1);
    // Pull a 600-char window starting at the declaration.
    const window = stripped.slice(declIdx, declIdx + 600);
    // No priority write inside the toggle handler.
    expect(window).not.toMatch(/priority\s*:/);
  });

  // --------------------------------------------------------------------------
  // Burden-score formula — must still weight required=3 / recommended=2 /
  // optional=1 so toggled-on buckets contribute as recommended.
  // --------------------------------------------------------------------------

  it('contract 3: burden-score weights required=3, recommended=2, optional=1 (formula intact)', () => {
    expect(INSIGHTS_SRC).toMatch(/required\s*\*\s*3/);
    expect(INSIGHTS_SRC).toMatch(/recommended\s*\*\s*2/);
    expect(INSIGHTS_SRC).toMatch(/optional\s*\*\s*1/);
  });

  it("contract 4: burden-score switch handles 'required' / 'recommended' / 'optional' cases", () => {
    // The aggregation loop branches on priority. All three string
    // values must be handled or a 'recommended'-default bucket would
    // silently fall through and contribute 0.
    expect(INSIGHTS_SRC).toMatch(/case\s+['"]required['"]/);
    expect(INSIGHTS_SRC).toMatch(/case\s+['"]recommended['"]/);
    expect(INSIGHTS_SRC).toMatch(/case\s+['"]optional['"]/);
  });

  it("contract 5: burden-score reads priority from item.priority || instance.priority (canonical resolution)", () => {
    // Pre-32A the priority resolution was `item?.priority ||
    // instance.priority`. The CarePlanItem-as-canonical-source pattern
    // means a toggled-on bucket's items get priority from the item
    // (which inherits the bucket config's 'recommended' default).
    // Pin the resolution shape so a future edit doesn't accidentally
    // hardcode one source or invert precedence.
    expect(INSIGHTS_SRC).toMatch(/item\?\.priority\s*\|\|\s*instance\.priority/);
  });
});
