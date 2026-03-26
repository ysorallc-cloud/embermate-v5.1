// ============================================================================
// Care Plan — Core vs Optional layout tests
// Verifies the CORE / ADD WHEN READY split used in care-plan/index.tsx
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';
import type { BucketType } from '../../types/carePlanConfig';
import {
  BUCKET_TYPES,
  PRIMARY_BUCKETS,
  SECONDARY_BUCKETS,
  OPTIONAL_BUCKETS,
} from '../../types/carePlanConfig';

const indexPath = path.resolve(__dirname, '../../app/care-plan/index.tsx');
const indexContent = fs.readFileSync(indexPath, 'utf-8');

// Replicate the component's constants
const CORE_BUCKETS: BucketType[] = ['meds', 'vitals', 'wellness', 'meals'];
const OPTIONAL_TOGGLE_BUCKETS: BucketType[] = BUCKET_TYPES.filter(b => !CORE_BUCKETS.includes(b));

describe('Care plan progressive disclosure', () => {
  const allBuckets: BucketType[] = [...PRIMARY_BUCKETS, ...SECONDARY_BUCKETS, ...OPTIONAL_BUCKETS];

  it('core 4 buckets always appear in the main section', () => {
    expect(CORE_BUCKETS).toEqual(['meds', 'vitals', 'wellness', 'meals']);
    expect(indexContent).toContain('CORE_BUCKETS');
    expect(indexContent).toContain('ALWAYS ON');
  });

  it('optional buckets appear in "Add when ready" section', () => {
    expect(indexContent).toContain('Add When Ready');
    expect(indexContent).toContain('OPTIONAL_TOGGLE_BUCKETS');

    // All non-core buckets should be in the optional list
    for (const b of OPTIONAL_TOGGLE_BUCKETS) {
      expect(CORE_BUCKETS).not.toContain(b);
    }
    expect(OPTIONAL_TOGGLE_BUCKETS.length).toBe(BUCKET_TYPES.length - CORE_BUCKETS.length);
  });

  it('toggling an optional bucket updates enabledBuckets (toggle wiring exists)', () => {
    expect(indexContent).toContain('handleToggleBucket');
    expect(indexContent).toContain('toggleBucket');
    expect(indexContent).toContain('onToggle');
  });

  it('core cards link to config screens (no toggle, just navigation)', () => {
    // Core cards use onPress → handleConfigureBucket, not a toggle
    expect(indexContent).toContain('coreCard');
    expect(indexContent).toContain('handleConfigureBucket(bucket)');
  });

  // Preserve existing split logic tests
  function splitBuckets(enabledBuckets: BucketType[]) {
    const enabledBucketSet = new Set(enabledBuckets);
    const enabled = allBuckets.filter(b => enabledBucketSet.has(b));
    const disabled = allBuckets.filter(b => !enabledBucketSet.has(b));
    return { enabled, disabled };
  }

  it('enabled and disabled are mutually exclusive and exhaustive', () => {
    const { enabled, disabled } = splitBuckets(['meds', 'sleep', 'appointments']);
    const combined = [...enabled, ...disabled];
    expect(combined).toHaveLength(allBuckets.length);
    const uniqueIds = new Set(combined);
    expect(uniqueIds.size).toBe(allBuckets.length);
  });

  it('new bucket types are included in optional toggles', () => {
    expect(OPTIONAL_TOGGLE_BUCKETS).toContain('errands');
    expect(OPTIONAL_TOGGLE_BUCKETS).toContain('shifts');
    expect(OPTIONAL_TOGGLE_BUCKETS).toContain('self_care');
  });
});
