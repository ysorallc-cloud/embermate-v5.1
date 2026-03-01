// File: utils/__tests__/nowScreenSections.validation.test.ts
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Now screen simplification', () => {
  const now = readFileSync(
    join(__dirname, '../../app/(tabs)/now.tsx'), 'utf8');
  const render = now.slice(now.indexOf('return ('));

  test('SectionHeader count is max 3', () => {
    const h = (render.match(/<SectionHeader/g) || []);
    expect(h.length).toBeLessThanOrEqual(3);
  });

  test('SampleDataBanner removed from Now screen', () => {
    expect(render).not.toContain('SampleDataBanner');
  });

  test('GettingStartedChecklist removed from Now screen', () => {
    expect(render).not.toContain('GettingStartedChecklist');
  });

  test('baselineStatusContainer removed', () => {
    expect(render).not.toContain('baselineStatusContainer');
  });
});
