// ============================================================================
// AffirmationHeader — daily affirmation rendered as ambient header copy.
// Locks in the v6.7 You-tab redesign Phase 1: serif italic line at the
// top of the You tab, centered, narrow column, low-key but readable.
// ============================================================================

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const filePath = join(ROOT, 'components/support/AffirmationHeader.tsx');
const src = existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';

function styleBlock(name: string): string {
  const re = new RegExp(`\\b${name}:\\s*\\{([^}]*)\\}`, 's');
  const m = src.match(re);
  return m ? m[1] : '';
}

function num(block: string, prop: string): number | null {
  const m = block.match(new RegExp(`\\b${prop}:\\s*(-?\\d+(?:\\.\\d+)?)`));
  return m ? Number(m[1]) : null;
}

describe('AffirmationHeader — file + exports', () => {
  it('components/support/AffirmationHeader.tsx exists', () => {
    expect(existsSync(filePath)).toBe(true);
  });

  it('exports a named React component (AffirmationHeader)', () => {
    expect(src).toMatch(/export\s+(?:function|const)\s+AffirmationHeader\b/);
  });

  it('imports the daily picker from utils/dailyAffirmation', () => {
    expect(src).toMatch(/from\s+['"][^'"]*dailyAffirmation['"]/);
    expect(src).toMatch(/getDailyAffirmation/);
  });
});

describe('AffirmationHeader — typography contract', () => {
  it('text uses a serif font family', () => {
    const block = styleBlock('text');
    expect(block).not.toBe('');
    // Phase 33 F7 — Georgia literal swept to Fonts.serifItalic token.
    // Accept either the literal forms (legacy) or the Fonts.serif*
    // identifier (post-F7 form) so the assertion is robust to either.
    expect(block).toMatch(
      /fontFamily:\s*(?:['"](?:serif|Georgia|Times New Roman)['"]|Fonts\.serif(?:Italic|Medium|SemiBold)?\b)/i,
    );
  });

  it('text is italic', () => {
    const block = styleBlock('text');
    expect(block).toMatch(/fontStyle:\s*['"]italic['"]/);
  });

  it('text fontSize is 18pt (Phase 7.1 affirmation presence bump)', () => {
    const block = styleBlock('text');
    expect(num(block, 'fontSize')).toBe(18);
  });

  it('text uses the youAffirmationText cream tint', () => {
    const block = styleBlock('text');
    expect(block).toMatch(/youAffirmationText|c\.textPrimary/);
  });

  it('text lineHeight is ≈ 1.65× the font size (Phase 7.1 → 30pt)', () => {
    const block = styleBlock('text');
    const lh = num(block, 'lineHeight');
    expect(lh).not.toBeNull();
    // 18 × 1.65 = 29.7, rounded to 30.
    expect(lh as number).toBeGreaterThanOrEqual(29);
    expect(lh as number).toBeLessThanOrEqual(31);
  });

  it('text is centered', () => {
    const block = styleBlock('text');
    expect(block).toMatch(/textAlign:\s*['"]center['"]/);
  });

  it('container constrains the line width to ~320pt for natural wrapping at 18pt', () => {
    // Either via a maxWidth on the container or on the text node.
    // Phase 7.1 widened the cap from 280 → 320 so the larger type
    // doesn't produce 2-word orphan lines.
    const containerBlock = styleBlock('container');
    const textBlock = styleBlock('text');
    const containerMax = num(containerBlock, 'maxWidth');
    const textMax = num(textBlock, 'maxWidth');
    const winner = containerMax ?? textMax;
    expect(winner).not.toBeNull();
    expect(winner as number).toBeGreaterThanOrEqual(300);
    expect(winner as number).toBeLessThanOrEqual(340);
  });
});

describe('AffirmationHeader — spacing contract', () => {
  it('container has the v6.7 generous padding (10/22/14)', () => {
    const block = styleBlock('container');
    expect(num(block, 'paddingTop')).toBe(10);
    expect(num(block, 'paddingBottom')).toBe(22);
    expect(num(block, 'paddingHorizontal')).toBe(14);
  });

  it('container centers its child horizontally (alignItems center)', () => {
    const block = styleBlock('container');
    expect(block).toMatch(/alignItems:\s*['"]center['"]/);
  });
});

describe('AffirmationHeader — accessibility', () => {
  it('renders an accessibilityLabel that prefaces with "Today\'s reflection:"', () => {
    expect(src).toMatch(/accessibilityLabel=\{[^}]*Today's reflection:/);
  });

  it('is not interactive — accessibilityRole is "text" (or omitted)', () => {
    // The header is ambient context, not a tappable. Either no role at all
    // or accessibilityRole="text". Must not be "button" or "link".
    const roleMatch = src.match(/accessibilityRole=['"](\w+)['"]/);
    if (roleMatch) {
      expect(['text', 'header']).toContain(roleMatch[1]);
    }
  });
});
