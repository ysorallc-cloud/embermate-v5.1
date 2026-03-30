/**
 * Tests for Care Plan ↔ Now page sync fixes (S1-S8) and refined card layout.
 * Source-level verification of event emission, bucket alignment, language changes,
 * ScreenHeader updates, and card structure.
 */
import * as fs from 'fs';
import * as path from 'path';

// Source files
const carePlanConfigSrc = fs.readFileSync(
  path.resolve(__dirname, '../../hooks/useCarePlanConfig.ts'), 'utf-8'
);
const dailyInstancesSrc = fs.readFileSync(
  path.resolve(__dirname, '../../hooks/useDailyCareInstances.ts'), 'utf-8'
);
const progressRingsSrc = fs.readFileSync(
  path.resolve(__dirname, '../../components/now/ProgressRings.tsx'), 'utf-8'
);
const upNextCardSrc = fs.readFileSync(
  path.resolve(__dirname, '../../components/now/UpNextCard.tsx'), 'utf-8'
);
const timelineSectionSrc = fs.readFileSync(
  path.resolve(__dirname, '../../components/now/TimelineSection.tsx'), 'utf-8'
);
const screenHeaderSrc = fs.readFileSync(
  path.resolve(__dirname, '../../components/ScreenHeader.tsx'), 'utf-8'
);
const nowSrc = fs.readFileSync(
  path.resolve(__dirname, '../../app/(tabs)/now.tsx'), 'utf-8'
);

// ============================================================================
// S1: Care Plan config changes emit events
// ============================================================================
describe('S1: useCarePlanConfig emits events', () => {
  test('imports emitDataUpdate and EVENT', () => {
    expect(carePlanConfigSrc).toContain("import { useDataListener, emitDataUpdate } from '../lib/events'");
    expect(carePlanConfigSrc).toContain("import { EVENT } from '../lib/eventNames'");
  });

  test('toggleBucket emits EVENT.CARE_PLAN_CONFIG', () => {
    // Find the toggleBucket function and verify it contains emitDataUpdate
    const toggleMatch = carePlanConfigSrc.match(
      /toggleBucket[\s\S]*?(?=const updateBucket|const getBucketStatus)/
    );
    expect(toggleMatch).not.toBeNull();
    expect(toggleMatch![0]).toContain('emitDataUpdate(EVENT.CARE_PLAN_CONFIG)');
  });

  test('updateBucket emits EVENT.CARE_PLAN_CONFIG', () => {
    const updateMatch = carePlanConfigSrc.match(
      /updateBucket[\s\S]*?(?=const getBucketStatus)/
    );
    expect(updateMatch).not.toBeNull();
    expect(updateMatch![0]).toContain('emitDataUpdate(EVENT.CARE_PLAN_CONFIG)');
  });
});

// ============================================================================
// S2: useDailyCareInstances emits events on completion
// ============================================================================
describe('S2: useDailyCareInstances emits events', () => {
  test('imports emitDataUpdate and EVENT', () => {
    expect(dailyInstancesSrc).toContain('emitDataUpdate');
    expect(dailyInstancesSrc).toContain("EVENT");
  });

  test('completeInstance emits EVENT.DAILY_INSTANCES', () => {
    const completeMatch = dailyInstancesSrc.match(
      /const completeInstance[\s\S]*?(?=const skipInstance)/
    );
    expect(completeMatch).not.toBeNull();
    expect(completeMatch![0]).toContain('emitDataUpdate(EVENT.DAILY_INSTANCES)');
  });

  test('skipInstance emits EVENT.DAILY_INSTANCES', () => {
    const skipMatch = dailyInstancesSrc.match(
      /const skipInstance[\s\S]*?(?=const markMissed)/
    );
    expect(skipMatch).not.toBeNull();
    expect(skipMatch![0]).toContain('emitDataUpdate(EVENT.DAILY_INSTANCES)');
  });

  test('markMissed emits EVENT.DAILY_INSTANCES', () => {
    const missedMatch = dailyInstancesSrc.match(
      /const markMissed[\s\S]*?(?=const getInstanceById)/
    );
    expect(missedMatch).not.toBeNull();
    expect(missedMatch![0]).toContain('emitDataUpdate(EVENT.DAILY_INSTANCES)');
  });
});

// ============================================================================
// S3: ProgressRings uses hardcoded CORE_BUCKETS
// ============================================================================
describe('S3: ProgressRings bucket alignment', () => {
  test('defines CORE_BUCKETS locally (hardcoded, not imported)', () => {
    expect(progressRingsSrc).toContain("const CORE_BUCKETS: BucketType[] = ['meds', 'vitals', 'wellness', 'meals']");
  });

  test('does not define DEFAULT_BUCKETS locally', () => {
    expect(progressRingsSrc).not.toMatch(/const DEFAULT_BUCKETS.*BucketType/);
  });

  test('uses CORE_SET to exclude core buckets from optional list', () => {
    expect(progressRingsSrc).toContain('CORE_SET');
    expect(progressRingsSrc).toContain('CORE_SET.has(b)');
  });
});

// ============================================================================
// S6: Overdue → Needs Attention language
// ============================================================================
describe('S6: Overdue language changes', () => {
  test('UpNextCard shows "NEEDS ATTENTION" not "OVERDUE"', () => {
    expect(upNextCardSrc).toContain("'NEEDS ATTENTION'");
    expect(upNextCardSrc).not.toContain("'OVERDUE'");
  });

  test('UpNextCard labelOverdue uses softened color (amber, not red)', () => {
    const labelOverdueMatch = upNextCardSrc.match(/labelOverdue:\s*\{[^}]+\}/);
    expect(labelOverdueMatch).not.toBeNull();
    expect(labelOverdueMatch![0]).toContain('amberBright');
    expect(labelOverdueMatch![0]).not.toContain('redBright');
  });

  test('TimelineSection renders Log button instead of time badges on pending items', () => {
    // Pending items in time windows show a "Log" button, not time delta badges
    expect(timelineSectionSrc).toContain('timelineLogButton');
    expect(timelineSectionSrc).toContain('timelineLogButtonText');
  });
});

// ============================================================================
// S7: ScreenHeader purpose subtitle
// ============================================================================
describe('S7: ScreenHeader purpose prop', () => {
  test('ScreenHeader interface includes purpose prop', () => {
    expect(screenHeaderSrc).toContain('purpose?: string');
  });

  test('ScreenHeader renders purpose text', () => {
    expect(screenHeaderSrc).toContain('{purpose && <Text style={styles.purpose}>{purpose}</Text>}');
  });

  test('purpose style exists with correct properties', () => {
    const purposeMatch = screenHeaderSrc.match(/purpose:\s*\{[^}]+\}/);
    expect(purposeMatch).not.toBeNull();
    expect(purposeMatch![0]).toContain('fontSize: 12');
    expect(purposeMatch![0]).toContain('c.textSecondary');
  });

  test('Now page does not pass purpose prop (v2: removed for clean header)', () => {
    expect(nowSrc).not.toContain('purpose="What needs your attention today."');
  });
});

// ============================================================================
// S8: Header spacing for Dynamic Island
// ============================================================================
describe('S8: ScreenHeader spacing', () => {
  test('paddingTop is >= 24', () => {
    const containerMatch = screenHeaderSrc.match(/container:\s*\{[^}]+\}/);
    expect(containerMatch).not.toBeNull();
    const block = containerMatch![0];
    const paddingTopMatch = block.match(/paddingTop:\s*(\d+)/);
    expect(paddingTopMatch).not.toBeNull();
    expect(Number(paddingTopMatch![1])).toBeGreaterThanOrEqual(24);
  });

  test('marginBottom is >= 12', () => {
    const containerMatch = screenHeaderSrc.match(/container:\s*\{[^}]+\}/);
    expect(containerMatch).not.toBeNull();
    const block = containerMatch![0];
    expect(block).toContain('marginBottom');
    const marginMatch = block.match(/marginBottom:\s*(\d+)/);
    expect(Number(marginMatch![1])).toBeGreaterThanOrEqual(12);
  });

  test('has bottom border', () => {
    const containerMatch = screenHeaderSrc.match(/container:\s*\{[^}]+\}/);
    expect(containerMatch).not.toBeNull();
    expect(containerMatch![0]).toContain('borderBottomWidth: 1');
  });
});
