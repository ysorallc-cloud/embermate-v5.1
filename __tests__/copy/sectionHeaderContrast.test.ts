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

// The "Plan ahead" header + its planAheadHeader/planAheadCard styles were
// retired in the You-tab restructure (the resources section was removed). The
// Caregiver Action Network resource row that replaced it uses theme tokens
// (resourceTitle/resourceDesc → c.textPrimary/c.textTertiary); the no-hardcoded-
// hex contract now lives with the Journal-Patterns / gear checks below.

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
  it('ReflectionPrompt section has marginTop on a token (Spacing.md+) OR a top divider', () => {
    // Phase 3.7.1 migrated literal margins to Spacing tokens so the
    // recalibrated scale (md=20, lg=28) cascades. Either approach
    // satisfies the contract: a token-routed marginTop pushes the prompt
    // clearly below Patterns, or a top border draws the same separation.
    const block = styleBlock(reflectionSrc, 'section');
    expect(block).not.toBe('');
    const mt = num(block, 'marginTop') ?? 0;
    const tokenMt = /marginTop:\s*Spacing\.(md|lg|xl)\b/.test(block);
    const hasTopBorder = /borderTopWidth:\s*(0\.5|1)/.test(block);
    expect(mt >= 16 || tokenMt || hasTopBorder).toBe(true);
  });
});
