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

// Find lines that route a SATURATED lavender into `backgroundColor`.
//
// Catches two patterns:
//   • Direct token: `backgroundColor: c.caregiverAccent` /
//     `backgroundColor: colors.caregiverAccent`
//   • Template-literal alpha-byte form: `` backgroundColor: `${c.caregiverAccent}NN` ``
//     where NN is a hex alpha byte (e.g. `08`, `1A`). This pattern was a
//     contract blind spot until 2026-05-21 — hub/reports/index.tsx used it
//     for a 3% alpha lavender wash that escaped the original regex.
//
// Excluded — the explicit faint-tint family (Faint / Wash / Muted / Bg /
// Light / Text / Mid / Strong / Border), which is a separate low-alpha
// tier banked for a separate on-device review.
//
// For template-literal alpha forms: a low alpha (<= 0x20 ≈ 12%) reads as
// a faint-tint equivalent and is excluded. Higher alphas (or the bare
// token with no alpha byte appended) read as saturated and trigger.
function findSaturatedFillSites(): Array<{ file: string; line: number; text: string }> {
  const srcRoots = [join(ROOT, 'app'), join(ROOT, 'components')];
  const violations: Array<{ file: string; line: number; text: string }> = [];

  const FAINT_SUFFIXES = [
    'Faint', 'Wash', 'Muted', 'Bg', 'Light', 'Text', 'Mid', 'Strong', 'Border',
  ];

  // Threshold for the template-literal alpha-byte form. 0x20 = 32/255 ≈ 12.5%.
  // Anything at or below reads as a faint-tint equivalent (caregiverAccentBg
  // is rgba 0.06 ≈ 0x0F; caregiverAccentLight is rgba 0.12 ≈ 0x1F).
  const FAINT_ALPHA_THRESHOLD = 0x20;

  for (const root of srcRoots) {
    const files = walkSrc(root);
    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      const lines = src.split('\n');
      lines.forEach((line, idx) => {
        // Pattern 1: direct token access.
        const direct = line.match(/backgroundColor:\s*(?:c|colors)\.caregiverAccent(\w*)/);
        if (direct) {
          const suffix = direct[1];
          if (FAINT_SUFFIXES.some((s) => suffix === s)) return;
          if (suffix !== '') return;
          violations.push({
            file: file.replace(ROOT + '/', ''),
            line: idx + 1,
            text: line.trim(),
          });
          return;
        }
        // Pattern 2: template-literal alpha-byte form.
        // backgroundColor: `${c.caregiverAccent}NN` (optionally with
        // additional template content). NN captured as a 2-hex-digit
        // alpha. The hex value gates faint-tint equivalence — only
        // alphas ABOVE the threshold count as saturated fills.
        const tmpl = line.match(
          /backgroundColor:\s*`[^`]*\$\{\s*(?:c|colors)\.caregiverAccent\s*\}([0-9a-fA-F]{2})?[^`]*`/,
        );
        if (tmpl) {
          const alphaByte = tmpl[1];
          // No alpha byte appended = saturated lavender wrapped in a
          // template literal — same as the direct token, always flag.
          if (!alphaByte) {
            violations.push({
              file: file.replace(ROOT + '/', ''),
              line: idx + 1,
              text: line.trim(),
            });
            return;
          }
          // Below the faint-tint threshold = effectively a wash; skip.
          if (parseInt(alphaByte, 16) <= FAINT_ALPHA_THRESHOLD) return;
          violations.push({
            file: file.replace(ROOT + '/', ''),
            line: idx + 1,
            text: line.trim(),
          });
        }
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

  it('#1 support.tsx caregiver chip site is RETIRED (You rebuild — full de-purple)', () => {
    // The lavender "This is your space" chip (avatar + text) was removed in the
    // You rebuild; the site no longer exists, so there is no lavender fill to pin.
    const src = readFileSync(join(ROOT, 'app/(tabs)/support.tsx'), 'utf8');
    expect(src).not.toMatch(/caregiverChipAvatarText:/);
  });
});
