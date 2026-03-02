// File: utils/__tests__/journalQuickLog.test.ts
// Updated for journal redesign — quick log buttons removed.
// Journal is a record, not an input screen.
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Journal quick log removed', () => {
  const src = readFileSync(join(__dirname, '../../app/(tabs)/journal.tsx'), 'utf8');
  const render = src.slice(src.indexOf('return ('));

  test('quick log row is removed from render', () => {
    expect(render).not.toContain('quickLogRow');
    expect(render).not.toContain('quickLogChip');
  });

  test('share action still exists', () => {
    expect(src).toContain('/care-report');
  });
});
