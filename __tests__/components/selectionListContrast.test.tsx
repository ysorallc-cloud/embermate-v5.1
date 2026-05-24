// ============================================================================
// Selection-list label contrast — selected items must keep the same label
// color as unselected items. The selection signal lives on the checkmark
// and the row border, NOT on the label text.
//
// Severity tints (amber/red for side effects, skip reasons, etc.) are
// intentionally excluded from this contract — those colors carry semantic
// meaning beyond "selected", so they may color the label.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

// Files + style names in scope. Each entry says: in `file`, the
// `*LabelSelected` style block must NOT declare `color: c.accent` or
// `color: c.green` (mint family — the readability-killing tint).
// Phase 32A F13/F14 — vitals.tsx + meals.tsx + wellness.tsx retired
// in F13; water/sleep/activity retire in F14. The drawer components
// (components/careplan/drawers/*) own selection chrome internally
// and pin their own contrast at the component level. The remaining
// entries below are still-live screens that should keep this
// contrast contract.
const targets: Array<{ file: string; styles: string[] }> = [
  // Phase 32A F13/F14 — all per-bucket subscreens (vitals/wellness/
  // meals/water/sleep/activity/errands/shifts/self-care) retired. The
  // inline-expand drawer components (components/careplan/drawers/*)
  // own selection chrome internally and pin their own contrast at the
  // component level. Remaining care-plan entry: manage.tsx (still
  // live; non-subscreen).
  {
    file: 'app/care-plan/manage.tsx',
    styles: ['typeChipLabelSelected', 'windowLabelSelected', 'priorityLabelSelected'],
  },
  // Phase 9.5 renamed moodLabelSelected → pillLabelSelected as part of
  // the LogScreen migration.
  { file: 'app/log-mood.tsx',             styles: ['pillLabelSelected'] },
  // Phase 9.5 renamed activityLabelSelected → pillLabelSelected when
  // log-activity migrated to LogScreen pattern (matches log-meal's
  // identical rename in 9.3). The selected pill keeps label at
  // textPrimary; selection conveyed by background + border + checkmark.
  { file: 'app/log-activity.tsx',         styles: ['pillLabelSelected'] },
  {
    file: 'app/log-evening-wellness.tsx',
    styles: ['optionLabelSelected', 'ratingLabelSelected'],
  },
  {
    // Phase 9.3 renamed mealLabelSelected → pillLabelSelected when the
    // 2x2 emoji-first card grid was replaced with a 2-column pill grid.
    // quickFoodLabelSelected kept its name; quick-foods got restyled
    // as compact pills matching the meal-pill family.
    file: 'app/log-meal.tsx',
    styles: ['pillLabelSelected', 'quickFoodLabelSelected'],
  },
  // GetStartedScreen.tsx had a `bucketLabelSelected` style backing the
  // bucket-grid selection UI. The grid was retired in v6.7 (default care
  // plan now generated at the orchestrator level), so the style is gone.
  {
    // Time-slot picker inside the medication form. Uses the *Active suffix
    // instead of *Selected, but the contract is the same.
    file: 'components/medication/DosageSection.tsx',
    styles: ['timeSlotTimeTextActive', 'timeSlotLabelTextActive'],
  },
];

function styleBody(src: string, name: string): string {
  const re = new RegExp(`\\b${name}:\\s*\\{([^}]*)\\}`, 's');
  const m = src.match(re);
  return m ? m[1] : '';
}

describe('Selection-list label contrast — selected styles do not tint the label', () => {
  for (const { file, styles } of targets) {
    describe(file, () => {
      const src = read(file);
      for (const styleName of styles) {
        it(`${styleName} does NOT set color to c.accent or c.green (label stays at textPrimary)`, () => {
          const body = styleBody(src, styleName);
          expect(body).not.toBe('');
          expect(body).not.toMatch(/color:\s*c\.accent\b/);
          expect(body).not.toMatch(/color:\s*c\.green\b/);
          expect(body).not.toMatch(/color:\s*colors\.accent\b/);
          expect(body).not.toMatch(/color:\s*colors\.green\b/);
        });
      }
    });
  }
});

describe('Severity-tinted labels are intentionally preserved (not in scope)', () => {
  // Counter-example: log-medication-plan-item carries amber/red severity tints
  // on selected side-effect / skip-reason rows. Those should still be tinted.
  const src = read('app/log-medication-plan-item.tsx');

  it('sideEffectLabelSelected keeps amber severity tint', () => {
    const body = styleBody(src, 'sideEffectLabelSelected');
    expect(body).toMatch(/color:\s*c\.amber/);
  });

  it('skipReasonLabelSelected keeps amberBright severity tint', () => {
    const body = styleBody(src, 'skipReasonLabelSelected');
    expect(body).toMatch(/color:\s*c\.amberBright/);
  });
});

// Phase 32A F13 — "Selection signal lives on the checkmark + border"
// describe block retired. Its canonical examples were vitals.tsx +
// meals.tsx, both deleted by F13. The same visual contract now lives
// in the inline-expand drawer components (chipSelected style:
// borderColor c.accent + backgroundColor c.accentDim) — pinned by
// each drawer's own contract suite rather than re-asserted here.
