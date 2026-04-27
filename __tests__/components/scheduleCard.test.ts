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

  it('active row has accent-tinted background; dim rows have no background', () => {
    // Active style applies an accent-tinted bg (accentFaint or rgba accent)
    expect(cardSrc).toMatch(/accentFaint|rgba\(\s*52,\s*211,\s*153,\s*0\.0[6-9]/i);
    // Default (non-active) windowRow style should NOT declare a background
    const rowBlock = cardSrc.match(/windowRow:\s*\{[^}]*\}/s);
    expect(rowBlock).toBeTruthy();
    expect(rowBlock![0]).not.toMatch(/backgroundColor/);
  });

  it('row vertical padding is at least 14pt (breathing room above/below dividers)', () => {
    // Bumped from 12pt → 14pt+ in v6.7 — see
    // __tests__/components/scheduleCardSpacing.test.ts for the full contract.
    const rowBlock = cardSrc.match(/windowRow:\s*\{[^}]*\}/s);
    expect(rowBlock).toBeTruthy();
    const padMatch = rowBlock![0].match(/paddingVertical:\s*(\d+)/);
    expect(padMatch).toBeTruthy();
    expect(Number(padMatch![1])).toBeGreaterThanOrEqual(14);
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
