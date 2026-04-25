// File: utils/__tests__/progressRingsSpacing.test.ts
// PURPOSE: Verify ProgressRings uses compact flat row layout (no excessive spacing)

import { readFileSync } from 'fs';
import { join } from 'path';

describe('ProgressRings spacing fix', () => {
  const content = readFileSync(
    join(__dirname, '../../components/now/ProgressRings.tsx'), 'utf8'
  );

  test('row style has no marginTop', () => {
    const rowMatch = content.match(/row:\s*\{([^}]+)\}/);
    expect(rowMatch).toBeTruthy();
    const rowStyle = rowMatch![1];
    expect(rowStyle).not.toMatch(/marginTop/);
  });

  test('row style uses flexDirection row for inline layout', () => {
    const rowMatch = content.match(/row:\s*\{([^}]+)\}/);
    expect(rowMatch).toBeTruthy();
    const rowStyle = rowMatch![1];
    expect(rowStyle).toContain("flexDirection: 'row'");
  });

  test('row paddingVertical is reasonable (max 16)', () => {
    const rowMatch = content.match(/row:\s*\{([^}]+)\}/);
    expect(rowMatch).toBeTruthy();
    const rowStyle = rowMatch![1];
    const pvMatch = rowStyle.match(/paddingVertical:\s*(\d+)/);
    if (pvMatch) {
      expect(parseInt(pvMatch[1])).toBeLessThanOrEqual(16);
    }
  });
});
