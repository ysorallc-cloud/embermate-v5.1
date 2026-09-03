// ============================================================================
// Phase 22.1 — Journal page restructured as a handoff document.
//
// The Journal page reads as cluttered because it mixes workspace
// patterns with summary content. Its actual role is a handoff
// document (caregiver-to-next-caregiver, or caregiver-to-future-self
// at the next doctor visit). 22.1 restructures section order and
// adds the identity + gestalt elements that make it read as one.
//
// Source-level audit on app/(tabs)/journal.tsx + the affected
// child components. codeOnly() strips comments before regex
// matching so retirement prose doesn't false-positive against the
// absence pins.
//
// Sub-phase scope (other Phase 22 sub-phases handle uniform
// SectionEyebrow application and a narrative builder rewrite):
//   • Identity strip under the title.
//   • GestaltSummary block above the day picker.
//   • Section reorder: identity → gestalt → day picker →
//     narrative → notable → pending → notes → BUILDING TOWARD →
//     disclaimer.
//   • "Example data" sample banner removed from inline scroll.
//   • Inline "Edit / Tap Edit to refine" affordance removed from
//     the narrative block.
//   • Notes section reframed: eyebrow includes caregiver name when
//     available; prompt names the provider when an upcoming
//     appointment exists.
//   • Disclaimer compressed to two lines (logged-stats + "A record
//     of care, not a medical record").
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

function codeOnly(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const ROOT = join(__dirname, '../../..');
const journalRaw = readFileSync(join(ROOT, 'app/(tabs)/journal.tsx'), 'utf8');
const journalCode = codeOnly(journalRaw);

describe('Phase 22.1 — Journal restructured as handoff document', () => {
  describe('identity strip + gestalt summary (NEW surfaces)', () => {
    it('contract 1: imports JournalIdentityStrip and GestaltSummary', () => {
      expect(journalCode).toMatch(/import\s+\{[^}]*\bJournalIdentityStrip\b[^}]*\}\s+from\s+['"][^'"]*JournalIdentityStrip['"]/);
      expect(journalCode).toMatch(/import\s+\{[^}]*\bGestaltSummary\b[^}]*\}\s+from\s+['"][^'"]*GestaltSummary['"]/);
    });

    it('contract 2: renders <JournalIdentityStrip /> below the title', () => {
      expect(journalCode).toMatch(/<JournalIdentityStrip\b/);
    });

    it('contract 3: renders <GestaltSummary /> above the day picker', () => {
      // Both must render in the populated path. Their relative
      // positions are pinned by contract 5 (section order).
      expect(journalCode).toMatch(/<GestaltSummary\b/);
    });
  });

  describe('absence pins — workspace clutter retired', () => {
    it('contract 4a: no inline "Example data — set up your loved one" banner', () => {
      // The sample-mode indicator at journal.tsx:608-623 is retired
      // from the inline scroll. Users with sample data still reach
      // ManageSampleDataSheet from Settings.
      expect(journalCode).not.toMatch(/Example data — set up your loved one/);
      expect(journalCode).not.toMatch(/\bsampleIndicator\s*:/);
    });

    it('contract 4b: no inline "Edit" or "Tap Edit to refine" affordance on the narrative block', () => {
      // The NarrativeSnapshot footnote "Auto-generated from your
      // logs · Tap Edit to refine." and the "Edit →" link are
      // retired. HandoffSheet is still reachable via the sticky
      // "Share handoff →" button at the bottom of the page.
      const narrativeSrc = readFileSync(
        join(ROOT, 'components/journal/NarrativeSnapshot.tsx'), 'utf8',
      );
      const narrativeCode = codeOnly(narrativeSrc);
      expect(narrativeCode).not.toMatch(/Tap Edit to refine/);
      expect(narrativeCode).not.toMatch(/Auto-generated from your logs/);
      expect(narrativeCode).not.toMatch(/['"]Edit →['"]/);
    });
  });

  describe('section reorder', () => {
    it('contract 5 (reframed Phase 27.X): GestaltSummary mounts AFTER DateTabStrip — past mount retired, today path inside SOAP Section 1', () => {
      // Pre-22.1 → 27.X: GestaltSummary lived standalone above
      // DateTabStrip (a Phase 22.1 reframe of the legacy mood line).
      // Phase 27.X retired the standalone mount entirely — today's
      // gestalt lives inside SOAP Section 1 (Subjective), past day's
      // does too (same path). The component is no longer above the
      // date picker.
      //
      // The contract's intent was "gestalt above date strip" as a
      // page-order signal. Post-27.X the page order is:
      //   IdentityStrip → DateTabStrip → SOAP cards (Section 1 owns
      //   gestalt) → BUILDING TOWARD → disclaimer.
      // The reframed pin checks that GestaltSummary now sits AFTER
      // DateTabStrip in source (inside Section 1's body, well below
      // the date picker).
      const gestaltIdx = journalCode.indexOf('<GestaltSummary');
      const dateStripIdx = journalCode.indexOf('<DateTabStrip');
      expect(gestaltIdx).toBeGreaterThan(-1);
      expect(dateStripIdx).toBeGreaterThan(-1);
      expect(gestaltIdx).toBeGreaterThan(dateStripIdx);
    });

    it('contract 6: BUILDING TOWARD feed-forward banner moved AFTER JournalNotesCard', () => {
      // Pre-22.1 the feed-forward (`s.feedBanner` style ref) sat at
      // the top of the scroll. Post-22.1 it sits between
      // JournalNotesCard and the disclaimer.
      const notesIdx = journalCode.indexOf('<JournalNotesCard');
      const feedIdx = journalCode.search(/styles?\.feedBanner|feedBanner\s*:/);
      // feedBanner style may have been renamed or extracted — accept
      // either the style ref OR the visit-prep banner JSX block. Pin
      // the BUILDING TOWARD copy text which only appears in this
      // banner's render. Post possessive-name fix the literal "'s" is
      // gone from source (routed through the possessive() helper), so
      // pin the surrounding text instead.
      const buildingTowardIdx = journalCode.indexOf('visit prep for');
      expect(notesIdx).toBeGreaterThan(-1);
      expect(buildingTowardIdx).toBeGreaterThan(-1);
      expect(buildingTowardIdx).toBeGreaterThan(notesIdx);
    });

    it('contract 7: identity strip renders before GestaltSummary (anchors the day above the gestalt)', () => {
      const stripIdx = journalCode.indexOf('<JournalIdentityStrip');
      const gestaltIdx = journalCode.indexOf('<GestaltSummary');
      expect(stripIdx).toBeGreaterThan(-1);
      expect(gestaltIdx).toBeGreaterThan(-1);
      expect(stripIdx).toBeLessThan(gestaltIdx);
    });
  });

  describe('notes section reframed', () => {
    const notesSrc = readFileSync(
      join(ROOT, 'components/journal/JournalNotesCard.tsx'), 'utf8',
    );
    const notesCode = codeOnly(notesSrc);

    it('contract 8: legacy "TODAY\'S NOTES" eyebrow literal is gone', () => {
      // The eyebrow is reframed to "NOTES FROM {caregiverName}" (or
      // "NOTES" when caregiverName is missing). Either is acceptable;
      // the legacy literal must NOT appear.
      expect(notesCode).not.toMatch(/['"]TODAY['’]S NOTES['"]/);
    });

    it('contract 9 [device-walk fix 2026-06-13]: "Anything to pass along?" is the placeholder copy (Phase 22.1 retire was reversed)', () => {
      // Phase 22.1 retired the short "Anything to pass along?" copy in
      // favor of the verbose "Anything to pass to the next caregiver,
      // or to flag at the next appointment?" prompt. The 2026-06-13
      // device walk reversed that decision: the long prompt read as
      // a verbose form header, and the short F7 handoff voice fits
      // the dusty card chrome better. Pin restored as a presence
      // assertion.
      expect(notesCode).toMatch(/Anything to pass along\?/);
    });

    it('contract 10: caregiverName is threaded to the notes card', () => {
      // Source-level pin: the card accepts a caregiverName prop and
      // journal.tsx passes it in.
      expect(notesCode).toMatch(/caregiverName/);
      expect(journalCode).toMatch(/<JournalNotesCard\b[\s\S]{0,500}?caregiverName=/);
    });

    it('contract 11: provider name (from appointmentLookahead) is threaded to the notes prompt', () => {
      // The prompt names the upcoming provider when one exists. The
      // resolution path is utils/appointmentLookahead — the same
      // source Insights uses for the visit-anchored subtitle.
      expect(journalCode).toMatch(/from\s+['"][^'"]*appointmentLookahead['"]/);
      // Card accepts a providerName / nextProvider prop.
      expect(journalCode).toMatch(/<JournalNotesCard\b[\s\S]{0,800}?(providerName|nextProvider)=/);
    });

    it('contract 12: notes prompt copy uses the new framing (pass to next caregiver / flag for provider)', () => {
      // The card's body copy includes both "next caregiver" and a
      // provider slot. Specific phrasing is pinned at the substring
      // level to avoid lock-in on incidental wording.
      expect(notesCode).toMatch(/pass to the next caregiver/);
      expect(notesCode).toMatch(/flag for/);
    });
  });

  describe('compressed disclaimer footer', () => {
    const discSrc = readFileSync(
      join(ROOT, 'components/journal/JournalDisclaimer.tsx'), 'utf8',
    );
    const discCode = codeOnly(discSrc);

    it('contract 13: legacy long-disclaimer body is gone', () => {
      expect(discCode).not.toMatch(/Journal is your record/);
      expect(discCode).not.toMatch(/Cross-reference with your loved one/);
    });

    it('contract 14: line 2 reads "A record of care, not a medical record"', () => {
      expect(discCode).toMatch(/A record of care, not a medical record/);
    });

    it('contract 15: line 1 carries the logged-stats string when stats are provided', () => {
      // The disclaimer accepts loggedCount / totalCount props (the
      // page-level completion footer collapses into this single
      // disclaimer surface). When stats are present, the first line
      // reads "{n} of {m} logged today".
      expect(discCode).toMatch(/\bloggedCount\b/);
      expect(discCode).toMatch(/\btotalCount\b/);
      expect(discCode).toMatch(/of \$\{totalCount\} logged today/);
    });
  });

  describe('upcoming-appointment single source of truth', () => {
    it('contract 16: BUILDING TOWARD banner sources via appointmentLookahead (same as notes prompt)', () => {
      // Pre-22.1 the feed-forward banner read brief.nextAppointment
      // from careSummaryBuilder. Post-22.1 the page maintains a
      // single upcoming-appointment state sourced via
      // getUpcomingAppointments + withinUpcomingWindow (the same
      // pattern Insights uses in Phase 15.8). Pin the import.
      expect(journalCode).toMatch(/import\s+\{[^}]*\bgetUpcomingAppointments\b[^}]*\}\s+from/);
      expect(journalCode).toMatch(/withinUpcomingWindow/);
    });
  });
});
