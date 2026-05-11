// ============================================================================
// Phase 15.12 — Apply SectionEyebrow uniformly across Insights.
//
// Pre-15.12 the Insights screen and its child components rendered
// eyebrow-style labels with inconsistent typography:
//   • understand.tsx local sectionLabel: fontSize 11, weight 600,
//     SENTENCE case ("Rule 3: sentence case, not ALL CAPS").
//   • PatternStack local eyebrow: fontSize 10, weight 600.
//   • UpcomingAppointmentCard local eyebrow: fontSize 10, weight 600.
//   • UpcomingVisitInsightsCard local eyebrow: fontSize 10, weight 600.
//   • InsightsEmptyStatePreview two local eyebrows: another scale.
//
// 15.12 consolidates onto components/SectionEyebrow.tsx — the same
// primitive HandoffSheet already uses. SectionEyebrow forces ALL
// CAPS at the render layer (text.toUpperCase()), so the typographic
// intent of an eyebrow is now uniform across all Insights surfaces.
// The "Rule 3 sentence case" comment is retired by this pass.
//
// Cross-surface: UpcomingAppointmentCard on the Now tab was
// explicitly deferred from 15.7 ("SectionEyebrow component swap is
// deferred to 15.12") and is swept in this pass too.
//
// New section: the Share CTA (15.11) gained no eyebrow at the time.
// 15.10's commit message filed the observation that the visual
// rhythm between PatternStack and the Share CTA wanted one. 15.12
// adds a "Reports" eyebrow above the consolidated Share button.
//
// codeOnly() strips comments before regex matching so retirement
// prose mentioning the removed inline-style names doesn't false-
// positive.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

function codeOnly(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const ROOT = join(__dirname, '../../..');
const read = (rel: string) => codeOnly(readFileSync(join(ROOT, rel), 'utf8'));

describe('Phase 15.12 — SectionEyebrow applied uniformly', () => {
  describe('understand.tsx', () => {
    const code = read('app/(tabs)/understand.tsx');

    it('imports SectionEyebrow', () => {
      expect(code).toMatch(/import\s+\{[^}]*\bSectionEyebrow\b[^}]*\}\s+from\s+['"][^'"]*components\/SectionEyebrow['"]/);
    });

    it('renders SectionEyebrow for each of the 4 surviving page-level sections', () => {
      // Phase 15.12 originally applied SectionEyebrow across 5 page-
      // level sections (Pulse / Missing data / Vitals / Medication
      // adherence / Reports). Phase 16.4 retired the "Reports"
      // eyebrow when the multi-option ShareSheet was hidden pre-
      // launch — a single direct button names its own action, an
      // eyebrow above it read redundant. Phase 21 will restore both
      // the eyebrow and the multi-option sheet when real PDF
      // generation ships.
      const eyebrows = code.match(/<SectionEyebrow\b[^/]*\/>/g) || [];
      expect(eyebrows.length).toBeGreaterThanOrEqual(4);
      const joined = eyebrows.join('\n');
      expect(joined).toMatch(/text=["'][Tt]his week.s pulse["']/);
      expect(joined).toMatch(/text=["'][Mm]issing data["']/);
      expect(joined).toMatch(/text=["'][Vv]itals this week["']/);
      expect(joined).toMatch(/text=["'][Mm]edication adherence["']/);
      // Phase 16.4 — "Reports" eyebrow retired with the ShareSheet
      // wrapper; explicitly pinned absent so a future drift puts it
      // back through intent, not accident.
      expect(joined).not.toMatch(/text=["'][Rr]eports["']/);
    });

    it('drops the now-orphaned sectionLabel style entry', () => {
      // The local sectionLabel typography is replaced by
      // SectionEyebrow's base style. Drop the local entry so it
      // can't accidentally re-attach to a future Text.
      expect(code).not.toMatch(/^\s*sectionLabel\s*:/m);
    });

    it('does not render raw <Text style={styles.sectionLabel}>...</Text> anywhere', () => {
      // Belt-and-suspenders: if the style is gone but a stray ref
      // remained, the audit catches it before runtime would.
      expect(code).not.toMatch(/styles\.sectionLabel\b/);
    });
  });

  describe('PatternStack', () => {
    const code = read('components/insights/PatternStack.tsx');

    it('imports SectionEyebrow', () => {
      expect(code).toMatch(/import\s+\{[^}]*\bSectionEyebrow\b[^}]*\}\s+from\s+['"][^'"]*\/SectionEyebrow['"]/);
    });

    it('renders SectionEyebrow with the EmberMate noticed text', () => {
      expect(code).toMatch(/<SectionEyebrow\b[^/]*text=["']EmberMate noticed["']/);
    });

    it('drops the local eyebrow style entry', () => {
      expect(code).not.toMatch(/^\s*eyebrow\s*:/m);
    });

    it('does not render a custom Text node for the eyebrow line', () => {
      expect(code).not.toMatch(/styles\.eyebrow\b/);
    });
  });

  describe('UpcomingAppointmentCard (Now tab — deferred from 15.7)', () => {
    const code = read('components/now/UpcomingAppointmentCard.tsx');

    it('imports SectionEyebrow', () => {
      expect(code).toMatch(/import\s+\{[^}]*\bSectionEyebrow\b[^}]*\}\s+from\s+['"][^'"]*\/SectionEyebrow['"]/);
    });

    it('renders SectionEyebrow with caregiverAccent tint', () => {
      // The card sits in the lavender caregiver-context lane; the
      // tint preserves that semantic. SectionEyebrow's API accepts
      // a `tint` prop keyed by ThemeContext color name.
      expect(code).toMatch(/<SectionEyebrow\b[\s\S]{0,200}?tint=["']caregiverAccent["']/);
    });

    it('drops the local eyebrow style entry', () => {
      expect(code).not.toMatch(/^\s*eyebrow\s*:/m);
    });
  });

  describe('UpcomingVisitInsightsCard', () => {
    const code = read('components/insights/UpcomingVisitInsightsCard.tsx');

    it('imports SectionEyebrow', () => {
      expect(code).toMatch(/import\s+\{[^}]*\bSectionEyebrow\b[^}]*\}\s+from\s+['"][^'"]*\/SectionEyebrow['"]/);
    });

    it('renders SectionEyebrow with caregiverAccent tint', () => {
      expect(code).toMatch(/<SectionEyebrow\b[\s\S]{0,200}?tint=["']caregiverAccent["']/);
    });

    it('drops the local eyebrow style entry', () => {
      expect(code).not.toMatch(/^\s*eyebrow\s*:/m);
    });
  });

  describe('InsightsEmptyStatePreview', () => {
    const code = read('components/understand/InsightsEmptyStatePreview.tsx');

    it('imports SectionEyebrow', () => {
      expect(code).toMatch(/import\s+\{[^}]*\bSectionEyebrow\b[^}]*\}\s+from\s+['"][^'"]*\/SectionEyebrow['"]/);
    });

    it('renders SectionEyebrow for both eyebrow lines', () => {
      expect(code).toMatch(/<SectionEyebrow\b[\s\S]{0,200}?text=["']Patterns coming["']/i);
      expect(code).toMatch(/<SectionEyebrow\b[\s\S]{0,200}?text=["'].*[Ww]atching for["']/);
    });

    it('drops the patternsEyebrow + watchingEyebrow style entries', () => {
      expect(code).not.toMatch(/^\s*patternsEyebrow\s*:/m);
      expect(code).not.toMatch(/^\s*watchingEyebrow\s*:/m);
    });
  });
});
