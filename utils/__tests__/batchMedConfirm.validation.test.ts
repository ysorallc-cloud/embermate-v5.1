// File: utils/__tests__/batchMedConfirm.validation.test.ts
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Batch med confirm elevation', () => {
  // After Phase 10.3 decomposition, MorningMedsBanner + TimelineSection
  // live in NowTimeline.tsx rather than now.tsx.
  const timeline = readFileSync(
    join(__dirname, '../../components/now/NowTimeline.tsx'), 'utf8');

  test('MorningMedsBanner renders before TimelineSection', () => {
    const bannerPos = timeline.indexOf('MorningMedsBanner');
    const timelinePos = timeline.indexOf('TimelineSection');
    expect(bannerPos).toBeGreaterThan(-1);
    expect(bannerPos).toBeLessThan(timelinePos);
  });

  test('MorningMedsBanner component exists', () => {
    expect(() => readFileSync(
      join(__dirname, '../../components/now/MorningMedsBanner.tsx')
    )).not.toThrow();
  });

  test('banner has batch confirm handler', () => {
    const b = readFileSync(
      join(__dirname, '../../components/now/MorningMedsBanner.tsx'), 'utf8');
    expect(b).toMatch(/onConfirmAll|handleBatchMed|batchConfirm/i);
  });
});
