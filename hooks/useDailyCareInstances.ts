// ============================================================================
// USE DAILY CARE INSTANCES HOOK
// React hook for accessing generated daily care instances from the regimen system
// This replaces the old static routine-based useCarePlan hook
// ============================================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDataListener } from '../lib/events';
import {
  DailyCareInstance,
  DailySchedule,
  TimeWindowLabel,
  LogEntry,
} from '../types/carePlan';
import {
  listDailyInstances,
  getDailySchedule,
  logInstanceCompletion,
  updateDailyInstanceStatus,
  DEFAULT_PATIENT_ID,
} from '../storage/carePlanRepo';
import {
  ensureDailyInstances,
  getTodayDateString,
  getCurrentWindowLabel,
} from '../services/carePlanGenerator';

// ============================================================================
// TYPES
// ============================================================================

export interface InstanceGroup {
  windowLabel: TimeWindowLabel;
  displayName: string;
  emoji: string;
  instances: DailyCareInstance[];
  completedCount: number;
  totalCount: number;
  status: 'upcoming' | 'available' | 'completed';
}

export interface DailyInstancesState {
  date: string;
  instances: DailyCareInstance[];
  byWindow: {
    morning: DailyCareInstance[];
    afternoon: DailyCareInstance[];
    evening: DailyCareInstance[];
    night: DailyCareInstance[];
    custom: DailyCareInstance[];
  };
  groups: InstanceGroup[];
  stats: {
    total: number;
    pending: number;
    completed: number;
    skipped: number;
    missed: number;
  };
  nextPending: DailyCareInstance | null;
  allComplete: boolean;
}

export interface UseDailyCareInstancesReturn {
  // State
  state: DailyInstancesState | null;
  loading: boolean;
  error: Error | null;

  // Actions
  refresh: () => Promise<void>;
  completeInstance: (
    instanceId: string,
    outcome?: 'taken' | 'completed' | 'skipped',
    data?: any,
    notes?: string
  ) => Promise<{ instance: DailyCareInstance; log: LogEntry } | null>;
  skipInstance: (instanceId: string, notes?: string) => Promise<void>;
  markMissed: (instanceId: string) => Promise<void>;

  // Convenience
  getInstanceById: (instanceId: string) => DailyCareInstance | undefined;
  getInstancesForWindow: (windowLabel: TimeWindowLabel) => DailyCareInstance[];
  getCurrentWindowInstances: () => DailyCareInstance[];
}

// ============================================================================
// HELPERS
// ============================================================================

const WINDOW_CONFIG: Record<TimeWindowLabel, { displayName: string; emoji: string }> = {
  morning: { displayName: 'Morning', emoji: '🌅' },
  afternoon: { displayName: 'Afternoon', emoji: '☀️' },
  evening: { displayName: 'Evening', emoji: '🌆' },
  night: { displayName: 'Night', emoji: '🌙' },
  custom: { displayName: 'Custom', emoji: '📋' },
};

function getWindowStatus(
  windowLabel: TimeWindowLabel,
  instances: DailyCareInstance[],
  currentWindow: TimeWindowLabel
): 'upcoming' | 'available' | 'completed' {
  // If all instances are completed or skipped, mark as completed
  const pendingCount = instances.filter(i => i.status === 'pending').length;
  if (instances.length > 0 && pendingCount === 0) {
    return 'completed';
  }

  // Check if this window is currently active
  const windowOrder: TimeWindowLabel[] = ['morning', 'afternoon', 'evening', 'night'];
  const currentIndex = windowOrder.indexOf(currentWindow);
  const thisIndex = windowOrder.indexOf(windowLabel);

  if (thisIndex < currentIndex) {
    // Past window - if has pending items, they should be available
    return pendingCount > 0 ? 'available' : 'completed';
  } else if (thisIndex === currentIndex) {
    return 'available';
  } else {
    return 'upcoming';
  }
}

function createInstanceGroups(
  instances: DailyCareInstance[],
  currentWindow: TimeWindowLabel
): InstanceGroup[] {
  const groups: InstanceGroup[] = [];
  const windowOrder: TimeWindowLabel[] = ['morning', 'afternoon', 'evening', 'night'];

  for (const windowLabel of windowOrder) {
    const windowInstances = instances.filter(i => i.windowLabel === windowLabel);
    if (windowInstances.length === 0) continue;

    const completedCount = windowInstances.filter(
      i => i.status === 'completed' || i.status === 'skipped'
    ).length;

    const config = WINDOW_CONFIG[windowLabel];
    groups.push({
      windowLabel,
      displayName: config.displayName,
      emoji: config.emoji,
      instances: windowInstances.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime)),
      completedCount,
      totalCount: windowInstances.length,
      status: getWindowStatus(windowLabel, windowInstances, currentWindow),
    });
  }

  return groups;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook for accessing generated daily care instances
 * @param date Optional date string (YYYY-MM-DD). Defaults to today.
 * @param patientId Optional patient ID. Defaults to DEFAULT_PATIENT_ID.
 */
export function useDailyCareInstances(
  date?: string,
  patientId: string = DEFAULT_PATIENT_ID
): UseDailyCareInstancesReturn {
  const targetDate = date || getTodayDateString();

  const [instances, setInstances] = useState<DailyCareInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Load instances for the target date
   * Ensures instances are generated if they don't exist
   */
  const loadInstances = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Ensure instances exist for this date (generates if needed)
      const dayInstances = await ensureDailyInstances(patientId, targetDate);
      setInstances(dayInstances);
    } catch (err) {
      console.error('Error loading daily care instances:', err);
      setError(err instanceof Error ? err : new Error('Failed to load instances'));
    } finally {
      setLoading(false);
    }
  }, [patientId, targetDate]);

  // Initial load
  useEffect(() => {
    loadInstances();
  }, [loadInstances]);

  // Listen for data updates
  useDataListener(() => {
    loadInstances();
  });

  /**
   * Compute derived state from instances
   */
  const state = useMemo((): DailyInstancesState | null => {
    if (loading && instances.length === 0) return null;

    const currentWindow = getCurrentWindowLabel();

    // Group by window
    const byWindow = {
      morning: instances.filter(i => i.windowLabel === 'morning'),
      afternoon: instances.filter(i => i.windowLabel === 'afternoon'),
      evening: instances.filter(i => i.windowLabel === 'evening'),
      night: instances.filter(i => i.windowLabel === 'night'),
      custom: instances.filter(i => i.windowLabel === 'custom'),
    };

    // Stats
    const stats = {
      total: instances.length,
      pending: instances.filter(i => i.status === 'pending').length,
      completed: instances.filter(i => i.status === 'completed').length,
      skipped: instances.filter(i => i.status === 'skipped').length,
      missed: instances.filter(i => i.status === 'missed').length,
    };

    // Find next pending instance
    const pendingInstances = instances
      .filter(i => i.status === 'pending')
      .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
    const nextPending = pendingInstances[0] || null;

    // Create groups
    const groups = createInstanceGroups(instances, currentWindow);

    return {
      date: targetDate,
      instances,
      byWindow,
      groups,
      stats,
      nextPending,
      allComplete: stats.pending === 0 && stats.total > 0,
    };
  }, [instances, loading, targetDate]);

  /**
   * Complete an instance
   */
  const completeInstance = useCallback(async (
    instanceId: string,
    outcome: 'taken' | 'completed' | 'skipped' = 'completed',
    data?: any,
    notes?: string
  ): Promise<{ instance: DailyCareInstance; log: LogEntry } | null> => {
    try {
      const result = await logInstanceCompletion(
        patientId,
        targetDate,
        instanceId,
        outcome,
        data,
        { notes, source: 'record' }
      );
      // Data will refresh via listener
      return result;
    } catch (err) {
      console.error('Error completing instance:', err);
      throw err;
    }
  }, [patientId, targetDate]);

  /**
   * Skip an instance
   */
  const skipInstance = useCallback(async (instanceId: string, notes?: string) => {
    try {
      await logInstanceCompletion(
        patientId,
        targetDate,
        instanceId,
        'skipped',
        undefined,
        { notes, source: 'record' }
      );
      // Data will refresh via listener
    } catch (err) {
      console.error('Error skipping instance:', err);
      throw err;
    }
  }, [patientId, targetDate]);

  /**
   * Mark an instance as missed
   */
  const markMissed = useCallback(async (instanceId: string) => {
    try {
      await updateDailyInstanceStatus(patientId, targetDate, instanceId, 'missed');
      // Data will refresh via listener
    } catch (err) {
      console.error('Error marking instance as missed:', err);
      throw err;
    }
  }, [patientId, targetDate]);

  /**
   * Get instance by ID
   */
  const getInstanceById = useCallback((instanceId: string): DailyCareInstance | undefined => {
    return instances.find(i => i.id === instanceId);
  }, [instances]);

  /**
   * Get instances for a specific window
   */
  const getInstancesForWindow = useCallback((windowLabel: TimeWindowLabel): DailyCareInstance[] => {
    return instances.filter(i => i.windowLabel === windowLabel);
  }, [instances]);

  /**
   * Get instances for the current time window
   */
  const getCurrentWindowInstances = useCallback((): DailyCareInstance[] => {
    const currentWindow = getCurrentWindowLabel();
    return getInstancesForWindow(currentWindow);
  }, [getInstancesForWindow]);

  return {
    state,
    loading,
    error,
    refresh: loadInstances,
    completeInstance,
    skipInstance,
    markMissed,
    getInstanceById,
    getInstancesForWindow,
    getCurrentWindowInstances,
  };
}

// ============================================================================
// CONVENIENCE HOOKS
// ============================================================================

/**
 * Hook for just the next pending instance
 */
export function useNextPendingInstance(date?: string, patientId?: string) {
  const { state, loading, error, completeInstance } = useDailyCareInstances(date, patientId);

  return {
    nextInstance: state?.nextPending || null,
    loading,
    error,
    complete: completeInstance,
  };
}

/**
 * Hook for daily progress stats
 */
export function useDailyProgress(date?: string, patientId?: string) {
  const { state, loading, error, refresh } = useDailyCareInstances(date, patientId);

  return {
    stats: state?.stats || null,
    allComplete: state?.allComplete || false,
    loading,
    error,
    refresh,
  };
}

/**
 * Hook for instances in a specific time window
 */
export function useWindowInstances(
  windowLabel: TimeWindowLabel,
  date?: string,
  patientId?: string
) {
  const { state, loading, error, completeInstance, skipInstance } = useDailyCareInstances(date, patientId);

  const windowInstances = useMemo(() => {
    if (!state) return [];
    return state.byWindow[windowLabel] || [];
  }, [state, windowLabel]);

  const group = useMemo(() => {
    if (!state) return null;
    return state.groups.find(g => g.windowLabel === windowLabel) || null;
  }, [state, windowLabel]);

  return {
    instances: windowInstances,
    group,
    loading,
    error,
    complete: completeInstance,
    skip: skipInstance,
  };
}
