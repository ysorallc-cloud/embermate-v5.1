// ============================================================================
// composeHandoffParagraph — prose lead for the HandoffSheet preview.
//
// One paragraph, readable as a single message. The structured sections
// below the paragraph are for scanning — the prose is for reading.
// ============================================================================

import { composeOutcomesSummary } from './outcomesSummary';
import { formatTime } from '../primitives';
import type { DailyOutcomes } from '../types';

const NAME_FALLBACK = 'Your loved one';
// Curly possessive apostrophe to match other prose surfaces in the app.
const APOS = '’';

export function composeHandoffParagraph(
  outcomes: DailyOutcomes,
  notes: string | null,
  name: string,
  time: Date = new Date(),
): string {
  const trimmedName = (name ?? '').trim();
  const display = trimmedName.length > 0 ? trimmedName : NAME_FALLBACK;
  const trimmedNotes = (notes ?? '').trim();
  const hasNotes = trimmedNotes.length > 0;

  const opener = `${display}${APOS}s care today, as of ${formatTime(time)}:`;
  const summary = composeOutcomesSummary(outcomes);
  const hasIssues = outcomes.missed.count > 0 || outcomes.pending.count > 0;

  const parts: string[] = [opener, summary];
  if (hasNotes) {
    parts.push(`"${trimmedNotes}"`);
  }
  // Closer appears when there's something worth re-reading: misses, pending
  // items, or caregiver notes. A clean fully-logged day with no notes is
  // self-evident and doesn't need the prompt; same for an empty day.
  if (hasIssues || hasNotes) {
    parts.push('Worth a quick review before handing off.');
  }

  return parts.join(' ');
}
