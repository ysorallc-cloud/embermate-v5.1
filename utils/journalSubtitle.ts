// ============================================================================
// JOURNAL SUBTITLE — time-aware variants for the Journal tab header.
//
// Drives the small one-line "[Name]'s day…" line under the Journal title.
// Branches by clock hour and a couple of optional signals so the copy reads
// naturally as the day progresses:
//
//   < noon                                 → "[Name]'s day, in progress."
//   noon – 6 PM                            → "[Name]'s day so far."
//   6 PM+ with a recent event              → "[Name]'s day so far · 8:05 PM"
//   6 PM+ with dayDone === true            → "[Name]'s day · wrapping up"
//   (6 PM+ with no events and not done)    → "[Name]'s day so far."
//
// dayDone is intentionally evening-gated: a morning "I'm finished" signal
// shouldn't flip the subtitle into the wrap-up copy prematurely.
// ============================================================================

import { LOVED_ONE_FALLBACK } from './lovedOneFallback';
import { possessive } from './text/possessive';

export interface JournalSubtitleInput {
  /** Patient display name. Empty / whitespace falls back to the canonical
   *  lowercase loved-one fallback (utils/lovedOneFallback). */
  name: string;
  /** Current time. Defaults to `new Date()` so callers can rely on Jest fake timers. */
  now?: Date;
  /** Timestamp of the most recent logged event for the day, if any. */
  lastEventAt?: Date;
  /** True when the day is fully logged or the user marked it done. */
  dayDone?: boolean;
  /**
   * When the journal is viewing a past calendar day, supply that date here.
   * Switches the subtitle to a static recap form: "[Name]'s day · Tue, Apr 8".
   */
  pastDate?: Date;
}

// Phase 23.2 F3 — was the titlecase literal. Routes through the canonical
// lowercase constant; the possessive renders as "your loved one's day…"
// when the patient name is unset (matches the mid-sentence register the
// loved-one fallback is used in elsewhere).
const NAME_FALLBACK = LOVED_ONE_FALLBACK;

function formatTimeOfDay(d: Date): string {
  const h24 = d.getHours();
  const m = d.getMinutes();
  const meridiem = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const mm = m < 10 ? `0${m}` : String(m);
  return `${h12}:${mm} ${meridiem}`;
}

export function journalSubtitle(input: JournalSubtitleInput): string {
  const now = input.now ?? new Date();
  const trimmed = (input.name ?? '').trim();
  const display = trimmed.length > 0 ? trimmed : NAME_FALLBACK;
  const displayPossessive = possessive(display);

  if (input.pastDate) {
    const weekday = input.pastDate.toLocaleDateString('en-US', { weekday: 'long' });
    const md = input.pastDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${displayPossessive} day · ${weekday}, ${md}`;
  }

  const hour = now.getHours();

  if (hour < 12) {
    return `${displayPossessive} day, in progress.`;
  }

  if (hour < 18) {
    return `${displayPossessive} day so far.`;
  }

  // 6 PM and later
  if (input.dayDone) {
    return `${displayPossessive} day · wrapping up`;
  }

  if (input.lastEventAt) {
    return `${displayPossessive} day so far · ${formatTimeOfDay(input.lastEventAt)}`;
  }

  return `${displayPossessive} day so far.`;
}
