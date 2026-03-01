// File: utils/__tests__/tabRename.validation.test.ts
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Understand to Insights rename', () => {
  const layout = readFileSync(
    join(__dirname, '../../app/(tabs)/_layout.tsx'), 'utf8');

  test('tab title is Insights', () => {
    expect(layout).toContain("title: 'Insights'");
    expect(layout).not.toContain("title: 'Understand'");
  });

  test('a11y label references Insights', () => {
    expect(layout).toMatch(/Insights tab/i);
  });

  test('understand.tsx file still exists for route stability', () => {
    expect(() => readFileSync(
      join(__dirname, '../../app/(tabs)/understand.tsx'))).not.toThrow();
  });

  test('ScreenHeader inside understand.tsx says Insights', () => {
    const content = readFileSync(
      join(__dirname, '../../app/(tabs)/understand.tsx'), 'utf8');
    expect(content).toMatch(/title.*Insights/i);
  });
});
