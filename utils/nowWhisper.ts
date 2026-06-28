// ============================================================================
// NOW TIMELINE WHISPER — the one-line status whisper above the flat feed.
//
// Extracted from FlatTimelineFeed so the copy is unit-testable. Bare-factual,
// calm. The overdue branch states actual state and NEVER claims a time-block
// is "done" while anything is overdue (the prior hardcoded "Morning done."
// was false in exactly that case — a trust issue in a care app). The done
// count is intentionally not surfaced here; the progress rings already show
// it, so the whisper points at what needs attention.
// ============================================================================

export type NowWhisperStatus = 'done' | 'overdue' | 'pending';

export function composeNowWhisper(
  items: ReadonlyArray<{ status: NowWhisperStatus }>,
): string | null {
  if (items.length === 0) return null;

  const total = items.length;
  const done = items.filter((i) => i.status === 'done').length;
  const overdue = items.filter((i) => i.status === 'overdue').length;
  const pending = items.filter((i) => i.status === 'pending').length;

  if (done === total) return 'All done today.';

  if (overdue > 0) {
    // No false "done" lead; suppress the awkward "0 still ahead".
    return pending > 0
      ? `${overdue} overdue, ${pending} still ahead.`
      : `${overdue} overdue.`;
  }

  if (pending > 0) {
    return pending === 1 ? '1 thing still ahead.' : `${pending} things still ahead.`;
  }

  return null;
}
