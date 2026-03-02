// File: utils/__tests__/journalSafeArea.test.ts
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Journal safe area', () => {
  const src = readFileSync(join(__dirname, '../../app/(tabs)/journal.tsx'), 'utf8');

  test('uses useSafeAreaInsets', () => {
    expect(src).toMatch(/useSafeAreaInsets/);
  });

  test('no hardcoded paddingBottom in scrollContent style', () => {
    const m = src.match(/scrollContent:\s*\{([^}]+)\}/);
    if (m) expect(m[1]).not.toMatch(/paddingBottom:\s*\d+/);
  });
});
