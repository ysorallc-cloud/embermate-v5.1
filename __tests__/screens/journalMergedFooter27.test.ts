// ============================================================================
// Phase 27 F4 — Journal merged footer (Q-27.3 single-eyebrow-block lock).
//
// Pre-F4 the page bottom carried two structurally separate units:
//   • BUILDING TOWARD banner — lavender-tinted touchable with hairline
//     divider above + dedicated eyebrow + emoji + arrow.
//   • JournalDisclaimer — separately-centered logged-count + privacy
//     line with its own paddingVertical: 16.
//
// F4 collapses them into one quiet footer block:
//   • Single <SectionEyebrow text="For the record" />
//   • Conditional building-toward text link with sage chevron (no
//     banner chrome — lavender no-fill canon compliant)
//   • <JournalDisclaimer inline /> — stats line + privacy line flow
//     inline in the merged block rather than as a separately-centered
//     standalone region
//
// Retired with F4:
//   • sectionDivider style (only consumed by the pre-F4 BUILDING
//     TOWARD section)
//   • feedBanner / feedBannerIcon / feedBannerText / feedBannerArrow
//     styles (the lavender-tinted touchable chrome)
//
// Pinned contracts:
//   1. journal.tsx has exactly one <SectionEyebrow text="For the
//      record" /> for the merged footer block.
//   2. journal.tsx renders <JournalDisclaimer ... inline /> — the
//      inline prop is the marker that the disclaimer is inside the
//      merged footer rather than the pre-F4 standalone centered region.
//   3. The retired BUILDING TOWARD banner pattern is gone — no
//      <SectionEyebrow text="Building toward" .../> wrapping a
//      lavender-tinted feedBanner touchable.
//   4. Building-toward affordance still navigates to /(tabs)/understand
//      (preserves the entry point; just changes the chrome).
//   5. The retired styles (sectionDivider, feedBanner, feedBannerIcon,
//      feedBannerText, feedBannerArrow) are absent from journal.tsx.
//   6. JournalDisclaimer declares an `inline` prop so the merged-
//      footer call site can opt in.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');

const journalSrc = readFileSync(join(ROOT, 'app/(tabs)/journal.tsx'), 'utf8');
const disclaimerSrc = readFileSync(
  join(ROOT, 'components/journal/JournalDisclaimer.tsx'),
  'utf8',
);

const journalStripped = journalSrc
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

describe('Phase 27 F4 — Journal merged footer', () => {
  it('contract 1: exactly one <SectionEyebrow text="For the record" /> renders for the merged footer block', () => {
    const matches = journalStripped.match(
      /<SectionEyebrow[\s\S]{0,200}?text=["']For the record["']/g,
    );
    expect(matches).not.toBeNull();
    expect(matches!.length).toBe(1);
  });

  it('contract 2: JournalDisclaimer is rendered with the `inline` prop', () => {
    expect(journalStripped).toMatch(/<JournalDisclaimer[\s\S]{0,400}inline/);
  });

  it('contract 3: pre-F4 BUILDING TOWARD banner pattern is retired (absence pin)', () => {
    // The pre-F4 banner had a `<SectionEyebrow text="Building toward"`
    // OPEN tag immediately followed by a <TouchableOpacity style={s.feedBanner}.
    // F4 retires both pieces; the merged-footer link doesn't use a
    // dedicated eyebrow ("For the record" is the shared eyebrow) and
    // doesn't use the feedBanner style.
    expect(journalStripped).not.toMatch(
      /<SectionEyebrow[\s\S]{0,200}?text=["']Building toward["']/,
    );
    expect(journalStripped).not.toMatch(/style=\{s\.feedBanner\b/);
  });

  it('contract 4: building-toward affordance preserves the navigate-to-understand entry point', () => {
    // The text-link replacement of the banner must still navigate to
    // /(tabs)/understand. Verify by greping for the navigate call near
    // the footerLink touchable. Source-level shape.
    expect(journalStripped).toMatch(/<TouchableOpacity[\s\S]{0,400}style=\{s\.footerLink\}[\s\S]{0,400}navigate\(['"]\/\(tabs\)\/understand['"]\)/);
  });

  it('contract 5: retired styles absent from journal.tsx style declarations', () => {
    // Pre-F4 styles were consumed only by the BUILDING TOWARD banner;
    // their removal is the cleanup signal. Anchor on the `:` style-
    // key form so commit-narrative comments mentioning the names
    // don't false-positive.
    const retired = ['sectionDivider', 'feedBanner', 'feedBannerIcon', 'feedBannerText', 'feedBannerArrow'];
    for (const name of retired) {
      const re = new RegExp(`^\\s+${name}\\s*:\\s*\\{`, 'm');
      expect(journalSrc).not.toMatch(re);
    }
  });

  it('contract 6: JournalDisclaimer declares an `inline` prop', () => {
    expect(disclaimerSrc).toMatch(/inline\??\s*:\s*boolean/);
  });
});
