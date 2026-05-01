// ============================================================================
// MEDICATION CHANGE TRACKING
//
// Append-only log of medication adds / removals / dose changes per patient.
// Powers the Visit Prep PDF's "What changed after medication updates" section
// (Phase 5 of Prompt 5). Reads filter by inclusive date range; writes are
// fire-and-forget (errors log to dev but never throw — losing a change-log
// entry should not break a med edit flow).
//
// The log is forward-only — entries before tracking was instrumented are
// absent, which matches the prompt's stop condition: "If medication change
// tracking requires retrofitting old records, default to 'No medication
// changes' for periods that pre-date tracking."
// ============================================================================

import { safeGetItem, safeSetItem } from '../utils/safeStorage';
import { generateUniqueId } from '../utils/idGenerator';
import { emitDataUpdate } from '../lib/events';
import { EVENT } from '../lib/eventNames';
import { logError } from '../utils/devLog';

export type MedicationChangeKind = 'added' | 'removed' | 'dose_changed';

export interface MedicationChangePatch {
  kind: MedicationChangeKind;
  medicationId: string;
  medicationName: string;
  previousDosage?: string;
  newDosage?: string;
  note?: string;
}

export interface MedicationChange extends MedicationChangePatch {
  id: string;
  patientId: string;
  changedAt: string; // ISO timestamp
}

const KEY = (patientId: string) => `@embermate_med_change_log_v1:${patientId}`;

async function read(patientId: string): Promise<MedicationChange[]> {
  return safeGetItem<MedicationChange[]>(KEY(patientId), []);
}

async function write(patientId: string, list: MedicationChange[]): Promise<void> {
  await safeSetItem(KEY(patientId), list);
}

export async function recordMedicationChange(
  patientId: string,
  patch: MedicationChangePatch,
): Promise<void> {
  try {
    const list = await read(patientId);
    const entry: MedicationChange = {
      ...patch,
      id: generateUniqueId(),
      patientId,
      changedAt: new Date().toISOString(),
    };
    list.push(entry);
    await write(patientId, list);
    emitDataUpdate(EVENT.MEDICATION);
  } catch (err) {
    logError('medicationChangeTracking.record', err);
  }
}

export async function listMedicationChanges(
  patientId: string,
  startDate: string,
  endDate: string,
): Promise<MedicationChange[]> {
  try {
    const list = await read(patientId);
    // Inclusive: 2026-04-10..2026-04-20 should match changedAt 2026-04-20T23:59:59.
    const startMs = new Date(`${startDate}T00:00:00`).getTime();
    const endMs = new Date(`${endDate}T23:59:59.999`).getTime();
    const filtered = list.filter((c) => {
      const t = new Date(c.changedAt).getTime();
      return t >= startMs && t <= endMs;
    });
    filtered.sort((a, b) => a.changedAt.localeCompare(b.changedAt));
    return filtered;
  } catch (err) {
    logError('medicationChangeTracking.list', err);
    return [];
  }
}
