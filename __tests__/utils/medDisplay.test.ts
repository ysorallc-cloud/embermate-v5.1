// ============================================================================
// formatMedDisplay — shared med name+dose display helper.
//
// P1 fix (Option A): medication CarePlanItem.name is persisted WITH the dose
// baked in (`${name} ${dosage}`, see medication-form.tsx:209 + carePlanGenerator
// + migrationService), AND itemDosage is stored separately. Surfaces that append
// the dose on top double it ("Aspirin 81mg 81mg"). This helper centralizes the
// dedupe (the pattern MedsBatchPanel already used inline) so no surface doubles.
//
// Option B (normalize the stored data — stop baking dose into name + migrate) is
// deliberately DEFERRED; this helper is the render-layer dedupe.
// ============================================================================

import { formatMedDisplay, dosageNotInName } from '../../utils/medDisplay';

describe('formatMedDisplay', () => {
  it('dedupes when the name already contains the dose (the P1 case)', () => {
    // Systematic: itemName is "Aspirin 81mg", itemDosage is "81mg".
    expect(formatMedDisplay('Aspirin 81mg', '81mg')).toBe('Aspirin 81mg');
  });

  it('appends the dose to a clean name', () => {
    expect(formatMedDisplay('Aspirin', '81mg')).toBe('Aspirin 81mg');
  });

  it('returns the name unchanged when there is no dose', () => {
    expect(formatMedDisplay('Aspirin', undefined)).toBe('Aspirin');
    expect(formatMedDisplay('Aspirin', '')).toBe('Aspirin');
    expect(formatMedDisplay('Aspirin', '   ')).toBe('Aspirin');
  });

  it('dedupes case-insensitively', () => {
    // Name carries "81MG", dose is "81mg" — still one, keep the name form.
    expect(formatMedDisplay('Aspirin 81MG', '81mg')).toBe('Aspirin 81MG');
  });

  it('stale-name case: name has an OLD dose, itemDosage is a DIFFERENT dose — appends (surfaces, does not hide)', () => {
    // Documents current behavior: a genuine stale name shouldn't occur (every
    // dose edit rebuilds the name), but if it did, the helper appends both so
    // the inconsistency is visible rather than silently hidden.
    expect(formatMedDisplay('Aspirin 81mg', '162mg')).toBe('Aspirin 81mg 162mg');
  });

  it('tolerates an empty/undefined name', () => {
    expect(formatMedDisplay('', '81mg')).toBe('81mg');
    expect(formatMedDisplay(undefined as any, '81mg')).toBe('81mg');
  });
});

describe('dosageNotInName — the separate-dose guard (MedsBatchPanel prefix pattern)', () => {
  it('false when there is no dose', () => {
    expect(dosageNotInName('Aspirin', undefined)).toBe(false);
    expect(dosageNotInName('Aspirin', '')).toBe(false);
  });
  it('false when the name already contains the dose (case-insensitive)', () => {
    expect(dosageNotInName('Aspirin 81mg', '81mg')).toBe(false);
    expect(dosageNotInName('Aspirin 81MG', '81mg')).toBe(false);
  });
  it('true when the name does not contain the dose (show it separately)', () => {
    expect(dosageNotInName('Aspirin', '81mg')).toBe(true);
    expect(dosageNotInName('Aspirin 81mg', '162mg')).toBe(true);
  });
});
