// File: utils/__tests__/nowCleanupSecondary.test.ts
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Now secondary cleanup', () => {
  const src = readFileSync(join(__dirname, '../../app/(tabs)/now.tsx'), 'utf8');
  const render = src.slice(src.indexOf('return ('));

  test('no Check In SectionHeader', () => {
    expect(render).not.toMatch(/title=.Check In/);
  });

  test('VitalsGuidance not rendered on Now', () => {
    expect(render).not.toContain('<VitalsGuidance');
  });

  test('UpNextCard still renders', () => {
    expect(render).toContain('UpNextCard');
  });

  test('appointmentPrepCard still renders', () => {
    expect(render).toContain('appointmentPrepCard');
  });
});
