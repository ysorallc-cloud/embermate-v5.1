// File: utils/__tests__/nowFooterTight.test.ts
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Now footer tightness', () => {
  const src = readFileSync(join(__dirname, '../../components/now/NowFooter.tsx'), 'utf8');

  test('journal preview card has no borderTop', () => {
    const m = src.match(/journalPreviewCard:\s*\{([^}]+)\}/);
    expect(m![1]).not.toContain('borderTopWidth');
  });

  test('journal preview card padding <= 16', () => {
    const m = src.match(/journalPreviewCard:\s*\{([^}]+)\}/);
    const pv = m![1].match(/padding:\s*(\d+)/);
    if (pv) expect(parseInt(pv[1])).toBeLessThanOrEqual(16);
  });

  test('journal preview text fontSize <= 13', () => {
    const m = src.match(/journalPreviewText:\s*\{([^}]+)\}/);
    const fs = m![1].match(/fontSize:\s*(\d+)/);
    expect(parseInt(fs![1])).toBeLessThanOrEqual(13);
  });
});
