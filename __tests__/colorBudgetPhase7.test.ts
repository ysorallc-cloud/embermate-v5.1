// ============================================================================
// 3-accent budget — May 1 sizing pass Phase 7 → Phase 33 F1b reframe.
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
// Pre-Phase-33, the 4th-accent coral (#e89a7a) was held as a v7-reserved
// token (Helpline pill + Meals ring neutralized in Phase 3a + 6). Phase
// 33 F1b retired the v7 reservation entirely and renamed the `red*`
// color-name family (#e6776e — the actual coral hue, same as
// criticalAlert) to claim the `coral*` namespace. The 3-budget intent
// survives — `coral` and `criticalAlert` now both resolve to #e6776e
// (the third budget color); the v7-reserved #e89a7a hex is gone from
// source AND tokens.
//
// What this test pins post-F1b:
//
//   1. The 3 budget colors are defined in theme-tokens (palette intact).
//   2. The retired v7-reserved coral hex (#e89a7a) does NOT appear in
//      app/ or components/ — defends against legacy reintroduction.
//
// Retired (Phase 33 F1b):
//
//   • `colors.coral` absence pin — coral is now the SANCTIONED color
//     name for the 3rd budget hex (renamed from `red`). 76 consumer
//     sites legitimately use it.
//   • v7-reserved declaration pin — the reservation was retired; the
//     `coral: '#e89a7a'` declaration was removed from theme-tokens.
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
    // F7 (2026-06-12) — caregiverAccent flipped from #aa8adc (warm
    // lavender) to #6b8cae (dusty blue). Token name preserved.
    expect(src).toMatch(/caregiverAccent:\s*['"]#6b8cae['"]/);
    expect(src).toMatch(/criticalAlert:\s*['"]#e6776e['"]/);
  });

  it('retired v7-reserved coral hex (#e89a7a) does NOT appear in app/ or components/', () => {
    // Defends against re-introduction of the retired 4th-accent hex.
    // Phase 33 F1b deleted the token AND the source-file pin (no
    // consumers historically existed), so this absence pin survives
    // as a "do not re-introduce" guard.
    const offenders: string[] = [];
    for (const file of SOURCE_FILES) {
      const src = readFileSync(file, 'utf8');
      if (/#e89a7a/i.test(src)) {
        offenders.push(file.replace(ROOT, ''));
      }
    }
    expect(offenders).toEqual([]);
  });
});
