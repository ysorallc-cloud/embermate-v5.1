// File: utils/__tests__/progressRingsSpacing.test.ts
// PURPOSE: Verify no excessive spacing in ProgressRings wrapper

import { readFileSync } from 'fs';
import { join } from 'path';

describe('ProgressRings spacing fix', () => {
  const content = readFileSync(
    join(__dirname, '../../components/now/ProgressRings.tsx'), 'utf8'
  );

  test('section style has no marginTop', () => {
    // Extract the section style block
    const sectionMatch = content.match(/section:\s*\{([^}]+)\}/);
    expect(sectionMatch).toBeTruthy();
    const sectionStyle = sectionMatch![1];
    expect(sectionStyle).not.toMatch(/marginTop/);
  });

  test('section style has no paddingTop', () => {
    const sectionMatch = content.match(/section:\s*\{([^}]+)\}/);
    const sectionStyle = sectionMatch![1];
    expect(sectionStyle).not.toMatch(/paddingTop/);
  });

  test('section marginBottom is reasonable (max 8)', () => {
    const sectionMatch = content.match(/section:\s*\{([^}]+)\}/);
    const sectionStyle = sectionMatch![1];
    const mbMatch = sectionStyle.match(/marginBottom:\s*(\d+)/);
    if (mbMatch) {
      expect(parseInt(mbMatch[1])).toBeLessThanOrEqual(8);
    }
  });
});
