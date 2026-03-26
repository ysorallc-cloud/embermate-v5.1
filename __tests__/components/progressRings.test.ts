// ============================================================================
// ProgressRings — Core vs Optional tile logic tests
// Tests the tile-building logic, not React rendering (node test env)
// ============================================================================

import type { BucketType } from '../../types/carePlanConfig';

// Replicate the component's core logic for unit testing
const CORE_BUCKETS: BucketType[] = ['meds', 'vitals', 'wellness', 'meals'];

const BUCKET_TILE_MAP: Record<string, { label: string; icon: string }> = {
  meds:      { icon: '💊', label: 'Meds' },
  vitals:    { icon: '📊', label: 'Vitals' },
  meals:     { icon: '🍽️', label: 'Meals' },
  water:     { icon: '💧', label: 'Water' },
  sleep:     { icon: '😴', label: 'Sleep' },
  activity:  { icon: '🚶', label: 'Activity' },
  wellness:  { icon: '🌅', label: 'Check' },
  appointments: { icon: '📅', label: 'Appts' },
  errands:   { icon: '📋', label: 'Errands' },
  shifts:    { icon: '🔄', label: 'Shifts' },
  self_care: { icon: '💛', label: 'Self' },
};

function buildCoreTiles() {
  return CORE_BUCKETS
    .filter(b => BUCKET_TILE_MAP[b])
    .map(b => ({ bucket: b, ...BUCKET_TILE_MAP[b] }));
}

function buildOptionalTiles(enabledBuckets: BucketType[]) {
  const coreSet = new Set<string>(CORE_BUCKETS);
  return enabledBuckets
    .filter(b => !coreSet.has(b) && BUCKET_TILE_MAP[b])
    .map(b => ({ bucket: b, ...BUCKET_TILE_MAP[b] }));
}

describe('ProgressRings tile logic', () => {
  it('renders exactly 4 core tiles when no optional buckets enabled', () => {
    const core = buildCoreTiles();
    const optional = buildOptionalTiles([]);
    expect(core).toHaveLength(4);
    expect(optional).toHaveLength(0);
  });

  it('renders 4 + N tiles when N optional buckets enabled', () => {
    const core = buildCoreTiles();
    const optional = buildOptionalTiles(['meds', 'vitals', 'wellness', 'meals', 'errands', 'shifts']);
    expect(core).toHaveLength(4);
    // meds, vitals, wellness, meals are core — only errands + shifts are optional
    expect(optional).toHaveLength(2);
    expect(optional[0].bucket).toBe('errands');
    expect(optional[1].bucket).toBe('shifts');
  });

  it('core tile order is always: Meds, Vitals, Wellness, Meals', () => {
    const core = buildCoreTiles();
    expect(core[0].bucket).toBe('meds');
    expect(core[1].bucket).toBe('vitals');
    expect(core[2].bucket).toBe('wellness');
    expect(core[3].bucket).toBe('meals');
  });

  it('optional tiles appear in second row (separate from core)', () => {
    const core = buildCoreTiles();
    const optional = buildOptionalTiles(['water', 'sleep', 'errands', 'self_care']);

    // Core should not contain any optional tiles
    const coreIds = core.map(t => t.bucket);
    expect(coreIds).not.toContain('water');
    expect(coreIds).not.toContain('errands');

    // Optional should only contain non-core tiles
    const optIds = optional.map(t => t.bucket);
    expect(optIds).toContain('water');
    expect(optIds).toContain('sleep');
    expect(optIds).toContain('errands');
    expect(optIds).toContain('self_care');
    expect(optIds).not.toContain('meds');
  });

  it('each tile has emoji, label, and bucket', () => {
    const core = buildCoreTiles();
    const optional = buildOptionalTiles(['errands', 'shifts', 'self_care']);
    const all = [...core, ...optional];

    for (const tile of all) {
      expect(tile.bucket).toBeDefined();
      expect(tile.icon).toBeDefined();
      expect(tile.label).toBeDefined();
      expect(typeof tile.icon).toBe('string');
      expect(typeof tile.label).toBe('string');
    }
  });

  it('non-enabled non-core buckets do NOT appear in optional row', () => {
    // Only 'water' is in enabledBuckets — sleep, activity, etc. should NOT appear
    const optional = buildOptionalTiles(['meds', 'vitals', 'wellness', 'meals', 'water']);
    expect(optional).toHaveLength(1);
    expect(optional[0].bucket).toBe('water');

    // sleep, activity, errands etc. are NOT in enabledBuckets → not in optional
    const optIds = optional.map(t => t.bucket);
    expect(optIds).not.toContain('sleep');
    expect(optIds).not.toContain('activity');
    expect(optIds).not.toContain('errands');
  });

  it('second row is empty when enabledBuckets only contains core buckets', () => {
    const optional = buildOptionalTiles(['meds', 'vitals', 'wellness', 'meals']);
    expect(optional).toHaveLength(0);
  });

  it('second row is empty when enabledBuckets is empty', () => {
    const optional = buildOptionalTiles([]);
    expect(optional).toHaveLength(0);
  });
});
