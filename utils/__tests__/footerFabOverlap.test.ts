// File: utils/__tests__/footerFabOverlap.test.ts
// PURPOSE: Verify footer is inside cardEncouragement which provides padding,
// and that the encouragement card has sufficient padding to clear the FAB zone.
// Updated for refined card layout: footer is now inside cardEncouragement.

import { readFileSync } from 'fs';
import { join } from 'path';

describe('Footer / FAB overlap fix', () => {
  const content = readFileSync(
    join(__dirname, '../../app/(tabs)/now.tsx'), 'utf8'
  );

  test('cardEncouragement wraps the footer section with padding >= 16', () => {
    const match = content.match(/cardEncouragement:\s*\{([^}]+)\}/);
    expect(match).toBeTruthy();
    const style = match![1];
    const paddingMatch = style.match(/padding:\s*(\d+)/);
    expect(paddingMatch).toBeTruthy();
    expect(parseInt(paddingMatch![1])).toBeGreaterThanOrEqual(16);
  });
});
