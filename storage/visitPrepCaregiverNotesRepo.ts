// ============================================================================
// VISIT PREP CAREGIVER NOTES REPO — Phase 16.2
//
// Per-appointment storage for the four caregiver-fillable Visit Prep
// prompts:
//   • symptomsChanged       — 3 short text fields
//   • functionalChanges     — 3 short text fields
//   • questionsForProvider  — 3 short text fields
//   • helpProvidedThisWeek  — longer single field
//
// Routes through safeStorage; the key prefix
// `visit_prep_caregiver_notes_` is health-sensitive and auto-encrypts
// to SecureStore on iOS per safeStorage's routing rules.
//
// Caregiver-driven only — this repo is the ONLY source of these
// values. The PDF assembler reads from here; nothing else writes.
// No log aggregators or insight detectors seed this data.
// ============================================================================

import { safeGetItem, safeSetItem } from '../utils/safeStorage';
import { logError } from '../utils/devLog';

export interface VisitPrepCaregiverNotes {
  symptomsChanged: [string, string, string];
  functionalChanges: [string, string, string];
  questionsForProvider: [string, string, string];
  helpProvidedThisWeek: string;
}

export const EMPTY_CAREGIVER_NOTES: VisitPrepCaregiverNotes = {
  symptomsChanged: ['', '', ''],
  functionalChanges: ['', '', ''],
  questionsForProvider: ['', '', ''],
  helpProvidedThisWeek: '',
};

const KEY_PREFIX = 'visit_prep_caregiver_notes_';

function keyFor(appointmentId: string): string {
  return `${KEY_PREFIX}${appointmentId}`;
}

function isWellFormed(v: any): v is VisitPrepCaregiverNotes {
  if (!v || typeof v !== 'object') return false;
  const triples = ['symptomsChanged', 'functionalChanges', 'questionsForProvider'];
  for (const t of triples) {
    if (!Array.isArray(v[t]) || v[t].length !== 3) return false;
    if (v[t].some((x: unknown) => typeof x !== 'string')) return false;
  }
  if (typeof v.helpProvidedThisWeek !== 'string') return false;
  return true;
}

export async function getCaregiverNotes(
  appointmentId: string,
): Promise<VisitPrepCaregiverNotes> {
  try {
    const stored = await safeGetItem<any>(keyFor(appointmentId), null);
    if (stored === null) return { ...EMPTY_CAREGIVER_NOTES };
    if (!isWellFormed(stored)) {
      // Defensive boundary: malformed payload (future-version write
      // that we don't recognize, or partial corruption) falls back
      // to empty rather than throwing.
      return { ...EMPTY_CAREGIVER_NOTES };
    }
    return stored;
  } catch (err) {
    logError('visitPrepCaregiverNotesRepo.get', err);
    return { ...EMPTY_CAREGIVER_NOTES };
  }
}

export async function saveCaregiverNotes(
  appointmentId: string,
  value: VisitPrepCaregiverNotes,
): Promise<void> {
  try {
    await safeSetItem(keyFor(appointmentId), value);
  } catch (err) {
    logError('visitPrepCaregiverNotesRepo.save', err);
  }
}
