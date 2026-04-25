// File: utils/__tests__/nowBannerCleanup.test.ts
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Now banner cleanup', () => {
  const nowSrc = readFileSync(join(__dirname, '../../app/(tabs)/now.tsx'), 'utf8');
  const nowRender = nowSrc.slice(nowSrc.indexOf('return ('));
  const timelineSrc = readFileSync(join(__dirname, '../../components/now/NowTimeline.tsx'), 'utf8');

  test('MorningBriefing not rendered', () => {
    expect(nowRender).not.toContain('<MorningBriefing');
  });

  test('DataIntegrityBanner not rendered', () => {
    expect(nowRender).not.toContain('DataIntegrityBanner');
  });

  test('NoMedicationsBanner not rendered', () => {
    expect(nowRender).not.toContain('NoMedicationsBanner');
  });

  test('NoCarePlanBanner not rendered', () => {
    expect(nowRender).not.toContain('NoCarePlanBanner');
  });

  test('empty state messages still render', () => {
    expect(timelineSrc).toContain('emptyTimeline');
  });
});
