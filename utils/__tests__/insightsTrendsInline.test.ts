// File: utils/__tests__/insightsTrendsInline.test.ts
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Insights trends link inline', () => {
  const src = readFileSync(join(__dirname, '../../app/(tabs)/understand.tsx'), 'utf8');
  const render = src.slice(src.indexOf('return ('));

  test('no standalone allTrendsLink element', () => {
    expect(render).not.toMatch(/style={styles\.allTrendsLink}/);
  });

  test('vitals section has inline header with trends link', () => {
    expect(src).toMatch(/vitalsSectionHeader|vitalsHeaderRow/);
  });

  test('settings route accessible from understand tab', () => {
    expect(render).toContain("'/settings'");
  });
});
