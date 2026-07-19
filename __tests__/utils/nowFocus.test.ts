// ============================================================================
// computeNowFocus — the shared Now-tab state model (correctness core).
//
// Given today's instances + a reference `now`, returns the ONE action to
// surface (topAction), the dayState ('active' | 'done'), and open/upcoming
// counts. Overdue determination reuses getCareItemStatus (the app's canonical
// resolver) so the model matches the timeline's own overdue split.
//
// Times are local-naive ISO (no Z) so getCareItemStatus's window-end math
// (setHours, local) aligns with the parsed scheduledTime.
// ============================================================================

import { computeNowFocus } from '../../utils/nowFocus';
import type { DailyCareInstance, CarePlanItemType } from '../../types/carePlan';

const NOW = new Date('2026-07-18T20:00:00'); // 8pm local

let seq = 0;
function inst(over: Partial<DailyCareInstance> & { itemType: CarePlanItemType }): DailyCareInstance {
  seq += 1;
  return {
    id: `i-${seq}`,
    carePlanId: 'cp',
    carePlanItemId: `ci-${seq}`,
    patientId: 'default',
    date: '2026-07-18',
    scheduledTime: '2026-07-18T08:00:00',
    windowLabel: 'morning',
    windowId: 'w',
    status: 'pending',
    itemName: 'Item',
    priority: 'recommended',
    createdAt: '',
    updatedAt: '',
    ...over,
  } as DailyCareInstance;
}

describe('computeNowFocus — Now-tab shared state model', () => {
  it('overdue MED beats an older (more-overdue) MEAL — importance wins over recency', () => {
    const meal = inst({ itemType: 'nutrition', windowLabel: 'morning', scheduledTime: '2026-07-18T08:00:00', itemName: 'Breakfast' });
    const med = inst({ itemType: 'medication', windowLabel: 'evening', scheduledTime: '2026-07-18T18:00:00', itemName: 'Warfarin' });

    const focus = computeNowFocus([meal, med], NOW);

    expect(focus.dayState).toBe('active');
    expect(focus.topAction?.itemName).toBe('Warfarin');
    expect(focus.openCount).toBe(2);
    expect(focus.upcomingCount).toBe(0);
  });

  it('tie on importance (two overdue meds) → OLDEST (most overdue) first', () => {
    const early = inst({ itemType: 'medication', windowLabel: 'morning', scheduledTime: '2026-07-18T07:00:00', itemName: 'Aspirin' });
    const late = inst({ itemType: 'medication', windowLabel: 'evening', scheduledTime: '2026-07-18T18:00:00', itemName: 'Warfarin' });

    const focus = computeNowFocus([late, early], NOW); // unsorted input
    expect(focus.topAction?.itemName).toBe('Aspirin');
  });

  it('nothing overdue → next UPCOMING chronologically (not by importance)', () => {
    // A meal is earlier than a med; upcoming ordering is purely by time, so the
    // meal wins even though a med would outrank it if overdue.
    const mealUp = inst({ itemType: 'nutrition', windowLabel: 'evening', scheduledTime: '2026-07-18T21:00:00', itemName: 'Dinner' });
    const medUp = inst({ itemType: 'medication', windowLabel: 'night', scheduledTime: '2026-07-18T22:00:00', itemName: 'Night meds' });

    const focus = computeNowFocus([medUp, mealUp], NOW);

    expect(focus.dayState).toBe('active');
    expect(focus.topAction?.itemName).toBe('Dinner');
    expect(focus.openCount).toBe(0);
    expect(focus.upcomingCount).toBe(2);
  });

  it('overdue present alongside upcoming → overdue wins the hero', () => {
    const overdueMed = inst({ itemType: 'medication', windowLabel: 'evening', scheduledTime: '2026-07-18T18:00:00', itemName: 'Warfarin' });
    const upcomingVital = inst({ itemType: 'vitals', windowLabel: 'night', scheduledTime: '2026-07-18T22:00:00', itemName: 'BP' });

    const focus = computeNowFocus([upcomingVital, overdueMed], NOW);
    expect(focus.topAction?.itemName).toBe('Warfarin');
    expect(focus.openCount).toBe(1);
    expect(focus.upcomingCount).toBe(1);
  });

  it('all positively resolved (completed OR skipped) → dayState done, topAction null', () => {
    const a = inst({ itemType: 'medication', scheduledTime: '2026-07-18T08:00:00', status: 'completed' });
    const b = inst({ itemType: 'vitals', scheduledTime: '2026-07-18T09:00:00', status: 'skipped' });

    const focus = computeNowFocus([a, b], NOW);
    expect(focus.dayState).toBe('done');
    expect(focus.topAction).toBeNull();
    expect(focus.openCount).toBe(0);
    expect(focus.upcomingCount).toBe(0);
  });

  it('all skipped (deliberate skip counts as done) → dayState done', () => {
    const s1 = inst({ itemType: 'medication', status: 'skipped' });
    const s2 = inst({ itemType: 'nutrition', status: 'skipped' });
    expect(computeNowFocus([s1, s2], NOW).dayState).toBe('done');
  });

  it('empty day → done, null', () => {
    const focus = computeNowFocus([], NOW);
    expect(focus.dayState).toBe('done');
    expect(focus.topAction).toBeNull();
  });

  // Contract CHANGED (was: "missed is resolved → day not active"). A missed item
  // is a FAILURE, not a resolution — it must keep the day not-done so the
  // reflection can't falsely say "wrapped" (matches End-of-shift's "not logged").
  it('a MISSED item keeps the day NOT done and is hero-eligible (missed != resolved)', () => {
    const missed = inst({ itemType: 'medication', itemName: 'Warfarin', scheduledTime: '2026-07-18T08:00:00', status: 'missed' });
    const done = inst({ itemType: 'vitals', scheduledTime: '2026-07-18T09:00:00', status: 'completed' });

    const focus = computeNowFocus([missed, done], NOW);
    expect(focus.dayState).toBe('active');           // was 'done' — the bug
    expect(focus.topAction?.itemName).toBe('Warfarin'); // missed item is the hero
    expect(focus.openCount).toBe(1);                  // missed counts as open
  });

  // REPRO of the reported contradiction: an all-missed day read as "caught up"
  // while End-of-shift showed "not logged". Must be not-done after the fix.
  it('REPRO: an all-missed day is NOT done (was done) → reflection cannot say wrapped', () => {
    const m1 = inst({ itemType: 'medication', itemName: 'Aspirin', windowLabel: 'morning', scheduledTime: '2026-07-18T07:00:00', status: 'missed' });
    const m2 = inst({ itemType: 'nutrition', itemName: 'Breakfast', windowLabel: 'morning', scheduledTime: '2026-07-18T08:00:00', status: 'missed' });

    const focus = computeNowFocus([m1, m2], NOW);
    expect(focus.dayState).toBe('active');   // RED before fix (returned 'done')
    expect(focus.topAction).not.toBeNull();  // a missed item leads the hero
    expect(focus.openCount).toBe(2);
  });

  it('topAction ranks across pending AND missed — a missed med beats a pending-overdue meal', () => {
    const missedMed = inst({ itemType: 'medication', itemName: 'Warfarin', windowLabel: 'evening', scheduledTime: '2026-07-18T18:00:00', status: 'missed' });
    const overdueMeal = inst({ itemType: 'nutrition', itemName: 'Breakfast', windowLabel: 'morning', scheduledTime: '2026-07-18T08:00:00', status: 'pending' });

    const focus = computeNowFocus([overdueMeal, missedMed], NOW);
    expect(focus.topAction?.itemName).toBe('Warfarin');
  });
});

// Direction C — the START HERE pointer shows ONLY when topAction is genuinely
// overdue (not merely the next-upcoming item). On-track = no pointer.
describe('computeNowFocus — topActionOverdue gate (Direction C)', () => {
  it('overdue present → topActionOverdue is true', () => {
    const overdueMed = inst({ itemType: 'medication', itemName: 'Warfarin', windowLabel: 'evening', scheduledTime: '2026-07-18T18:00:00', status: 'missed' });
    const upcomingVital = inst({ itemType: 'vitals', windowLabel: 'night', scheduledTime: '2026-07-18T22:00:00', status: 'pending' });
    expect(computeNowFocus([upcomingVital, overdueMed], NOW).topActionOverdue).toBe(true);
  });

  it('ON-TRACK (nothing overdue, only upcoming) → topActionOverdue is false (no pointer)', () => {
    const up1 = inst({ itemType: 'medication', itemName: 'Night meds', windowLabel: 'night', scheduledTime: '2026-07-18T22:00:00', status: 'pending' });
    const up2 = inst({ itemType: 'nutrition', itemName: 'Dinner', windowLabel: 'evening', scheduledTime: '2026-07-18T21:00:00', status: 'pending' });
    const focus = computeNowFocus([up1, up2], NOW);
    expect(focus.topAction).not.toBeNull();      // there IS a next item
    expect(focus.topActionOverdue).toBe(false);  // but nothing overdue → no pointer
  });

  it('day done → topActionOverdue is false', () => {
    const done = inst({ itemType: 'medication', status: 'completed' });
    expect(computeNowFocus([done], NOW).topActionOverdue).toBe(false);
  });
});
