// File: utils/__tests__/insightsQuickActions.test.ts
// PURPOSE: Verify MORE menu is replaced with compact quick actions grid

import { readFileSync } from 'fs';
import { join } from 'path';

describe('Insights quick actions restructure', () => {
  const content = readFileSync(
    join(__dirname, '../../app/(tabs)/understand.tsx'), 'utf8'
  );
  const render = content.slice(content.indexOf('return ('));

  test('"All Trends" link exists in JSX', () => {
    expect(render).toMatch(/All Trends/);
  });

  test('no MORE label in render', () => {
    // The old "MORE" section label should be gone
    expect(render).not.toMatch(/>MORE</);
  });

  test('quickActionsGrid style exists', () => {
    expect(content).toMatch(/quickActionsGrid/);
  });

  test('quick action items use 2-column layout', () => {
    // The grid container should use flexWrap or a 2-col approach
    expect(content).toMatch(/quickActionsGrid[^}]*flexDirection:\s*'row'/s);
    expect(content).toMatch(/quickActionsGrid[^}]*flexWrap:\s*'wrap'/s);
  });
});
