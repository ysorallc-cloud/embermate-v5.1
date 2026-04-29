// ============================================================================
// ProgressRings — Flat inline progress row tests
// ============================================================================

import { CATEGORY_CONFIG } from '../../constants/categoryLabels';
import type { BucketType } from '../../types/carePlanConfig';
import * as fs from 'fs';
import * as path from 'path';

const srcPath = path.resolve(__dirname, '../../components/now/ProgressRings.tsx');
const src = fs.readFileSync(srcPath, 'utf-8');

const CORE_BUCKETS: BucketType[] = ['meds', 'vitals', 'wellness', 'meals'];
const CORE_SET = new Set<string>(CORE_BUCKETS);

const BUCKET_TO_ITEM_TYPE: Record<string, string> = {
  meds: 'medication', vitals: 'vitals', meals: 'nutrition',
  water: 'hydration', wellness: 'wellness',
};

describe('ProgressRings (flat inline row)', () => {
  it('renders as a centered row with no cards, no icons, no gradient', () => {
    expect(src).toContain("justifyContent: 'center'");
    expect(src).not.toContain('LinearGradient');
    expect(src).not.toContain('cellIcon');
    expect(src).not.toContain('borderRadius: 10');
    // Uses CATEGORY_CONFIG for labels
    expect(src).toContain('CATEGORY_CONFIG');
    expect(src).toContain('config.chipLabel');
  });

  it('always shows 4 core buckets', () => {
    expect(src).toContain("const CORE_BUCKETS: BucketType[] = ['meds', 'vitals', 'wellness', 'meals']");
  });

  it('shows optional buckets only when they have items > 0', () => {
    expect(src).toContain('stat.total > 0');
    expect(src).toContain('CORE_SET.has(b)');
  });

  it('dot is 6px circle', () => {
    expect(src).toContain('width: 6');
    expect(src).toContain('height: 6');
    expect(src).toContain('borderRadius: 3');
  });

  it('text is 11px fontSize 500 weight', () => {
    expect(src).toContain('fontSize: 11');
    expect(src).toContain("fontWeight: '500'");
  });

  it('gap between items is 16px', () => {
    expect(src).toContain('gap: 16');
  });

  it('overdue categories use red color', () => {
    expect(src).toContain("'#e6776e'");
    expect(src).toContain('isCategoryOverdue');
  });

  it('complete categories show at 0.5 opacity', () => {
    expect(src).toContain('textOpacity = 0.5');
  });

  it('in-progress categories show at 0.6 opacity', () => {
    expect(src).toContain('textOpacity = 0.6');
  });

  it('uses chipLabel from CATEGORY_CONFIG', () => {
    expect(CATEGORY_CONFIG.medication.chipLabel).toBe('Meds');
    expect(CATEGORY_CONFIG.vitals.chipLabel).toBe('Vitals');
    expect(CATEGORY_CONFIG.wellness.chipLabel).toBe('Check-ins');
    expect(CATEGORY_CONFIG.nutrition.chipLabel).toBe('Meals');
  });

  it('dot colors match CATEGORY_CONFIG colors', () => {
    expect(CATEGORY_CONFIG.medication.color).toBe('#5fb88a');
    expect(CATEGORY_CONFIG.vitals.color).toBe('#A78BFA');
    expect(CATEGORY_CONFIG.wellness.color).toBe('#5fb88a');
    expect(CATEGORY_CONFIG.nutrition.color).toBe('#e5b04a');
  });
});
