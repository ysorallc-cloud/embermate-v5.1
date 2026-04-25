// File: utils/__tests__/nowSectionOrder.test.ts
// Updated: StatRings replaces QuickPulseStatus
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Now screen section order', () => {
  const src = readFileSync(join(__dirname, '../../app/(tabs)/now.tsx'), 'utf8');
  const render = src.slice(src.indexOf('return ('));

  test('StatRings appears before NowTimeline', () => {
    const rings = render.indexOf('StatRings');
    const timeline = render.indexOf('NowTimeline');
    expect(rings).toBeGreaterThan(-1);
    expect(timeline).toBeGreaterThan(-1);
    expect(rings).toBeLessThan(timeline);
  });

  test('QuickPulseStatus no longer renders (replaced by StatRings)', () => {
    expect(render).not.toContain('<QuickPulseStatus');
  });

  test('UpNextCard is not rendered in JSX', () => {
    // The string may appear in a comment — only check for JSX usage
    expect(render).not.toContain('<UpNextCard');
  });
});
