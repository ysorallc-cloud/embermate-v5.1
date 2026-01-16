// ============================================================================
// QUICK LOG SETTINGS HOOK
// Manages user's custom quick log options with persistence
// ============================================================================

import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MORE_OPTIONS, QuickLogOption } from '../constants/quickLogOptions';

const STORAGE_KEY = '@embermate_quick_log_settings';

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
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        setUserOptionIds(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Failed to load quick log settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(userOptionIds));
    } catch (error) {
      console.error('Failed to save quick log settings:', error);
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
