// ============================================================================
// Phase 5.9 — Finding 1.4 reproduction: in-app PDF preview not shipped.
//
// Device evidence: 7 taps + typing required to see the PDF after Generate.
// Tapping Generate fires Print.printToFileAsync immediately and hands the
// PDF to the iOS share sheet — there is no in-app preview step where the
// user can review content before the file leaves the device.
//
// This test verifies the absence as a not-shipped state — confirming the
// app/visit-prep.tsx generate handler still calls
// generateAndShareVisitPrep directly with no preview detour.
//
// EXPECTED STATE: this test PASSES today (confirming 5.7.d hasn't shipped).
// After 5.7.d lands, the test should be inverted to assert the preview
// route exists.
// ============================================================================

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const screenSrc = readFileSync(join(ROOT, 'app/visit-prep.tsx'), 'utf8');

describe('Phase 5.9 finding 1.4 — Visit Prep preview status', () => {
  it('no app/visit-prep-preview.tsx route exists yet', () => {
    // 5.7.d's spec puts the preview at app/visit-prep-preview.tsx (or
    // similar). Confirm it has not shipped.
    const candidatePaths = [
      'app/visit-prep-preview.tsx',
      'app/visit-prep/preview.tsx',
      'app/(tabs)/visit-prep-preview.tsx',
    ];
    for (const p of candidatePaths) {
      expect(existsSync(join(ROOT, p))).toBe(false);
    }
  });

  it('the Generate handler still calls generateAndShareVisitPrep directly', () => {
    // No preview-screen detour. The Generate button → assemble + share
    // is a one-shot today.
    const start = screenSrc.indexOf('handleGenerate');
    const tail = screenSrc.slice(start);
    const body = tail.slice(0, tail.indexOf('}, [') + 1);
    expect(body).toMatch(/generateAndShareVisitPrep\s*\(/);
    // Should NOT route through a preview screen first.
    expect(body).not.toMatch(/navigate\s*\(\s*['"]\/visit-prep-preview['"]/);
  });

  it('the Generate button label still says "Generate PDF" (not "Preview")', () => {
    // 5.7.d's spec renames "Generate PDF" → "Preview". Confirm the
    // current label is unchanged.
    expect(screenSrc).toMatch(/Generate PDF/);
  });
});
