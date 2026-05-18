// ============================================================================
// NowGreeting — compressed header (Phase 3.6.2 contract).
//
// Pre-3.6.2 layout had a 32pt title on row 1 and a metadata row below
// with emoji + current device-clock time + separator dot + subtitle.
// Phase 3.6.2 collapsed to a tighter ~60pt header zone:
//   • Title at fontSize 22, weight 500, letterSpacing -0.3
//   • Single inline subtitle: "{tod-emoji} {greeting.subtitle}"
//   • No metadataRow / metadataTime / metadataDot — current device-clock
//     time is dropped (the iOS status bar already shows it).
//
// The patient chip on NowHeader is independent and still asserted here.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const greetingSrc = readFileSync(
  join(__dirname, '../../components/now/NowGreeting.tsx'),
  'utf8',
);
const headerSrc = readFileSync(
  join(__dirname, '../../components/now/NowHeader.tsx'),
  'utf8',
);

function styleBlock(src: string, name: string): string {
  const re = new RegExp(`\\b${name}:\\s*\\{([^}]*)\\}`, 's');
  const m = src.match(re);
  return m ? m[1] : '';
}

function readNumberProp(block: string, prop: string): number | null {
  const m = block.match(new RegExp(`${prop}:\\s*(-?\\d+(?:\\.\\d+)?)`));
  return m ? Number(m[1]) : null;
}

describe('NowGreeting — compressed header (Phase 3.6.2)', () => {
  it('does NOT render a filled time chip with rgba purple background', () => {
    expect(greetingSrc).not.toMatch(/rgba\(180,\s*148,\s*244,\s*0\.15\)/);
    expect(greetingSrc).not.toMatch(/timeChip:\s*\{[^}]*backgroundColor/);
  });

  it('title block uses the canonical greeting register (Phase 33b Scope 1)', () => {
    // Phase 33b Scope 1 — greeting canonical block per
    // project_brand_alignment_canon.md `.phone-greeting`. Phase 33 F7
    // placed a TODO(phase-33b) marker here pending the architecture
    // reframe; 33b locks the canonical block (regular serif, 26pt,
    // weight 400, letterSpacing -0.5). Italic register moved to the
    // separate Subhead component (Phase 33b Scope 1; ships empty/null
    // in v1.0 per Path A).
    const titleBlock = styleBlock(greetingSrc, 'title');
    expect(titleBlock).not.toBe('');
    expect(readNumberProp(titleBlock, 'fontSize')).toBe(26);
    expect(titleBlock).toMatch(/fontWeight:\s*['"]400['"]/);
    expect(titleBlock).toMatch(/fontFamily:\s*Fonts\.serif\b/);
    expect(readNumberProp(titleBlock, 'letterSpacing')).toBe(-0.5);
  });

  it('renders a single inline subtitle (not a multi-element metadata row)', () => {
    // No metadataRow / metadataTime / metadataDot styles remain after 3.6.2.
    expect(greetingSrc).not.toMatch(/\bmetadataRow:\s*\{/);
    expect(greetingSrc).not.toMatch(/\bmetadataTime:\s*\{/);
    expect(greetingSrc).not.toMatch(/\bmetadataDot:\s*\{/);
    // A `subtitle` style block is the only inline secondary line.
    const subtitleBlock = styleBlock(greetingSrc, 'subtitle');
    expect(subtitleBlock).not.toBe('');
  });

  it('subtitle uses textSecondary at fontSize 12 with marginTop 4', () => {
    const block = styleBlock(greetingSrc, 'subtitle');
    expect(block).toMatch(/textSecondary/);
    expect(readNumberProp(block, 'fontSize')).toBe(12);
    expect(readNumberProp(block, 'marginTop')).toBe(4);
  });

  it('does NOT call formatCurrentTime — device-clock display retired', () => {
    // The iOS status bar already shows current time; rendering "5:58 PM"
    // in the greeting was a tautology Phase 3.6.2 removed.
    expect(greetingSrc).not.toMatch(/formatCurrentTime\s*\(\s*\)/);
  });
});

describe('NowGreeting — patient pill (smaller variant)', () => {
  // The patient pill lives in NowHeader, not NowGreeting. Assertions
  // unchanged by Phase 3.6 — the chip was already compact.
  it('patientChip has reduced font size (10pt)', () => {
    const nameBlock = styleBlock(headerSrc, 'patientChipName');
    const fs = readNumberProp(nameBlock, 'fontSize');
    expect(fs).not.toBeNull();
    expect(fs as number).toBeLessThanOrEqual(10);
  });

  it('patientChip avatar is 16pt (smaller variant)', () => {
    const avatarBlock = styleBlock(headerSrc, 'patientAvatar');
    const w = readNumberProp(avatarBlock, 'width');
    const h = readNumberProp(avatarBlock, 'height');
    expect(w).toBe(16);
    expect(h).toBe(16);
  });

  it('patientChip uses accentBorder + accentTint (subtle, not filled accentLight)', () => {
    const chipBlock = styleBlock(headerSrc, 'patientChip');
    expect(chipBlock).toMatch(/accentBorder/);
    expect(chipBlock).toMatch(/accentTint/);
  });

  it('patientChip border is 0.5px hairline (not full 1px)', () => {
    const chipBlock = styleBlock(headerSrc, 'patientChip');
    const bw = readNumberProp(chipBlock, 'borderWidth');
    expect(bw).toBe(0.5);
  });
});
