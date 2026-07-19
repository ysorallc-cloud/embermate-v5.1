// ============================================================================
// Brand-name aliases for the medication autocomplete. COMMON_MEDICATIONS holds
// clinical names only, so a caregiver typing a brand ("Tylenol") got nothing.
// matchMedications matches a query against the clinical name OR the entry's
// brand aliases, surfacing the right clinical entry (with its dose options).
// Brands cover the ~18 existing meds only — not a new drug database. Free-text
// still works for anything unlisted (an empty match → the caller keeps the typed
// text).
// ============================================================================

import { matchMedications, COMMON_MEDICATIONS } from '../../components/medication/medicationFormHelpers';

function names(query: string): string[] {
  return matchMedications(query).map((m) => m.name);
}

describe('matchMedications — brand aliases → clinical entry', () => {
  it('a brand name surfaces its clinical entry (with dose options)', () => {
    const tylenol = matchMedications('Tylenol');
    expect(tylenol.map((m) => m.name)).toContain('Acetaminophen');
    // Same entry → carries the clinical dose options.
    expect(tylenol.find((m) => m.name === 'Acetaminophen')!.commonDosages.length).toBeGreaterThan(0);

    expect(names('Coumadin')).toContain('Warfarin');
    expect(names('Advil')).toContain('Ibuprofen');
    expect(names('Motrin')).toContain('Ibuprofen');
    expect(names('Glucophage')).toContain('Metformin');
    expect(names('Lasix')).toContain('Furosemide');
    expect(names('Norvasc')).toContain('Amlodipine');
    expect(names('Lipitor')).toContain('Atorvastatin');
    expect(names('Synthroid')).toContain('Levothyroxine');
    expect(names('Prilosec')).toContain('Omeprazole');
    expect(names('Zestril')).toContain('Lisinopril');
    expect(names('Prinivil')).toContain('Lisinopril');
    expect(names('Cozaar')).toContain('Losartan');
    expect(names('Toprol')).toContain('Metoprolol');
    expect(names('Plavix')).toContain('Clopidogrel');
  });

  it('case-insensitive + partial brand prefixes match', () => {
    expect(names('tylen')).toContain('Acetaminophen');
    expect(names('COUMADIN')).toContain('Warfarin');
  });

  it('clinical-name search still works (regression)', () => {
    expect(names('Lisin')).toContain('Lisinopril');
    expect(names('Warfarin')).toContain('Warfarin');
  });

  it('an unlisted brand/med returns no match → caller free-texts', () => {
    expect(matchMedications('Eliquis')).toHaveLength(0);
    expect(matchMedications('Nonexistent')).toHaveLength(0);
    expect(matchMedications('')).toHaveLength(0);
  });

  it('brands only decorate existing entries — the list length is unchanged', () => {
    expect(COMMON_MEDICATIONS.length).toBe(18);
  });
});
