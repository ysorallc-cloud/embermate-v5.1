// File: utils/__tests__/nowSectionOrder.test.ts
// Updated for refined card layout: ProgressRings now in "At a Glance" (before Schedule)
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Now screen section order', () => {
  const src = readFileSync(join(__dirname, '../../app/(tabs)/now.tsx'), 'utf8');
  const render = src.slice(src.indexOf('<View style={styles.content}'));

  test('ProgressRings appears in At a Glance before Today\'s Schedule', () => {
    const rings = render.indexOf('ProgressRings');
    const timeline = render.indexOf('TimelineSection');
    expect(rings).toBeGreaterThan(-1);
    expect(timeline).toBeGreaterThan(-1);
    expect(rings).toBeLessThan(timeline);
  });

  test('UpNextCard is removed (overdue items appear inline in time windows)', () => {
    expect(render).not.toContain('UpNextCard');
  });

  test('ProgressRings appears before footer', () => {
    const rings = render.indexOf('ProgressRings');
    const footer = render.indexOf('footerSection');
    expect(rings).toBeLessThan(footer);
  });
});
