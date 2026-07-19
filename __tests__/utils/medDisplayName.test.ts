// ============================================================================
// resolveMedDisplayName — store BOTH names for brand-aliased meds so they read
// consistently EVERYWHERE (schedule, timeline, handoff, report), not just in the
// autocomplete suggestion. Clinical name for accuracy + brand for recognition:
// "Acetaminophen (Tylenol)". Whether the caregiver typed the clinical name or a
// brand, the stored/displayed name resolves to the combined form. Unlisted meds
// (free-text) are returned unchanged.
// ============================================================================

import { resolveMedDisplayName } from '../../components/medication/medicationFormHelpers';

describe('resolveMedDisplayName — clinical + brand', () => {
  it('a brand entry → "Clinical (Brand)"', () => {
    expect(resolveMedDisplayName('Tylenol')).toBe('Acetaminophen (Tylenol)');
    expect(resolveMedDisplayName('Coumadin')).toBe('Warfarin (Coumadin)');
    expect(resolveMedDisplayName('Glucophage')).toBe('Metformin (Glucophage)');
  });

  it('the CLINICAL name of an aliased med also resolves to "Clinical (Brand)"', () => {
    // Consistency: however it was entered, an aliased med shows both.
    expect(resolveMedDisplayName('Acetaminophen')).toBe('Acetaminophen (Tylenol)');
    expect(resolveMedDisplayName('Lisinopril')).toBe('Lisinopril (Zestril)');
  });

  it('case-insensitive', () => {
    expect(resolveMedDisplayName('tylenol')).toBe('Acetaminophen (Tylenol)');
    expect(resolveMedDisplayName('ACETAMINOPHEN')).toBe('Acetaminophen (Tylenol)');
  });

  it('a listed med with NO brand → clinical name unchanged', () => {
    expect(resolveMedDisplayName('Aspirin')).toBe('Aspirin');
  });

  it('an unlisted med (free-text) → returned unchanged', () => {
    expect(resolveMedDisplayName('Eliquis')).toBe('Eliquis');
    expect(resolveMedDisplayName('Some Compound 5mg')).toBe('Some Compound 5mg');
  });

  it('an already-combined name is not double-wrapped', () => {
    expect(resolveMedDisplayName('Acetaminophen (Tylenol)')).toBe('Acetaminophen (Tylenol)');
  });

  it('empty / whitespace → returned as-is', () => {
    expect(resolveMedDisplayName('')).toBe('');
    expect(resolveMedDisplayName('   ')).toBe('');
  });
});
