// ============================================================================
// QUICK LOG SETTINGS HOOK
// Manages user's custom quick log options with persistence
// ============================================================================

import { useState, useEffect } from 'react';
import { logError } from '../utils/devLog';
import { safeGetItem, safeSetItem } from '../utils/safeStorage';
import { MORE_OPTIONS, QuickLogOption } from '../constants/quickLogOptions';
import { StorageKeys } from '../utils/storageKeys';

const STORAGE_KEY = StorageKeys.QUICK_LOG_SETTINGS;

interface UseQuickLogSettingsReturn {
  userOptions: QuickLogOption[];
  addOption: (option: QuickLogOption) => void;
  removeOption: (optionId: string) => void;
  isLoading: boolean;
}

export const useQuickLogSettings = (): UseQuickLogSettingsReturn => {
  const [userOptionIds, setUserOptionIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  // Save settings whenever they change
  useEffect(() => {
    if (!isLoading) {
      saveSettings();
    }
  }, [userOptionIds, isLoading]);

  const loadSettings = async () => {
    try {
      const saved = await safeGetItem<string[] | null>(STORAGE_KEY, null);
      if (saved) {
        setUserOptionIds(saved);
      }
    } catch (error) {
      logError('useQuickLogSettings.loadSettings', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      await safeSetItem(STORAGE_KEY, userOptionIds);
    } catch (error) {
      logError('useQuickLogSettings.saveSettings', error);
    }
  };

  const addOption = (option: QuickLogOption) => {
    if (!userOptionIds.includes(option.id)) {
      setUserOptionIds(prev => [...prev, option.id]);
    }
  };

  const removeOption = (optionId: string) => {
    setUserOptionIds(prev => prev.filter(id => id !== optionId));
  };

  // Convert IDs back to full option objects
  const userOptions = userOptionIds
    .map((id) => MORE_OPTIONS.find((opt) => opt.id === id))
    .filter((opt): opt is QuickLogOption => opt !== undefined);

  return {
    userOptions,
    addOption,
    removeOption,
    isLoading,
  };
};
