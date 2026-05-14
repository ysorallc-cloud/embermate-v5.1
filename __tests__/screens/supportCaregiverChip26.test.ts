// ============================================================================
// Phase 26 F3 — Caregiver chip in support.tsx headerWrap.
//
// The You tab's headerWrap pre-26 was a vertical stack: H1 "You" + subtitle
// "A space for you, not your loved one." With the tab-bar lavender lane
// established in Commit A, the You header needed the same "this is yours"
// chip the patient chip provides on Now (where it telegraphs "this is
// about Dad"). The chip:
//
//   • Renders at the top-left of the header row, on the SAME baseline as
//     the H1 title (chip-then-title same row).
//   • Mirrors the patient chip's dimensions (22pt height, 16pt avatar,
//     10pt name text) but tints lavender via caregiverAccent tokens.
//   • Reads the caregiver name via getCaregiverProfile() — the same
//     source Now and Journal use (storage/caregiverProfileRepo).
//   • Does NOT render when the caregiver name is empty (no "Caregiver"
//     placeholder — the chip is identity, not a slot).
//   • The subtitle "A space for you, not your loved one." drops below
//     the chip-plus-title row, unchanged in content and style.
//   • headerWrap padding stays at paddingTop: 32 / paddingBottom: 24 /
//     borderBottomWidth 0.5 so the four contracts pinned by
//     __tests__/screens/headerStructureContract.test.ts stay green.
//
// Pinned contracts:
//   1. support.tsx imports getCaregiverProfile from the canonical repo.
//   2. The screen carries a caregiverName state populated on mount via
//      getCaregiverProfile() — same shape as the Now tab.
//   3. headerWrap contains an inner row with flexDirection: 'row',
//      alignItems: 'center', gap: 12 (chip + title on same baseline).
//   4. A caregiverChip style block exists tinted via caregiverAccent
//      tokens (caregiverAccentBg / caregiverAccentStrong / caregiverAccent
//      — NOT colors.accent / accentTint, which are sage).
//   5. The chip render is conditionally gated on caregiverName being
//      truthy and non-whitespace (no "Caregiver" placeholder).
//   6. The subtitle (headerMessage "A space for you, not your loved one.")
//      still renders, and renders AFTER the row in source order — drops
//      below the row visually.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const SRC_PATH = join(__dirname, '../../app/(tabs)/support.tsx');
const SRC = readFileSync(SRC_PATH, 'utf8');
const STRIPPED = SRC
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

describe('Phase 26 F3 — caregiver chip in support.tsx headerWrap', () => {
  it('contract 1: imports getCaregiverProfile from storage/caregiverProfileRepo', () => {
    expect(STRIPPED).toMatch(
      /import\s*\{[^}]*getCaregiverProfile[^}]*\}\s*from\s*['"][^'"]*caregiverProfileRepo['"]/,
    );
  });

  it('contract 2: carries a caregiverName state populated via getCaregiverProfile() on mount', () => {
    // useState for caregiverName — empty string default matches the Now
    // / Journal patterns.
    expect(STRIPPED).toMatch(/useState[^(]*\(['"]['"]\)|useState[^(]*<\s*string\s*>\s*\(['"]['"]\)/);
    expect(STRIPPED).toMatch(/setCaregiverName/);
    // useEffect on mount that calls getCaregiverProfile().then(...)
    expect(STRIPPED).toMatch(/getCaregiverProfile\(\)/);
  });

  it('contract 3: headerWrap contains an inner row (chip + title same baseline)', () => {
    // A new styles entry — chip-and-title row — must be flexDirection:
    // 'row' with alignItems: 'center' and gap: 12.
    // Pin by locating a style block with these three properties together.
    const headerRowMatch = STRIPPED.match(
      /\bheaderTitleRow\s*:\s*\{[\s\S]*?\}|\bheaderRow\s*:\s*\{[\s\S]*?\}/,
    );
    expect(headerRowMatch).toBeTruthy();
    const rowBlock = headerRowMatch![0];
    expect(rowBlock).toMatch(/flexDirection:\s*['"]row['"]/);
    expect(rowBlock).toMatch(/alignItems:\s*['"]center['"]/);
    expect(rowBlock).toMatch(/gap:\s*12/);
  });

  it('contract 4: caregiverChip style routes through caregiverAccent tokens (NOT accent / accentTint)', () => {
    const chipBlock = STRIPPED.match(/\bcaregiverChip\s*:\s*\{[\s\S]*?\n\s*\}/);
    expect(chipBlock).toBeTruthy();
    const b = chipBlock![0];
    // Mirror the patient chip dimensions.
    expect(b).toMatch(/height:\s*22/);
    expect(b).toMatch(/borderRadius:\s*11/);
    // Lavender — not sage.
    expect(b).toMatch(/caregiverAccent/);
    expect(b).not.toMatch(/c\.accentTint\b/);
    expect(b).not.toMatch(/borderColor:\s*c\.accentBorder\b/);
  });

  it('contract 5: chip render is gated on caregiverName being truthy + non-whitespace', () => {
    // Acceptable gating shapes — the chip is identity, not a slot, so
    // an empty caregiverName must not render the chip:
    //   {caregiverName ? <Chip/> : null}
    //   {caregiverName && <Chip/>}
    //   {caregiverName.trim().length > 0 && <Chip/>}
    //   {caregiverName.length > 0 && <Chip/>}        ← trim happens at the
    //                                                  useEffect setState
    //                                                  upstream, so .length
    //                                                  here is whitespace-safe
    const chipJsxRegion = STRIPPED.match(
      /styles\.caregiverChip[\s\S]{0,300}/,
    );
    expect(chipJsxRegion).toBeTruthy();
    const around = STRIPPED.slice(
      Math.max(0, chipJsxRegion!.index! - 400),
      chipJsxRegion!.index! + chipJsxRegion![0].length,
    );
    expect(around).toMatch(/caregiverName\s*(?:\?|&&|\.trim|\.length)/);
  });

  it('contract 6: subtitle "A space for you, not your loved one." still renders, AFTER the chip+title row in source order', () => {
    // Subtitle copy intact (no incidental rewrites).
    expect(STRIPPED).toMatch(/A space for you, not your loved one\./);
    // The chip JSX must appear before the subtitle in source order so
    // the subtitle renders below the row visually.
    const chipIdx = STRIPPED.indexOf('styles.caregiverChip');
    const subtitleIdx = STRIPPED.indexOf('A space for you, not your loved one.');
    expect(chipIdx).toBeGreaterThan(-1);
    expect(subtitleIdx).toBeGreaterThan(-1);
    expect(chipIdx).toBeLessThan(subtitleIdx);
  });
});
