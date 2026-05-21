// ============================================================================
// Phase 22.2 — Uniform SectionEyebrow + section-color encoding on Journal.
//
// Phase 15.12 established the SectionEyebrow primitive on Insights with
// tint semantics (sage / lavender / default textTertiary). Phase 22.2
// extends the same primitive to Journal with section-color encoding
// that signals content type:
//
//   WHAT HAPPENED   → sage  (accent)        — settled, factual baseline
//   WORTH MENTIONING→ amber (amber)         — attention without alarm
//   STILL PENDING   → coral (coral)         — handoff action required
//   NOTES FROM …    → default textTertiary  — neutral, caregiver-voice
//   BUILDING TOWARD → lavender (caregiverAccent) — visit-prep context
//
// Hairline dividers sit above each major section. Each section
// component renders its own divider as the first child of its content
// block — when the component returns null (e.g. no notable moments
// today, no pending tasks), the divider is also absent automatically.
// No orphan dividers across the page.
//
// Source-level audit on each Journal section component + journal.tsx.
// codeOnly() strips comments before regex matching so retirement prose
// and section-name mentions inside comments don't false-positive.
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

const narrativeCode = read('components/journal/NarrativeSnapshot.tsx');
const notableCode = read('components/journal/TodayNotableMoments.tsx');
const pendingCode = read('components/journal/TodayStillPending.tsx');
const notesCode = read('components/journal/JournalNotesCard.tsx');
const journalCode = read('app/(tabs)/journal.tsx');

describe('Phase 22.2 — SectionEyebrow applied uniformly to Journal sections', () => {
  describe('WHAT HAPPENED (NarrativeSnapshot, sage)', () => {
    it('imports SectionEyebrow', () => {
      expect(narrativeCode).toMatch(/import\s+\{[^}]*\bSectionEyebrow\b[^}]*\}\s+from\s+['"][^'"]*\/SectionEyebrow['"]/);
    });

    it('renders SectionEyebrow with text "What happened" and sage tint (accent)', () => {
      expect(narrativeCode).toMatch(
        /<SectionEyebrow\b[\s\S]{0,200}?text=["']What happened["']/,
      );
      expect(narrativeCode).toMatch(
        /<SectionEyebrow\b[\s\S]{0,200}?tint=["']accent["']/,
      );
    });

    it('renders a hairline divider above the section content', () => {
      // Divider lives inside the component so it auto-gates with the
      // null-return path (no content → no divider).
      expect(narrativeCode).toMatch(/\bsectionDivider\b|styles?\.divider/);
    });
  });

  describe('WORTH MENTIONING (TodayNotableMoments, amber)', () => {
    it('imports SectionEyebrow', () => {
      expect(notableCode).toMatch(/import\s+\{[^}]*\bSectionEyebrow\b[^}]*\}\s+from\s+['"][^'"]*\/SectionEyebrow['"]/);
    });

    it('renders SectionEyebrow with text "Worth mentioning" and amber tint', () => {
      expect(notableCode).toMatch(
        /<SectionEyebrow\b[\s\S]{0,200}?text=["']Worth mentioning["']/,
      );
      expect(notableCode).toMatch(
        /<SectionEyebrow\b[\s\S]{0,200}?tint=["']amber["']/,
      );
    });

    it('legacy "NOTABLE TODAY" literal is gone (renamed per 22.2 spec)', () => {
      // The string was the previous eyebrow content. SectionEyebrow
      // auto-uppercases its text prop, so "Worth mentioning" renders
      // as "WORTH MENTIONING" at runtime — neither the lowercase nor
      // uppercase form of the OLD name should remain.
      expect(notableCode).not.toMatch(/['"]NOTABLE TODAY['"]/);
    });

    it('renders a hairline divider above the section', () => {
      expect(notableCode).toMatch(/\bsectionDivider\b|styles?\.divider/);
    });

    it('drops the local eyebrow style (replaced by SectionEyebrow primitive)', () => {
      expect(notableCode).not.toMatch(/^\s*eyebrow\s*:/m);
    });
  });

  describe('STILL PENDING (TodayStillPending, coral)', () => {
    it('imports SectionEyebrow', () => {
      expect(pendingCode).toMatch(/import\s+\{[^}]*\bSectionEyebrow\b[^}]*\}\s+from\s+['"][^'"]*\/SectionEyebrow['"]/);
    });

    it('renders SectionEyebrow with text "Still pending" and coral tint', () => {
      expect(pendingCode).toMatch(
        /<SectionEyebrow\b[\s\S]{0,200}?text=["']Still pending["']/,
      );
      expect(pendingCode).toMatch(
        /<SectionEyebrow\b[\s\S]{0,200}?tint=["']coral["']/,
      );
    });

    it('renders a hairline divider above the section', () => {
      expect(pendingCode).toMatch(/\bsectionDivider\b|styles?\.divider/);
    });

    it('drops the local eyebrow style (replaced by SectionEyebrow primitive)', () => {
      expect(pendingCode).not.toMatch(/^\s*eyebrow\s*:/m);
    });
  });

  describe('NOTES FROM … (JournalNotesCard, default textTertiary)', () => {
    it('imports SectionEyebrow', () => {
      expect(notesCode).toMatch(/import\s+\{[^}]*\bSectionEyebrow\b[^}]*\}\s+from\s+['"][^'"]*\/SectionEyebrow['"]/);
    });

    it('renders SectionEyebrow with text built from eyebrowText (caregiverName-driven)', () => {
      // The component already builds an eyebrowText variable in 22.1
      // ("NOTES FROM {name}" or "NOTES"). 22.2 passes that variable
      // through SectionEyebrow. No tint prop → default textTertiary.
      expect(notesCode).toMatch(/<SectionEyebrow\b[\s\S]{0,200}?text=\{eyebrowText\}/);
    });

    it('does NOT pass a tint prop (defaults to textTertiary)', () => {
      // Match the SectionEyebrow opening element and confirm there is
      // no tint attribute inside it.
      const tag = notesCode.match(/<SectionEyebrow\b[^/]*\/>/);
      expect(tag).not.toBeNull();
      expect(tag![0]).not.toMatch(/\btint=/);
    });

    it('drops the local eyebrow style (text styled by SectionEyebrow now)', () => {
      // The eyebrow lives inside the card's internal headerRow; the
      // Text+style pair is replaced by SectionEyebrow. The style key
      // itself is gone.
      expect(notesCode).not.toMatch(/^\s*eyebrow\s*:/m);
    });
  });

  describe('Merged footer page-level eyebrow (Phase 27 F4 reframe — was BUILDING TOWARD)', () => {
    // Phase 22.2 added a dedicated <SectionEyebrow text="Building toward"
    // tint="caregiverAccent" /> at page level above the lavender-tinted
    // BUILDING TOWARD banner. Phase 27 F4 (2026-05-21) collapsed
    // BUILDING TOWARD into the merged footer block — the dedicated
    // eyebrow + banner chrome + sectionDivider retire, replaced by a
    // single "For the record" eyebrow at the top of the merged footer
    // (Q-27.3 single-eyebrow-block lock). Original Phase 22.2 contracts
    // reframed to assert the NEW shape; the BUILDING TOWARD eyebrow
    // absence is defended by journalMergedFooter27 contract 3.

    it('renders SectionEyebrow with text "For the record" for the merged footer block (reframed from Building toward)', () => {
      expect(journalCode).toMatch(
        /<SectionEyebrow\b[\s\S]{0,200}?text=["']For the record["']/,
      );
      // The "Building toward" eyebrow is retired.
      expect(journalCode).not.toMatch(
        /<SectionEyebrow\b[\s\S]{0,200}?text=["']Building toward["']/,
      );
    });

    it('hairline divider above BUILDING TOWARD section is retired (absorbed into merged footer)', () => {
      // Pre-F4 the BUILDING TOWARD area had its own sectionDivider
      // above. The merged footer (Phase 27 F4) drops the divider
      // because the footer reads as one continuous quiet block below
      // the SOAP sections — no inter-section separator needed.
      expect(journalCode).not.toMatch(/\bsectionDivider\b/);
    });

    it('the merged-footer building-toward affordance stays gated on showFeedBanner', () => {
      // The dedicated eyebrow is gone, but the building-toward LINE
      // (now a quiet text link inside the footer) is still gated on
      // the same condition so no orphan text renders when there's no
      // upcoming appointment. Anchor on the footerLink style usage
      // and verify showFeedBanner appears in the lookback window.
      const idx = journalCode.indexOf('s.footerLink');
      expect(idx).toBeGreaterThan(-1);
      const before = journalCode.slice(Math.max(0, idx - 600), idx);
      expect(before).toMatch(/showFeedBanner/);
    });
  });
});

describe('Phase 22.2 — uniform divider treatment', () => {
  // Each section component declares a sectionDivider style entry so
  // the divider is consistent across the page (same height + same
  // theme-colored hairline). The colors test relies on the runtime
  // theme so the source-level pin checks structural presence only.
  it('NarrativeSnapshot declares a divider style', () => {
    expect(narrativeCode).toMatch(/\bsectionDivider\b|^\s*divider\s*:/m);
  });

  it('TodayNotableMoments declares a divider style', () => {
    expect(notableCode).toMatch(/\bsectionDivider\b|^\s*divider\s*:/m);
  });

  it('TodayStillPending declares a divider style', () => {
    expect(pendingCode).toMatch(/\bsectionDivider\b|^\s*divider\s*:/m);
  });

  it('JournalNotesCard declares a divider style (inside card or as outer wrapper)', () => {
    expect(notesCode).toMatch(/\bsectionDivider\b|^\s*divider\s*:/m);
  });

  it('journal.tsx no longer declares a sectionDivider style (Phase 27 F4 retired with the BUILDING TOWARD banner)', () => {
    // Reframed Phase 22.2 contract. The sectionDivider style was only
    // consumed by the pre-F4 BUILDING TOWARD area's hairline-above-
    // banner pattern. F4's merged footer drops that divider, and the
    // style declaration is retired alongside. Per-component dividers
    // (NarrativeSnapshot / TodayNotableMoments / etc.) remain as
    // pinned above; this assertion is page-level only.
    expect(journalCode).not.toMatch(/\bsectionDivider\b/);
  });
});

// Phase 22.2's "Insights tab unchanged (15.12 still passes)" describe
// retired by Phase 28 Batch B F6 (audit-revised cadence). F6 swapped
// understand.tsx's inline eyebrow consumers for `<InsightsReadCard>` +
// `<InsightsDataCard>`, which carry SectionEyebrow internally via the
// JournalSection primitive. The page-level eyebrow count is no longer
// the structural contract — the three-card mount is, pinned in
// `__tests__/screens/insightsThreeCardStructure28.test.ts`.
