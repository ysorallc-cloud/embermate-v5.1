// ============================================================================
// DAILY AFFIRMATION PICKER
// Deterministic mapping from a calendar day → one entry in AFFIRMATIONS.
// Hash: sum the char codes of YYYY-MM-DD, mod by list length. Same date in
// returns the same affirmation; consecutive days produce different indices.
// ============================================================================

import { AFFIRMATIONS } from './affirmations';

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function hashKey(key: string): number {
  let sum = 0;
  for (let i = 0; i < key.length; i++) {
    sum += key.charCodeAt(i);
  }
  return sum;
}

/**
 * Returns the affirmation for `date` (defaults to now). Time of day is
 * ignored — the YYYY-MM-DD string drives selection, so the same calendar
 * day always returns the same line.
 */
export function getDailyAffirmation(date: Date = new Date()): string {
  const key = dateKey(date);
  const idx = hashKey(key) % AFFIRMATIONS.length;
  return AFFIRMATIONS[idx];
}
