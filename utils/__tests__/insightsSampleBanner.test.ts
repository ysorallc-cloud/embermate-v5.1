// File: utils/__tests__/insightsSampleBanner.test.ts
// PURPOSE: Verify SampleDataBanner is removed from Insights screen

import { readFileSync } from 'fs';
import { join } from 'path';

describe('Insights SampleDataBanner removal', () => {
  const content = readFileSync(
    join(__dirname, '../../app/(tabs)/understand.tsx'), 'utf8'
  );

  test('no local SampleDataBanner component definition', () => {
    expect(content).not.toMatch(/function SampleDataBanner/);
  });

  test('no SampleDataBanner render in JSX', () => {
    const render = content.slice(content.indexOf('return ('));
    expect(render).not.toMatch(/<SampleDataBanner/);
  });

  test('no handleDismissSampleData function', () => {
    expect(content).not.toMatch(/handleDismissSampleData/);
  });

  test('no sampleBanner styles', () => {
    expect(content).not.toMatch(/sampleBanner[A-Z]/);
  });
});
