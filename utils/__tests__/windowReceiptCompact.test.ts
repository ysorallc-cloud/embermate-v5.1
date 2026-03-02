// File: utils/__tests__/windowReceiptCompact.test.ts
import { readFileSync } from 'fs';
import { join } from 'path';

describe('WindowReceipt compactness', () => {
  const src = readFileSync(
    join(__dirname, '../../components/now/WindowReceipt.tsx'), 'utf8'
  );

  test('container has no background color', () => {
    const containerMatch = src.match(/container:\s*\{([^}]+)\}/);
    expect(containerMatch).toBeTruthy();
    expect(containerMatch![1]).not.toMatch(/backgroundColor/);
  });

  test('container has no border (or transparent)', () => {
    const containerMatch = src.match(/container:\s*\{([^}]+)\}/);
    expect(containerMatch![1]).not.toMatch(/borderWidth/);
  });

  test('header padding is compact (paddingVertical <= 8)', () => {
    const headerMatch = src.match(/header:\s*\{([^}]+)\}/);
    expect(headerMatch).toBeTruthy();
    const pvMatch = headerMatch![1].match(/paddingVertical:\s*(\d+)/);
    if (pvMatch) expect(parseInt(pvMatch[1])).toBeLessThanOrEqual(8);
  });

  test('summary text is on same line as title', () => {
    // title and summary should be in a single row, not stacked
    const headerMatch = src.match(/header:\s*\{([^}]+)\}/);
    expect(headerMatch![1]).toContain("'row'");
  });
});
