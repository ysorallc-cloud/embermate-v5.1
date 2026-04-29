// ============================================================================
// You-tab compact wellness link.
// Locks in v6.7 Phase 4: the verbose "Your wellness over time" warm card
// collapses to a single tappable row — uppercase label on the left, chevron
// on the right, glassDim surface with a hairline border. Tap still navigates
// to /caregiver-wellness.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const src = readFileSync(join(ROOT, 'app/(tabs)/support.tsx'), 'utf8');

function styleBlock(name: string): string {
  const re = new RegExp(`\\b${name}:\\s*\\{([^}]*)\\}`, 's');
  const m = src.match(re);
  return m ? m[1] : '';
}

function num(block: string, prop: string): number | null {
  const m = block.match(new RegExp(`\\b${prop}:\\s*(-?\\d+(?:\\.\\d+)?)`));
  return m ? Number(m[1]) : null;
}

describe('You tab — wellness link is a compact row, not a full card', () => {
  it('does not wrap the wellness link in the warm-card surface', () => {
    // The previous design wrapped the link in <View style={[styles.warmCard,
    // styles.warmCardQuiet, ...]}>. The compact row drops that wrapper.
    expect(src).not.toMatch(/warmCard[\s\S]{0,200}?wellnessLink/);
  });

  it('drops the verbose descriptor copy', () => {
    expect(src).not.toContain('See how your mood trends week to week');
    // The longer "Your wellness over time" sentence-case title is also gone —
    // the compact row uses the all-caps label below.
    expect(src).not.toContain('>Your wellness over time<');
  });

  it('renders the uppercase "YOUR WELLNESS OVER TIME" label', () => {
    expect(src).toContain('YOUR WELLNESS OVER TIME');
  });

  it('renders a chevron (›) at the right edge of the row', () => {
    // Tolerate either the literal glyph or the unicode escape.
    expect(src).toMatch(/[›]|\\u203A/);
  });
});

describe('You tab — wellness row style contract', () => {
  it('row container uses glassDim background', () => {
    const block = styleBlock('wellnessLink');
    expect(block).not.toBe('');
    expect(block).toMatch(/backgroundColor:\s*c\.glassDim|backgroundColor:\s*colors\.glassDim/);
  });

  it('row has 0.5px glassBorder', () => {
    const block = styleBlock('wellnessLink');
    expect(num(block, 'borderWidth')).toBe(0.5);
    expect(block).toMatch(/borderColor:\s*c\.glassBorder|borderColor:\s*colors\.glassBorder/);
  });

  it('row has borderRadius 8 and paddingVertical 10', () => {
    const block = styleBlock('wellnessLink');
    expect(num(block, 'borderRadius')).toBe(8);
    expect(num(block, 'paddingVertical')).toBe(10);
  });

  it('row uses justifyContent: space-between (label left, chevron right)', () => {
    const block = styleBlock('wellnessLink');
    expect(block).toMatch(/flexDirection:\s*['"]row['"]/);
    expect(block).toMatch(/justifyContent:\s*['"]space-between['"]/);
    expect(block).toMatch(/alignItems:\s*['"]center['"]/);
  });

  it('label style: 10pt textTertiary, letterSpacing 0.3', () => {
    // Either the existing wellnessTitle was rebuilt to the compact spec, or
    // a new label style was introduced. Check whichever names the file uses.
    const candidates = ['wellnessLabel', 'wellnessTitle'];
    let found = '';
    for (const name of candidates) {
      const block = styleBlock(name);
      if (block && /fontSize:\s*10/.test(block)) {
        found = block;
        break;
      }
    }
    expect(found).not.toBe('');
    expect(num(found, 'fontSize')).toBe(10);
    expect(found).toMatch(/color:\s*c\.textTertiary|color:\s*colors\.textTertiary/);
    const ls = num(found, 'letterSpacing');
    expect(ls).toBeCloseTo(0.3, 1);
  });
});

describe('You tab — wellness row navigation', () => {
  it('tap navigates to /caregiver-wellness (existing destination)', () => {
    expect(src).toMatch(/onPress=\{\(\)\s*=>\s*navigate\(['"]\/caregiver-wellness['"]\)\}/);
  });

  it('preserves the accessibilityLabel for screen readers', () => {
    expect(src).toMatch(/accessibilityLabel=['"]View your wellness history['"]/);
  });
});
