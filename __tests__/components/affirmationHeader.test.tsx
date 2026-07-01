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

  it('text fontSize is 16pt (You rebuild — reflect line)', () => {
    const block = styleBlock('text');
    expect(num(block, 'fontSize')).toBe(16);
  });

  it('text uses the youAffirmationText cream tint', () => {
    const block = styleBlock('text');
    expect(block).toMatch(/youAffirmationText|c\.textPrimary/);
  });

  it('text lineHeight is ≈ 1.6× the font size (You rebuild → 26pt)', () => {
    const block = styleBlock('text');
    const lh = num(block, 'lineHeight');
    expect(lh).not.toBeNull();
    expect(lh as number).toBeGreaterThanOrEqual(24);
    expect(lh as number).toBeLessThanOrEqual(28);
  });

  it('text is left-aligned (reflect line, not centered)', () => {
    const block = styleBlock('text');
    expect(block).toMatch(/textAlign:\s*['"]left['"]/);
  });
});

describe('AffirmationHeader — reflect-line rule (§5 blue-never-on-You)', () => {
  it('container carries a SAGE left rule — never blue, never lavender', () => {
    const block = styleBlock('container');
    expect(num(block, 'borderLeftWidth')).toBeGreaterThanOrEqual(1);
    // sage: c.accent / accentMuted / accentLight. NOT caregiverAccent (lavender),
    // NOT a raw hex/blue rgba (the mockup's border was the You-blue error).
    expect(block).toMatch(/borderLeftColor:\s*c\.accent(?:Muted|Light)?\b/);
    expect(block).not.toMatch(/caregiverAccent/);
  });

  it('container is an open, left-inset reflect line (paddingLeft for the rule gap)', () => {
    const block = styleBlock('container');
    expect(num(block, 'paddingLeft')).toBeGreaterThanOrEqual(10);
  });

  it('container is NOT centered (left-aligned open fabric)', () => {
    const block = styleBlock('container');
    expect(block).not.toMatch(/alignItems:\s*['"]center['"]/);
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
