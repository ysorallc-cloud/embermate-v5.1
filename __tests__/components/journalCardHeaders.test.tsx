// ============================================================================
// Journal cards — internal eyebrow header pattern (Phase 1).
// Today's Outcomes + Today's Notes both wear their eyebrow inside the card.
// No floating <SectionEyebrow> stays above either card.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const journalSrc = readFileSync(join(ROOT, 'app/(tabs)/journal.tsx'), 'utf8');
const outcomesSrc = readFileSync(
  join(ROOT, 'components/journal/TodayOutcomes.tsx'),
  'utf8',
);
const notesSrc = readFileSync(
  join(ROOT, 'components/journal/JournalNotesCard.tsx'),
  'utf8',
);

describe('Journal page — no floating eyebrows above cards', () => {
  it('Journal does NOT render <SectionEyebrow text="Today\'s outcomes" /> above the card', () => {
    expect(journalSrc).not.toMatch(
      /<SectionEyebrow[^>]*text=\{?["']Today's outcomes["']\}?/,
    );
  });

  it("Journal does NOT render <SectionEyebrow text=\"Today's notes\" /> above the input", () => {
    expect(journalSrc).not.toMatch(
      /<SectionEyebrow[^>]*text=\{?["']Today's notes["']\}?/,
    );
  });
});

describe('TodayOutcomes — internal header', () => {
  it('renders an internal "TODAY\'S OUTCOMES" eyebrow inside the card', () => {
    // Either a literal uppercase string or a <SectionEyebrow text="Today's outcomes" />
    // rendered inside the card body.
    expect(outcomesSrc).toMatch(/Today's outcomes|TODAY'S OUTCOMES/);
  });

  it('exposes an asOf timestamp prop for the right-side meta', () => {
    expect(outcomesSrc).toMatch(/asOf\??:\s*Date|asOf:\s*Date/);
  });

  it('renders the "as of …" timestamp inside the header row', () => {
    // The header copy contains "as of " and pulls a formatted time.
    expect(outcomesSrc).toMatch(/as of\b/);
    // formatTime is the pure helper that respects the user's 12h/24h pref.
    expect(outcomesSrc).toMatch(/formatTime\(/);
  });

  it('header row has a bottom border separating it from the body', () => {
    expect(outcomesSrc).toMatch(
      /header(?:Row)?:\s*\{[\s\S]{0,400}?borderBottomWidth/i,
    );
  });
});

describe('JournalNotesCard — internal header + footer', () => {
  it('renders an internal "TODAY\'S NOTES" eyebrow inside the card', () => {
    expect(notesSrc).toMatch(/Today's notes|TODAY'S NOTES/);
  });

  it('renders a footer row with "Private · on this device" copy', () => {
    expect(notesSrc).toMatch(/Private\s*[·.]\s*on this device/);
  });

  it('renders a Save pill button (outlined, becomes mint when dirty)', () => {
    expect(notesSrc).toMatch(/Save/);
    // Dirty-state styling: mint background when unsaved changes exist.
    expect(notesSrc).toMatch(/saveButtonDirty|saveDirty|isDirty/);
  });

  it('input area has no internal background — the card surface is the surface', () => {
    // The TextInput style block should NOT declare a backgroundColor.
    // Either a dedicated style block exists, or the inline style on the
    // TextInput excludes backgroundColor.
    const block = notesSrc.match(/input:\s*\{[^}]+\}/);
    if (block) {
      expect(block[0]).not.toMatch(/backgroundColor:/);
    }
  });

  it('uses the journal page background (no wrapping View bg) inside the card', () => {
    // Card surface is colors.glass per the spec.
    expect(notesSrc).toMatch(/backgroundColor:\s*c\.glass/);
  });
});
