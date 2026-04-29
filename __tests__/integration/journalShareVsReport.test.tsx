// ============================================================================
// Phase 9 — Share vs Report differentiation.
//
// Source-pattern integration test: locks the wiring without booting the
// full Journal tree. The Share button opens the HandoffSheet (sheet, no
// navigation push). The Report button navigates to /visit-prep.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const journalSrc = readFileSync(join(ROOT, 'app/(tabs)/journal.tsx'), 'utf8');

describe('Share button → opens HandoffSheet (sheet, no navigation push)', () => {
  it('Share handler sets handoffSheetVisible to true', () => {
    expect(journalSrc).toMatch(/function\s+handleShareDaily[\s\S]{0,400}?setHandoffSheetVisible\(\s*true\s*\)/);
  });

  it('Share handler does NOT navigate to a route', () => {
    // Slice the source between handleShareDaily and the next function declaration
    // so we only inspect that one body — the file's other handlers may navigate.
    const start = journalSrc.indexOf('function handleShareDaily');
    const end = journalSrc.indexOf('function handleShareClinical');
    const body = journalSrc.slice(start, end);
    expect(body).not.toMatch(/navigate\s*\(/);
  });

  it('Share handler does NOT open the deprecated Daily Summary preview modal', () => {
    expect(journalSrc).not.toMatch(/setShowDailyPreview\s*\(\s*true\s*\)/);
  });
});

describe('Report button → navigates to /visit-prep (no Daily Summary modal)', () => {
  it('Report handler calls navigate("/visit-prep")', () => {
    expect(journalSrc).toMatch(/function\s+handleShareClinical[\s\S]{0,400}?navigate\s*\(\s*['"]\/visit-prep['"]\s*\)/);
  });

  it('Report handler does NOT open the deprecated Clinical Report preview modal', () => {
    expect(journalSrc).not.toMatch(/setShowClinicalPreview\s*\(\s*true\s*\)/);
  });
});

describe('Different content: HandoffSheet today-only vs Visit Prep multi-day', () => {
  it('HandoffSheet receives today\'s outcomes only', () => {
    expect(journalSrc).toMatch(/<HandoffSheet[\s\S]{0,400}?outcomes=\{outcomes\}/);
  });

  it('HandoffSheet receives the ISO/Date for "today" (not a multi-day range)', () => {
    expect(journalSrc).toMatch(/<HandoffSheet[\s\S]{0,400}?date=\{new Date\(\)\}/);
  });
});
