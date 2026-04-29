// ============================================================================
// Patient name resolution — consistency across surfaces (Phase 11).
//
// The "Daily Summary screenshot shows 'Patient: Patient'" regression was a
// downstream symptom of one surface taking the raw activePatient.name without
// the standard placeholder filter. After the redesign, the HandoffSheet has
// replaced the old Daily Summary preview, so all three places that show the
// patient name (Now, Journal, Understand, HandoffSheet) must use the same
// resolution: filter the legacy "Patient" sentinel + fall back to a single
// shared display string.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

describe('Tab consumers filter the legacy "Patient" sentinel', () => {
  it.each([
    'app/(tabs)/now.tsx',
    'app/(tabs)/understand.tsx',
    'app/(tabs)/journal.tsx',
  ])('%s — filters the legacy "Patient" sentinel via comparison or PLACEHOLDERS set', (path) => {
    const src = read(path);
    // Either the inline `!== 'Patient'` comparison (now / understand) or
    // the broader PLACEHOLDERS Set filter (journal). Both are accepted.
    const hasFilter =
      /!==\s*['"]Patient['"]/.test(src) ||
      /PLACEHOLDERS[\s\S]{0,200}?['"]Patient['"]/.test(src);
    expect(hasFilter).toBe(true);
  });

  it.each([
    'app/(tabs)/now.tsx',
    'app/(tabs)/understand.tsx',
    'app/(tabs)/journal.tsx',
  ])('%s — falls back to "your loved one"', (path) => {
    expect(read(path)).toContain("'your loved one'");
  });
});

describe('HandoffSheet shares the same resolution as the tab consumers', () => {
  const sheetSrc = read('components/journal/HandoffSheet.tsx');

  it('does not render the literal "Patient" string anywhere', () => {
    // The old Daily Summary preview rendered "Patient: Patient" when the
    // raw activePatient.name leaked through. The new sheet must not.
    expect(sheetSrc).not.toMatch(/'Patient'/);
    expect(sheetSrc).not.toMatch(/"Patient"/);
  });

  it('falls back to a non-empty display string when name is empty', () => {
    expect(sheetSrc).toMatch(/Your loved one/);
  });
});

describe('No standalone Daily Summary route is referenced after the redesign', () => {
  // The old preview screen was the surface that leaked "Patient: Patient".
  // After the redesign, no callsite should reach for it.
  const journalSrc = read('app/(tabs)/journal.tsx');

  it('Journal does not import ReportPreviewModal', () => {
    expect(journalSrc).not.toMatch(/from\s+['"][^'"]*ReportPreviewModal['"]/);
  });

  it('Journal does not import buildDailySummaryReport / buildClinicalReportData', () => {
    expect(journalSrc).not.toMatch(/buildDailySummaryReport|buildClinicalReportData/);
  });
});
