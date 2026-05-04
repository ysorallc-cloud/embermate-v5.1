// ============================================================================
// Phase 5.9 — Finding 1.4 inverted: in-app PDF preview is now SHIPPED.
//
// Stage 1's original assertions pinned the absence of the preview as a
// not-shipped state. After Phase 5.9.d landed the screen, those
// assertions are inverted to confirm the preview route exists, the
// Generate button no longer fires Print directly, and the config
// screen's primary button label changed to "Preview".
// ============================================================================

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const screenSrc = readFileSync(join(ROOT, 'app/visit-prep.tsx'), 'utf8');

describe('Phase 5.9.d — Visit Prep preview status (post-ship)', () => {
  it('app/visit-prep-preview.tsx exists', () => {
    expect(existsSync(join(ROOT, 'app/visit-prep-preview.tsx'))).toBe(true);
  });

  it('the config screen Generate handler navigates to /visit-prep-preview', () => {
    const start = screenSrc.indexOf('handleGenerate');
    const tail = screenSrc.slice(start);
    const body = tail.slice(0, tail.indexOf('}, [') + 1);
    expect(body).toMatch(/navigate\s*\(\s*['"]\/visit-prep-preview['"]\s*\)/);
    // Should NOT call generateAndShareVisitPrep directly anymore.
    expect(body).not.toMatch(/generateAndShareVisitPrep\s*\(/);
  });

  it('the primary button label is now "Preview" (not "Generate PDF")', () => {
    expect(screenSrc).not.toMatch(/Generate PDF/);
    expect(screenSrc).toMatch(/>Preview</);
  });
});
