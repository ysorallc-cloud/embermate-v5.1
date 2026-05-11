// ============================================================================
// Insights — May 1 sizing pass Phase 5.
//
// "Missing data" section was redundant in the under-7-days empty state —
// the consolidated InsightsEmptyStatePreview card above already explained
// the data state. Phase 5 suppresses Missing Data when daysOfData < 7.
//
// Source-level guard: the gate must reference both `daysOfData >= 7` AND
// `dataGaps.length`. The component itself can stay; the empty-state path
// must not include it.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const understandSrc = readFileSync(join(ROOT, 'app/(tabs)/understand.tsx'), 'utf8');

describe('Insights Missing Data — gated on 7+ days', () => {
  it('the Missing Data section gate references daysOfData >= 7', () => {
    // Phase 15.12 — the marker changed from
    //   <Text style={styles.sectionLabel}>Missing data</Text>
    // to
    //   <SectionEyebrow text="Missing data" />
    // when the sectionLabel style was retired in favor of the
    // SectionEyebrow primitive. Locate the new marker.
    const marker = '<SectionEyebrow text="Missing data" />';
    const idx = understandSrc.indexOf(marker);
    expect(idx).toBeGreaterThan(0);
    // The guard line sits within ~600 chars before the block.
    const guardWindow = understandSrc.slice(Math.max(0, idx - 600), idx);
    expect(guardWindow).toMatch(/daysOfData\s*>=\s*7/);
    expect(guardWindow).toMatch(/dataGaps\.length/);
  });

  it('the section header copy is unchanged ("Missing data")', () => {
    expect(understandSrc).toContain('Missing data');
  });

  it('the consolidated InsightsEmptyStatePreview gate stays at < 14 days', () => {
    // The Phase 4 consolidated card lives at the < 14 days gate.
    // Phase 3.7.3 wraps it in the classifyInsightsState helper, which
    // encodes the same threshold via POPULATED_DAYS_THRESHOLD = 14.
    // Accept either wiring so the contract holds across refactors.
    const usesGating =
      /gating\.showPatternsComing[\s\S]{0,300}<InsightsEmptyStatePreview/.test(
        understandSrc,
      );
    const usesLiteral = /pageData\.daysOfData\s*<\s*14[\s\S]{0,200}<InsightsEmptyStatePreview/.test(
      understandSrc,
    );
    expect(usesGating || usesLiteral).toBe(true);
  });
});
