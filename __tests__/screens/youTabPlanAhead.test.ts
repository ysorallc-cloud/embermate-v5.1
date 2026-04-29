// ============================================================================
// You-tab Plan ahead grouping.
// Locks in v6.7 Phase 5: section header + subtitle sit directly on the page
// background (no warm-card wrapper); ResourcesList rows use 11pt vertical
// padding, top dividers, and the new typography ramp.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const supportSrc = readFileSync(join(ROOT, 'app/(tabs)/support.tsx'), 'utf8');
const resourcesSrc = readFileSync(
  join(ROOT, 'components/support/ResourcesList.tsx'),
  'utf8',
);

function styleBlock(src: string, name: string): string {
  const re = new RegExp(`\\b${name}:\\s*\\{([^}]*)\\}`, 's');
  const m = src.match(re);
  return m ? m[1] : '';
}

function num(block: string, prop: string): number | null {
  const m = block.match(new RegExp(`\\b${prop}:\\s*(-?\\d+(?:\\.\\d+)?)`));
  return m ? Number(m[1]) : null;
}

describe('You tab — Plan ahead block sits on the page (no card wrapper)', () => {
  it('the Plan ahead section label is not nested inside a warmCard wrapper', () => {
    // The previous JSX was: <View style={[styles.warmCard, ...]}>
    //   <View style={styles.planAheadCard} ...
    // Phase 5 strips the wrapper so the list sits directly on the page bg.
    // Match the specific JSX shape, not keyword proximity (which would catch
    // unrelated comments + style definitions).
    expect(supportSrc).not.toMatch(
      /<View\s+style=\{\[styles\.warmCard[\s\S]{0,300}?>\s*<Text[^>]*>Plan ahead/,
    );
  });

  it('keeps the "Plan ahead" header and the calm subtitle copy', () => {
    expect(supportSrc).toContain('Plan ahead');
    expect(supportSrc).toContain('When things are calm, future you will be glad.');
  });

  it('subtitle is no longer overridden with a hardcoded olive-green color', () => {
    // Inline override `{ color: '#3a5a4a' }` was a hardcoded literal that
    // didn't track the theme. Phase 5 drops the override and lets the
    // sectionContext base style win (textSecondary).
    expect(supportSrc).not.toMatch(/\{\s*color:\s*'#3a5a4a'\s*\}/);
  });
});

describe('You tab — Plan ahead typography (v6.7 internal-eyebrow card)', () => {
  it('planAheadEyebrow: 9pt textTertiary weight 500, letter-spacing 0.5', () => {
    const block = styleBlock(supportSrc, 'planAheadEyebrow');
    expect(num(block, 'fontSize')).toBe(9);
    expect(block).toMatch(/fontWeight:\s*['"]500['"]/);
    expect(block).toMatch(/color:\s*c\.textTertiary|color:\s*colors\.textTertiary/);
    expect(num(block, 'letterSpacing')).toBe(0.5);
  });

  it('planAheadSubtitle: 11pt serif italic textSecondary', () => {
    const block = styleBlock(supportSrc, 'planAheadSubtitle');
    expect(num(block, 'fontSize')).toBe(11);
    expect(block).toMatch(/fontStyle:\s*['"]italic['"]/);
    expect(block).toMatch(/color:\s*c\.textSecondary|color:\s*colors\.textSecondary/);
  });
});

describe('ResourcesList — row spacing + dividers', () => {
  it('each row uses 11pt vertical padding', () => {
    const block = styleBlock(resourcesSrc, 'categoryHeader');
    expect(num(block, 'paddingVertical')).toBe(11);
  });

  it('each row carries a TOP divider (0.5px glassBorder), not a bottom one', () => {
    const block = styleBlock(resourcesSrc, 'categoryCard');
    expect(num(block, 'borderTopWidth')).toBe(0.5);
    expect(block).toMatch(/borderTopColor:\s*c\.glassBorder|borderTopColor:\s*colors\.glassBorder/);
    // No bottom divider — the top-divider stack puts N-1 lines between N rows.
    expect(block).not.toMatch(/borderBottomWidth:\s*0\.5/);
  });

  it('first row hides its top divider so the section header isn\'t separated by a stray line at the very top', () => {
    // Implementation hook: either an `index === 0` style override, a
    // `categoryCardFirst` variant, or `borderTopWidth: 0` applied to the
    // first item.
    const inlineGuard = /index === 0[\s\S]{0,200}?borderTopWidth:\s*0/.test(resourcesSrc);
    const variantGuard = /categoryCardFirst|isFirst/.test(resourcesSrc);
    expect(inlineGuard || variantGuard).toBe(true);
  });
});

describe('ResourcesList — typography ramp', () => {
  it('row title: 13pt textPrimary weight 500', () => {
    const block = styleBlock(resourcesSrc, 'categoryTitle');
    expect(num(block, 'fontSize')).toBe(13);
    expect(block).toMatch(/fontWeight:\s*['"]500['"]/);
    expect(block).toMatch(/color:\s*c\.textPrimary|color:\s*colors\.textPrimary/);
  });

  it('row subtitle: 11pt textTertiary', () => {
    const block = styleBlock(resourcesSrc, 'categoryDesc');
    expect(num(block, 'fontSize')).toBe(11);
    expect(block).toMatch(/color:\s*c\.textTertiary|color:\s*colors\.textTertiary/);
  });

  it('chevron renders on the right (› glyph)', () => {
    expect(resourcesSrc).toMatch(/[›]|\\u203A/);
  });
});

describe('ResourcesList — no card surface', () => {
  it('container has no background color (sits directly on page background)', () => {
    const block = styleBlock(resourcesSrc, 'container');
    // Either no backgroundColor at all, or transparent — anything else would
    // re-introduce a card surface.
    if (/backgroundColor:/.test(block)) {
      expect(block).toMatch(/backgroundColor:\s*['"]transparent['"]/);
    } else {
      expect(block).not.toMatch(/backgroundColor:/);
    }
  });

  it('row containers are not bordered cards (no borderRadius / no fill)', () => {
    const block = styleBlock(resourcesSrc, 'categoryCard');
    expect(block).not.toMatch(/borderRadius:/);
    if (/backgroundColor:/.test(block)) {
      expect(block).toMatch(/backgroundColor:\s*['"]transparent['"]/);
    }
  });
});
