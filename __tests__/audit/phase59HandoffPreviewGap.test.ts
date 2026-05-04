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
  it('the component surfaces a loading or empty placeholder when canonicalText is empty', () => {
    // Currently the JSX renders {canonicalText} unconditionally. When the
    // string is empty, the user sees nothing — no spinner, no "Loading…",
    // no error pointing at the underlying fetch failure. We want a
    // conditional render that surfaces SOMETHING when canonicalText is
    // empty AND the profile is complete.
    //
    // Two acceptable shapes for a fix:
    //   {canonicalText ? (<Text…>{canonicalText}</Text>) : (<Text…>Loading…</Text>)}
    //   OR
    //   {!canonicalText && <ActivityIndicator/>}
    //   <Text>{canonicalText}</Text>
    //
    // The match below tolerates both.
    const hasLoadingFallback =
      /canonicalText\s*\?\s*<|!\s*canonicalText\s*&&\s*<|ActivityIndicator/.test(
        sheetSrc,
      ) ||
      /Loading…|Loading\.\.\.|building|Preparing/.test(sheetSrc);
    expect(hasLoadingFallback).toBe(true);
  });

  it('errors thrown by buildHandoffReport are surfaced to the user (not silently swallowed)', () => {
    // The current catch block silently sets canonicalText to '' for any
    // non-ProfileMissingError. After 5.9.b, the user should see SOMETHING
    // when the build fails — an error banner, a "Couldn't build summary —
    // pull down to retry" message, etc.
    //
    // This test pins that the error path leads somewhere visible. We
    // accept either an error-state state variable or a user-facing
    // string in the error catch arm.
    const errCatchBlock = sheetSrc.match(
      /catch\s*\(\s*err[\s\S]{0,500}?\}\s*$/m,
    );
    expect(errCatchBlock).toBeTruthy();
    if (errCatchBlock) {
      const block = errCatchBlock[0];
      // Either state-based error reporting (setError-style) or surfaced
      // error string. Today's block does NEITHER.
      const surfacesError =
        /setError|setBuildError|setCanonicalError|setCanonicalText\s*\(\s*['"`]/.test(
          block,
        );
      expect(surfacesError).toBe(true);
    }
  });
});
