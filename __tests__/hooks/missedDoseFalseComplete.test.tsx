// ============================================================================
// FALSE-COMPLETE — a 'missed' dose must NOT count as done.
//
// Bug: DailyInstanceStatus has a distinct 'missed' value (time passed,
// nobody logged — a failure, NOT a caregiver decision). ensureDailyInstances
// auto-transitions a pending instance to 'missed' after its window's grace
// period. But the completion rollups compute "done" as "no pending remain":
//   - useDailyCareInstances getWindowStatus: pendingCount === 0 → 'completed'
//   - useDailyCareInstances state.allComplete: stats.pending === 0
//   - useCareTasks state.allComplete: stats.pending === 0
// A 'missed' instance is neither pending nor incomplete under that logic, so
// a window/day with missed doses renders as complete/green — a false-complete
// that tells a caregiver everything was handled when a dose was actually
// dropped.
//
// CRITICAL distinction the fix must preserve:
//   - 'skipped' = caregiver DELIBERATELY marked not-taken. A legitimate close.
//     It SHOULD count toward the window/day being done. (No shame-swing.)
//   - 'missed'  = failure. It must NOT count toward complete.
//   - 'completed' = done.
//
// This test drives the REAL hook outputs (state.allComplete + the window
// group's status) for three days built from the same instances, differing
// only in one instance's status: missed vs skipped vs completed.
//   missed    → allComplete FALSE, window status NOT 'completed'   (RED today)
//   skipped   → allComplete TRUE,  window status 'completed'       (must stay)
//   completed → allComplete TRUE,  window status 'completed'       (control)
// ============================================================================

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { DailyCareInstance, DailyInstanceStatus } from '../../types/carePlan';

// The mutable fixture the mocked storage layer returns for the day under test.
let mockInstances: DailyCareInstance[] = [];

jest.mock('../../services/carePlanGenerator', () => ({
  ensureDailyInstances: jest.fn(async () => mockInstances),
  getTodayDateString: () => '2026-07-16',
  // Pin "now" to night so morning/evening are PAST windows — the branch that
  // decides whether a past window reads 'completed' or 'available'.
  getCurrentWindowLabel: () => 'night',
}));

jest.mock('../../storage/carePlanRepo', () => ({
  DEFAULT_PATIENT_ID: 'default',
  listDailyInstances: jest.fn(async () => mockInstances),
  getDailySchedule: jest.fn(async () => null),
  logInstanceCompletion: jest.fn(async () => null),
  updateDailyInstanceStatus: jest.fn(async () => undefined),
}));

jest.mock('../../hooks/useTodayScope', () => ({
  useTodayScope: () => ({ isSuppressed: () => false, loading: false }),
}));

jest.mock('../../utils/devLog', () => ({ devLog: () => {}, logError: () => {} }));

import { useDailyCareInstances } from '../../hooks/useDailyCareInstances';
import { useCareTasks } from '../../hooks/useCareTasks';

const DATE = '2026-07-16';

function makeInstance(
  id: string,
  status: DailyInstanceStatus,
  overrides: Partial<DailyCareInstance> = {},
): DailyCareInstance {
  return {
    id,
    carePlanId: 'cp-1',
    carePlanItemId: `item-${id}`,
    patientId: 'default',
    date: DATE,
    scheduledTime: `${DATE}T08:00:00.000Z`,
    windowLabel: 'evening',
    windowId: 'evening-1',
    status,
    itemName: `Item ${id}`,
    itemType: 'medication',
    priority: 'required',
    createdAt: `${DATE}T00:00:00.000Z`,
    updatedAt: `${DATE}T00:00:00.000Z`,
    ...overrides,
  };
}

// Base day: one dose already taken; a second dose whose status is the variable.
const buildDay = (secondStatus: DailyInstanceStatus): DailyCareInstance[] => [
  makeInstance('a', 'completed'),
  makeInstance('b', secondStatus, {
    skipReason: secondStatus === 'skipped' ? 'refused' : undefined,
  }),
];

describe('Missed-dose false-complete — useDailyCareInstances rollup', () => {
  it('MISSED dose: day is NOT allComplete and the window is NOT "completed"', async () => {
    mockInstances = buildDay('missed');
    const { result } = renderHook(() => useDailyCareInstances(DATE));
    await waitFor(() => expect(result.current.state).not.toBeNull());

    expect(result.current.state!.stats.missed).toBe(1);
    expect(result.current.state!.allComplete).toBe(false);
    const evening = result.current.state!.groups.find((g) => g.windowLabel === 'evening');
    expect(evening?.status).not.toBe('completed');
  });

  it('SKIPPED dose: day IS allComplete and the window IS "completed" (skip is a legitimate close)', async () => {
    mockInstances = buildDay('skipped');
    const { result } = renderHook(() => useDailyCareInstances(DATE));
    await waitFor(() => expect(result.current.state).not.toBeNull());

    expect(result.current.state!.allComplete).toBe(true);
    const evening = result.current.state!.groups.find((g) => g.windowLabel === 'evening');
    expect(evening?.status).toBe('completed');
  });

  it('ALL COMPLETED (control): allComplete and window "completed"', async () => {
    mockInstances = buildDay('completed');
    const { result } = renderHook(() => useDailyCareInstances(DATE));
    await waitFor(() => expect(result.current.state).not.toBeNull());

    expect(result.current.state!.allComplete).toBe(true);
    const evening = result.current.state!.groups.find((g) => g.windowLabel === 'evening');
    expect(evening?.status).toBe('completed');
  });
});

describe('Missed-dose false-complete — useCareTasks rollup (Now tab + Journal)', () => {
  it('MISSED dose: allComplete is false', async () => {
    mockInstances = buildDay('missed');
    const { result } = renderHook(() => useCareTasks(DATE));
    await waitFor(() => expect(result.current.state).not.toBeNull());

    expect(result.current.state!.stats.missed).toBe(1);
    expect(result.current.state!.allComplete).toBe(false);
  });

  it('SKIPPED dose: allComplete stays true', async () => {
    mockInstances = buildDay('skipped');
    const { result } = renderHook(() => useCareTasks(DATE));
    await waitFor(() => expect(result.current.state).not.toBeNull());

    expect(result.current.state!.allComplete).toBe(true);
  });
});
