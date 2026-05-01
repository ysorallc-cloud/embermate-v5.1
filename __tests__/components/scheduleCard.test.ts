import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const cardPath = join(__dirname, '../../components/now/ScheduleCard.tsx');
const timelinePath = join(__dirname, '../../components/now/NowTimeline.tsx');

const cardSrc = existsSync(cardPath) ? readFileSync(cardPath, 'utf8') : '';
const timelineSrc = existsSync(timelinePath) ? readFileSync(timelinePath, 'utf8') : '';

describe('Schedule card — single card with internal dividers', () => {
  it('ScheduleCard component file exists', () => {
    expect(existsSync(cardPath)).toBe(true);
  });

  it('schedule renders as a single card surface (one wrapping View)', () => {
    // Should declare exactly one container/card style with borderRadius and a
    // background, and the JSX should map rows inside that single wrapper.
    const cardStyles = (cardSrc.match(/card:\s*\{|container:\s*\{/g) || []).length;
    expect(cardStyles).toBeGreaterThanOrEqual(1);
    expect(cardSrc).toMatch(/borderRadius:\s*14/);
  });

  it('rows after the first use 0.5px borderTop as internal divider', () => {
    expect(cardSrc).toMatch(/borderTopWidth:\s*0\.5/);
    expect(cardSrc).toMatch(/idx\s*>\s*0\s*&&/);
  });

  it('divider color uses subtle rgba or token (works in both modes)', () => {
    expect(cardSrc).toMatch(/rgba\(255,\s*255,\s*255,\s*0\.04\)|warmSurfaceBorder|glassDim|glassBorder/);
  });

  it('active row has NO card-in-card fill (May 1 sizing pass — Phase 3b)', () => {
    // Active state is conveyed by sage label / status / Start › text-link
    // colour, not a tinted background. The default windowRow style and
    // any windowRowActive style both declare zero backgroundColor.
    const rowBlock = cardSrc.match(/windowRow:\s*\{[^}]*\}/s);
    expect(rowBlock).toBeTruthy();
    expect(rowBlock![0]).not.toMatch(/backgroundColor/);
    const activeBlock = cardSrc.match(/windowRowActive:\s*\{[^}]*\}/s);
    if (activeBlock) {
      expect(activeBlock[0]).not.toMatch(/backgroundColor/);
    }
  });

  it('row vertical padding equalizes active + inactive at 6pt (May 1 sizing pass — Phase 3b)', () => {
    // The prior pass bumped to 14pt for breathing room; Phase 3b of the
    // May 1 pass reverts to 6 so active and inactive rows share row
    // geometry. Active state is colour-only, so taller padding made the
    // active row visually heavier than its dim siblings.
    const rowBlock = cardSrc.match(/windowRow:\s*\{[^}]*\}/s);
    expect(rowBlock).toBeTruthy();
    const padMatch = rowBlock![0].match(/paddingVertical:\s*(\d+)/);
    expect(padMatch).toBeTruthy();
    expect(Number(padMatch![1])).toBe(6);
  });

  it('exposes windows + onStart props matching the spec', () => {
    expect(cardSrc).toMatch(/windows\s*:/);
    expect(cardSrc).toMatch(/onStart\s*:/);
    // Each window item carries the four documented fields
    expect(cardSrc).toMatch(/name\s*:/);
    expect(cardSrc).toMatch(/status\s*:/);
    expect(cardSrc).toMatch(/remaining\s*:/);
    expect(cardSrc).toMatch(/isActive\s*:/);
  });

  it('NowTimeline section header still reads "Today\'s Schedule"', () => {
    expect(timelineSrc).toContain("Today's Schedule");
  });

  it('"Today\'s Schedule" header has no disclosure triangle indicator', () => {
    // Triangle glyphs that previously implied an expand/collapse affordance —
    // tap toggles still work, but no visual chevron should remain on the row.
    const triangleEscapes = ['\\u25B6', '\\u25BC', '\\u25B8', '\\u25B7', '\\u25BD'];
    for (const esc of triangleEscapes) {
      expect(timelineSrc).not.toContain(esc);
    }
    const triangleGlyphs = ['▶', '▼', '▸', '▷', '▽'];
    for (const glyph of triangleGlyphs) {
      expect(timelineSrc).not.toContain(glyph);
    }
  });

  it('"Tap Start when you\'re ready" helper text is not rendered unconditionally', () => {
    expect(timelineSrc).not.toMatch(/>\s*Tap Start when you're ready/);
  });

  it('NowTimeline imports and uses ScheduleCard', () => {
    expect(timelineSrc).toMatch(/from\s+['"].\/ScheduleCard['"]|import.*ScheduleCard/);
    expect(timelineSrc).toMatch(/<ScheduleCard\b/);
  });
});
