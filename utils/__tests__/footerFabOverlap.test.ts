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
    // Phase 4.6 migrated journalPreviewCard's literal margins to tokens
    // (Spacing.md = 20pt). Accept either a literal ≥ 12 or a Spacing
    // token reference; both pin the same "card has clearance" contract.
    const match = content.match(/journalPreviewCard:\s*\{([^}]+)\}/);
    expect(match).toBeTruthy();
    const style = match![1];
    const literalMatch = style.match(/marginTop:\s*(\d+)/);
    if (literalMatch) {
      expect(parseInt(literalMatch[1])).toBeGreaterThanOrEqual(12);
    } else {
      // Token-routed: Spacing.md (20), Spacing.lg (28), or Spacing.xl (36)
      // all clear the 12pt floor.
      expect(style).toMatch(/marginTop:\s*Spacing\.(md|lg|xl)\b/);
    }
  });
});
