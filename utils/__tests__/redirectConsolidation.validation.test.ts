// File: utils/__tests__/redirectConsolidation.validation.test.ts
import { readFileSync } from 'fs';
import { join } from 'path';

const STUBS = ['care-brief','care-summary-export','daily-care-report',
  'medication-report','coming-soon','log-hydration','daily-checkin'];

describe('Redirect consolidation', () => {
  test('lib/redirects.ts exists with all routes', () => {
    const content = readFileSync(
      join(__dirname, '../../lib/redirects.ts'), 'utf8');
    STUBS.forEach(r => expect(content).toContain(r));
  });

  test.each(STUBS)('stub file %s.tsx is deleted', (route) => {
    expect(() => readFileSync(
      join(__dirname, `../../app/${route}.tsx`))).toThrow();
  });

  test('_layout.tsx no longer registers stub screens', () => {
    const layout = readFileSync(
      join(__dirname, '../../app/_layout.tsx'), 'utf8');
    STUBS.forEach(r => expect(layout).not.toContain(`name="${r}"`));
  });
});
