// ============================================================================
// USE PREP CHECKLIST HOOK
// Hook for managing appointment prep checklists
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { useDataListener, emitDataUpdate } from '../lib/events';
import {
  AppointmentPrepChecklist,
  PrepChecklistItem,
} from '../types/schedule';
import {
  getPrepChecklist,
  updatePrepChecklistItem,
  addCustomPrepItem,
  removeCustomPrepItem,
  getChecklistProgress,
} from '../utils/prepChecklistStorage';
import { Appointment } from '../utils/appointmentStorage';

// ============================================================================
// TYPES
// ============================================================================

export interface UsePrepChecklistReturn {
  checklist: AppointmentPrepChecklist | null;
  progress: {
    completed: number;
    total: number;
    percentage: number;
    isComplete: boolean;
  };
  loading: boolean;
  error: Error | null;

  // Actions
  toggleItem: (itemId: string) => Promise<void>;
  addItem: (label: string) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook for managing an appointment's prep checklist
 * One-tap checklist auto-generated from care plan + meds list
 */
export function usePrepChecklist(appointment: Appointment | null): UsePrepChecklistReturn {
  const [checklist, setChecklist] = useState<AppointmentPrepChecklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Load checklist data
   */
  const loadData = useCallback(async () => {
    if (!appointment) {
      setChecklist(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const data = await getPrepChecklist(appointment);
      setChecklist(data);
    } catch (err) {
      console.error('Error loading prep checklist:', err);
      setError(err instanceof Error ? err : new Error('Failed to load checklist'));
    } finally {
      setLoading(false);
    }
  }, [appointment?.id]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Listen for data updates
  useDataListener(() => {
    loadData();
  });

  /**
   * Calculate progress
   */
  const progress = checklist
    ? getChecklistProgress(checklist)
    : { completed: 0, total: 0, percentage: 0, isComplete: false };

  /**
   * Toggle an item's checked state
   */
  const toggleItem = useCallback(async (itemId: string) => {
    if (!checklist || !appointment) return;

    const item = checklist.items.find(i => i.id === itemId);
    if (!item) return;

    try {
      const updated = await updatePrepChecklistItem(
        appointment.id,
        itemId,
        !item.checked
      );
      if (updated) {
        setChecklist(updated);
        emitDataUpdate('prepChecklist');
      }
    } catch (err) {
      console.error('Error toggling prep item:', err);
    }
  }, [checklist, appointment?.id]);

  /**
   * Add a custom item
   */
  const addItem = useCallback(async (label: string) => {
    if (!appointment) return;

    try {
      const updated = await addCustomPrepItem(appointment.id, label);
      if (updated) {
        setChecklist(updated);
        emitDataUpdate('prepChecklist');
      }
    } catch (err) {
      console.error('Error adding prep item:', err);
    }
  }, [appointment?.id]);

  /**
   * Remove a custom item
   */
  const removeItem = useCallback(async (itemId: string) => {
    if (!appointment) return;

    try {
      const updated = await removeCustomPrepItem(appointment.id, itemId);
      if (updated) {
        setChecklist(updated);
        emitDataUpdate('prepChecklist');
      }
    } catch (err) {
      console.error('Error removing prep item:', err);
    }
  }, [appointment?.id]);

  /**
   * Refresh checklist
   */
  const refresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  return {
    checklist,
    progress,
    loading,
    error,
    toggleItem,
    addItem,
    removeItem,
    refresh,
  };
}
