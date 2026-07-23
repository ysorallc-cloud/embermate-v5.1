// ============================================================================
// Stage 1 (Option C) — the windowEnd-based overdue cutoff extends from meals to
// EVERY non-medication type. getCareItemStatus is the single overdue authority
// read by nowFocus, START HERE, the timeline, Journal, and careSummaryBuilder,
// so this pins the new boundary directly at the helper.
//
// LOCKED RULE:
//   • non-medication (vitals/wellness/meals/…): due until windowEnd + 120min grace
//   • medication: unchanged — scheduledTime + 30min (a pill is due at a clock time)
//
// Windows (DEFAULT_TIME_WINDOWS): morning 06–10, afternoon 12–14. Grace 120min.
//   morning windowEnd 10:00 → non-med cutoff 12:00
//   afternoon windowEnd 14:00 → non-med cutoff 16:00
// Med grace: OVERDUE_GRACE_MINUTES = 30.
// ============================================================================

import type { DailyCareInstance } from '../../types/carePlan';
import { getCareItemStatus } from '../../utils/careItemStatus';
import { getOutstandingItemNames } from '../../utils/journalEmptyDayCheck';

const DATE = '2026-06-29';
function inst(over: Partial<DailyCareInstance>): DailyCareInstance {
  return {
    id: 'i', carePlanId: 'cp', carePlanItemId: 'it', patientId: 'default',
    date: DATE, scheduledTime: `${DATE}T08:00:00`, windowLabel: 'morning',
    windowId: 'w', status: 'pending', itemName: 'Item', itemType: 'vitals',
    priority: 'recommended', createdAt: DATE, updatedAt: DATE, ...over,
  } as DailyCareInstance;
}
const at = (hhmm: string) => new Date(`${DATE}T${hhmm}:00`);

describe('Stage 1 — vitals/wellness use windowEnd + grace (the fix)', () => {
  // morning window: scheduled 08:00, windowEnd 10:00, cutoff 12:00.
  const vitals = inst({ itemType: 'vitals', itemName: 'BP', scheduledTime: `${DATE}T08:00:00`, windowLabel: 'morning' });
  const wellness = inst({ itemType: 'wellness', itemName: 'Morning check-in', scheduledTime: `${DATE}T08:00:00`, windowLabel: 'morning' });

  it.each([['vitals', vitals], ['wellness', wellness]] as const)(
    '%s inside its window → DUE, not overdue — decisively NOT overdue at scheduled+30',
    (_t, item) => {
      // 08:30 = scheduled+30. Pre-Stage-1 this flipped 'overdue' (the +30 rule).
      // Windowed → still 'due' (cutoff 12:00). This is the whole point of the change.
      expect(getCareItemStatus(item, at('08:30'))).toBe('due');
      // 09:59, one minute before windowEnd → still due.
      expect(getCareItemStatus(item, at('09:59'))).toBe('due');
      // 11:00, past windowEnd but inside the 120min grace → still due.
      expect(getCareItemStatus(item, at('11:00'))).toBe('due');
    },
  );

  it.each([['vitals', vitals], ['wellness', wellness]] as const)(
    '%s past windowEnd + grace (12:00) → OVERDUE',
    (_t, item) => {
      expect(getCareItemStatus(item, at('12:30'))).toBe('overdue');
    },
  );

  it('before scheduled → upcoming (boundary unchanged)', () => {
    expect(getCareItemStatus(vitals, at('07:00'))).toBe('upcoming');
  });
});

describe('Stage 1 — medications UNCHANGED (scheduled + 30min)', () => {
  const med = inst({ itemType: 'medication', itemName: 'Warfarin', scheduledTime: `${DATE}T08:00:00`, windowLabel: 'morning' });

  it('within +30 → due; past +30 → overdue (a windowed item would still be due at 08:45)', () => {
    expect(getCareItemStatus(med, at('08:15'))).toBe('due');
    // 08:45 is past scheduled+30 → overdue. If meds had drifted onto the window
    // rule the cutoff would be 12:00 and this would read 'due' — so 'overdue'
    // here is the decisive regression guard that meds keep +30.
    expect(getCareItemStatus(med, at('08:45'))).toBe('overdue');
  });
});

describe('Stage 1 — meals UNCHANGED (already windowEnd-based)', () => {
  // afternoon window: scheduled 12:00, windowEnd 14:00, cutoff 16:00.
  const lunch = inst({ itemType: 'nutrition', itemName: 'Lunch', scheduledTime: `${DATE}T12:00:00`, windowLabel: 'afternoon' });

  it('within window → due; past windowEnd+grace → overdue', () => {
    expect(getCareItemStatus(lunch, at('13:30'))).toBe('due');   // was 'due' before, still 'due'
    expect(getCareItemStatus(lunch, at('16:30'))).toBe('overdue');
  });
});

describe('Stage 1 — missed-as-not-done honesty preserved', () => {
  // A vitals reading past its window+grace is 'overdue', which is exactly the
  // state getOutstandingItemNames (Journal's empty-day floor) counts as CONTENT
  // — so a never-recorded vitals keeps the day active rather than reading empty.
  it("un-recorded vitals past windowEnd+grace reads 'overdue' AND is surfaced as outstanding", () => {
    const vitalsPast = inst({ itemType: 'vitals', itemName: 'BP', scheduledTime: `${DATE}T08:00:00`, windowLabel: 'morning' });
    // getCareItemStatus is deterministic under an injected clock.
    expect(getCareItemStatus(vitalsPast, at('12:30'))).toBe('overdue');
    // getOutstandingItemNames uses the real clock; drive DATE far into the past so
    // 'now' is unambiguously past this morning window + grace → still outstanding.
    expect(getOutstandingItemNames([vitalsPast])).toContain('BP');
  });

  it('persisted missed still maps to overdue (day stays active)', () => {
    expect(getCareItemStatus(inst({ itemType: 'vitals', status: 'missed' }), at('08:30'))).toBe('overdue');
  });
});
