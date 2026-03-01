// File: utils/__tests__/tabScreenSmoke.test.ts
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const TABS = [
  { name: 'Now', path: 'app/(tabs)/now.tsx' },
  { name: 'Journal', path: 'app/(tabs)/journal.tsx' },
  { name: 'Insights', path: 'app/(tabs)/understand.tsx' },
];

describe('Tab screen smoke tests', () => {
  test.each(TABS)('$name screen exists with default export',
    ({ path }) => {
      const full = join(__dirname, '../..', path);
      expect(existsSync(full)).toBe(true);
      expect(readFileSync(full, 'utf8')).toMatch(/export default/);
  });

  test.each(TABS)('$name screen has SafeAreaView', ({ path }) => {
    expect(readFileSync(
      join(__dirname, '../..', path), 'utf8')).toContain('SafeAreaView');
  });

  test.each(TABS)('$name screen has error handling', ({ path }) => {
    expect(readFileSync(
      join(__dirname, '../..', path), 'utf8')).toMatch(/try\s*\{|logError/);
  });

  test.each(TABS)('$name screen has no self-imports', ({ path }) => {
    const content = readFileSync(join(__dirname, '../..', path), 'utf8');
    const name = path.split('/').pop()?.replace('.tsx', '');
    expect(content).not.toMatch(
      new RegExp(`from.*['"]\\\\.\\\\.*/${name}['"]\\s*;`));
  });
});
