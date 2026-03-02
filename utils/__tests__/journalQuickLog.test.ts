// File: utils/__tests__/journalQuickLog.test.ts
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Journal quick log row', () => {
  const src = readFileSync(join(__dirname, '../../app/(tabs)/journal.tsx'), 'utf8');
  const render = src.slice(src.indexOf('return ('));

  test('quick log row exists in render', () => {
    expect(render).toMatch(/quickLog/i);
  });

  test('appears before timestamp in render', () => {
    const ql = render.indexOf('quickLogRow');
    const ts = render.indexOf('s.timestamp');
    expect(ql).toBeGreaterThan(-1);
    expect(ts).toBeGreaterThan(-1);
    expect(ql).toBeLessThan(ts);
  });

  test('contains navigation targets', () => {
    expect(src).toContain("'/log-vitals'");
    expect(src).toContain("'/log-meal'");
  });
});
