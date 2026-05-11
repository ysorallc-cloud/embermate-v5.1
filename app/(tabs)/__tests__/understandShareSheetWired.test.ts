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

  it('contract 2: ShareSheet is imported and rendered', () => {
    expect(code).toMatch(/import\s+\{[^}]*\bShareSheet\b[^}]*\}\s+from\s+['"][^'"]*components\/insights\/ShareSheet['"]/);
    expect(code).toMatch(/<ShareSheet\b/);
  });

  it('contract 3: a state hook drives the sheet visibility', () => {
    // The state name itself is implementation detail; pin the
    // pattern: a useState somewhere passes a boolean into the
    // ShareSheet `visible` prop. The simplest fingerprint is
    // `visible={` immediately following the ShareSheet open tag.
    expect(code).toMatch(/<ShareSheet[\s\S]{0,200}?visible=\{/);
    expect(code).toMatch(/<ShareSheet[\s\S]{0,400}?onClose=\{/);
    expect(code).toMatch(/<ShareSheet[\s\S]{0,400}?onSelect=\{/);
  });

  it('contract 4: the single Share button opens the sheet', () => {
    // The new button has either "Share with " (when an
    // appointment is in window) or "Share these insights"
    // (fallback). Pin both possibilities under one regex.
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

  it('contract 7: Share.share calls survive for care + medication payloads', () => {
    // The inline onPress called Share.share with a text payload.
    // The new handler keeps that exact mechanism (no PDF
    // generation introduced — that promise was already not kept
    // in the pre-15.11 implementation; 15.11 is UI consolidation,
    // not feature addition).
    expect(code).toMatch(/Share\.share\(/);
  });

  it('contract 8: ShareToast wiring stays intact', () => {
    // The toast was triggered before Share.share in the pre-15.11
    // care/medication branch. Same UX is preserved by handle-
    // ShareSelection.
    expect(code).toMatch(/setShareToastVisible/);
    expect(code).toMatch(/<ShareToast\b/);
  });

  it('contract 9: section gating (gating.showReports) is preserved', () => {
    // Same data-state gate. The single button + sheet should
    // continue to be hidden in empty/building states.
    expect(code).toMatch(/gating\.showReports/);
  });
});
