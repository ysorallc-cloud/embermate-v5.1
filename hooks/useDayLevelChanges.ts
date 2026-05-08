// ============================================================================
// useDayLevelChanges — Phase 5.12.4b.
//
// React-side wrapper around services/dayLevelChanges so the WhatChangedToday
// component (and any future consumer) can declare a target date and re-fetch
// automatically when it changes. The hook owns no detection logic — the
// service produces the result; the hook handles loading state and the
// useEffect cleanup.
// ============================================================================

import { useEffect, useState } from 'react';
import {
  detectDayLevelChanges,
  type DayLevelChangesResult,
} from '../services/dayLevelChanges';
import { logError } from '../utils/devLog';

export interface UseDayLevelChangesValue {
  result: DayLevelChangesResult | null;
  loading: boolean;
}

export function useDayLevelChanges(dateKey: string): UseDayLevelChangesValue {
  const [result, setResult] = useState<DayLevelChangesResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    detectDayLevelChanges(dateKey)
      .then((r) => {
        if (cancelled) return;
        setResult(r);
        setLoading(false);
      })
      .catch((err) => {
        logError('useDayLevelChanges', err);
        if (cancelled) return;
        setResult({ changes: [], hasSignificantChange: false });
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [dateKey]);

  return { result, loading };
}
