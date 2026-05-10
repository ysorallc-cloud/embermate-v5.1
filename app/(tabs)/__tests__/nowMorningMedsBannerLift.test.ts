// ============================================================================
// Phase 15.3 — MorningMedsBanner lift to now.tsx (source-level audit).
//
// Pre-15.3 the banner sat inside NowTimeline.tsx, atop the populated
// section card (line 183, gated by `pendingCount === 0` internally).
// 15.3 lifts it up to now.tsx so it renders ABOVE StatRings — the
// "X meds due now · Confirm All" affordance is the highest-priority
// action when meds are pending and shouldn't be visually nested
// inside the schedule card.
//
// Mounting now.tsx end-to-end is impractical given its dependency
// graph (matching the existing app/(tabs)/__tests__ pattern).
// Source-level checks pin the lift:
//
//   1. now.tsx imports MorningMedsBanner.
//   2. now.tsx renders <MorningMedsBanner before <StatRings (the
//      ordering check from the spec — the banner appears above the
//      orbs in the JSX).
//   3. NowTimeline.tsx no longer imports MorningMedsBanner.
//   4. NowTimeline.tsx no longer renders <MorningMedsBanner.
//   5. Behavioural contracts (returns null on pendingCount===0,
//      fires onConfirmAll on press) live in the colocated
//      MorningMedsBanner.test.tsx and stay independent of mount
//      location — the lift is a render-position change only.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../../..');
const nowSrc = readFileSync(join(ROOT, 'app/(tabs)/now.tsx'), 'utf8');
const timelineSrc = readFileSync(join(ROOT, 'components/now/NowTimeline.tsx'), 'utf8');

describe('Phase 15.3 — MorningMedsBanner lift to now.tsx', () => {
  it('contract 1: now.tsx imports MorningMedsBanner', () => {
    expect(nowSrc).toMatch(
      /import\s*\{[^}]*\bMorningMedsBanner\b[^}]*\}\s*from\s*['"][^'"]+\/MorningMedsBanner['"]/,
    );
  });

  it('contract 2: now.tsx renders <MorningMedsBanner before <StatRings', () => {
    // Use lastIndexOf so the JSX render site dominates over import-line
    // matches (imports appear first in the file).
    const banner = nowSrc.lastIndexOf('<MorningMedsBanner');
    const rings = nowSrc.lastIndexOf('<StatRings');
    expect(banner).toBeGreaterThan(-1);
    expect(rings).toBeGreaterThan(-1);
    expect(banner).toBeLessThan(rings);
  });

  it('contract 2: the banner render derives pendingMeds from allPending', () => {
    // The lift moves the medication-filter logic from NowTimeline to
    // now.tsx. Pin the derivation site so a future cleanup doesn't
    // accidentally drop the filter and pass the unfiltered allPending.
    expect(nowSrc).toMatch(
      /allPending\.filter\([\s\S]{0,80}?itemType\s*===?\s*['"]medication['"]/,
    );
  });

  it('contract 3: NowTimeline no longer imports MorningMedsBanner', () => {
    expect(timelineSrc).not.toMatch(
      /^\s*import\s+\{\s*MorningMedsBanner\s*\}\s+from\s+['"][^'"]+MorningMedsBanner['"]/m,
    );
  });

  it('contract 4: NowTimeline no longer renders <MorningMedsBanner', () => {
    expect(timelineSrc).not.toMatch(/<MorningMedsBanner\b/);
  });

  it('regression: NowTimeline still threads onBatchMedConfirm down to TimelineSection', () => {
    // The handler is no longer used by the banner (which lifted), but
    // TimelineSection's filtered-meds path still consumes it for its
    // own batch-confirm CTA inside the schedule. Removing the prop
    // would break that surface. The lift drops the BANNER's use, not
    // the prop's use entirely.
    expect(timelineSrc).toMatch(/onBatchMedConfirm\b/);
  });
});
