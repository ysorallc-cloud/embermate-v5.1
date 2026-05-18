// ============================================================================
// Phase 7.3 — Plan Ahead section reframe.
//
// Old: "PLAN AHEAD" administrative eyebrow + serif italic subtitle
// "When things are calm, future you will be glad." Two warmth lines
// with one structural label, slightly out of register.
//
// New: a single serif-italic header "When you have a moment" sized to
// match the affirmation header bump (18pt). The resources list below
// carries the meaning. No double warmth.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const supportSrc = readFileSync(
  join(ROOT, 'app/(tabs)/support.tsx'),
  'utf8',
);

describe('Phase 7.3 — Plan Ahead caregiver-voice header', () => {
  it('renders the new "When you have a moment" header', () => {
    expect(supportSrc).toMatch(/When you have a moment/);
  });

  it('does NOT render the old "PLAN AHEAD" uppercase eyebrow', () => {
    // Whole-word so this doesn't catch comments / docstrings that
    // describe the section by name in the abstract.
    expect(supportSrc).not.toMatch(/['"]PLAN AHEAD['"]/);
  });

  it('does NOT render the old "future you will be glad" subtitle', () => {
    expect(supportSrc).not.toMatch(/future you will be glad/);
  });

  it('still mounts ResourcesList below the header (regression guard)', () => {
    // The resources list is the body of the section — must continue to
    // render after the reframe.
    expect(supportSrc).toMatch(/<ResourcesList\b/);
  });

  it('the new header style uses 18pt serif italic to match the affirmation bump', () => {
    // The style block driving the new header should hit those numbers.
    const block = supportSrc.match(/planAheadHeader:\s*\{([\s\S]*?)\}/);
    expect(block).toBeTruthy();
    const body = block![1];
    expect(body).toMatch(/fontSize:\s*18\b/);
    // Phase 33 F7 — Georgia literal swept to Fonts.serifItalic token.
    expect(body).toMatch(/fontFamily:\s*Fonts\.serifItalic\b/);
    expect(body).toMatch(/fontStyle:\s*['"]italic['"]/);
  });
});
