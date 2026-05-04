// ============================================================================
// Phase 5.7.b — header Share pill → ExportChooserSheet → routes.
//
// Source-pattern integration test: locks the wiring without booting the
// full Journal tree. The bottom HandoffCard's Share button opens the
// HandoffSheet (sheet, no navigation push). The header Share pill opens
// the ExportChooserSheet, which routes the user to either HandoffSheet
// or /visit-prep based on the option they tap.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const journalSrc = readFileSync(join(ROOT, 'app/(tabs)/journal.tsx'), 'utf8');

describe('Bottom HandoffCard fast-path → opens HandoffSheet (sheet, no navigation push)', () => {
  it('handleShareDaily sets handoffSheetVisible to true', () => {
    expect(journalSrc).toMatch(/function\s+handleShareDaily[\s\S]{0,400}?setHandoffSheetVisible\(\s*true\s*\)/);
  });

  it('handleShareDaily does NOT navigate to a route', () => {
    // Slice the source between handleShareDaily and the next function declaration
    // so we only inspect that one body — the file's other handlers may navigate.
    const start = journalSrc.indexOf('function handleShareDaily');
    const end = journalSrc.indexOf('function handleShareClinical');
    const body = journalSrc.slice(start, end);
    expect(body).not.toMatch(/navigate\s*\(/);
  });

  it('handleShareDaily does NOT open the deprecated Daily Summary preview modal', () => {
    expect(journalSrc).not.toMatch(/setShowDailyPreview\s*\(\s*true\s*\)/);
  });
});

describe('Header Share pill → opens ExportChooserSheet (no direct navigation)', () => {
  it('handleShareClinical opens the chooser via setExportChooserVisible(true)', () => {
    expect(journalSrc).toMatch(
      /function\s+handleShareClinical[\s\S]{0,400}?setExportChooserVisible\(\s*true\s*\)/,
    );
  });

  it('handleShareClinical body does NOT call navigate() directly anymore', () => {
    const start = journalSrc.indexOf('function handleShareClinical');
    const tail = journalSrc.slice(start);
    const body = tail.slice(0, tail.indexOf('\n  }') + 4);
    expect(body).not.toMatch(/navigate\s*\(/);
  });

  it('handleShareClinical does NOT open the deprecated Clinical Report preview modal', () => {
    expect(journalSrc).not.toMatch(/setShowClinicalPreview\s*\(\s*true\s*\)/);
  });
});

describe('ExportChooserSheet wiring forwards to existing surfaces', () => {
  it('onChooseHandoff opens the existing HandoffSheet (not a new screen)', () => {
    expect(journalSrc).toMatch(
      /onChooseHandoff=\{[\s\S]{0,200}?setHandoffSheetVisible\(\s*true\s*\)/,
    );
  });

  it('onChooseVisitPrep navigates to /visit-prep', () => {
    expect(journalSrc).toMatch(
      /onChooseVisitPrep=\{[\s\S]{0,200}?navigate\s*\(\s*['"]\/visit-prep['"]\s*\)/,
    );
  });
});

describe('Different content: HandoffSheet today-only vs Visit Prep multi-day', () => {
  it('HandoffSheet receives a date prop pinned to today (not a multi-day range)', () => {
    // Phase 5.8.e dropped the prop-driven outcomes/notes/events triple —
    // HandoffSheet now fetches its own data via the canonical builder.
    // The remaining today-only signal is the date prop.
    expect(journalSrc).toMatch(/<HandoffSheet[\s\S]{0,400}?date=\{new Date\(\)\}/);
  });

  it('HandoffSheet is keyed to selectedDate for tone/canonical fetch', () => {
    expect(journalSrc).toMatch(/<HandoffSheet[\s\S]{0,400}?dateKey=\{selectedDate\}/);
  });
});
