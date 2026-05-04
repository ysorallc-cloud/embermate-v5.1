// ============================================================================
// Phase 5.9 — Finding 1.2 reproduction: HandoffSheet preview not visible.
//
// Device evidence: image 4 shows the handoff sheet with TONE input + 3
// action buttons + Cancel. No preview text visible.
//
// Source-level diagnosis:
//   • The <Text style={canonicalBody}> block IS in the JSX (Phase 5.8.d).
//   • Source-grep tests pass.
//   • So the gap is RUNTIME — when the canonical builder fails, returns
//     empty, or hasn't resolved yet, the user sees a blank preview area
//     with no loading state, no error message, no fallback content.
//
// This test reproduces the runtime ambiguity at the source level: the
// component has no visible "loading" or "error" state for the canonical
// fetch. When canonicalText is empty, the user sees nothing.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const sheetSrc = readFileSync(
  join(ROOT, 'components/journal/HandoffSheet.tsx'),
  'utf8',
);

describe('Phase 5.9 finding 1.2 — HandoffSheet preview empty/loading state', () => {
  it('a "loading" branch is rendered when the canonical fetch is in flight', () => {
    // The JSX must conditionally render a status message tied to the
    // canonical-load state. The literal copy "Building summary…" is
    // pinned as the canonical placeholder.
    expect(sheetSrc).toMatch(/Building summary/);
    expect(sheetSrc).toMatch(/canonicalState\s*===\s*['"]loading['"]/);
  });

  it('an "error" branch is rendered when buildHandoffReport throws a non-ProfileMissingError', () => {
    // Tightened over the original lenient match — now requires a literal
    // user-facing error string AND an error state guard. The previous
    // assertion accidentally passed on `setCanonicalText('')`.
    expect(sheetSrc).toMatch(/canonicalState\s*===\s*['"]error['"]/);
    expect(sheetSrc).toMatch(/Couldn't build today's summary/);
  });

  it('the canonical state machine has the four expected states', () => {
    // idle | loading | ready | error. Pinning the union keeps the
    // states grounded; future drift gets caught here.
    expect(sheetSrc).toMatch(
      /'idle'\s*\|\s*'loading'\s*\|\s*'ready'\s*\|\s*'error'/,
    );
  });
});
