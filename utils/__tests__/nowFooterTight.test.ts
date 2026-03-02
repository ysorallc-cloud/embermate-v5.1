// File: utils/__tests__/nowFooterTight.test.ts
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Now footer tightness', () => {
  const src = readFileSync(join(__dirname, '../../app/(tabs)/now.tsx'), 'utf8');

  test('footerSection has no borderTop', () => {
    const m = src.match(/footerSection:\s*\{([^}]+)\}/);
    expect(m![1]).not.toContain('borderTopWidth');
  });

  test('footerSection paddingVertical <= 14', () => {
    const m = src.match(/footerSection:\s*\{([^}]+)\}/);
    const pv = m![1].match(/paddingVertical:\s*(\d+)/);
    if (pv) expect(parseInt(pv[1])).toBeLessThanOrEqual(14);
  });

  test('footerMessage fontSize <= 13', () => {
    const m = src.match(/footerMessage:\s*\{([^}]+)\}/);
    const fs = m![1].match(/fontSize:\s*(\d+)/);
    expect(parseInt(fs![1])).toBeLessThanOrEqual(13);
  });
});
