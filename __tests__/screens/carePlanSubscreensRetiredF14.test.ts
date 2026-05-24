// ============================================================================
// Phase 32A F14 — water/sleep/activity + errands/shifts/self-care subscreens
//                 retired.
//
// Water/Sleep/Activity: drawers F9/F10/F11 fully replace them.
// Errands/Shifts/Self-care: orphaned by F3 render filter (no row routes
// to them anymore). Types stay in the data model (render-filter
// philosophy unchanged per F3).
//
// All 6 deletions are atomic with caller updates (today-scope.tsx,
// BucketCarePlanPanel.tsx, AddItemSheet.tsx, utils/carePlanRouting.ts,
// utils/careplan/taskAction.ts, types/carePlanConfig.ts BUCKET_META.route).
// ============================================================================

import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');

const RETIRED_FILES = [
  'app/care-plan/water.tsx',
  'app/care-plan/sleep.tsx',
  'app/care-plan/activity.tsx',
  'app/care-plan/errands.tsx',
  'app/care-plan/shifts.tsx',
  'app/care-plan/self-care.tsx',
];

const RETIRED_ROUTES = [
  '/care-plan/water',
  '/care-plan/sleep',
  '/care-plan/activity',
  '/care-plan/errands',
  '/care-plan/shifts',
  '/care-plan/self-care',
];

describe('Phase 32A F14 — water/sleep/activity + errands/shifts/self-care subscreens retired', () => {
  it.each(RETIRED_FILES)("file does NOT exist: %s", (path) => {
    expect(existsSync(join(ROOT, path))).toBe(false);
  });

  it('no non-test source file references any retired route literal', () => {
    const offenders: string[] = [];

    function walk(dir: string) {
      let entries: string[];
      try { entries = readdirSync(dir); } catch { return; }
      for (const name of entries) {
        if (['node_modules', '__tests__', '.git', '.expo', 'ios', 'android', 'build', 'dist'].includes(name)) continue;
        const full = join(dir, name);
        let isDir = false;
        try { isDir = statSync(full).isDirectory(); } catch { continue; }
        if (isDir) { walk(full); continue; }
        if (!name.endsWith('.ts') && !name.endsWith('.tsx')) continue;
        const src = readFileSync(full, 'utf8');
        const stripped = src
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/\/\/[^\n]*/g, '');
        for (const route of RETIRED_ROUTES) {
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
        `Retired route(s) still referenced in non-test source:\n${offenders.map((o) => '  ' + o).join('\n')}`,
      );
    }
    expect(offenders).toEqual([]);
  });
});
