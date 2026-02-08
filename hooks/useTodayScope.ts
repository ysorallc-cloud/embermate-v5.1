// ============================================================================
// USE TODAY'S SCOPE HOOK
// Temporary daily suppressions - hide items from Now/Record without editing Care Plan
// Suppressions are date-scoped and auto-expire tomorrow
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { useDataListener } from '../lib/events';
import {
  getOverrides,
  suppressItemForToday,
  unsuppressItem,
  resetTodayScope,
  getSuppressedItems,
} from '../utils/carePlanStorage';

// ============================================================================
// TYPES
// ============================================================================

export interface TodayScopeItem {
  routineId: string;
  itemId: string;
}

export interface UseTodayScopeReturn {
  // State
  suppressedItems: TodayScopeItem[];
  loading: boolean;

  // Actions
  suppress: (routineId: string, itemId: string) => Promise<void>;
  unsuppress: (routineId: string, itemId: string) => Promise<void>;
  toggleSuppression: (routineId: string, itemId: string) => Promise<void>;
  resetToDefaults: () => Promise<void>;
  refresh: () => Promise<void>;

  // Helpers
  isSuppressed: (routineId: string, itemId: string) => boolean;
  hasSuppressedItems: boolean;
}

// ============================================================================
// HOOK
// ============================================================================

export function useTodayScope(date?: string): UseTodayScopeReturn {
  const targetDate = date || new Date().toISOString().split('T')[0];
  const [suppressedItems, setSuppressedItems] = useState<TodayScopeItem[]>([]);
  const [loading, setLoading] = useState(true);

  /**
   * Load suppressed items for the date
   */
  const loadSuppressedItems = useCallback(async () => {
    try {
      setLoading(true);
      const items = await getSuppressedItems(targetDate);
      setSuppressedItems(items);
    } catch (error) {
      console.error('Error loading suppressed items:', error);
      setSuppressedItems([]);
    } finally {
      setLoading(false);
    }
  }, [targetDate]);

  // Initial load
  useEffect(() => {
    loadSuppressedItems();
  }, [loadSuppressedItems]);

  // Listen for data updates
  useDataListener(() => {
    loadSuppressedItems();
  });

  /**
   * Suppress an item for today
   */
  const suppress = useCallback(async (routineId: string, itemId: string) => {
    await suppressItemForToday(routineId, itemId, targetDate);
    await loadSuppressedItems();
  }, [targetDate, loadSuppressedItems]);

  /**
   * Unsuppress an item
   */
  const unsuppressCallback = useCallback(async (routineId: string, itemId: string) => {
    await unsuppressItem(routineId, itemId, targetDate);
    await loadSuppressedItems();
  }, [targetDate, loadSuppressedItems]);

  /**
   * Toggle suppression state
   */
  const toggleSuppression = useCallback(async (routineId: string, itemId: string) => {
    const isCurrentlySuppressed = suppressedItems.some(
      s => s.routineId === routineId && s.itemId === itemId
    );
    if (isCurrentlySuppressed) {
      await unsuppressCallback(routineId, itemId);
    } else {
      await suppress(routineId, itemId);
    }
  }, [suppressedItems, suppress, unsuppressCallback]);

  /**
   * Reset to Care Plan defaults (clear all suppressions)
   */
  const resetToDefaults = useCallback(async () => {
    await resetTodayScope(targetDate);
    await loadSuppressedItems();
  }, [targetDate, loadSuppressedItems]);

  /**
   * Check if a specific item is suppressed
   */
  const isSuppressed = useCallback((routineId: string, itemId: string): boolean => {
    return suppressedItems.some(
      s => s.routineId === routineId && s.itemId === itemId
    );
  }, [suppressedItems]);

  return {
    suppressedItems,
    loading,
    suppress,
    unsuppress: unsuppressCallback,
    toggleSuppression,
    resetToDefaults,
    refresh: loadSuppressedItems,
    isSuppressed,
    hasSuppressedItems: suppressedItems.length > 0,
  };
}

export default useTodayScope;
