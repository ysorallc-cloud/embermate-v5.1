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
//
// Phase 23.2 F2 — orphan count anchor. When the only non-zero outcome is
// missed (logged === 0 AND pending === 0 AND missed > 0), the 23.1 output
// "11 not yet logged. Review before handing off." read as an orphan count
// — 11 of what? The reframe anchors the count with its denominator:
//
//   "0 of 11 logged today. Review before handing off."
//
// This harmonises structurally with the Journal footer ("X of N logged
// today") and the gestalt block ("0/5 medications logged"). All three
// cover surfaces use the same fraction grammar when a day is empty of
// completions — only the scope differs (full day, total tasks, single
// bucket). If Phase 22.4 reframes the gestalt away from fractions, this
// footer follows then.
//
// The anchor only fires on the orphan branch. Cases where logged > 0 OR
// pending > 0 keep their 23.1 witness-voice clauses unchanged — pending
// is the actionable evening signal in those cases, not the absence count.
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
  // Phase 23.2 F2 — orphan branch. Fires only when the day is completely
  // un-logged AND nothing remains pending, leaving missed as the lone
  // non-zero outcome. We re-introduce the logged count here ONLY because
  // it's the numerator of a fraction — not as a standalone clause (which
  // 23.1 banned). The notable-readings clause (if any) appends after.
  const isOrphan =
    outcomes.logged.count === 0 &&
    outcomes.pending.count === 0 &&
    outcomes.missed.count > 0;

  if (isOrphan) {
    const total = outcomes.missed.count; // logged + pending = 0 here
    const clauses: string[] = [`0 of ${total} logged today`];
    const notable = notableClause(outcomes.notable);
    if (notable) clauses.push(notable);
    return `${clauses.join(', ')}. Review before handing off.`;
  }

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
