// ============================================================================
// Phase 32A F13 — Vitals/Wellness/Meals subscreens retired.
//
// Drawers (F6/F7/F8) fully replace the subscreens. Files deleted; callers
// rewired to /care-plan (the home — user finds the row + expands the
// drawer). HealthKit auto-import code path PRESERVED at
// utils/parked/vitalsHealthKitAutoImport.parked.tsx per P3 lock (v1.1
// re-attachment ticket).
// ============================================================================

import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');

describe('Phase 32A F13 — vitals/wellness/meals subscreens retired', () => {
  it('contract 1: app/care-plan/vitals.tsx does NOT exist', () => {
    expect(existsSync(join(ROOT, 'app/care-plan/vitals.tsx'))).toBe(false);
  });

  it('contract 2: app/care-plan/wellness.tsx does NOT exist', () => {
    expect(existsSync(join(ROOT, 'app/care-plan/wellness.tsx'))).toBe(false);
  });

  it('contract 3: app/care-plan/meals.tsx does NOT exist', () => {
    expect(existsSync(join(ROOT, 'app/care-plan/meals.tsx'))).toBe(false);
  });

  it('contract 4: HealthKit auto-import preserved at utils/parked/vitalsHealthKitAutoImport.parked.tsx (P3 lock)', () => {
    const parkedPath = join(ROOT, 'utils/parked/vitalsHealthKitAutoImport.parked.tsx');
    expect(existsSync(parkedPath)).toBe(true);
    const src = readFileSync(parkedPath, 'utf8');
    // The parked module preserves the HealthKit-detection + UI block
    // exactly enough that v1.1 can re-attach without re-deriving.
    expect(src).toMatch(/getHealthDataProvider|HealthKit/i);
    expect(src).toMatch(/Auto-Import/i);
  });

  it('contract 5: NO non-test source file references /care-plan/{vitals,wellness,meals} as a route literal', () => {
    // The retired routes must not survive in any non-test source file.
    // The parked module is allowed to mention HealthKit context but
    // not the route paths.
    const offenders: string[] = [];

    function walk(dir: string) {
      let entries: string[];
      try { entries = readdirSync(dir); } catch { return; }
      for (const name of entries) {
        if (['node_modules', '__tests__', '.git', '.expo', 'ios', 'android', 'build', 'dist'].includes(name)) continue;
        const full = join(dir, name);
        let isDir = false;
        try {
          const stat = require('fs').statSync(full);
          isDir = stat.isDirectory();
        } catch { continue; }
        if (isDir) {
          walk(full);
          continue;
        }
        if (!name.endsWith('.ts') && !name.endsWith('.tsx')) continue;
        // Skip the parked module — it documents HealthKit but doesn't
        // route anywhere.
        if (full.includes('/utils/parked/')) continue;
        const src = readFileSync(full, 'utf8');
        // Strip line + block comments so historical commentary doesn't
        // false-positive.
        const stripped = src
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/\/\/[^\n]*/g, '');
        for (const route of ['/care-plan/vitals', '/care-plan/wellness', '/care-plan/meals']) {
          // Use word-boundary so /care-plan/meals doesn't false-positive on /care-plan/meds.
          const re = new RegExp(`['"\`]${route.replace(/\//g, '\\/')}['"\`]`);
          if (re.test(stripped)) {
            offenders.push(`${full.replace(ROOT + '/', '')}  →  ${route}`);
          }
        }
      }
    }

    for (const top of ['app', 'components', 'utils', 'services', 'hooks', 'lib', 'storage', 'types', 'constants']) {
      walk(join(ROOT, top));
    }

    if (offenders.length > 0) {
      throw new Error(
        `Retired route(s) still referenced in non-test source:\n${offenders.map((o) => '  ' + o).join('\n')}\n\n` +
          `F13 retires app/care-plan/{vitals,wellness,meals}.tsx; every caller must rewire to /care-plan (the home) or remove the route entirely.`,
      );
    }
    expect(offenders).toEqual([]);
  });
});
