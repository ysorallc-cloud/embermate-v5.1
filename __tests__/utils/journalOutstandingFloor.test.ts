// ============================================================================
// Journal outstanding-items floor (Option A) — gate + "Still to do" names.
//
// A morning of MISSED (overdue, un-logged) wellness/vitals must not read as an
// empty day: Journal should neither say "the day is still open" nor go blank —
// it should NAME what's outstanding. This pins the two journal-local pieces:
//
//   • getOutstandingItemNames routes through getCareItemStatus (consumes the
//     canonical helper, derives no status): overdue items in, names out;
//     merely-pending (not-yet-overdue) items excluded.
//   • shouldRenderJournalEmptyDay counts an outstanding item as CONTENT, so
//     the restorative empty state can't render over a genuine miss.
// ============================================================================

import {
  shouldRenderJournalEmptyDay,
  getOutstandingItemNames,
  OutstandingInstance,
} from '../../utils/journalEmptyDayCheck';

// 2 days ago, 08:00 — deterministically past window+grace regardless of run time.
const pastMorning = new Date(Date.now() - 2 * 86400000); pastMorning.setHours(8, 0, 0, 0);
const overdueISO = pastMorning.toISOString();
// tomorrow 18:00 — not overdue.
const future = new Date(Date.now() + 86400000); future.setHours(18, 0, 0, 0);
const futureISO = future.toISOString();

function inst(over: Partial<OutstandingInstance>): OutstandingInstance {
  return { itemName: 'X', itemType: 'wellness', scheduledTime: overdueISO, status: 'pending', ...over } as OutstandingInstance;
}

describe('getOutstandingItemNames — overdue via getCareItemStatus', () => {
  it('returns names of overdue un-logged items only', () => {
    const names = getOutstandingItemNames([
      inst({ itemName: 'Morning Wellness Check-in', itemType: 'wellness', scheduledTime: overdueISO }),
      inst({ itemName: 'Check vitals', itemType: 'vitals', scheduledTime: overdueISO }),
      inst({ itemName: 'Evening vitals', itemType: 'vitals', scheduledTime: futureISO }),   // not overdue
      inst({ itemName: 'Aspirin', itemType: 'medication', scheduledTime: overdueISO, status: 'completed' }), // logged
    ]);
    expect(names).toEqual(['Morning Wellness Check-in', 'Check vitals']);
  });

  it('is empty when nothing is overdue', () => {
    expect(getOutstandingItemNames([
      inst({ itemName: 'Evening vitals', scheduledTime: futureISO }),
    ])).toEqual([]);
  });
});

describe('shouldRenderJournalEmptyDay — outstanding counts as content', () => {
  const bareEmpty = {
    isViewingPast: false,
    hasEvents: false,
    hasNotes: false,
    hasTone: false,
    hasCompletedInstances: false,
  };

  it('renders empty-day when truly empty (no outstanding)', () => {
    expect(shouldRenderJournalEmptyDay({ ...bareEmpty, hasOutstandingItems: false })).toBe(true);
  });

  it('does NOT render empty-day when items are outstanding (no false "day is still open")', () => {
    expect(shouldRenderJournalEmptyDay({ ...bareEmpty, hasOutstandingItems: true })).toBe(false);
  });

  it('back-compat: omitting hasOutstandingItems behaves as false', () => {
    expect(shouldRenderJournalEmptyDay(bareEmpty)).toBe(true);
  });

  it('past days never render empty-day regardless', () => {
    expect(shouldRenderJournalEmptyDay({ ...bareEmpty, isViewingPast: true, hasOutstandingItems: true })).toBe(false);
  });
});
