// File: utils/__tests__/nowScreenImports.validation.test.ts
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Now screen static imports', () => {
  const content = readFileSync(
    join(__dirname, '../../app/(tabs)/now.tsx'), 'utf8');

  test('no dynamic imports in loadData function', () => {
    const match = content.match(
      /const loadData = async[\s\S]*?(?=\/\/ ===|const \w+ = )/);
    if (match) expect(match[0]).not.toContain('await import(');
  });

  test('max 1 dynamic import in entire file', () => {
    const hits = content.match(/await import\(/g) || [];
    expect(hits.length).toBeLessThanOrEqual(1);
  });

  test('safeStorage and storageKeys are statically imported', () => {
    const top = content.slice(0, content.indexOf('export default'));
    expect(top).toMatch(/import.*safeStorage/);
    expect(top).toMatch(/import.*[Ss]torageKeys/);
  });
});
