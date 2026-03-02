// File: utils/__tests__/journalBadgeActions.test.ts
// Updated for journal redesign — badges and JournalSection removed,
// replaced by data rows with status dots.
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Journal data row actions', () => {
  const src = readFileSync(join(__dirname, '../../app/(tabs)/journal.tsx'), 'utf8');

  test('data rows use colored status dots', () => {
    expect(src).toContain('dataRowDot');
    expect(src).toContain('dotGreen');
    expect(src).toContain('dotAmber');
    expect(src).toContain('dotRed');
  });

  test('Share button links to /care-report', () => {
    expect(src).toContain('/care-report');
  });
});
