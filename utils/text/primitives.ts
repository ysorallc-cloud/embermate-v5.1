// ============================================================================
// Text composition primitives.
//
// Pure functions, no state, no I/O. Each returns deterministic output from
// its inputs. Composers (utils/text/composers/*) build user-facing prose
// out of these.
// ============================================================================

/**
 * Join items with commas and a final conjunction. Uses the Oxford comma at
 * length 3+. Conjunction defaults to "and"; pass "or" for alternatives.
 *
 *   []                  → ""
 *   ["A"]               → "A"
 *   ["A", "B"]          → "A and B"
 *   ["A", "B", "C"]     → "A, B, and C"
 *   ["A", "B"], "or"    → "A or B"
 */
export function naturalList(items: string[], conjunction: string = 'and'): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} ${conjunction} ${items[1]}`;
  const head = items.slice(0, -1).join(', ');
  return `${head}, ${conjunction} ${items[items.length - 1]}`;
}

/**
 * "1 dose" / "2 doses". Default plural is `singular + "s"`. Caller passes
 * irregular plurals explicitly (e.g., person/people).
 */
export function pluralize(n: number, singular: string, plural?: string): string {
  const word = n === 1 ? singular : (plural ?? `${singular}s`);
  return `${n} ${word}`;
}

export type DayPart = 'morning' | 'afternoon' | 'evening' | 'night';

/**
 * Hour bucket per the spec:
 *   5–11  → morning
 *   12–17 → afternoon
 *   18–21 → evening
 *   22–4  → night
 */
export function timeOfDay(date: Date): DayPart {
  const h = date.getHours();
  if (h >= 5 && h <= 11) return 'morning';
  if (h >= 12 && h <= 17) return 'afternoon';
  if (h >= 18 && h <= 21) return 'evening';
  return 'night';
}

const WEEKDAY_NAMES = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function calendarDayOffset(target: Date, anchor: Date): number {
  const a = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate()).getTime();
  const b = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  return Math.round((a - b) / (1000 * 60 * 60 * 24));
}

/**
 * Calendar-relative day phrasing.
 *
 *   today      → "today"
 *   1 day ago  → "yesterday"
 *   2–6 ago    → "last Tuesday"
 *   7+ ago     → "on April 17"
 *
 * Time-of-day on the inputs is ignored — comparison is by calendar day.
 */
export function relativeDay(date: Date, now: Date = new Date()): string {
  const offset = calendarDayOffset(date, now);
  if (offset === 0) return 'today';
  if (offset === 1) return 'yesterday';
  if (offset >= 2 && offset <= 6) return `last ${WEEKDAY_NAMES[date.getDay()]}`;
  return `on ${MONTH_NAMES[date.getMonth()]} ${date.getDate()}`;
}

/**
 * Compose a multi-clause sentence from conditional fragments. Drops null /
 * undefined / empty parts, joins with single spaces, capitalizes the first
 * letter, and ensures the result ends in terminal punctuation (period
 * unless an existing "?" or "!" is already present).
 */
export function composeSentence(parts: (string | null | undefined)[]): string {
  const cleaned = parts
    .filter((p): p is string => p != null && p !== '')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (cleaned.length === 0) return '';

  let joined = cleaned.join(' ');
  // Capitalize first letter without disturbing the rest of the sentence.
  joined = joined.charAt(0).toUpperCase() + joined.slice(1);

  const last = joined[joined.length - 1];
  if (last === '.' || last === '?' || last === '!') {
    return joined;
  }
  return `${joined}.`;
}

export interface FormatTimeOpts {
  format: '12h' | '24h';
}

/**
 * Format a Date as a clock time. Defaults to 12-hour ("8:00 AM"). Pass
 * `{ format: '24h' }` to render zero-padded 24-hour output ("08:00").
 *
 * The user's "use 24-hour time" Setting toggle is read by callers, who pass
 * the resolved format here. This primitive stays pure — no storage access.
 */
export function formatTime(date: Date, opts?: FormatTimeOpts): string {
  const h24 = date.getHours();
  const m = date.getMinutes();
  const mm = m < 10 ? `0${m}` : String(m);

  if (opts?.format === '24h') {
    const hh = h24 < 10 ? `0${h24}` : String(h24);
    return `${hh}:${mm}`;
  }

  const meridiem = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${mm} ${meridiem}`;
}
