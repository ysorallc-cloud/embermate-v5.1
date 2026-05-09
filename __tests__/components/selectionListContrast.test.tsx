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
const targets: Array<{ file: string; styles: string[] }> = [
  {
    file: 'app/care-plan/vitals.tsx',
    styles: ['priorityLabelSelected', 'vitalLabelSelected', 'frequencyLabelSelected'],
  },
  {
    file: 'app/care-plan/meals.tsx',
    styles: ['priorityLabelSelected', 'mealLabelSelected', 'styleLabelSelected'],
  },
  { file: 'app/care-plan/sleep.tsx',    styles: ['priorityLabelSelected'] },
  { file: 'app/care-plan/activity.tsx', styles: ['priorityLabelSelected'] },
  {
    file: 'app/care-plan/water.tsx',
    styles: ['priorityLabelSelected', 'goalOptionLabelSelected', 'unitLabelSelected', 'reminderLabelSelected'],
  },
  {
    file: 'app/care-plan/manage.tsx',
    styles: ['typeChipLabelSelected', 'windowLabelSelected', 'priorityLabelSelected'],
  },
  { file: 'app/log-mood.tsx',             styles: ['moodLabelSelected'] },
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

describe('Selection signal lives on the checkmark + border, not the label', () => {
  // For vitals + meals (the canonical examples), the selected-row style still
  // sets a mint border, and the checkbox-selected style still sets accent
  // background — those are the visual signals after this fix.
  const vitalsSrc = read('app/care-plan/vitals.tsx');
  const mealsSrc  = read('app/care-plan/meals.tsx');

  it('vitalItemSelected sets borderColor: c.accent', () => {
    const body = styleBody(vitalsSrc, 'vitalItemSelected');
    expect(body).toMatch(/borderColor:\s*c\.accent/);
  });

  it('vitals checkboxSelected fills with c.accent', () => {
    const body = styleBody(vitalsSrc, 'checkboxSelected');
    expect(body).toMatch(/backgroundColor:\s*c\.accent/);
  });

  it('mealItemSelected sets borderColor: c.accent', () => {
    const body = styleBody(mealsSrc, 'mealItemSelected');
    expect(body).toMatch(/borderColor:\s*c\.accent/);
  });

  it('meals checkboxSelected fills with c.accent', () => {
    const body = styleBody(mealsSrc, 'checkboxSelected');
    expect(body).toMatch(/backgroundColor:\s*c\.accent/);
  });
});
