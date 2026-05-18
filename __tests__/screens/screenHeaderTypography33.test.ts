// ============================================================================
// screenHeaderTypography33 — Phase 33 header typography contract.
//
// Pins the shipped typography for the two header primitives that
// migrated in Phase 33 F4 + F5:
//   • ScreenHeader (Journal + Insights tab headers + ~20 sub-screens)
//   • SubScreenHeader default + serif-italic variants
//
// Greeting blocks INCLUDED (Phase 33b Scope 1 — carve-out closed):
//   • NowGreeting (components/now/NowGreeting.tsx) — canonical 26pt
//     regular-serif block per `.phone-greeting` website canon
//   • Support / You-tab greeting (app/(tabs)/support.tsx) — same
//     canonical block; symmetric with NowGreeting
//   • Subhead component (components/shared/Subhead.tsx) — italic-serif
//     14pt witness-voice register; ships empty/null in v1.0 per
//     Path A; v1.1 fills via rewritten caregiverWitnessBuilder
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
const nowGreetingSrc = read('components/now/NowGreeting.tsx');
const supportSrc = read('app/(tabs)/support.tsx');
const subheadSrc = read('components/shared/Subhead.tsx');

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

// ── NowGreeting + Support greeting (Phase 33b Scope 1) ───────────────────

describe('screenHeaderTypography33 — NowGreeting canonical greeting block (Phase 33b Scope 1)', () => {
  it('fontFamily routes through Fonts.serif token (regular, not italic)', () => {
    const block = styleBlock(nowGreetingSrc, 'title');
    expect(block).toMatch(/fontFamily:\s*Fonts\.serif\b(?!Italic|Medium|SemiBold)/);
  });

  it('fontSize is 26 (website `.phone-greeting` canon)', () => {
    const block = styleBlock(nowGreetingSrc, 'title');
    expect(num(block, 'fontSize')).toBe(26);
  });

  it('fontWeight is 400 (regular-weight serif; italic register moves to Subhead)', () => {
    const block = styleBlock(nowGreetingSrc, 'title');
    expect(block).toMatch(/fontWeight:\s*['"]400['"]/);
  });

  it('letterSpacing is -0.5 (website canon)', () => {
    const block = styleBlock(nowGreetingSrc, 'title');
    expect(num(block, 'letterSpacing')).toBe(-0.5);
  });

  it('color routes through c.textPrimary', () => {
    const block = styleBlock(nowGreetingSrc, 'title');
    expect(block).toMatch(/color:\s*c\.textPrimary|color:\s*colors\.textPrimary/);
  });
});

describe('screenHeaderTypography33 — Support greeting canonical block (Phase 33b Scope 1)', () => {
  // Symmetric with NowGreeting — both tabs render the same canonical
  // greeting per the Path 2 lock that superseded Q-33.5's italic-greeting
  // interpretation. F6's italic-serif greeting retired here.
  it('fontFamily routes through Fonts.serif token (regular, not italic; F6 retired)', () => {
    const block = styleBlock(supportSrc, 'greeting');
    expect(block).toMatch(/fontFamily:\s*Fonts\.serif\b(?!Italic|Medium|SemiBold)/);
  });

  it('fontSize is 26', () => {
    const block = styleBlock(supportSrc, 'greeting');
    expect(num(block, 'fontSize')).toBe(26);
  });

  it('fontWeight is 400', () => {
    const block = styleBlock(supportSrc, 'greeting');
    expect(block).toMatch(/fontWeight:\s*['"]400['"]/);
  });

  it('letterSpacing is -0.5', () => {
    const block = styleBlock(supportSrc, 'greeting');
    expect(num(block, 'letterSpacing')).toBe(-0.5);
  });

  it('no fontStyle: italic (italic register moved to Subhead component)', () => {
    const block = styleBlock(supportSrc, 'greeting');
    expect(block).not.toMatch(/fontStyle:\s*['"]italic['"]/);
  });
});

// ── Subhead component (Phase 33b Scope 1) ────────────────────────────────

describe('screenHeaderTypography33 — Subhead component canonical block (Phase 33b Scope 1)', () => {
  // The italic-serif witness-voice register moved here from F6's greeting.
  // Ships empty/null in v1.0 per Path A; v1.1 fills via rewritten
  // caregiverWitnessBuilder + retires AffirmationHeader in the same phase.
  it('fontFamily routes through Fonts.serifItalic token', () => {
    const block = styleBlock(subheadSrc, 'text');
    expect(block).toMatch(/fontFamily:\s*Fonts\.serifItalic\b/);
  });

  it('fontStyle is italic (witness-voice register)', () => {
    const block = styleBlock(subheadSrc, 'text');
    expect(block).toMatch(/fontStyle:\s*['"]italic['"]/);
  });

  it('fontSize is 14 (website `.phone-greeting-sub` canon)', () => {
    const block = styleBlock(subheadSrc, 'text');
    expect(num(block, 'fontSize')).toBe(14);
  });

  it('fontWeight is 400', () => {
    const block = styleBlock(subheadSrc, 'text');
    expect(block).toMatch(/fontWeight:\s*['"]400['"]/);
  });

  it('lineHeight is 21 (1.5 × fontSize per website canon)', () => {
    const block = styleBlock(subheadSrc, 'text');
    expect(num(block, 'lineHeight')).toBe(21);
  });

  it('marginTop routes through Spacing.s2 (8pt — canonical greeting → subhead gap)', () => {
    const block = styleBlock(subheadSrc, 'text');
    expect(block).toMatch(/marginTop:\s*Spacing\.s2\b/);
  });

  it('color routes through c.textSecondary (cream-tan, dimmer than greeting textPrimary)', () => {
    const block = styleBlock(subheadSrc, 'text');
    expect(block).toMatch(/color:\s*c\.textSecondary/);
  });

  it('renders null when children is falsy (no phantom whitespace)', () => {
    // Source-level contract: the component's render path must explicitly
    // return null for falsy children before reaching the Text render.
    // Defends the consumer pattern `<Subhead>{maybeText}</Subhead>` /
    // `{maybeText ? <Subhead>{maybeText}</Subhead> : null}` against
    // accidental phantom marginTop allocation.
    expect(subheadSrc).toMatch(/if\s*\(\s*!children/);
    expect(subheadSrc).toMatch(/return\s+null/);
  });
});
