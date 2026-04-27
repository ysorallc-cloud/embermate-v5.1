// ============================================================================
// Section header + chrome contrast — locks in the v6.7 contrast updates.
// "Plan ahead" (You tab) and "Patterns" (Journal) must read at the same
// contrast level (textSecondary). Settings gear icon must be visible
// against the lifted page background. ReflectionPrompt should sit visibly
// below the Patterns block, not look like a continuation of it.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

const supportSrc    = read('app/(tabs)/support.tsx');
const understandSrc = read('app/(tabs)/understand.tsx');
const patternsSrc   = read('components/journal/JournalPatterns.tsx');
const reflectionSrc = read('components/journal/ReflectionPrompt.tsx');

function styleBlock(src: string, name: string): string {
  const re = new RegExp(`\\b${name}:\\s*\\{([^}]*)\\}`, 's');
  const m = src.match(re);
  return m ? m[1] : '';
}

function num(block: string, prop: string): number | null {
  const m = block.match(new RegExp(`\\b${prop}:\\s*(-?\\d+(?:\\.\\d+)?)`));
  return m ? Number(m[1]) : null;
}

describe('You tab — "Plan ahead" header contrast', () => {
  it('Plan ahead label uses the textSecondary token (no hardcoded #6a7a72 override)', () => {
    const planAheadJsx = supportSrc.match(/<Text[^>]*>Plan ahead<\/Text>/);
    expect(planAheadJsx).toBeTruthy();
    // The hex literal #6a7a72 was the low-contrast override that triggered
    // the regression. It must not appear next to "Plan ahead".
    expect(planAheadJsx![0]).not.toContain('#6a7a72');
  });

  it('sectionLabel base style references textSecondary (token, not hex)', () => {
    const block = styleBlock(supportSrc, 'sectionLabel');
    expect(block).not.toBe('');
    expect(block).toMatch(/color:\s*c\.textSecondary|color:\s*colors\.textSecondary/);
  });
});

describe('Insights — Settings gear icon visibility', () => {
  it('settingsGearText style declares color: textSecondary', () => {
    const block = styleBlock(understandSrc, 'settingsGearText');
    expect(block).not.toBe('');
    expect(block).toMatch(/color:\s*c\.textSecondary|color:\s*colors\.textSecondary/);
  });

  it('gear glyph uses text-presentation Unicode (no \\uFE0F variation selector)', () => {
    // The variation selector forces emoji rendering, which ignores the
    // `color` style. Drop it so the glyph honors textSecondary.
    expect(understandSrc).not.toMatch(/'\\u2699\\uFE0F'/);
  });
});

describe('Journal Patterns — section header normalization', () => {
  it('Patterns label uses the textSecondary token (matches Plan ahead)', () => {
    const block = styleBlock(patternsSrc, 'label');
    expect(block).not.toBe('');
    expect(block).toMatch(/color:\s*c\.textSecondary|color:\s*colors\.textSecondary/);
  });
});

describe('Reflection prompt — visual separation from Patterns', () => {
  it('ReflectionPrompt section has marginTop >= 16 OR a top divider', () => {
    // Either approach satisfies the contract: extra margin pushes the
    // prompt clearly below Patterns, or a top border draws the same
    // separation explicitly.
    const block = styleBlock(reflectionSrc, 'section');
    expect(block).not.toBe('');
    const mt = num(block, 'marginTop') ?? 0;
    const hasTopBorder = /borderTopWidth:\s*(0\.5|1)/.test(block);
    expect(mt >= 16 || hasTopBorder).toBe(true);
  });
});
