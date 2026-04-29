// ============================================================================
// Visit Prep PDF — clinical precision regression guard.
//
// The Visit Prep PDF is the *doctor*-facing artifact. The rest of the app
// switched to caregiver-warm vocabulary in the v6.7 tone pass — but the
// PDF audience is a clinician who needs precise medical language.
//
// This test fails if the PDF accidentally gets over-softened: it must
// continue to use "missed", "adherence", and the column / table headers
// that signal a clinical document.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const src = readFileSync(join(ROOT, 'services/visitPrepPdf.ts'), 'utf8');

describe('Visit Prep PDF — clinical vocabulary preserved', () => {
  it('still uses "Missed" as a column header in the medication adherence table', () => {
    expect(src).toMatch(/<th>\s*Missed\s*<\/th>/);
  });

  it('still uses "Medication Adherence" as the section header', () => {
    expect(src).toContain('Medication Adherence');
  });

  it('still uses the word "missed" inside data field names (missedDays)', () => {
    expect(src).toMatch(/missedDays\b/);
  });

  it('still classifies "skipped" status separately from "missed"', () => {
    // The PDF differentiates intentional skips from missed doses — both
    // are clinically distinct events, both retained as documentation.
    expect(src).toContain("'skipped'");
    expect(src).toContain("'missed'");
  });
});

describe('Visit Prep PDF — does NOT borrow caregiver-warm copy', () => {
  it('does not use "not logged" as a substitute for "missed" in HTML', () => {
    // The caregiver vocabulary belongs on Now / Journal / HandoffSheet.
    // It would read as evasive in a clinical PDF — the doctor needs to
    // know the dose was missed, not "unlogged".
    expect(src).not.toMatch(/<th>\s*Not logged\s*<\/th>/i);
    expect(src).not.toMatch(/<th>\s*Still to do\s*<\/th>/i);
  });
});
