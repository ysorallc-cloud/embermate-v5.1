import { readFileSync } from 'fs';
import { join } from 'path';

const src = readFileSync(
  join(__dirname, '../../app/(tabs)/journal.tsx'),
  'utf8',
);

function extractStyleBlock(name: string): string {
  const re = new RegExp(`${name}:\\s*\\{`, 'g');
  const match = re.exec(src);
  if (!match) throw new Error(`Style block "${name}" not found`);
  const start = match.index + match[0].length;
  let depth = 1;
  let i = start;
  for (; i < src.length && depth > 0; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') depth--;
  }
  return src.slice(start, i - 1);
}

describe('Journal header spacing', () => {
  it('scrollContent has paddingTop >= 24', () => {
    const block = extractStyleBlock('scrollContent');
    const match = block.match(/paddingTop:\s*(\d+)/);
    expect(match).toBeTruthy();
    expect(Number(match![1])).toBeGreaterThanOrEqual(24);
  });

  it('headerRow has paddingTop >= 32', () => {
    // Phase 5.13.4 — dropped 56 → 32. The contract is now a floor at 32
    // (matches the four-tab unified value pinned in
    // headerStructureContract.test.ts).
    const block = extractStyleBlock('headerRow');
    const match = block.match(/paddingTop:\s*(\d+)/);
    expect(match).toBeTruthy();
    expect(Number(match![1])).toBeGreaterThanOrEqual(32);
  });
});
