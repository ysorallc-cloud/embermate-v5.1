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

  describe('BUILDING TOWARD (journal.tsx page-level, lavender)', () => {
    it('renders SectionEyebrow with text "Building toward" and lavender tint above the feed-forward banner', () => {
      // The banner has no internal eyebrow container, so the eyebrow
      // lives at page level inside the same conditional as the banner.
      expect(journalCode).toMatch(
        /<SectionEyebrow\b[\s\S]{0,200}?text=["']Building toward["']/,
      );
      expect(journalCode).toMatch(
        /<SectionEyebrow\b[\s\S]{0,400}?tint=["']caregiverAccent["']/,
      );
    });

    it('renders a hairline divider above the BUILDING TOWARD section', () => {
      // Page-level divider — gated by the same showFeedBanner /
      // upcomingAppointment conditional as the eyebrow + banner so no
      // orphan divider appears when the banner is absent.
      expect(journalCode).toMatch(/\bsectionDivider\b/);
    });

    it('the new BUILDING TOWARD eyebrow renders inside the showFeedBanner conditional', () => {
      // Pin the gating: the eyebrow must NOT render when no upcoming
      // appointment is in window (otherwise it sits orphaned above
      // empty space).
      const idx = journalCode.indexOf('Building toward');
      expect(idx).toBeGreaterThan(-1);
      // Look ~600 chars before the eyebrow for the gating expression
      // (the conditional opens with `{showFeedBanner && upcomingAppointment && (`).
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

  it('journal.tsx declares a sectionDivider style for the BUILDING TOWARD divider', () => {
    expect(journalCode).toMatch(/\bsectionDivider\b/);
  });
});

describe('Phase 22.2 — Insights tab unchanged (15.12 still passes)', () => {
  // Adding new tint values (amber, coral) to the variant set must
  // not regress Insights — its existing eyebrows continue to use
  // their original tints. Pin a quick sanity check.
  const insightsCode = read('app/(tabs)/understand.tsx');
  it('Insights still imports SectionEyebrow', () => {
    expect(insightsCode).toMatch(/import\s+\{[^}]*\bSectionEyebrow\b[^}]*\}\s+from\s+['"][^'"]*\/SectionEyebrow['"]/);
  });
  it('Insights renders at least 4 SectionEyebrow components (Phase 15.12 count)', () => {
    const eyebrows = insightsCode.match(/<SectionEyebrow\b[^/]*\/>/g) || [];
    expect(eyebrows.length).toBeGreaterThanOrEqual(4);
  });
});
