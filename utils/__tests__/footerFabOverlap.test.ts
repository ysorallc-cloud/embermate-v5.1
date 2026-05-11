// ============================================================================
// Phase 15.6 — journal preview card retired from NowFooter.
//
// Pre-15.6 this file pinned the journalPreviewCard's marginTop so
// the card cleared the FAB zone at the bottom of Now. 15.6 retired
// the entire card; the FAB-clearance contract is moot for that
// specific surface. The EndOfShiftCard below it still carries its
// own margin discipline (pinned in nowFooterCardSpacing.test.ts).
//
// Flipped to a retirement pin documenting the absence so the file
// keeps tracking the surface it always tracked, just with the
// inverted assertion.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

describe('Phase 15.6 — journal preview card retired (was Footer / FAB overlap fix)', () => {
  const content = readFileSync(
    join(__dirname, '../../components/now/NowFooter.tsx'), 'utf8'
  );

  test('journalPreviewCard style entry is gone from NowFooter', () => {
    expect(content).not.toMatch(/journalPreviewCard:\s*\{/);
  });
});
