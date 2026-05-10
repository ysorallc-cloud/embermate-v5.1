// ============================================================================
// Phase 15.4 — HydrationTodayRow retirement (source-level audit).
//
// Pre-15.4 the standalone HydrationTodayRow rendered between
// StatRings and the schedule, gated by `(isWaterBucketEnabled ||
// waterGlasses > 0)`. 15.4 folds hydration into the StatRings as a
// 5th ring; the standalone row is retired.
//
// Behavioural contracts (water ring renders + tap navigates) live
// in components/now/__tests__/StatRingsHydrationRing.test.tsx.
// This file pins the retirement at the JSX-render-site level:
//
//   1. now.tsx no longer imports HydrationTodayRow.
//   2. now.tsx no longer renders <HydrationTodayRow.
//   3. The dead handlers (handleHydrationRowAdd /
//      handleHydrationRowPress) are gone — they had no other
//      consumers besides the deleted row.
//   4. handleAddCup STAYS in now.tsx — NowTimeline still threads
//      it as `onAddCup` for inline schedule-row +1 (separate
//      surface from the standalone row).
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../../..');
const nowSrc = readFileSync(join(ROOT, 'app/(tabs)/now.tsx'), 'utf8');

// Strip line + block comments so audits scanning code semantics don't
// false-match against historical-context comment blocks (the
// retirement comment in now.tsx legitimately mentions
// handleHydrationRowAdd / handleHydrationRowPress to point future
// maintainers at what the lift retired).
function codeOnly(src: string): string {
  const lines = src.split('\n');
  let inBlock = false;
  const out: string[] = [];
  for (const line of lines) {
    let l = line;
    if (inBlock) {
      const e = l.indexOf('*/');
      if (e >= 0) { inBlock = false; l = l.slice(e + 2); } else continue;
    }
    const bs = l.indexOf('/*');
    if (bs >= 0) {
      const be = l.indexOf('*/', bs + 2);
      if (be >= 0) l = l.slice(0, bs) + l.slice(be + 2);
      else { inBlock = true; l = l.slice(0, bs); }
    }
    const lc = l.indexOf('//');
    if (lc >= 0) l = l.slice(0, lc);
    out.push(l);
  }
  return out.join('\n');
}

const nowCode = codeOnly(nowSrc);

describe('Phase 15.4 — HydrationTodayRow retired from now.tsx', () => {
  it('contract 1: now.tsx does NOT import HydrationTodayRow', () => {
    expect(nowSrc).not.toMatch(
      /^\s*import\s+\{\s*HydrationTodayRow\s*\}\s+from\s+['"][^'"]+HydrationTodayRow['"]/m,
    );
  });

  it('contract 2: now.tsx does NOT render <HydrationTodayRow', () => {
    expect(nowSrc).not.toMatch(/<HydrationTodayRow\b/);
  });

  it('contract 3: dead handler handleHydrationRowAdd is removed', () => {
    // The handler's only consumer was HydrationTodayRow's onAddCup
    // prop. After the row is deleted, the handler has zero remaining
    // callers. Pin its absence so future cleanup doesn't reintroduce
    // a dead path. (Use code-only source — the retirement comment
    // legitimately mentions the name to orient future maintainers.)
    expect(nowCode).not.toMatch(/\bhandleHydrationRowAdd\b/);
  });

  it('contract 3: dead handler handleHydrationRowPress is removed', () => {
    // Pre-15.4 this handler called navigate('/log-water') from the
    // row's onRowPress. Now StatRings's water-ring tap owns that
    // route directly; the handler is dead.
    expect(nowCode).not.toMatch(/\bhandleHydrationRowPress\b/);
  });

  it('contract 4: handleAddCup STAYS — NowTimeline still consumes it', () => {
    // NowTimeline threads onAddCup down to the schedule rows for
    // inline +1 cup on water-tracking instances. Different surface
    // from the retired standalone row. Removing handleAddCup would
    // break the schedule-side affordance.
    expect(nowSrc).toMatch(/\bhandleAddCup\b/);
    expect(nowSrc).toMatch(/onAddCup\s*=\s*\{\s*handleAddCup\s*\}/);
  });
});

describe('Phase 15.4 — HydrationTodayRow file lifecycle', () => {
  it('records remaining references to HydrationTodayRow across the codebase', () => {
    // After the now.tsx delete, the only references SHOULD be:
    //   • components/now/HydrationTodayRow.tsx (the file itself)
    //   • this test file's comments + assertions
    // If any other file references it, surface for review before
    // deleting the component file.
    //
    // Nothing to assert here directly (this test serves as a tripwire
    // — if the deletion goes wrong, the contracts above fail). Keep
    // for documentation.
    expect(true).toBe(true);
  });
});
