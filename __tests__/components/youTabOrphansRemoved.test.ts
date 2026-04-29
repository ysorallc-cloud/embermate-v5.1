// ============================================================================
// You-tab orphan cleanup (Phase 7).
// After Phase 6 collapsed the inline mood / breathe / contact-tile JSX into
// the new component-based composition (AffirmationHeader, ReflectionCard,
// QuickResetPills), three pre-existing components are no longer used:
//   • components/support/MoodSlider.tsx         (was: inline mood selector)
//   • components/support/HandoffPrompt.tsx      (caregiver share prompt — unused)
//   • components/support/UpcomingNotifications.tsx (notifications panel — unused)
//
// This test pins both invariants:
//   1. The orphan files are deleted from disk.
//   2. No source file imports them (so they can never silently come back
//      via stale imports).
// ============================================================================

import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');

const ORPHANS = [
  'components/support/MoodSlider.tsx',
  'components/support/HandoffPrompt.tsx',
  'components/support/UpcomingNotifications.tsx',
];

const ORPHAN_NAMES = ['MoodSlider', 'HandoffPrompt', 'UpcomingNotifications'];

function listSourceFiles(dir: string): string[] {
  const out: string[] = [];
  const walk = (p: string) => {
    for (const entry of readdirSync(p)) {
      const full = join(p, entry);
      const s = statSync(full);
      if (s.isDirectory()) {
        if (entry === 'node_modules' || entry === '.git' || entry.startsWith('.')) continue;
        walk(full);
      } else if (/\.(tsx|ts)$/.test(entry)) {
        out.push(full);
      }
    }
  };
  walk(dir);
  return out;
}

describe('You-tab orphan cleanup — files removed from disk', () => {
  for (const rel of ORPHANS) {
    it(`${rel} no longer exists`, () => {
      expect(existsSync(join(ROOT, rel))).toBe(false);
    });
  }
});

describe('You-tab orphan cleanup — no source file imports the removed components', () => {
  // Walk every source file under app/ + components/ + hooks/ + services/ +
  // utils/ + lib/ + storage/ + types/ + contexts/ and confirm none import
  // the orphan modules. Tests dir is excluded — the cleanup test itself
  // names the modules in strings.
  const dirs = ['app', 'components', 'hooks', 'services', 'utils', 'lib', 'storage', 'types', 'contexts', 'theme'];
  const offenders: { file: string; line: number; text: string }[] = [];

  for (const dir of dirs) {
    const root = join(ROOT, dir);
    if (!existsSync(root)) continue;
    for (const file of listSourceFiles(root)) {
      const lines = readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, i) => {
        for (const name of ORPHAN_NAMES) {
          // import { Foo } from '.../Foo' or import Foo from '.../Foo'.
          // Restrict to the path so we don't trip on incidental string
          // matches (e.g., a function called getUpcomingNotifications).
          const importPathRe = new RegExp(`from\\s+['"][^'"]*${name}['"]`);
          if (importPathRe.test(line)) {
            offenders.push({
              file: file.replace(ROOT + '/', ''),
              line: i + 1,
              text: line.trim(),
            });
          }
        }
      });
    }
  }

  it('zero source imports of the orphan components remain', () => {
    if (offenders.length > 0) {
      const report = offenders
        .map((o) => `  ${o.file}:${o.line} — ${o.text}`)
        .join('\n');
      throw new Error(`Found ${offenders.length} stale orphan import(s):\n${report}`);
    }
    expect(offenders).toEqual([]);
  });
});
