// ============================================================================
// useSampleMode — behavioural tests
// Verifies: initial detection, refresh on event, post-clear transition.
// ============================================================================

import React from 'react';
import { create, act } from 'react-test-renderer';

// ── Mocks (declared before importing the hook) ───────────────────────────────
const mockHasSampleData = jest.fn();
const mockDetectSampleData = jest.fn();

jest.mock('../../utils/sampleDataManager', () => ({
  hasSampleData: (...args: any[]) => mockHasSampleData(...args),
  detectSampleData: (...args: any[]) => mockDetectSampleData(...args),
}));

// In-process event bus stand-in so we can drive listener callbacks from tests.
let listenerCb: ((category: string) => void) | null = null;
jest.mock('../../lib/events', () => ({
  useDataListener: (cb: (category: string) => void) => {
    React.useEffect(() => {
      listenerCb = cb;
      return () => {
        if (listenerCb === cb) listenerCb = null;
      };
    }, [cb]);
  },
}));

jest.mock('../../utils/devLog', () => ({
  devLog: jest.fn(),
  logError: jest.fn(),
}));

import { useSampleMode } from '../useSampleMode';

// Tiny harness that exposes the hook return value to the test via a ref.
function Probe({ onRender }: { onRender: (v: ReturnType<typeof useSampleMode>) => void }) {
  const value = useSampleMode();
  React.useEffect(() => {
    onRender(value);
  });
  return null;
}

const FULL_STATUS = {
  hasSampleData: true,
  counts: {
    medications: 5, vitals: 3, moodLogs: 14, appointments: 2,
    caregivers: 1, symptoms: 0, dailyTracking: 7, notes: 4,
  },
  totalSampleRecords: 36,
};

const EMPTY_STATUS = {
  hasSampleData: false,
  counts: {
    medications: 0, vitals: 0, moodLogs: 0, appointments: 0,
    caregivers: 0, symptoms: 0, dailyTracking: 0, notes: 0,
  },
  totalSampleRecords: 0,
};

describe('useSampleMode', () => {
  beforeEach(() => {
    mockHasSampleData.mockReset();
    mockDetectSampleData.mockReset();
    listenerCb = null;
  });

  it('returns isSampleMode=true and a populated status when sample data exists on mount', async () => {
    mockHasSampleData.mockResolvedValue(true);
    mockDetectSampleData.mockResolvedValue(FULL_STATUS);

    const renders: any[] = [];
    await act(async () => {
      create(<Probe onRender={(v) => renders.push(v)} />);
    });

    const last = renders[renders.length - 1];
    expect(last.isSampleMode).toBe(true);
    expect(last.sampleStatus).toEqual(FULL_STATUS);
    expect(typeof last.refresh).toBe('function');
    expect(mockHasSampleData).toHaveBeenCalledTimes(1);
    expect(mockDetectSampleData).toHaveBeenCalledTimes(1);
  });

  it('returns isSampleMode=false and zero counts when no sample data exists', async () => {
    mockHasSampleData.mockResolvedValue(false);

    const renders: any[] = [];
    await act(async () => {
      create(<Probe onRender={(v) => renders.push(v)} />);
    });

    const last = renders[renders.length - 1];
    expect(last.isSampleMode).toBe(false);
    expect(last.sampleStatus?.hasSampleData).toBe(false);
    expect(last.sampleStatus?.totalSampleRecords).toBe(0);
    // Fast-path: skips the full detection call
    expect(mockDetectSampleData).not.toHaveBeenCalled();
  });

  it('re-detects when SAMPLE_DATA_CLEARED fires and flips to false', async () => {
    // First mount: sample data is present.
    mockHasSampleData.mockResolvedValueOnce(true);
    mockDetectSampleData.mockResolvedValueOnce(FULL_STATUS);

    const renders: any[] = [];
    await act(async () => {
      create(<Probe onRender={(v) => renders.push(v)} />);
    });

    expect(renders[renders.length - 1].isSampleMode).toBe(true);

    // After clearing: detection now reports empty.
    mockHasSampleData.mockResolvedValue(false);

    await act(async () => {
      listenerCb?.('sampleDataCleared');
    });

    const final = renders[renders.length - 1];
    expect(final.isSampleMode).toBe(false);
    expect(final.sampleStatus?.totalSampleRecords).toBe(0);
  });

  it('refresh() can be called manually to re-run detection', async () => {
    mockHasSampleData.mockResolvedValue(true);
    mockDetectSampleData.mockResolvedValue(FULL_STATUS);

    const renders: any[] = [];
    await act(async () => {
      create(<Probe onRender={(v) => renders.push(v)} />);
    });

    expect(mockHasSampleData).toHaveBeenCalledTimes(1);

    const { refresh } = renders[renders.length - 1];
    await act(async () => {
      await refresh();
    });

    expect(mockHasSampleData).toHaveBeenCalledTimes(2);
    expect(mockDetectSampleData).toHaveBeenCalledTimes(2);
  });

  it('ignores unrelated event categories', async () => {
    mockHasSampleData.mockResolvedValue(true);
    mockDetectSampleData.mockResolvedValue(FULL_STATUS);

    const renders: any[] = [];
    await act(async () => {
      create(<Probe onRender={(v) => renders.push(v)} />);
    });

    expect(mockHasSampleData).toHaveBeenCalledTimes(1);

    await act(async () => {
      listenerCb?.('rhythm');
    });

    expect(mockHasSampleData).toHaveBeenCalledTimes(1);
  });

  it('refreshes when the patient changes (covers setup-flow handoff)', async () => {
    mockHasSampleData.mockResolvedValue(true);
    mockDetectSampleData.mockResolvedValue(FULL_STATUS);

    const renders: any[] = [];
    await act(async () => {
      create(<Probe onRender={(v) => renders.push(v)} />);
    });

    expect(mockHasSampleData).toHaveBeenCalledTimes(1);

    await act(async () => {
      listenerCb?.('patient');
    });

    expect(mockHasSampleData).toHaveBeenCalledTimes(2);
  });
});
