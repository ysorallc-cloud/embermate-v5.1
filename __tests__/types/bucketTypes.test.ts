import type { BucketType } from '../../types/carePlanConfig';
import {
  BUCKET_TYPES,
  PRIMARY_BUCKETS,
  OPTIONAL_BUCKETS,
} from '../../types/carePlanConfig';

describe('BucketType extensions', () => {
  it("BucketType union includes 'errands', 'shifts', 'self_care'", () => {
    // These assignments would fail at compile time if the types weren't in the union
    const errands: BucketType = 'errands';
    const shifts: BucketType = 'shifts';
    const selfCare: BucketType = 'self_care';
    expect(errands).toBe('errands');
    expect(shifts).toBe('shifts');
    expect(selfCare).toBe('self_care');
  });

  it('BUCKET_TYPES array includes all 11 types', () => {
    expect(BUCKET_TYPES).toHaveLength(11);
    expect(BUCKET_TYPES).toContain('meds');
    expect(BUCKET_TYPES).toContain('vitals');
    expect(BUCKET_TYPES).toContain('meals');
    expect(BUCKET_TYPES).toContain('water');
    expect(BUCKET_TYPES).toContain('sleep');
    expect(BUCKET_TYPES).toContain('activity');
    expect(BUCKET_TYPES).toContain('wellness');
    expect(BUCKET_TYPES).toContain('appointments');
    expect(BUCKET_TYPES).toContain('errands');
    expect(BUCKET_TYPES).toContain('shifts');
    expect(BUCKET_TYPES).toContain('self_care');
  });

  it("OPTIONAL_BUCKETS includes 'errands', 'shifts', 'self_care'", () => {
    expect(OPTIONAL_BUCKETS).toContain('errands');
    expect(OPTIONAL_BUCKETS).toContain('shifts');
    expect(OPTIONAL_BUCKETS).toContain('self_care');
  });

  it("PRIMARY_BUCKETS still contains 'meds', 'vitals', 'meals', 'water' (unchanged)", () => {
    expect(PRIMARY_BUCKETS).toContain('meds');
    expect(PRIMARY_BUCKETS).toContain('vitals');
    expect(PRIMARY_BUCKETS).toContain('meals');
    expect(PRIMARY_BUCKETS).toContain('water');
    expect(PRIMARY_BUCKETS).toHaveLength(4);
  });
});
