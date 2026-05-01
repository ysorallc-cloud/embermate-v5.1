// ============================================================================
// PATIENT QUESTIONS REPO
//
// "Questions for the doctor" — the running list a caregiver builds across the
// period leading up to a visit. Surfaced in the Visit Prep PDF (Phase 4) and
// editable from a small entry surface on Care Plan / You.
//
// Behavior:
// • One per-patient list, ordered by insertion (oldest first).
// • Empty / whitespace-only adds are rejected — the entry surface should
//   trim and validate, but the repo defends as well.
// • clearQuestions() drops the list — invoked after the PDF is generated so
//   the next visit starts fresh.
// ============================================================================

import { safeGetItem, safeSetItem } from '../utils/safeStorage';
import { emitDataUpdate } from '../lib/events';
import { EVENT } from '../lib/eventNames';
import { generateUniqueId } from '../utils/idGenerator';
import { logError } from '../utils/devLog';

export interface PatientQuestion {
  id: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}

const KEY = (patientId: string) => `@embermate_patient_questions_v1:${patientId}`;

async function read(patientId: string): Promise<PatientQuestion[]> {
  return safeGetItem<PatientQuestion[]>(KEY(patientId), []);
}

async function write(patientId: string, questions: PatientQuestion[]): Promise<void> {
  await safeSetItem(KEY(patientId), questions);
}

export async function addQuestion(
  patientId: string,
  text: string,
): Promise<PatientQuestion> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error('addQuestion: text must be non-empty');
  }
  try {
    const list = await read(patientId);
    const now = new Date().toISOString();
    const q: PatientQuestion = {
      id: generateUniqueId(),
      text: trimmed,
      createdAt: now,
      updatedAt: now,
    };
    list.push(q);
    await write(patientId, list);
    emitDataUpdate(EVENT.NOTES);
    return q;
  } catch (err) {
    logError('patientQuestionsRepo.add', err);
    throw err;
  }
}

export async function listQuestions(patientId: string): Promise<PatientQuestion[]> {
  try {
    return read(patientId);
  } catch (err) {
    logError('patientQuestionsRepo.list', err);
    return [];
  }
}

export async function removeQuestion(
  patientId: string,
  questionId: string,
): Promise<void> {
  try {
    const list = await read(patientId);
    const next = list.filter((q) => q.id !== questionId);
    if (next.length === list.length) return;
    await write(patientId, next);
    emitDataUpdate(EVENT.NOTES);
  } catch (err) {
    logError('patientQuestionsRepo.remove', err);
  }
}

export async function updateQuestion(
  patientId: string,
  questionId: string,
  newText: string,
): Promise<PatientQuestion | null> {
  const trimmed = newText.trim();
  if (!trimmed) return null;
  try {
    const list = await read(patientId);
    const index = list.findIndex((q) => q.id === questionId);
    if (index === -1) return null;
    const updated: PatientQuestion = {
      ...list[index],
      text: trimmed,
      updatedAt: new Date().toISOString(),
    };
    list[index] = updated;
    await write(patientId, list);
    emitDataUpdate(EVENT.NOTES);
    return updated;
  } catch (err) {
    logError('patientQuestionsRepo.update', err);
    return null;
  }
}

/**
 * Drop all questions for a patient. Called after PDF generation per Phase 4 —
 * "Cleared after PDF generation" so the next visit's list starts empty.
 */
export async function clearQuestions(patientId: string): Promise<void> {
  try {
    await write(patientId, []);
    emitDataUpdate(EVENT.NOTES);
  } catch (err) {
    logError('patientQuestionsRepo.clear', err);
  }
}
