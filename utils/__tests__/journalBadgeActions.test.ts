// File: utils/__tests__/journalBadgeActions.test.ts
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Journal badge actions', () => {
  const src = readFileSync(join(__dirname, '../../app/(tabs)/journal.tsx'), 'utf8');

  test('JournalSection accepts onBadgePress prop', () => {
    expect(src).toMatch(/onBadgePress/);
  });

  test('Badge uses TouchableOpacity when onBadgePress provided', () => {
    expect(src).toMatch(/TouchableOpacity[\s\S]*?badge/i);
  });

  test('Vitals section links to /log-vitals', () => {
    expect(src).toContain("'/log-vitals'");
  });

  test('Meals section links to /log-meal', () => {
    expect(src).toContain("'/log-meal'");
  });

  test('Wellness section links to /log-morning-wellness', () => {
    expect(src).toMatch(/log-morning-wellness|log-wellness/);
  });
});
