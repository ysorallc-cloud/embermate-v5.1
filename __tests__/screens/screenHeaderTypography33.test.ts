// ============================================================================
// screenHeaderTypography33 — Phase 33 header typography contract.
//
// Pins the shipped typography for the two header primitives that
// migrated in Phase 33 F4 + F5:
//   • ScreenHeader (Journal + Insights tab headers + ~20 sub-screens)
//   • SubScreenHeader default + serif-italic variants
//
// EXCLUDED from this contract (Phase 33b carve-out per locked plan):
//   • NowGreeting style — Phase 33b Scope 1 architecture reframe will
//     replace F6's 22pt italic-serif with a regular-serif 26pt greeting
//     line + separate italic-serif subhead component. Pinning the
//     current state would create a contract Phase 33b immediately
//     violates. TODO(phase-33b) markers in nowGreeting.test.tsx and
//     headerStructureContract.test.ts continue to hold the open reframe.
//   • Support (You-tab) greeting — same carve-out: Phase 33b Scope 1
//     reverts F6's italic greeting to regular serif at 26pt as part
//     of the same coordinated greeting+subhead reframe. F6 italic
//     greeting holds in-app until 33b ships the corrected pattern.
//
// EXCLUDED from this contract (Phase 33b Lock 4 carve-out):
//   • SectionEyebrow letterSpacing — Phase 33 F8 shipped at
//     letterSpacing: 2 per Q-33.8 lock. Phase 33b Lock 4 (eyebrow
//     canon reconciliation) may relock to website canon 1.5.
//     ScreenHeader headline letterSpacing (-0.8) IS pinned here —
//     different canon, different Phase 33b scope.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

const screenHeaderSrc = read('components/ScreenHeader.tsx');
const subScreenHeaderSrc = read('components/SubScreenHeader.tsx');

function styleBlock(src: string, name: string): string {
  // Brace-counter walk so style blocks with nested objects don't close early.
  const opener = src.indexOf(`${name}: {`);
  if (opener < 0) return '';
  const start = opener + name.length + 3;
  let depth = 1;
  let i = start;
  while (i < src.length && depth > 0) {
    if (src[i] === '{') depth += 1;
    else if (src[i] === '}') depth -= 1;
    i += 1;
  }
  return src.slice(start, i - 1);
}

function num(block: string, prop: string): number | null {
  const m = block.match(new RegExp(`\\b${prop}:\\s*(-?\\d+(?:\\.\\d+)?)`));
  return m ? Number(m[1]) : null;
}

// ── ScreenHeader (Journal + Insights tab headers + sub-screens) ──────────

describe('screenHeaderTypography33 — ScreenHeader.title (Phase 33 F4)', () => {
  it('fontFamily routes through Fonts.serif token', () => {
    const block = styleBlock(screenHeaderSrc, 'title');
    expect(block).toMatch(/fontFamily:\s*Fonts\.serif\b(?!Italic|Medium|SemiBold)/);
  });

  it('fontSize is 32 (base size for short titles)', () => {
    const block = styleBlock(screenHeaderSrc, 'title');
    expect(num(block, 'fontSize')).toBe(32);
  });

  it('fontWeight is 400 (regular-weight serif per Q-33.5)', () => {
    const block = styleBlock(screenHeaderSrc, 'title');
    expect(block).toMatch(/fontWeight:\s*['"]400['"]/);
  });

  it('letterSpacing is -0.8 (website headline canon)', () => {
    const block = styleBlock(screenHeaderSrc, 'title');
    expect(num(block, 'letterSpacing')).toBe(-0.8);
  });

  it('color routes through c.textPrimary (cream cascade from F1a)', () => {
    const block = styleBlock(screenHeaderSrc, 'title');
    expect(block).toMatch(/color:\s*c\.textPrimary|color:\s*colors\.textPrimary/);
  });
});

describe('screenHeaderTypography33 — ScreenHeader.titleShrink (long titles > 16 chars)', () => {
  it('fontSize is 28 (drops from 32 base; runtime adjustsFontSizeToFit handles overflow)', () => {
    const block = styleBlock(screenHeaderSrc, 'titleShrink');
    expect(num(block, 'fontSize')).toBe(28);
  });

  it('letterSpacing matches base at -0.8 (no tracking divergence between sizes)', () => {
    const block = styleBlock(screenHeaderSrc, 'titleShrink');
    expect(num(block, 'letterSpacing')).toBe(-0.8);
  });
});

// ── SubScreenHeader.title (default variant — Phase 33 F5) ────────────────

describe('screenHeaderTypography33 — SubScreenHeader.title default variant (Phase 33 F5)', () => {
  it('fontFamily routes through Fonts.serif token (regular serif per Q-33.7)', () => {
    const block = styleBlock(subScreenHeaderSrc, 'title');
    expect(block).toMatch(/fontFamily:\s*Fonts\.serif\b(?!Italic|Medium|SemiBold)/);
  });

  it('fontSize is 32', () => {
    const block = styleBlock(subScreenHeaderSrc, 'title');
    expect(num(block, 'fontSize')).toBe(32);
  });

  it('fontWeight is 400 (regular-weight serif; pre-Phase-33 was 300)', () => {
    const block = styleBlock(subScreenHeaderSrc, 'title');
    expect(block).toMatch(/fontWeight:\s*['"]400['"]/);
  });

  it('letterSpacing is -0.8 (matches ScreenHeader base headline canon)', () => {
    const block = styleBlock(subScreenHeaderSrc, 'title');
    expect(num(block, 'letterSpacing')).toBe(-0.8);
  });

  it('color routes through c.textPrimary', () => {
    const block = styleBlock(subScreenHeaderSrc, 'title');
    expect(block).toMatch(/color:\s*c\.textPrimary|color:\s*colors\.textPrimary/);
  });
});

// ── SubScreenHeader.titleSerif (italic variant — opt-in for witness voice) ─

describe('screenHeaderTypography33 — SubScreenHeader.titleSerif italic variant', () => {
  // Witness-voice opt-in variant — caregiver-wellness + /resources subscreens
  // consume this via titleVariant="serif". Italic stays reserved for witness
  // voice; the default variant above is regular serif for informational labels.
  it('fontFamily routes through Fonts.serifItalic token', () => {
    const block = styleBlock(subScreenHeaderSrc, 'titleSerif');
    expect(block).toMatch(/fontFamily:\s*Fonts\.serifItalic\b/);
  });

  it('fontStyle is italic', () => {
    const block = styleBlock(subScreenHeaderSrc, 'titleSerif');
    expect(block).toMatch(/fontStyle:\s*['"]italic['"]/);
  });

  it('fontSize is 20 (smaller than 32 default — italic witness-voice subscreen H1 sits below informational register)', () => {
    const block = styleBlock(subScreenHeaderSrc, 'titleSerif');
    expect(num(block, 'fontSize')).toBe(20);
  });

  it('fontWeight is 400', () => {
    const block = styleBlock(subScreenHeaderSrc, 'titleSerif');
    expect(block).toMatch(/fontWeight:\s*['"]400['"]/);
  });

  it('letterSpacing is 0.1 (positive tracking on italic, opposite of -0.8 headline contraction)', () => {
    const block = styleBlock(subScreenHeaderSrc, 'titleSerif');
    expect(num(block, 'letterSpacing')).toBe(0.1);
  });

  it('lineHeight is 26', () => {
    const block = styleBlock(subScreenHeaderSrc, 'titleSerif');
    expect(num(block, 'lineHeight')).toBe(26);
  });
});

// ── titleVariant prop wiring (Phase 29 Batch C F1 + Phase 33 F5) ─────────

describe('screenHeaderTypography33 — SubScreenHeader.titleVariant prop wiring', () => {
  it('props interface declares titleVariant?: "default" | "serif"', () => {
    expect(subScreenHeaderSrc).toMatch(
      /titleVariant\?:\s*['"]?default['"]?\s*\|\s*['"]?serif['"]?/,
    );
  });

  it('component destructures titleVariant with "default" fallback', () => {
    expect(subScreenHeaderSrc).toMatch(/titleVariant\s*=\s*['"]default['"]/);
  });

  it('JSX selects titleSerif vs title based on titleVariant', () => {
    expect(subScreenHeaderSrc).toMatch(
      /titleVariant\s*===\s*['"]serif['"]\s*\?\s*styles\.titleSerif\s*:\s*styles\.title/,
    );
  });
});
