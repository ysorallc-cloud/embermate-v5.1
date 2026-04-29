/**
 * Regression guard against dark-only surface literals in screens/components.
 *
 * Several screens previously hardcoded dark hex / rgba literals on
 * `backgroundColor`, which bypass the theme and break light mode (the
 * surface stays dark while the rest of the screen flips). This test scans
 * `app/` and `components/` for those specific dark-surface literals and
 * asserts none remain.
 *
 * Decorative tints (low-alpha accent colors like `rgba(52, 211, 153, 0.08)`,
 * solid accent indicators like `'#5fb88a'` for slider fills, and modal
 * overlay backdrops like `rgba(0, 0, 0, 0.5)`) are intentionally allowed —
 * they read correctly in both modes.
 */

import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

const REPO_ROOT = join(__dirname, '../..');
const SCAN_DIRS = ['app', 'components'];

// Dark surface literals that should never appear as a `backgroundColor` value.
// Matched case-insensitively. Each entry is a substring match against the
// content following `backgroundColor:` on a single line.
const BANNED_HEX = [
  '#0a1612',
  '#0c100e',
  '#0f1f1a',
  '#10140f',
  '#131a16',
  '#1a1a2e',
  '#1a2a22',
];

// Dark gray-green / dark wash rgba surfaces (these read as dark in light mode).
const BANNED_RGBA = [
  /rgba\(\s*45\s*,\s*59\s*,\s*45\s*,/i,
  /rgba\(\s*20\s*,\s*55\s*,\s*45\s*,/i,
  /rgba\(\s*4\s*,\s*36\s*,\s*32\s*,/i,
];

function listSourceFiles(dir: string): string[] {
  const out: string[] = [];
  const walk = (p: string) => {
    for (const entry of readdirSync(p)) {
      const full = join(p, entry);
      const s = statSync(full);
      if (s.isDirectory()) {
        if (entry === 'node_modules' || entry.startsWith('.')) continue;
        walk(full);
      } else if (/\.(tsx|ts)$/.test(entry)) {
        out.push(full);
      }
    }
  };
  walk(dir);
  return out;
}

interface Hit {
  file: string;
  line: number;
  text: string;
  reason: string;
}

function scan(): Hit[] {
  const hits: Hit[] = [];
  const files = SCAN_DIRS.flatMap((d) => listSourceFiles(join(REPO_ROOT, d)));

  for (const file of files) {
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      const idx = line.toLowerCase().indexOf('backgroundcolor:');
      if (idx === -1) return;
      const value = line.slice(idx).toLowerCase();

      for (const hex of BANNED_HEX) {
        if (value.includes(hex.toLowerCase())) {
          hits.push({
            file: relative(REPO_ROOT, file),
            line: i + 1,
            text: line.trim(),
            reason: `banned dark hex ${hex}`,
          });
        }
      }
      for (const re of BANNED_RGBA) {
        if (re.test(value)) {
          hits.push({
            file: relative(REPO_ROOT, file),
            line: i + 1,
            text: line.trim(),
            reason: `banned dark rgba ${re.source}`,
          });
        }
      }
    });
  }

  return hits;
}

describe('No hardcoded dark surface literals on backgroundColor', () => {
  it('finds zero banned surface literals across app/ and components/', () => {
    const hits = scan();
    if (hits.length > 0) {
      const report = hits
        .map((h) => `  ${h.file}:${h.line} — ${h.reason}\n    ${h.text}`)
        .join('\n');
      throw new Error(
        `Found ${hits.length} hardcoded dark surface literal(s). Replace with a theme token (c.background, c.glass, c.warmSurface, etc):\n${report}`,
      );
    }
    expect(hits.length).toBe(0);
  });
});
