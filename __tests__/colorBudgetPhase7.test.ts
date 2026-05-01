// ============================================================================
// 3-accent budget — May 1 sizing pass Phase 7.
//
// The May 1 screenshots showed too many competing accent tones across the
// surface (sage / lavender / criticalAlert / coral / amber-warning) and
// the eye couldn't settle. Phase 7 pins a strict 3-accent budget for
// DECORATIVE accents:
//
//   • #5fb88a  sage              (primary CTAs, completed states, Now)
//   • #aa8adc  caregiverAccent   (lavender — caregiver-facing surfaces)
//   • #e6776e  criticalAlert     (genuine emergencies / destructive)
//
// Coral (#e89a7a) was the 4th accent — used for the Helpline pill and
// Meals ring. Both have been neutralized (Phase 3a + Phase 6). This test
// pins:
//
//   1. The 3 budget colors are defined in theme-tokens (palette intact).
//   2. The coral hex literal does NOT appear in any app/ or components/
//      source file. The token declaration in theme-tokens.ts is allowed
//      so the value isn't lost (it's marked v7-reserved in source).
//   3. `colors.coral` / `(colors as any).coral` references are gone from
//      the runtime source (semantic uses retired alongside the literal).
//
// Note on `colors.warning` (amber): warning is a SEMANTIC status color
// (partial completion, concerning vitals) — distinct from a decorative
// accent. It is intentionally NOT in the 3-budget; it's a status token.
// This audit does not disturb its existing semantic uses.
// ============================================================================

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const ROOT = join(__dirname, '..');

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (name === 'node_modules' || name.startsWith('.')) continue;
      walk(full, out);
    } else {
      const ext = extname(name);
      if (['.ts', '.tsx'].includes(ext) && !name.endsWith('.d.ts')) {
        out.push(full);
      }
    }
  }
  return out;
}

const APP_FILES = walk(join(ROOT, 'app'));
const COMP_FILES = walk(join(ROOT, 'components'));
const SOURCE_FILES = [...APP_FILES, ...COMP_FILES];

describe('Phase 7 — 3-accent budget enforced', () => {
  it('the 3 budget accents are defined in theme-tokens', () => {
    const src = readFileSync(join(ROOT, 'theme/theme-tokens.ts'), 'utf8');
    expect(src).toMatch(/accent:\s*['"]#5fb88a['"]/);
    expect(src).toMatch(/caregiverAccent:\s*['"]#aa8adc['"]/);
    expect(src).toMatch(/criticalAlert:\s*['"]#e6776e['"]/);
  });

  it('coral hex literal (#e89a7a) does NOT appear in app/ or components/', () => {
    const offenders: string[] = [];
    for (const file of SOURCE_FILES) {
      const src = readFileSync(file, 'utf8');
      if (/#e89a7a/i.test(src)) {
        offenders.push(file.replace(ROOT, ''));
      }
    }
    expect(offenders).toEqual([]);
  });

  it('colors.coral / (colors as any).coral references are gone from source', () => {
    const offenders: string[] = [];
    for (const file of SOURCE_FILES) {
      const src = readFileSync(file, 'utf8');
      if (
        /\bcolors\.coral\b/.test(src) ||
        /\(colors as any\)\.coral\b/.test(src) ||
        /\bc\.coral\b/.test(src) ||
        /\(c as any\)\.coral\b/.test(src)
      ) {
        offenders.push(file.replace(ROOT, ''));
      }
    }
    expect(offenders).toEqual([]);
  });

  it('coral is marked v7-reserved in theme-tokens (not deleted, not active)', () => {
    // The token stays in the palette so a future v7 design pass can opt
    // it back in without re-establishing the value, but the comment must
    // signal "not in current budget."
    const src = readFileSync(join(ROOT, 'theme/theme-tokens.ts'), 'utf8');
    // Find the coral declaration line and a comment on the lines above it.
    const idx = src.indexOf("coral: '#e89a7a'");
    expect(idx).toBeGreaterThan(0);
    const window = src.slice(Math.max(0, idx - 800), idx);
    expect(window).toMatch(/v7-reserved/);
  });
});
