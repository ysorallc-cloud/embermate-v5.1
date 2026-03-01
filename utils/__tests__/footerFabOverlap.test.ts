// File: utils/__tests__/footerFabOverlap.test.ts
// PURPOSE: Verify footer has right padding to clear FAB zone

import { readFileSync } from 'fs';
import { join } from 'path';

describe('Footer / FAB overlap fix', () => {
  const content = readFileSync(
    join(__dirname, '../../app/(tabs)/now.tsx'), 'utf8'
  );

  test('footerSection style has paddingRight >= 72', () => {
    const match = content.match(/footerSection:\s*\{([^}]+)\}/);
    expect(match).toBeTruthy();
    const style = match![1];
    const prMatch = style.match(/paddingRight:\s*(\d+)/);
    expect(prMatch).toBeTruthy();
    expect(parseInt(prMatch![1])).toBeGreaterThanOrEqual(72);
  });
});
