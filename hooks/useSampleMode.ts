// ============================================================================
// useSampleMode — single source of truth for "am I in sample-data mode?"
//
// Drives the SampleModeBanner, the EXAMPLE tags inside Switch Patient, and
// the Settings entry for managing example data. Subscribes to the global
// event bus so the value flips immediately when ManageSampleDataSheet (or
// any other surface) clears sample data.
// ============================================================================

import { useCallback, useEffect, useState } from 'react';
import {
  hasSampleData,
  detectSampleData,
  SampleDataStatus,
} from '../utils/sampleDataManager';
import { useDataListener } from '../lib/events';
import { logError } from '../utils/devLog';

export interface UseSampleModeResult {
  isSampleMode: boolean;
  sampleStatus: SampleDataStatus | null;
  refresh: () => Promise<void>;
}

const EMPTY_STATUS: SampleDataStatus = {
  hasSampleData: false,
  counts: {
    medications: 0,
    vitals: 0,
    moodLogs: 0,
    appointments: 0,
    caregivers: 0,
    symptoms: 0,
    dailyTracking: 0,
    notes: 0,
  },
  totalSampleRecords: 0,
};

export function useSampleMode(): UseSampleModeResult {
  const [isSampleMode, setIsSampleMode] = useState<boolean>(false);
  const [sampleStatus, setSampleStatus] = useState<SampleDataStatus | null>(null);

  const refresh = useCallback(async () => {
    try {
      // Fast path — if the cleared flag is set or no sample meds exist, skip
      // the full record-counting walk.
      const present = await hasSampleData();
      if (!present) {
        setIsSampleMode(false);
        setSampleStatus(EMPTY_STATUS);
        return;
      }
      const status = await detectSampleData();
      setIsSampleMode(status.hasSampleData);
      setSampleStatus(status);
    } catch (error) {
      logError('useSampleMode.refresh', error);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // SAMPLE_DATA_CLEARED is emitted by clearSampleData(); PATIENT covers the
  // setup-flow handoff (updatePatient writes a real name + clears sample);
  // MEDICATION catches direct CarePlan edits that may strip sample meds.
  useDataListener((category) => {
    if (
      category === 'sampleDataCleared' ||
      category === 'patient' ||
      category === 'medication'
    ) {
      refresh();
    }
  });

  return { isSampleMode, sampleStatus, refresh };
}
