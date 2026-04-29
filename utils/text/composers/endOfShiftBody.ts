// ============================================================================
// composeEndOfShiftBody — body text for the End of Shift card on Now.
//
// "[N] items logged. [optional alert clause]. Review before handing off."
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
  const itemsClause = pluralize(outcomes.logged.count, 'item logged', 'items logged');

  const detailClauses: string[] = [];
  if (outcomes.missed.count > 0) {
    // Caregiver-warm vocabulary on Now (the EndOfShift card lives there).
    // Clinical "missed dose" stays in services/visitPrepPdf.ts.
    detailClauses.push(pluralize(outcomes.missed.count, 'not logged', 'not logged'));
  }
  if (outcomes.pending.count > 0) {
    detailClauses.push(`${outcomes.pending.count} still to do`);
  }
  const notable = notableClause(outcomes.notable);
  if (notable) detailClauses.push(notable);

  const head = detailClauses.length > 0
    ? `${itemsClause}, ${detailClauses.join(', ')}`
    : itemsClause;

  return `${head}. Review before handing off.`;
}
