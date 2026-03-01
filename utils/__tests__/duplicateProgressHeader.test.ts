// File: utils/__tests__/duplicateProgressHeader.test.ts
// PURPOSE: Verify only one "Today's Progress" header exists

import { readFileSync } from 'fs';
import { join } from 'path';

describe('Duplicate progress header fix', () => {
  test('ProgressRings does NOT render its own section header', () => {
    const content = readFileSync(
      join(__dirname, '../../components/now/ProgressRings.tsx'), 'utf8'
    );
    // Should NOT contain the internal header text
    expect(content).not.toContain("TODAY'S PROGRESS");
    // Should NOT contain the internal manageLink/Care Plan text
    expect(content).not.toMatch(/Manage Care Plan/);
  });

  test('Now screen still has exactly one SectionHeader for progress', () => {
    const content = readFileSync(
      join(__dirname, '../../app/(tabs)/now.tsx'), 'utf8'
    );
    // The SectionHeader wrapper in now.tsx should remain
    const matches = content.match(/SectionHeader[\s\S]*?Today's Progress/g) || [];
    expect(matches.length).toBe(1);
  });

  test('ProgressRings still renders the tile strip', () => {
    const content = readFileSync(
      join(__dirname, '../../components/now/ProgressRings.tsx'), 'utf8'
    );
    expect(content).toContain('styles.strip');
    expect(content).toContain('renderCell');
  });
});
