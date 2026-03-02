// File: utils/__tests__/nowBannerCleanup.test.ts
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Now banner cleanup', () => {
  const src = readFileSync(join(__dirname, '../../app/(tabs)/now.tsx'), 'utf8');
  const render = src.slice(src.indexOf('return ('));

  test('MorningBriefing not rendered', () => {
    expect(render).not.toContain('<MorningBriefing');
  });

  test('DataIntegrityBanner not rendered', () => {
    expect(render).not.toContain('DataIntegrityBanner');
  });

  test('NoMedicationsBanner not rendered', () => {
    expect(render).not.toContain('NoMedicationsBanner');
  });

  test('NoCarePlanBanner not rendered', () => {
    expect(render).not.toContain('NoCarePlanBanner');
  });

  test('empty state messages still render', () => {
    expect(render).toContain('emptyTimeline');
  });
});
