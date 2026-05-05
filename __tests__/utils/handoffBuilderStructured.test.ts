import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const builderSrc = readFileSync(join(ROOT, 'utils/handoffReportBuilder.ts'), 'utf8');

describe('Structured handoff — section labels', () => {
  it('uses STILL TO DO instead of or in addition to pending section', () => {
    expect(builderSrc).toMatch(/STILL TO DO/);
  });

  it('uses HEADS UP instead of WORTH KNOWING', () => {
    expect(builderSrc).toMatch(/HEADS UP/);
    expect(builderSrc).not.toMatch(/WORTH KNOWING/);
  });

  it('uses DONE as a one-line summary, not DONE TODAY', () => {
    expect(builderSrc).toMatch(/'DONE'/);
    expect(builderSrc).not.toMatch(/DONE TODAY/);
  });

  it('does not include formatEventLine or per-event timeline rendering', () => {
    // The per-event chronological timeline (8:15 AM — Lisinopril 20mg)
    // is removed from the handoff builder. Visit prep owns that detail.
    expect(builderSrc).not.toMatch(/formatEventLine/);
    expect(builderSrc).not.toMatch(/formatEventTime/);
  });
});

describe('Structured handoff — includeNotes option', () => {
  it('BuildHandoffOptions has an includeNotes field', () => {
    expect(builderSrc).toMatch(/includeNotes\??\s*:\s*boolean/);
  });

  it('NOTES section is gated by includeNotes', () => {
    expect(builderSrc).toMatch(/includeNotes/);
  });
});

describe('Structured handoff — DONE is a summary line', () => {
  it('DONE section uses a count-based summary, not event lines', () => {
    // The DONE section should reference counts/totals, not individual events.
    // Look for patterns like "X of Y meds" or outcome counting logic.
    const doneSection = builderSrc.match(/['"]DONE['"][\s\S]{0,500}/);
    expect(doneSection).toBeTruthy();
    // Must NOT loop over sorted events to build DONE lines.
    expect(builderSrc).not.toMatch(/eventLines\.length > 0[\s\S]{0,100}DONE/);
  });
});
