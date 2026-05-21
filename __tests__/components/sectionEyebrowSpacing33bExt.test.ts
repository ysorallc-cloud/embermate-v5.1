// ============================================================================
// Phase 33b extension pre-Lock-3 Item B — SectionEyebrow → first-row spacing.
//
// Lock 2 consolidated three previously-local `eyebrow:` styles in
// confirm.tsx onto the SectionEyebrow primitive. The retired local
// styles carried a `marginBottom: 8` that provided the gap between the
// eyebrow label and the first row beneath it. SectionEyebrow only
// declares `fontSize: 11` + `letterSpacing: 1.5` — no marginBottom —
// so post-Lock-2 every eyebrow in confirm.tsx (and at the 14 other
// consumer sites) renders flush against its next sibling. Reads cramped,
// and the lavender label drops contrast onto the lighter glass card
// surface ("purple blending into cards").
//
// Audit (recorded in the commit body): 14 direct SectionEyebrow consumers
// across confirm.tsx + journal surfaces + insights cards + now banners.
// None provides a wrapper marginBottom. JournalSection-wrapped consumers
// have an implicit 7pt gap via `body.marginTop: 7`. To get a consistent
// canon gap everywhere — and to avoid the per-surface drift of expecting
// every consumer to remember its own spacing — the fix lives at the
// primitive layer: SectionEyebrow gains a default `marginBottom` ≥
// Spacing.sm (12pt). JournalSection's redundant `body.marginTop: 7` is
// dropped in the same commit so the gap doesn't compound for the
// JournalSection-wrapped consumer family.
//
// Note: RN/jest doesn't compute layout. This is a style-PRESENCE pin
// (asserts the spacing token lives in the source); the visual gap +
// lavender contrast verification happen at the simulator gate.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';
import { Spacing } from '../../theme/theme-tokens';

const ROOT = join(__dirname, '../..');
const eyebrowSrc = readFileSync(join(ROOT, 'components/SectionEyebrow.tsx'), 'utf8');
const journalSectionSrc = readFileSync(
  join(ROOT, 'components/journal/JournalSection.tsx'),
  'utf8',
);

describe('Phase 33b extension pre-Lock-3 Item B — SectionEyebrow→first-row spacing', () => {
  it('SectionEyebrow primitive carries a marginBottom of Spacing.sm or larger', () => {
    // Pin the spacing token presence. The primitive's baseStyle (or an
    // equivalent inline style override at the render site) must specify
    // a marginBottom that resolves to Spacing.sm (12) or above. Drives
    // off the canonical Spacing.sm value so a future Spacing token bump
    // doesn't silently leave the eyebrow under-spaced.
    const sm = Spacing.sm;
    // Expression form (Spacing.sm token reference).
    const usesToken = /marginBottom:\s*Spacing\.(?:sm|md|lg|s[3-9]|s1[0-2])\b/.test(eyebrowSrc);
    // Literal form — must be >= Spacing.sm.
    const literalMatch = eyebrowSrc.match(/marginBottom:\s*(\d+)\b/);
    const usesLiteral = literalMatch ? Number(literalMatch[1]) >= sm : false;
    expect(usesToken || usesLiteral).toBe(true);
  });

  it('JournalSection no longer carries its own body.marginTop (was redundant with primitive marginBottom)', () => {
    // Pre-fix JournalSection had `body: { marginTop: 7 }` providing an
    // implicit 7pt gap between the eyebrow and the card body. With the
    // primitive-level marginBottom (≥ Spacing.sm = 12), keeping the
    // body marginTop would compound to 19pt+ inside JournalSection
    // consumers — louder than the 12pt canon outside JournalSection.
    // The body marginTop is retired so the gap is consistent across
    // all 14+ consumer sites.
    expect(journalSectionSrc).not.toMatch(/^\s+body:\s*\{[\s\S]{0,80}?marginTop:\s*7/m);
  });

  it('confirm.tsx sections render their SectionEyebrows (regression pin from Lock 2)', () => {
    // Defensive: a future refactor must not strip SectionEyebrow from
    // confirm.tsx in pursuit of a "simpler" fix to the spacing question.
    const confirmSrc = readFileSync(
      join(ROOT, 'app/care-plan/setup/confirm.tsx'),
      'utf8',
    );
    const eyebrows = confirmSrc.match(/<SectionEyebrow\b/g) ?? [];
    expect(eyebrows.length).toBeGreaterThanOrEqual(3);
  });
});
