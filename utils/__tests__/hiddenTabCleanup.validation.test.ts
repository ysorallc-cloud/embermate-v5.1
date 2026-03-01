// File: utils/__tests__/hiddenTabCleanup.validation.test.ts
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Hidden tab cleanup', () => {
  const layout = readFileSync(
    join(__dirname, '../../app/(tabs)/_layout.tsx'), 'utf8');

  test('tab layout has exactly 3 visible tabs', () => {
    const all = (layout.match(/<Tabs\.Screen/g) || []).length;
    const hidden = (layout.match(/href:\s*null/g) || []).length;
    expect(all - hidden).toBe(3);
  });

  test.each(['support.tsx', 'timeline.tsx', 'family-tab.tsx'])(
    '%s is deleted from tabs directory', (file) => {
      expect(() => readFileSync(
        join(__dirname, '../../app/(tabs)/' + file))).toThrow();
  });

  test('layout no longer references deleted screens', () => {
    expect(layout).not.toContain('name="support"');
    expect(layout).not.toContain('name="timeline"');
    expect(layout).not.toContain('name="family-tab"');
  });
});
