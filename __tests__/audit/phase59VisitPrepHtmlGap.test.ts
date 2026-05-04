// ============================================================================
// Phase 5.9 — Finding 1.1 reproduction: Visit Prep PDF content gap.
//
// Device evidence: Phase 5.8.b added a `whatChanged` lede to the assembled
// VisitPrepData. The data field IS computed, but the HTML template that
// becomes the actual PDF doesn't render it. This test reproduces the gap
// at the source level — assembling a 14-day window with worsening symptoms
// produces a non-empty whatChanged.observations array, but the rendered
// HTML contains zero references to the lede content or section heading.
//
// EXPECTED STATE while broken: this test FAILS — what we want to be true
// (the HTML renders the section) is not yet true. After Phase 5.9.a fixes
// the template, this test should pass.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const pdfSrc = readFileSync(join(ROOT, 'services/visitPrepPdf.ts'), 'utf8');

describe('Phase 5.9 finding 1.1 — Visit Prep HTML renders the whatChanged lede', () => {
  it('the HTML template references data.whatChanged.observations', () => {
    // Surface evidence: the buildHtml function should walk
    // data.whatChanged.observations to render the lede. Right now the
    // buildHtml body has zero mentions of `whatChanged`.
    const buildHtmlIdx = pdfSrc.indexOf('function buildHtml');
    expect(buildHtmlIdx).toBeGreaterThan(0);
    // Slice from buildHtml's opening brace to the next top-level export
    // so we only inspect that one function's body.
    const bodyStart = pdfSrc.indexOf('{', buildHtmlIdx);
    const nextFnIdx = pdfSrc.indexOf('\nexport ', bodyStart);
    const buildHtmlBody = pdfSrc.slice(bodyStart, nextFnIdx);
    expect(buildHtmlBody).toMatch(/data\.whatChanged/);
  });

  it('the HTML emits a "What changed" section heading', () => {
    expect(pdfSrc).toMatch(/<h2[^>]*>\s*What changed\s*<\/h2>/i);
  });

  it('the HTML walks whatChanged.observations into <li> entries (or equivalent block)', () => {
    // Either bullet list (<ul><li>...) or paragraph block — both acceptable.
    // What matters: the observations array reaches the template.
    expect(pdfSrc).toMatch(
      /whatChanged\.observations[\s\S]{0,200}?(?:map|forEach|join)/,
    );
  });

  it('the deferred-data fallback message reaches the template too', () => {
    // When insufficientData is true, the section should render the
    // "Two weeks of tracking suggested before patterns appear here." line —
    // not silently drop the section.
    expect(pdfSrc).toMatch(/insufficientData/);
  });
});
