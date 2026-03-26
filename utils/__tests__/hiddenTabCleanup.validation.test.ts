// File: utils/__tests__/hiddenTabCleanup.validation.test.ts
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Hidden tab cleanup', () => {
  const layout = readFileSync(
    join(__dirname, '../../app/(tabs)/_layout.tsx'), 'utf8');

  test('tab layout has exactly 4 visible tabs', () => {
    const all = (layout.match(/<Tabs\.Screen/g) || []).length;
    const hidden = (layout.match(/href:\s*null/g) || []).length;
    expect(all - hidden).toBe(4);
  });

  test.each(['timeline.tsx', 'family-tab.tsx'])(
    '%s is deleted from tabs directory', (file) => {
      expect(() => readFileSync(
        join(__dirname, '../../app/(tabs)/' + file))).toThrow();
  });

  test('support tab exists in layout', () => {
    expect(layout).toContain('name="support"');
  });

  test('layout no longer references deleted screens', () => {
    expect(layout).not.toContain('name="timeline"');
    expect(layout).not.toContain('name="family-tab"');
  });
});
