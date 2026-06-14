// ============================================================================
// Phase 32A — Priority UI removed (brief-named launch pin, absence pin).
//
// Brief test discipline:
//   "carePlanPriorityRemoved32A.test.tsx pins absence:
//     - No Required/Recommended/Optional cards render anywhere in
//       Care Plan UI"
//
// P-lock: Priority three-card picker retired from UI in 32A; field
// preserved silently in the data model (DEFAULT_BUCKET_CONFIG.priority
// defaults to 'recommended'; burden score continues to read it). This
// is the forward-looking guard — if any future contributor restores
// a Priority picker on the Care Plan home, a drawer, or any new
// Care Plan UI surface, this test catches it.
//
// In-scope surfaces (post-Slice-C):
//   • app/care-plan/index.tsx (home with inline-expand drawers + meds list)
//   • components/careplan/drawers/*.tsx (all 7 drawer files)
//   • app/care-plan/meds.tsx (the meds form — Priority was never surfaced
//     here; included for completeness so a regression elsewhere fails too)
//
// EXPLICITLY OUT OF SCOPE — app/care-plan/manage.tsx:
//   The brief's PRIORITY HANDLING section scoped removal to "Vitals and
//   Meals subscreens as three-card Required/Recommended/Optional picker"
//   — i.e., BUCKET-level pickers (one priority per bucket). The
//   manage.tsx regimen-management screen surfaces an ITEM-level Priority
//   picker (`formPriority === p`) for individual care-plan items, which
//   is a different concept on a different surface that 32A did not
//   touch. Including manage.tsx in this absence pin would expand 32A's
//   scope retroactively. If item-level Priority retirement is a future
//   intent, it should be its own ticket with its own brief.
// ============================================================================

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');

function stripComments(s: string): string {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
}

const CARE_PLAN_HOME = join(ROOT, 'app/care-plan/index.tsx');
// Phase 32A.1 F7 — CARE_PLAN_MEDS retired. The meds.tsx subscreen is
// gone; meds list lives inside MedicationsDrawer (covered by the
// drawerFiles() sweep below).
const DRAWERS_DIR = join(ROOT, 'components/careplan/drawers');

function drawerFiles(): string[] {
  return readdirSync(DRAWERS_DIR)
    .filter((f) => f.endsWith('Drawer.tsx'))
    .map((f) => join(DRAWERS_DIR, f));
}

const SURFACES = [
  CARE_PLAN_HOME,
  ...drawerFiles(),
];

describe('Phase 32A — Priority UI removed (absence pin across Care Plan surfaces)', () => {
  it('contract 1: every in-scope Care Plan UI surface is included in this audit', () => {
    // Pin the surface list so a future drawer file (added without
    // updating this list) doesn't escape the absence check.
    // Phase 34 F5.3 — WellnessDrawer.tsx retired; replaced by the
    // per-window check-in editor. Wellness-merge F5 then merged the two
    // pseudo-key rows into one row whose drawer is WellnessWindowsDrawer
    // .tsx (WellnessCheckInDrawer.tsx deleted in the same slice).
    expect(SURFACES.length).toBeGreaterThanOrEqual(9); // home + 8 drawers
    const drawerNames = drawerFiles().map((f) => f.split('/').pop());
    for (const expected of [
      'ActivityDrawer.tsx',
      'AppointmentsDrawer.tsx',
      'MealsDrawer.tsx',
      'SleepDrawer.tsx',
      'VitalsDrawer.tsx',
      'WaterDrawer.tsx',
      'WellnessWindowsDrawer.tsx',
    ]) {
      expect(drawerNames).toContain(expected);
    }
  });

  it.each(SURFACES.map((p) => [p.replace(ROOT + '/', '')]))(
    'contract 2: %s does NOT declare a priority-picker style block',
    (rel) => {
      const src = stripComments(readFileSync(join(ROOT, rel), 'utf8'));
      // Style blocks the pre-32A Priority pickers used.
      expect(src).not.toMatch(/\bpriorityContainer\s*:\s*\{/);
      expect(src).not.toMatch(/\bpriorityOption\s*:\s*\{/);
      expect(src).not.toMatch(/\bpriorityOptionSelected\s*:\s*\{/);
      expect(src).not.toMatch(/\bpriorityLabelSelected\s*:\s*\{/);
    },
  );

  it.each(SURFACES.map((p) => [p.replace(ROOT + '/', '')]))(
    'contract 3: %s does NOT render the Priority picker label trio (Required + Recommended + Optional all together)',
    (rel) => {
      const src = stripComments(readFileSync(join(ROOT, rel), 'utf8'));
      // The picker rendered three options with these literal labels.
      // We don't forbid individual words (they may show up in copy
      // elsewhere), but the three-together triple is the picker
      // fingerprint.
      const hasRequired = /['"`]Required['"`]/.test(src);
      const hasRecommended = /['"`]Recommended['"`]/.test(src);
      const hasOptional = /['"`]Optional['"`]/.test(src);
      const hasAllThree = hasRequired && hasRecommended && hasOptional;
      expect({ rel, hasAllThree }).toEqual({ rel, hasAllThree: false });
    },
  );

  it.each(SURFACES.map((p) => [p.replace(ROOT + '/', '')]))(
    'contract 4: %s does NOT call handleChangePriority / updateBucket with a priority literal',
    (rel) => {
      const src = stripComments(readFileSync(join(ROOT, rel), 'utf8'));
      // The pre-32A subscreens used `handleChangePriority` (a
      // dedicated callback) + `updateBucket(bucket, { priority: ... })`
      // (a direct write). Both are gone in 32A.
      expect(src).not.toMatch(/\bhandleChangePriority\b/);
      expect(src).not.toMatch(/updateBucket\([^)]*priority\s*:\s*['"]/);
    },
  );
});
