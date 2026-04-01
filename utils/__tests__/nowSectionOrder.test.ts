// File: utils/__tests__/nowSectionOrder.test.ts
// Updated: QuickPulseStatus replaces ProgressRings
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Now screen section order', () => {
  const src = readFileSync(join(__dirname, '../../app/(tabs)/now.tsx'), 'utf8');
  const render = src.slice(src.indexOf('<View style={styles.content}'));

  test('QuickPulseStatus appears before Today\'s Schedule', () => {
    const pulse = render.indexOf('QuickPulseStatus');
    const timeline = render.indexOf('TimelineSection');
    expect(pulse).toBeGreaterThan(-1);
    expect(timeline).toBeGreaterThan(-1);
    expect(pulse).toBeLessThan(timeline);
  });

  test('ProgressRings no longer renders (replaced by QuickPulseStatus)', () => {
    expect(render).not.toContain('<ProgressRings');
  });

  test('UpNextCard is removed', () => {
    expect(render).not.toContain('UpNextCard');
  });
});
