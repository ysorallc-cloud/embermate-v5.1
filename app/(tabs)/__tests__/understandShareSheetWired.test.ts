// ============================================================================
// Phase 15.11 — Insights wiring pinned at the source level.
//
// Pre-15.11 understand.tsx rendered three stacked reportCards
// inside an IIFE gated by gating.showReports. Each card carried
// its own "Share" button. 15.11 consolidates them onto one
// button that opens a ShareSheet exposing the same three
// actions.
//
// What changed in understand.tsx:
//   • The hardcoded array of 3 {key,title,subtitle,icon} entries
//     and its .map() render are gone.
//   • A single TouchableOpacity (one button) sits in the same
//     gated position, opening the new ShareSheet.
//   • A handleShareSelection helper routes 'visit-prep' →
//     navigate, 'care-report' / 'medication-report' →
//     Share.share + toast. Exactly the dispatch the old inline
//     onPress did.
//
// What did NOT change:
//   • Gating (gating.showReports) — same data-state rules apply
//     to whether the section renders.
//   • The Share.share call sites for care + medication — same
//     payload structure as the pre-15.11 inline branch.
//   • The visit-prep navigation target — still navigate('/visit-prep').
//
// codeOnly() strips comments before regex matching so retirement
// prose mentioning removed symbols by name does not false-positive.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

function codeOnly(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('Phase 15.11 — Insights ↔ ShareSheet wiring', () => {
  const source = readFileSync(
    join(__dirname, '../understand.tsx'), 'utf8',
  );
  const code = codeOnly(source);

  it('contract 1: the three-entry reportCard array + map() render are gone', () => {
    // Pre-15.11 entries: { key: 'provider', ... }, { key: 'care', ... },
    // { key: 'medication', ... }. None of those literal keys should
    // appear in the Insights screen after consolidation.
    expect(code).not.toMatch(/\bkey:\s*['"]provider['"]/);
    expect(code).not.toMatch(/\bkey:\s*['"]care['"]/);
    expect(code).not.toMatch(/\bkey:\s*['"]medication['"]/);
    // The reportCard / reportShareBtn styles + the per-card Share
    // text label should also be gone.
    expect(code).not.toMatch(/\breportCard\s*:/);
    expect(code).not.toMatch(/\breportShareBtn\s*:/);
    expect(code).not.toMatch(/\breportShareText\s*:/);
    expect(code).not.toMatch(/\breportIcon\s*:/);
    expect(code).not.toMatch(/\breportInfo\s*:/);
    expect(code).not.toMatch(/\breportTitle\s*:/);
    expect(code).not.toMatch(/\breportSubtitle\s*:/);
  });

  it('contract 2: ShareSheet runtime mount retired in 16.4 (was imported and rendered in 15.11)', () => {
    // Phase 16.4 — runtime ShareSheet mount retired pre-launch
    // because the Care/Medication report options text-shared with no
    // visible system sheet on simulator. The component file is left
    // on disk as orphan source (Phase 21 will restore the mount).
    // The TS-only type import for ShareOption may remain.
    expect(code).not.toMatch(/<ShareSheet\b/);
  });

  it('contract 3: ShareSheet visibility state retired in 16.4 (was driven by useState in 15.11)', () => {
    // shareSheetOpen / setShareSheetOpen retired with the runtime
    // mount. Direct-button approach has no sheet state to manage.
    expect(code).not.toMatch(/\bshareSheetOpen\b/);
    expect(code).not.toMatch(/\bsetShareSheetOpen\b/);
  });

  it('contract 4: the single Share button is rendered (post-16.4 routes directly to /visit-prep)', () => {
    // Phase 16.4 — the button still renders with the same copy
    // ("Share with {provider}" / "Share these insights"). Its
    // onPress no longer opens the ShareSheet; it invokes
    // handleShareSelection('visit-prep') for a direct navigation.
    expect(code).toMatch(/Share with |Share these insights/);
  });

  it('contract 5: handleShareSelection dispatch covers all three options', () => {
    // The selection handler must route to all three keys. Pin
    // each branch explicitly so a future refactor that drops
    // one (the easy mistake) gets caught.
    expect(code).toMatch(/['"]visit-prep['"]/);
    expect(code).toMatch(/['"]care-report['"]/);
    expect(code).toMatch(/['"]medication-report['"]/);
  });

  it('contract 6: visit-prep navigation target is preserved', () => {
    expect(code).toMatch(/navigate\(['"]\/visit-prep['"]\)/);
  });

  it('contract 7: Share.share calls retired in 16.4 (broken text-only payload was unreachable)', () => {
    // Phase 16.4 — Share.share calls retired with the care/medication
    // branch bodies. Phase 21 will replace these no-ops with real
    // generate-and-share calls when the PDF pipeline ships, and the
    // bodies will return.
    expect(code).not.toMatch(/Share\.share\(/);
  });

  it('contract 8: ShareToast wiring stays intact (still triggered by other surfaces)', () => {
    // The toast component itself stays mounted — other share paths
    // (visit-prep-preview) may still emit it. setShareToastVisible
    // is no longer called from understand.tsx post-16.4 since the
    // care/medication handler bodies that fired it are no-ops.
    expect(code).toMatch(/<ShareToast\b/);
  });

  it('contract 9: section gating (gating.showReports) is preserved', () => {
    // Same data-state gate. The single button + sheet should
    // continue to be hidden in empty/building states.
    expect(code).toMatch(/gating\.showReports/);
  });
});
