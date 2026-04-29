// ============================================================================
// composeJournalDraft — multi-sentence draft for the Journal text input.
//
// Suggested starting point only — the user is expected to edit. Keep it
// short, factual, and honest. Returns "" when there's nothing to say.
// ============================================================================

import { composeOutcomesSummary } from './outcomesSummary';
import { composeSentence, formatTime, timeOfDay } from '../primitives';
import type { DailyOutcomes, NotableReading, Alert } from '../types';

function severityTail(s: NotableReading['severity']): string | null {
  if (s === 'elevated') return 'slightly elevated';
  if (s === 'high') return 'high';
  if (s === 'low') return 'low';
  return null; // normal or unspecified — not worth mentioning
}

function notableSentence(notable: NotableReading[] | undefined): string | null {
  if (!notable || notable.length === 0) return null;
  // Stop condition from the brief: if multiple notable readings, ambiguity
  // about which to feature → omit. Better silent than wrong.
  const flagged = notable.filter((n) => severityTail(n.severity) !== null);
  if (flagged.length !== 1) return null;
  const r = flagged[0];
  const tail = severityTail(r.severity)!;
  return `${r.type} at ${formatTime(r.time)} was ${r.reading}, ${tail}.`;
}

function aheadSentence(now: Date, outcomes: DailyOutcomes): string | null {
  if (outcomes.pending.count === 0 && timeOfDay(now) !== 'morning') return null;

  const part = timeOfDay(now);
  if (part === 'morning') {
    return 'Afternoon and evening still ahead.';
  }
  if (part === 'afternoon') {
    return 'Evening still ahead.';
  }
  return null;
}

export function composeJournalDraft(
  outcomes: DailyOutcomes,
  _alerts: Alert[],
  time: Date = new Date(),
): string {
  const total = outcomes.logged.count + outcomes.missed.count + outcomes.pending.count;
  if (total === 0) return '';

  const opening = composeOutcomesSummary(outcomes);
  const middle = notableSentence(outcomes.notable);
  const closing = aheadSentence(time, outcomes);

  // Each clause is already a complete sentence — just join with spaces.
  return [opening, middle, closing].filter((s): s is string => !!s).join(' ');
}
