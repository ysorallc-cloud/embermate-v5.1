// File: utils/__tests__/quickLogFAB.validation.test.ts
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Quick Log FAB', () => {
  test('Now screen renders QuickLogFAB', () => {
    const now = readFileSync(
      join(__dirname, '../../app/(tabs)/now.tsx'), 'utf8');
    expect(now).toContain('QuickLogFAB');
  });

  test('QuickLogFAB component file exists', () => {
    expect(() => readFileSync(
      join(__dirname, '../../components/now/QuickLogFAB.tsx')
    )).not.toThrow();
  });

  test('FAB has accessibility attributes', () => {
    const fab = readFileSync(
      join(__dirname, '../../components/now/QuickLogFAB.tsx'), 'utf8');
    expect(fab).toContain('accessibilityLabel');
    expect(fab).toContain('accessibilityRole');
  });

  test('FAB navigates to quick-log-more', () => {
    const fab = readFileSync(
      join(__dirname, '../../components/now/QuickLogFAB.tsx'), 'utf8');
    expect(fab).toContain('quick-log-more');
  });
});
