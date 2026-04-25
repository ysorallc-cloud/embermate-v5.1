// File: utils/__tests__/footerFabOverlap.test.ts
// PURPOSE: Verify footer section has sufficient padding to clear the FAB zone.
// Updated for v2 flat layout: footer is now a flat zone (no card wrapper).

import { readFileSync } from 'fs';
import { join } from 'path';

describe('Footer / FAB overlap fix', () => {
  const content = readFileSync(
    join(__dirname, '../../components/now/NowFooter.tsx'), 'utf8'
  );

  test('footer has sufficient spacing via marginTop on journal preview cards', () => {
    // Footer was restructured — footerSection replaced by journal preview +
    // allDone cards. Verify the top card has marginTop >= 12 for clearance.
    const match = content.match(/journalPreviewCard:\s*\{([^}]+)\}/);
    expect(match).toBeTruthy();
    const style = match![1];
    const marginMatch = style.match(/marginTop:\s*(\d+)/);
    expect(marginMatch).toBeTruthy();
    expect(parseInt(marginMatch![1])).toBeGreaterThanOrEqual(12);
  });
});
