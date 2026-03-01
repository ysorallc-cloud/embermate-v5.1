// File: utils/__tests__/nowDeadImports.test.ts
// PURPOSE: Verify no unused imports in Now screen

import { readFileSync } from 'fs';
import { join } from 'path';

describe('Now screen dead imports', () => {
  const content = readFileSync(
    join(__dirname, '../../app/(tabs)/now.tsx'), 'utf8'
  );

  test('SampleDataBanner is not imported', () => {
    expect(content).not.toMatch(/import.*SampleDataBanner/);
  });

  test('SampleDataBanner is not rendered', () => {
    const render = content.slice(content.indexOf('return ('));
    expect(render).not.toContain('SampleDataBanner');
  });
});
