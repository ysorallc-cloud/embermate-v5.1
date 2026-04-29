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
    // Either the literal 'serif' or a serif token (Georgia is the iOS
    // serif fallback used elsewhere in this codebase).
    expect(block).toMatch(/fontFamily:\s*['"](?:serif|Georgia|Times New Roman)['"]/i);
  });

  it('text is italic', () => {
    const block = styleBlock('text');
    expect(block).toMatch(/fontStyle:\s*['"]italic['"]/);
  });

  it('text fontSize is 13.5pt (v6.7 You-tab content warmth pass)', () => {
    const block = styleBlock('text');
    expect(num(block, 'fontSize')).toBe(13.5);
  });

  it('text uses the youAffirmationText cream tint', () => {
    const block = styleBlock('text');
    expect(block).toMatch(/youAffirmationText|c\.textPrimary/);
  });

  it('text lineHeight is 1.7× the font size (≈ 23)', () => {
    const block = styleBlock('text');
    const lh = num(block, 'lineHeight');
    expect(lh).not.toBeNull();
    // 13.5 * 1.7 = 22.95.
    expect(lh as number).toBeGreaterThanOrEqual(22);
    expect(lh as number).toBeLessThanOrEqual(24);
  });

  it('text is centered', () => {
    const block = styleBlock('text');
    expect(block).toMatch(/textAlign:\s*['"]center['"]/);
  });

  it('container constrains the line width to ~280pt for natural wrapping', () => {
    // Either via a maxWidth on the container or on the text node.
    const containerBlock = styleBlock('container');
    const textBlock = styleBlock('text');
    const containerMax = num(containerBlock, 'maxWidth');
    const textMax = num(textBlock, 'maxWidth');
    const winner = containerMax ?? textMax;
    expect(winner).not.toBeNull();
    expect(winner as number).toBeGreaterThanOrEqual(260);
    expect(winner as number).toBeLessThanOrEqual(300);
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
