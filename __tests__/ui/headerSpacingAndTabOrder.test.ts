import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

describe('Header top spacing', () => {
  // Phase 5.13.4 — dropped 56 → 32 to recover ~24pt of vertical real
  // estate above the H1. Unified across all four tabs — see
  // __tests__/screens/headerStructureContract.test.ts.
  it('ScreenHeader container has paddingTop: 32', () => {
    const src = read('components/ScreenHeader.tsx');
    const containerMatch = src.match(/container:\s*\{[^}]*\}/s);
    expect(containerMatch).toBeTruthy();
    expect(containerMatch![0]).toMatch(/paddingTop:\s*32/);
  });

  it('Support headerWrap has paddingTop: 32', () => {
    const src = read('app/(tabs)/support.tsx');
    const headerWrapMatch = src.match(/headerWrap:\s*\{[^}]*\}/s);
    expect(headerWrapMatch).toBeTruthy();
    expect(headerWrapMatch![0]).toMatch(/paddingTop:\s*32/);
  });

  it('Journal headerRow has paddingTop: 32', () => {
    const src = read('app/(tabs)/journal.tsx');
    const headerRowMatch = src.match(/headerRow:\s*\{[^}]*\}/s);
    expect(headerRowMatch).toBeTruthy();
    expect(headerRowMatch![0]).toMatch(/paddingTop:\s*32/);
  });
});

describe('Tab order', () => {
  it('tabs are ordered: now → journal → understand → support', () => {
    const src = read('app/(tabs)/_layout.tsx');
    const names = [...src.matchAll(/<Tabs\.Screen\s+name="(\w+)"/g)].map(m => m[1]);
    expect(names).toEqual(['now', 'journal', 'understand', 'support']);
  });
});
