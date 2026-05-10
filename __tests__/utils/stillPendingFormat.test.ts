// ============================================================================
// Phase 11.8.3 — formatStillPendingTonight pure formatter.
//
// Extracted from the TodayStillPending component so the per-instance
// shaping (clock label, status filter, sort order) is testable
// without mounting React.
//
// Pinned contracts:
//   1. Filters to pending status only — completed/skipped/missed
//      excluded.
//   2. Sorts by scheduledTime ascending.
//   3. Each line carries name + clock label.
//   4. Empty list → empty array.
//   5. Items past their scheduled time still appear (caregiver
//      hasn't logged yet — they ARE still pending).
// ============================================================================

import {
  formatStillPendingTonight,
  PendingTonightItem,
} from '../../utils/stillPendingFormat';

const TODAY = '2026-05-09';

function inst(overrides: Partial<any> = {}): any {
  return {
    id: `i-${Math.random()}`,
    carePlanId: 'cp',
    carePlanItemId: `item-${Math.random()}`,
    patientId: 'default',
    date: TODAY,
    scheduledTime: `${TODAY}T08:00:00`,
    windowLabel: 'morning',
    windowId: 'morning',
    status: 'pending',
    itemName: 'Item',
    itemType: 'medication',
    priority: 'recommended',
    createdAt: TODAY,
    updatedAt: TODAY,
    ...overrides,
  };
}

describe('Phase 11.8.3 — formatStillPendingTonight', () => {
  it('contract 1: filters to pending only', () => {
    const items = [
      inst({ status: 'completed', itemName: 'Done' }),
      inst({ status: 'pending',   itemName: 'Pending1' }),
      inst({ status: 'skipped',   itemName: 'Skipped' }),
      inst({ status: 'missed',    itemName: 'Missed' }),
    ];
    const out = formatStillPendingTonight(items);
    expect(out.map((p) => p.name)).toEqual(['Pending1']);
  });

  it('contract 2: sorts by scheduledTime ascending', () => {
    const items = [
      inst({ status: 'pending', itemName: 'Evening', scheduledTime: `${TODAY}T18:00:00` }),
      inst({ status: 'pending', itemName: 'Morning', scheduledTime: `${TODAY}T08:00:00` }),
      inst({ status: 'pending', itemName: 'Lunch',   scheduledTime: `${TODAY}T12:30:00` }),
    ];
    const out = formatStillPendingTonight(items);
    expect(out.map((p) => p.name)).toEqual(['Morning', 'Lunch', 'Evening']);
  });

  it('contract 3: each line carries name + clock label', () => {
    const items = [
      inst({ status: 'pending', itemName: 'Lunch', scheduledTime: `${TODAY}T12:30:00` }),
    ];
    const out = formatStillPendingTonight(items);
    expect(out[0].name).toBe('Lunch');
    // Clock label like "12:30 PM" or "12:30p" — pin the time digits.
    expect(out[0].time).toMatch(/12:?30/);
  });

  it('contract 4: empty list → empty array', () => {
    expect(formatStillPendingTonight([])).toEqual([]);
  });

  it('contract 5: pending items past scheduled time still appear', () => {
    // 8 AM scheduled instance with status still pending — caregiver
    // hasn't logged it. Should still be in the list.
    const items = [
      inst({ status: 'pending', itemName: 'Aspirin', scheduledTime: `${TODAY}T08:00:00` }),
    ];
    const out = formatStillPendingTonight(items);
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe('Aspirin');
  });

  it('clock label uses 12-hour AM/PM format (clinical reading convention)', () => {
    const items = [
      inst({ status: 'pending', itemName: 'A', scheduledTime: `${TODAY}T08:00:00` }),
      inst({ status: 'pending', itemName: 'B', scheduledTime: `${TODAY}T15:00:00` }),
      inst({ status: 'pending', itemName: 'C', scheduledTime: `${TODAY}T20:30:00` }),
    ];
    const out = formatStillPendingTonight(items);
    // 24-hour parsing → 12-hour display.
    expect(out[0].time.toUpperCase()).toMatch(/8(:00)?\s*AM/);
    expect(out[1].time.toUpperCase()).toMatch(/3(:00)?\s*PM/);
    expect(out[2].time.toUpperCase()).toMatch(/8:30\s*PM/);
  });
});
