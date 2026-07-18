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

  it('all complete → dayState done, topAction null', () => {
    const a = inst({ itemType: 'medication', scheduledTime: '2026-07-18T08:00:00', status: 'completed' });
    const b = inst({ itemType: 'vitals', scheduledTime: '2026-07-18T09:00:00', status: 'skipped' });

    const focus = computeNowFocus([a, b], NOW);
    expect(focus.dayState).toBe('done');
    expect(focus.topAction).toBeNull();
    expect(focus.openCount).toBe(0);
    expect(focus.upcomingCount).toBe(0);
  });

  it('empty day → done, null', () => {
    const focus = computeNowFocus([], NOW);
    expect(focus.dayState).toBe('done');
    expect(focus.topAction).toBeNull();
  });

  it('missed instances are resolved (not pending) → do not keep the day active', () => {
    const missed = inst({ itemType: 'medication', scheduledTime: '2026-07-18T08:00:00', status: 'missed' });
    const done = inst({ itemType: 'vitals', scheduledTime: '2026-07-18T09:00:00', status: 'completed' });

    const focus = computeNowFocus([missed, done], NOW);
    expect(focus.dayState).toBe('done');
    expect(focus.topAction).toBeNull();
  });
});
