// ============================================================================
// Phase 33b extension — lavender no-fill canon.
//
// New brand rule (recorded in project_brand_alignment_canon.md):
// `caregiverAccent` (#aa8adc) is permitted ONLY on eyebrow-scale text
// (≤11pt labels) and thin accents (borders, icons). It is NEVER a fill —
// no `backgroundColor: caregiverAccent` on buttons, cards, or banners.
// Matches website parity (lavender = small-label garnish like "CAPTURE"
// / "A NOTE FOR CAREGIVERS").
//
// Scope: saturated fills only — the exact `c.caregiverAccent` /
// `colors.caregiverAccent` token. Faint-tint variants
// (caregiverAccentFaint / Wash / Muted / Bg / Light) are a separate
// low-alpha tier the user reviews on-device after this pass. This
// contract MUST NOT flag those.
//
// This pin enumerates the current violation set so the cleanup pass
// can knock them out. After the cleanup, the contract stands as
// regression defense — any future commit re-introducing a saturated
// lavender backgroundColor will FAIL CI.
// ============================================================================

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');

// Recursively walk a directory and return all .ts / .tsx file paths
// (excluding node_modules, .git, dist, build, __tests__).
function walkSrc(dir: string, acc: string[] = []): string[] {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    if (entry === 'node_modules' || entry === '.git' || entry === 'dist' || entry === 'build' || entry === '__tests__') continue;
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      walkSrc(fullPath, acc);
    } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
      acc.push(fullPath);
    }
  }
  return acc;
}

// Find lines matching `backgroundColor:\s*(c|colors)\.caregiverAccent\b`
// — the EXACT token only. Negative-lookahead excludes the Faint / Wash /
// Muted / Bg / Light / Text / Mid / Strong / Border suffixes which form
// the low-alpha tier banked for a separate on-device review.
function findSaturatedFillSites(): Array<{ file: string; line: number; text: string }> {
  const srcRoots = [join(ROOT, 'app'), join(ROOT, 'components')];
  const violations: Array<{ file: string; line: number; text: string }> = [];

  // Token suffixes to EXCLUDE (the faint-tint family).
  const FAINT_SUFFIXES = [
    'Faint', 'Wash', 'Muted', 'Bg', 'Light', 'Text', 'Mid', 'Strong', 'Border',
  ];

  for (const root of srcRoots) {
    const files = walkSrc(root);
    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      const lines = src.split('\n');
      lines.forEach((line, idx) => {
        // Match `backgroundColor: c.caregiverAccent` or `backgroundColor: colors.caregiverAccent`
        const m = line.match(/backgroundColor:\s*(?:c|colors)\.caregiverAccent(\w*)/);
        if (!m) return;
        const suffix = m[1];
        // Skip the faint-tint family.
        if (FAINT_SUFFIXES.some((s) => suffix === s)) return;
        // Skip if any suffix at all is present and not in the EXACT
        // token form. The exact saturated token has empty suffix.
        if (suffix !== '') return;
        violations.push({
          file: file.replace(ROOT + '/', ''),
          line: idx + 1,
          text: line.trim(),
        });
      });
    }
  }

  return violations;
}

describe('Phase 33b extension — lavender no-fill canon', () => {
  it('no `backgroundColor: c.caregiverAccent` (saturated fill) anywhere in app/ or components/', () => {
    const violations = findSaturatedFillSites();
    if (violations.length > 0) {
      const report = violations
        .map((v) => `  ${v.file}:${v.line}  ${v.text}`)
        .join('\n');
      throw new Error(
        `Phase 33b extension lavender no-fill canon violated — saturated ` +
          `backgroundColor: caregiverAccent surface(s) found (${violations.length}):\n${report}\n\n` +
          `New canon: caregiverAccent is permitted ONLY on eyebrow-scale text + thin accents.\n` +
          `Fix per surface: action-affirmative → sage (c.accent) fill; handoff-lane → dark/glass\n` +
          `fill + lavender text + thin lavender border (preserves the lane signal without the fill).\n` +
          `Faint-tint variants (caregiverAccentFaint / Wash / Muted / Bg / Light) are a separate\n` +
          `tier banked for on-device review — NOT in scope of this contract.`,
      );
    }
  });

  it('the faint-tint variants are NOT in scope (regression-defense: contract doesn\'t over-flag)', () => {
    // Synthetic check — confirm the suffix-filter behaviour by parsing
    // a known faint-tint occurrence. If this assertion ever fails, the
    // contract is over-reaching and would need the suffix filter
    // tightened.
    const example = `backgroundColor: c.caregiverAccentBg`;
    const m = example.match(/backgroundColor:\s*(?:c|colors)\.caregiverAccent(\w*)/);
    expect(m).not.toBeNull();
    expect(m![1]).toBe('Bg');
    // The contract above would skip this line because suffix !== ''.
  });

  // --------------------------------------------------------------------------
  // Paired-flip pins for the three dark-fill sites (#3, #9, #1).
  //
  // When the saturated lavender fill is replaced with a dark/glass fill +
  // lavender border, the paired text element MUST also flip to lavender
  // so the label remains visible. Pre-fix text was cream / near-black
  // (designed for high contrast against the lavender fill); leaving it
  // unflipped against the new dark fill produces a silent invisible-text
  // regression.
  //
  // Three sites pinned individually so the regression is specific —
  // a contract that just said "any lavender text somewhere" would be
  // too loose to defend against the actual bug pattern.
  // --------------------------------------------------------------------------

  it('#3 confirm.tsx primaryText is lavender (flipped from cream so the "Done — let\'s start" CTA label reads on the dark fill)', () => {
    const src = readFileSync(join(ROOT, 'app/care-plan/setup/confirm.tsx'), 'utf8');
    // Anchor on the primaryText style block and inspect its color value.
    const m = src.match(/primaryText:\s*\{[\s\S]{0,200}?color:\s*([^,\n]+?),/);
    expect(m).not.toBeNull();
    expect(m![1]).toMatch(/c\.caregiverAccent\b/);
  });

  it('#9 visit-prep-preview primaryButtonText is lavender (flipped from #0a0c0a so the "Generate & share PDF" CTA label reads on the dark fill)', () => {
    const src = readFileSync(join(ROOT, 'app/visit-prep-preview.tsx'), 'utf8');
    const m = src.match(/primaryButtonText:\s*\{[\s\S]{0,200}?color:\s*([^,\n]+?),/);
    expect(m).not.toBeNull();
    expect(m![1]).toMatch(/c\.caregiverAccent\b/);
  });

  it('#1 support.tsx caregiverChipAvatarText is lavender (flipped from cream so the chip initial reads on the dark fill)', () => {
    const src = readFileSync(join(ROOT, 'app/(tabs)/support.tsx'), 'utf8');
    const m = src.match(/caregiverChipAvatarText:\s*\{[\s\S]{0,200}?color:\s*([^,\n]+?),/);
    expect(m).not.toBeNull();
    expect(m![1]).toMatch(/c\.caregiverAccent\b/);
  });
});
