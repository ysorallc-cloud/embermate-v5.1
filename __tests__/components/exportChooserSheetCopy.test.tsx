// ============================================================================
// Phase 5.10.c — Chooser audience-explicit subtitles.
//
// Today's handoff card subtitle reads "For someone who knows {Patient}."
// (patient name interpolated). Visit prep card subtitle reads "For the
// doctor's office." (no interpolation). Replaces the previous Visit prep
// description that leaked menu options ("7/14/30 days of trends.").
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const sheetSrc = readFileSync(
  join(ROOT, 'components/journal/ExportChooserSheet.tsx'),
  'utf8',
);

describe('Phase 5.10.c — chooser source contract', () => {
  it("Today's handoff card carries an audience subtitle that interpolates the patient name", () => {
    // Accept any interpolation token name — patientName, name, audienceName.
    expect(sheetSrc).toMatch(
      /For someone who knows\s*\$\{[^}]+\}/,
    );
  });

  it('Visit prep card carries the fixed "For the doctor\'s office." subtitle', () => {
    expect(sheetSrc).toContain("For the doctor's office.");
  });

  it("the chooser no longer surfaces '7/14/30' in any visible string", () => {
    // Strip whole-line comments before searching to avoid matching
    // narrative/spec references in code comments.
    const stripped = sheetSrc
      .split('\n')
      .map((line) => line.replace(/^\s*\/\/.*$/, ''))
      .join('\n');
    expect(stripped).not.toMatch(/7\/14\/30/);
  });

  it('the patient name flows in via a new prop on ExportChooserSheetProps', () => {
    // Optional or required string both acceptable.
    expect(sheetSrc).toMatch(/patientName\??:\s*string/);
  });
});

describe('Phase 5.10.c — interpolation invariants', () => {
  // Source-level checks for the interpolation shape — render tests for
  // chooser tap routing already live in exportChooserSheet.test.tsx.
  it('the audience subtitle interpolates the resolved name (not a hardcoded literal)', () => {
    // The literal must not appear without an interpolation token nearby.
    expect(sheetSrc).toMatch(/For someone who knows \$\{audienceName\}\./);
    // And there must be a fallback path when patientName is missing.
    expect(sheetSrc).toMatch(/your loved one/);
  });

  it("the Visit prep subtitle is plain (no interpolation)", () => {
    expect(sheetSrc).toMatch(/"For the doctor's office\."/);
  });
});

describe('Phase 5.10.c — journal.tsx threads patient name into the chooser', () => {
  const journalSrc = readFileSync(join(ROOT, 'app/(tabs)/journal.tsx'), 'utf8');

  it('the chooser is mounted with patientName prop', () => {
    expect(journalSrc).toMatch(/<ExportChooserSheet[\s\S]{0,400}?patientName=/);
  });
});
