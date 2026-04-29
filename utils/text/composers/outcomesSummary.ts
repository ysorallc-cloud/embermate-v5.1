// ============================================================================
// composeOutcomesSummary — one-line summary of the day's outcomes.
//
// Tone: honest, not cheery. Caregivers don't want toxic positivity.
// "Today was rough" reads as acknowledgment, not failure.
// ============================================================================

import { naturalList, pluralize } from '../primitives';
import type { DailyOutcomes } from '../types';

function summariseLogged(outcomes: DailyOutcomes): string {
  const { logged } = outcomes;
  if (logged.summary) return logged.summary;
  if (logged.categories && logged.categories.length > 0) {
    // Label is rendered verbatim — caller chooses the right form for the
    // count (e.g. "meals" at count 3, "morning check-in" at count 1).
    return naturalList(
      logged.categories.map((c) => `${c.count} ${c.label}`),
    );
  }
  return `${pluralize(logged.count, 'event')} logged`;
}

export function composeOutcomesSummary(outcomes: DailyOutcomes): string {
  const { logged, missed, pending } = outcomes;
  const total = logged.count + missed.count + pending.count;

  if (total === 0) {
    return 'Nothing logged yet today.';
  }

  if (missed.count === 0 && pending.count === 0) {
    return `Today went smoothly — ${summariseLogged(outcomes)}.`;
  }

  if (missed.count === 0 && pending.count > 0) {
    return `Mostly on track — ${pending.count} still to do (${naturalList(pending.names)}).`;
  }

  // Hard day — at least one miss. Compose the clauses in the spec order:
  // not-logged → still-to-do → logged. Caregiver-warm vocabulary; clinical
  // language ("missed dose") stays in services/visitPrepPdf.ts.
  const clauses: string[] = [];
  clauses.push(`${missed.count} not logged (${naturalList(missed.names)})`);
  if (pending.count > 0) {
    clauses.push(`${pending.count} still to do (${naturalList(pending.names)})`);
  }
  clauses.push(`${logged.count} logged`);

  return `Today was rough — ${clauses.join(', ')}.`;
}
