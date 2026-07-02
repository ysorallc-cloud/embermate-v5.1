// ============================================================================
// MED DISPLAY — shared name+dose formatter (P1 dedupe).
//
// Medication CarePlanItem.name is persisted WITH the dose baked in
// (`${name} ${dosage}` at medication-form.tsx:209, carePlanGenerator, and
// migrationService), while itemDosage is ALSO stored separately. Surfaces that
// append the dose on top of the name double it ("Aspirin 81mg 81mg").
//
// This helper centralizes the dedupe (the same `!name.includes(dose)` guard
// MedsBatchPanel used inline) so every surface renders the med line one way and
// none can re-introduce the doubling.
//
// Option A (render-layer dedupe). Option B — normalizing the stored data so the
// dose is not baked into the name (+ a migration) — is deliberately DEFERRED.
// ============================================================================

/**
 * True when the dose should be shown SEPARATELY from the name — i.e. there is a
 * dose and the name does not already contain it (case-insensitive). Use this at
 * surfaces that render the dose as its own element (e.g. a "81mg · " meta prefix)
 * rather than appending it to the name. Centralizes the guard MedsBatchPanel
 * used inline.
 */
export function dosageNotInName(itemName: string | undefined | null, itemDosage?: string | null): boolean {
  const name = (itemName ?? '').trim().toLowerCase();
  const dose = (itemDosage ?? '').trim().toLowerCase();
  return dose.length > 0 && !name.includes(dose);
}

/**
 * Format a medication's display line, de-duplicating the dose.
 * - no dose            → the name
 * - name contains dose → the name (case-insensitive; avoids the double)
 * - else               → `${name} ${dose}`
 */
export function formatMedDisplay(itemName: string | undefined | null, itemDosage?: string | null): string {
  const name = (itemName ?? '').trim();
  const dose = (itemDosage ?? '').trim();
  if (!dose) return name;
  if (!name) return dose;
  return dosageNotInName(name, dose) ? `${name} ${dose}` : name;
}

export default formatMedDisplay;
