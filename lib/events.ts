// ============================================================================
// Event System for Real-Time Sync Between Pages
// ============================================================================

import { useEffect, useCallback } from 'react';

type EventCallback = (category: string) => void;
const listeners: Set<EventCallback> = new Set();

export const emitDataUpdate = (category: string) => {
  listeners.forEach(callback => callback(category));
};

export const emitNavigateToRecord = (section?: string) => {
  // This can be used for deep-linking to specific sections
  listeners.forEach(callback => callback(`navigate:${section || 'all'}`));
};

export const useDataListener = (callback: EventCallback) => {
  const stableCallback = useCallback(callback, []);

  useEffect(() => {
    listeners.add(stableCallback);
    return () => {
      listeners.delete(stableCallback);
    };
  }, [stableCallback]);
};
