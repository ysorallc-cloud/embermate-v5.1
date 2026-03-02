// File: utils/__tests__/nowSectionOrder.test.ts
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Now screen section order', () => {
  const src = readFileSync(join(__dirname, '../../app/(tabs)/now.tsx'), 'utf8');
  const render = src.slice(src.indexOf('<View style={styles.content}'));

  test('UpNextCard appears before TimelineSection', () => {
    const upNext = render.indexOf('UpNextCard');
    const timeline = render.indexOf('TimelineSection');
    expect(upNext).toBeGreaterThan(-1);
    expect(timeline).toBeGreaterThan(-1);
    expect(upNext).toBeLessThan(timeline);
  });

  test('TimelineSection appears before ProgressRings', () => {
    const timeline = render.indexOf('TimelineSection');
    const rings = render.indexOf('ProgressRings');
    expect(timeline).toBeLessThan(rings);
  });

  test('ProgressRings appears before footer', () => {
    const rings = render.indexOf('ProgressRings');
    const footer = render.indexOf('footerSection');
    expect(rings).toBeLessThan(footer);
  });
});
