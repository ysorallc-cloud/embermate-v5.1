// ============================================================================
// Phase 28 Batch B F8 — Missing Data demotion source-level pin.
//
// Pre-Phase-28: Missing Data was its own page-level section
// (`═══ SECTION 3: DATA GAPS ═══`) with eyebrow + per-gap cards. The
// section read as scolding in first-time-use state.
//
// Phase 28 Batch B F6 (audit-revised cadence): the Missing Data section
// was demoted into a single footer line at the bottom of
// `<InsightsDataCard>`. The card builds `gapFooterCopy()` from its
// `dataGaps` prop and renders one short line ("N days of X missing this
// period →" / "N metrics with gaps this period →"). Per-gap eyebrow +
// card chrome retired.
//
// This pin defends against:
//   • Re-introducing the page-level Missing Data section as a standalone
//     surface in understand.tsx
//   • Removing the `dataGaps` prop pipeline from understand.tsx to
//     InsightsDataCard (breaks the footer signal even if the card still
//     mounts)
//   • Removing the footer-copy helper from InsightsDataCard (breaks the
//     demotion contract — the card still mounts but the Missing Data
//     surface disappears entirely)
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const understandSrc = readFileSync(join(ROOT, 'app/(tabs)/understand.tsx'), 'utf8');
const dataCardSrc = readFileSync(
  join(ROOT, 'components/insights/InsightsDataCard.tsx'),
  'utf8',
);

describe('Phase 28 Batch B — Missing Data demoted to InsightsDataCard footer', () => {
  it('understand.tsx no longer renders an inline DATA GAPS section', () => {
    expect(understandSrc).not.toContain('SECTION 3: DATA GAPS');
    expect(understandSrc).not.toContain('dataGapCard:');
    expect(understandSrc).not.toContain('dataGapHeader:');
    expect(understandSrc).not.toContain('dataGapMetric:');
    expect(understandSrc).not.toMatch(/<SectionEyebrow\s+text=["']Missing data["']/);
  });

  it('understand.tsx still computes dataGaps and passes them to InsightsDataCard', () => {
    expect(understandSrc).toMatch(/computeDataGaps\(/);
    expect(understandSrc).toMatch(/<InsightsDataCard[\s\S]*?dataGaps=\{[^}]+\}/);
  });

  it('InsightsDataCard exposes a DataGap-aware footer copy helper', () => {
    expect(dataCardSrc).toMatch(/function\s+gapFooterCopy\s*\(/);
    expect(dataCardSrc).toMatch(/dataGaps:\s*DataGap\[\]/);
  });

  it('InsightsDataCard footer surfaces a single-line gap summary, not per-gap cards', () => {
    // The pre-F8 per-gap card render mapped over dataGaps with icon +
    // metric + days-missing + impact. The demoted form renders ONE
    // line via gapFooterCopy(). Pin that the per-gap map is gone.
    expect(dataCardSrc).not.toMatch(/dataGaps\.map\([^)]*=>[\s\S]*?gap\.icon/);
    expect(dataCardSrc).not.toMatch(/dataGaps\.map\([^)]*=>[\s\S]*?gap\.daysMissing/);
  });
});
