// ============================================================================
// Phase 23.3 — Visit Prep preview screen mirrors the PDF cover provenance.
//
// The on-screen preview (app/visit-prep-preview.tsx) renders the same cover
// the PDF emits: "Care Summary: {patientName}" + subtitle line with
// dateRange and preparedBy. Phase 23.3 adds a second cover row to the PDF;
// the on-screen preview mirrors it so a caregiver previewing before share
// sees the same calibration the clinician will see.
//
// Source-level contract (mirrors the established pattern in
// visitPrepPreview.test.tsx, which is itself a readFileSync-grep contract):
//   1. The literal provenance line is rendered as a <Text> string.
//   2. It appears AFTER the subtitle Text in source order (visual order
//      mirrors the PDF cover).
//   3. A `styles.provenance` block exists in the StyleSheet, and routes
//      its color through the textWarmMuted theme token rather than
//      hardcoding the PDF's #9a9aa8 (the preview renders against a dark
//      surface; the PDF print color #9a9aa8 wouldn't read).
// ============================================================================

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const PREVIEW_PATH = join(ROOT, 'app/visit-prep-preview.tsx');

const PROVENANCE_LINE = 'Caregiver-reported observations · Not a clinical record';

describe('Phase 23.3 — preview screen provenance mirror', () => {
  const src = existsSync(PREVIEW_PATH) ? readFileSync(PREVIEW_PATH, 'utf8') : '';

  // Strip comments so retirement / migration prose in the file header
  // can't false-positive against absence pins or shift indices.
  const stripped = src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

  it('contract 1: the literal provenance line is rendered as content', () => {
    // The line should appear inside a JSX Text node, not buried in a
    // comment. Use the stripped source so comment text doesn't match.
    expect(stripped).toContain(PROVENANCE_LINE);
  });

  it('contract 2: provenance Text appears AFTER the subtitle Text in source order', () => {
    // The existing subtitle renders `data.header.dateRange` directly,
    // so we anchor on that variable as the subtitle marker. The
    // provenance line must follow it in source order — that produces
    // visual order on screen since both are direct children of the
    // same parent ScrollView.
    const subtitleAnchor = stripped.indexOf('data.header.dateRange');
    const provenanceIdx = stripped.indexOf(PROVENANCE_LINE);
    expect(subtitleAnchor).toBeGreaterThan(-1);
    expect(provenanceIdx).toBeGreaterThan(-1);
    expect(provenanceIdx).toBeGreaterThan(subtitleAnchor);
  });

  it('contract 3: styles.provenance is defined and reuses textWarmMuted (not a hardcoded color)', () => {
    // The PDF uses #9a9aa8 which won't read on the dark preview surface;
    // the preview routes through the theme token instead. Pin both: the
    // style block exists, AND it does NOT hardcode the PDF color.
    expect(stripped).toMatch(/provenance\s*:\s*\{/);
    expect(stripped).toMatch(/textWarmMuted/);
    // The hardcoded PDF print color must not appear in the preview file —
    // it would indicate the developer copy-pasted the CSS without
    // adapting to the dark theme.
    expect(stripped).not.toMatch(/#9a9aa8/i);
  });
});
