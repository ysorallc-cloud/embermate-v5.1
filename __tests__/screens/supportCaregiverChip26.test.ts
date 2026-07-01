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

  it('contract 3 (You rebuild S4): the caregiverChip style block is RETIRED (full de-purple)', () => {
    // The lavender "This is your space" chip is removed in the You rebuild.
    // The warm top now flows greeting → reflect line → breath, chip-less.
    expect(STRIPPED).not.toMatch(/\bcaregiverChip\s*:\s*\{/);
    expect(STRIPPED).not.toMatch(/\bheaderTitleRow\s*:\s*\{/);
  });

  it('contract 4 (You rebuild S4): no lavender chip chrome remains (caregiverChip* family gone)', () => {
    expect(STRIPPED).not.toMatch(/caregiverChipAvatar|caregiverChipName/);
    expect(STRIPPED).not.toMatch(/styles\.caregiverChip\b/);
  });

  it('contract 5 (You rebuild S4): the "This is your space" chip copy is retired', () => {
    expect(STRIPPED).not.toMatch(/This is your space/);
  });

  it('contract 6: the pre-29 subtitle "A space for you..." stays retired', () => {
    expect(STRIPPED).not.toMatch(/A space for you, not your loved one/);
  });
});
