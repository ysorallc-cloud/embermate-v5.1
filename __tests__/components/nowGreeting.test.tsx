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

  it('title block exists at 22pt', () => {
    // TODO(phase-33b): re-pin once the greeting style block relocks
    // per website canon. Phase 33 F7 dropped the fontWeight 500
    // assertion because Phase 33b's greeting+subhead architecture
    // supersedes Q-33.5's italic-greeting interpretation — the new
    // style block has not yet been locked, and pinning against an
    // unfinished spec would re-litigate the contract every iteration.
    // The 22pt fontSize survives (it's a separate compression-pass
    // invariant from Phase 3.6.2 unrelated to the greeting voice
    // question). Weight + family + style + lineHeight + letterSpacing
    // assertions land in F11's screenHeaderTypography33 contract
    // against the post-Phase-33b shape.
    const titleBlock = styleBlock(greetingSrc, 'title');
    expect(titleBlock).not.toBe('');
    expect(readNumberProp(titleBlock, 'fontSize')).toBe(22);
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
