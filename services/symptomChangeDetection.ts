// ============================================================================
// SYMPTOM CHANGE DETECTION
//
// Compares first-half vs second-half symptom frequency over the Visit Prep
// period. Surfaces the 3–5 most-changed symptoms for the PDF section.
//
// Classification rules (deliberately conservative — false-positives in this
// data make the PDF noisier than no signal at all):
//   • new      → 0 in first half, >0 in second
//   • resolved → >0 in first half, 0 in second
//   • worse    → second-half freq is ≥2x first-half freq
//   • better   → second-half freq is ≤0.5x first-half freq
//   • (omitted) → change within ±50% — too noisy to be informative
//
// Sorted by magnitude of change so the most-meaningful entries land first.
// ============================================================================

import { getEventsByDateRange } from '../storage/eventRepo';
import type { CareEvent } from '../types/event';
import { logError } from '../utils/devLog';

export type SymptomChangeKind = 'new' | 'worse' | 'better' | 'resolved';

export interface SymptomChange {
  symptom: string;
  change: SymptomChangeKind;
  firstHalfFreq: number;
  secondHalfFreq: number;
  briefDescription: string;
}

export interface DateRange {
  start: string; // YYYY-MM-DD
  end: string;
}

const MAX_RESULTS = 5;
const MIN_DAYS_FOR_DETECTION = 7;

function symptomNameFromEvent(event: CareEvent): string | null {
  const meta = event.metadata as any;
  if (!meta) return null;
  const name = meta.symptomName || meta.name || meta.symptom;
  return typeof name === 'string' && name.trim() ? name.trim().toLowerCase() : null;
}

function daysBetween(start: string, end: string): number {
  const s = new Date(`${start}T12:00:00`).getTime();
  const e = new Date(`${end}T12:00:00`).getTime();
  return Math.floor((e - s) / (1000 * 60 * 60 * 24)) + 1;
}

function midpointDate(start: string, end: string): string {
  const s = new Date(`${start}T12:00:00`);
  const e = new Date(`${end}T12:00:00`);
  const mid = new Date((s.getTime() + e.getTime()) / 2);
  return mid.toISOString().slice(0, 10);
}

function classify(first: number, second: number): SymptomChangeKind | null {
  if (first === 0 && second > 0) return 'new';
  if (first > 0 && second === 0) return 'resolved';
  if (first === 0 && second === 0) return null;
  const ratio = second / first;
  if (ratio >= 2) return 'worse';
  if (ratio <= 0.5) return 'better';
  return null;
}

function magnitude(first: number, second: number): number {
  // Combined "how far apart are the two halves" — drives sort order so that
  // a 0→6 jump ranks above 1→3, but 0→1 ranks below 0→2.
  return Math.abs(second - first) + Math.max(first, second);
}

function describe(symptom: string, kind: SymptomChangeKind, first: number, second: number): string {
  switch (kind) {
    case 'new':
      return `${symptom} reported ${second} time${second === 1 ? '' : 's'} in the recent half — none in the earlier half.`;
    case 'resolved':
      return `${symptom} reported ${first} time${first === 1 ? '' : 's'} earlier — none in the recent half.`;
    case 'worse':
      return `${symptom} reported ${second}x in the recent half vs. ${first}x earlier.`;
    case 'better':
      return `${symptom} dropped from ${first}x earlier to ${second}x in the recent half.`;
  }
}

export async function detectSymptomChanges(
  patientId: string,
  range: DateRange,
): Promise<SymptomChange[]> {
  // Stop condition: small windows produce noisy results. PDF caller should
  // surface the "More data needed" message above the empty section.
  if (daysBetween(range.start, range.end) < MIN_DAYS_FOR_DETECTION) {
    return [];
  }

  let events: CareEvent[];
  try {
    events = await getEventsByDateRange(range.start, range.end, patientId);
  } catch (err) {
    logError('symptomChangeDetection.read', err);
    return [];
  }

  const symptomEvents = events.filter((e) => e.type === 'symptom_reported');
  if (symptomEvents.length === 0) return [];

  const mid = midpointDate(range.start, range.end);
  const counts = new Map<string, { first: number; second: number }>();

  for (const e of symptomEvents) {
    const name = symptomNameFromEvent(e);
    if (!name) continue;
    const day = e.timestamp.slice(0, 10);
    const slot = day < mid ? 'first' : 'second';
    const entry = counts.get(name) || { first: 0, second: 0 };
    entry[slot] += 1;
    counts.set(name, entry);
  }

  const changes: SymptomChange[] = [];
  for (const [symptom, { first, second }] of counts) {
    const kind = classify(first, second);
    if (!kind) continue;
    changes.push({
      symptom,
      change: kind,
      firstHalfFreq: first,
      secondHalfFreq: second,
      briefDescription: describe(symptom, kind, first, second),
    });
  }

  changes.sort((a, b) => {
    const mb = magnitude(b.firstHalfFreq, b.secondHalfFreq);
    const ma = magnitude(a.firstHalfFreq, a.secondHalfFreq);
    return mb - ma;
  });

  return changes.slice(0, MAX_RESULTS);
}
