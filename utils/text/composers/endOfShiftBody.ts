// ============================================================================
// composeEndOfShiftBody — body text for the End of Shift card on Now.
//
// Phase 23.1 Fix 4 — softened to witness voice. Pre-fix the body led with
// "0 items logged, 11 not logged, 3 still to do. Review before handing
// off." — a stark count of failure when the caregiver had logged nothing
// yet. Post-fix the body:
//   • Never leads with a zero ("0 items logged" is suppressed; we only
//     mention logged.count when it's > 0).
//   • Reframes "not logged" → "not yet logged" — observational, not
//     judgmental. The day is still open.
//   • Adds "this evening" qualifier on the pending clause so the card
//     reads as a handoff prompt, not a final accounting.
//   • Falls back to a gentle "Today's care is wrapping up" when nothing
//     has been logged AND nothing else needs attention.
// Math reconciliation: logged + missed + pending continues to equal the
// Journal footer's total ("X of N logged today"), since the underlying
// outcomes object is unchanged — only the prose around it softened.
// ============================================================================

import { pluralize } from '../primitives';
import type { DailyOutcomes, Alert, NotableReading } from '../types';

function severityWord(s: NotableReading['severity']): string | null {
  if (s === 'high') return 'high';
  if (s === 'elevated') return 'elevated';
  if (s === 'low') return 'low';
  return null;
}

function notableClause(notable: NotableReading[] | undefined): string | null {
  if (!notable || notable.length === 0) return null;
  const flagged = notable.filter((n) => severityWord(n.severity) !== null);
  if (flagged.length === 0) return null;
  // Group by type/severity for a single clause: "1 BP reading was high".
  // For multiple readings of the same type/severity: "2 BP readings were high".
  const sample = flagged[0];
  const word = severityWord(sample.severity)!;
  const sameKind = flagged.filter(
    (n) => n.type === sample.type && severityWord(n.severity) === word,
  );
  const noun = pluralize(sameKind.length, `${sample.type} reading`);
  const verb = sameKind.length === 1 ? 'was' : 'were';
  return `${noun} ${verb} ${word}`;
}

export function composeEndOfShiftBody(
  outcomes: DailyOutcomes,
  _alerts: Alert[],
): string {
  const clauses: string[] = [];

  if (outcomes.logged.count > 0) {
    clauses.push(pluralize(outcomes.logged.count, 'item logged', 'items logged'));
  }
  if (outcomes.pending.count > 0) {
    clauses.push(`${outcomes.pending.count} still to do this evening`);
  }
  if (outcomes.missed.count > 0) {
    clauses.push(pluralize(outcomes.missed.count, 'not yet logged', 'not yet logged'));
  }
  const notable = notableClause(outcomes.notable);
  if (notable) clauses.push(notable);

  if (clauses.length === 0) {
    // All-zero day — no logged items, no pending, no missed, no notable.
    // Gentle observational fallback, no enumeration.
    return "Today's care is wrapping up. Review before handing off.";
  }

  return `${clauses.join(', ')}. Review before handing off.`;
}
