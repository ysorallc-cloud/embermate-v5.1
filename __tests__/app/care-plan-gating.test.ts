// ============================================================================
// Care Plan — section allocation + toggle wiring (Phase 32A reframe).
//
// Pre-32A this file pinned a CORE / ADD WHEN READY 2-section split with a
// stale local CORE_BUCKETS = ['meds', 'vitals', 'wellness', 'meals'] —
// out-of-date even pre-32A (canonical CORE_BUCKETS settled at
// ['meds', 'vitals'] in commit 506fc49c).
//
// Phase 32A F2 introduces a three-section management layout (ALWAYS ON /
// DAILY TRACKING / ADD WHEN READY) with hardcoded section bucket
// allocations and retires OPTIONAL_TOGGLE_BUCKETS + the "ALWAYS ON" /
// "Add When Ready" pre-32A literals from the source.
//
// Reframe: drop the source-grep assertions for retired symbols; pin the
// post-32A section allocation contract instead. Structural assertions
// about toggle wiring (handleToggleBucket / toggleBucket / onToggle) and
// the meds-row navigation (handleConfigureBucket) survive — that
// behavior is still present.
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';
import type { BucketType } from '../../types/carePlanConfig';
import {
  BUCKET_TYPES,
  OPTIONAL_BUCKETS,
} from '../../types/carePlanConfig';

const indexPath = path.resolve(__dirname, '../../app/care-plan/index.tsx');
const indexContent = fs.readFileSync(indexPath, 'utf-8');

// Phase 32A locked section allocation. The render-filter philosophy
// (preserve types in BUCKET_TYPES, suppress at the UI section level)
// means errands / shifts / self_care are absent from every section
// list even though they're still valid BucketTypes.
const ALWAYS_ON_BUCKETS: BucketType[] = ['meds'];
const DAILY_TRACKING_BUCKETS: BucketType[] = ['vitals', 'wellness', 'meals'];
const ADD_WHEN_READY_BUCKETS: BucketType[] = ['water', 'sleep', 'activity', 'appointments'];

describe('Care plan section allocation (Phase 32A)', () => {
  it('section consts cover 8 buckets — no overlap', () => {
    const allSectionBuckets = [
      ...ALWAYS_ON_BUCKETS,
      ...DAILY_TRACKING_BUCKETS,
      ...ADD_WHEN_READY_BUCKETS,
    ];
    expect(allSectionBuckets.length).toBe(8);
    expect(new Set(allSectionBuckets).size).toBe(8);
  });

  it('errands / shifts / self_care intentionally absent from every section (MVP render filter)', () => {
    const allSectionBuckets = [
      ...ALWAYS_ON_BUCKETS,
      ...DAILY_TRACKING_BUCKETS,
      ...ADD_WHEN_READY_BUCKETS,
    ];
    expect(allSectionBuckets).not.toContain('errands');
    expect(allSectionBuckets).not.toContain('shifts');
    expect(allSectionBuckets).not.toContain('self_care');
  });

  it('canonical types still carry the three suppressed buckets (render filter, not data deletion)', () => {
    expect(BUCKET_TYPES).toContain('errands');
    expect(BUCKET_TYPES).toContain('shifts');
    expect(BUCKET_TYPES).toContain('self_care');
    expect(OPTIONAL_BUCKETS).toContain('errands');
    expect(OPTIONAL_BUCKETS).toContain('shifts');
    expect(OPTIONAL_BUCKETS).toContain('self_care');
  });
});

describe('Care plan source-level wiring (Phase 32A)', () => {
  it('toggle wiring still present (handleToggleBucket / toggleBucket / onToggle)', () => {
    expect(indexContent).toContain('handleToggleBucket');
    expect(indexContent).toContain('toggleBucket');
    expect(indexContent).toContain('onToggle');
  });

  it('meds-row navigation still uses handleConfigureBucket → /care-plan/meds', () => {
    expect(indexContent).toContain('handleConfigureBucket');
    expect(indexContent).toContain('/care-plan/meds');
  });

  it('source declares ALWAYS_ON_BUCKETS / DAILY_TRACKING_BUCKETS / ADD_WHEN_READY_BUCKETS', () => {
    expect(indexContent).toMatch(/const\s+ALWAYS_ON_BUCKETS\b/);
    expect(indexContent).toMatch(/const\s+DAILY_TRACKING_BUCKETS\b/);
    expect(indexContent).toMatch(/const\s+ADD_WHEN_READY_BUCKETS\b/);
  });

  it('retired pre-32A symbols no longer in source', () => {
    expect(indexContent).not.toMatch(/\bOPTIONAL_TOGGLE_BUCKETS\b/);
    expect(indexContent).not.toMatch(/>\s*ALWAYS ON\s*</);
    expect(indexContent).not.toMatch(/title=["']Add When Ready["']/);
  });
});
