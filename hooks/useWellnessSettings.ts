// ============================================================================
// WELLNESS SETTINGS HOOK
// Manages daily wellness check configuration
// ============================================================================

import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  WellnessSettings,
  DEFAULT_WELLNESS_SETTINGS,
} from '../types/wellnessSettings';

const STORAGE_KEY = '@embermate_wellness_settings';

export const useWellnessSettings = () => {
  const [settings, setSettings] = useState<WellnessSettings>(
    DEFAULT_WELLNESS_SETTINGS
  );
  const [isLoading, setIsLoading] = useState(true);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        setSettings(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Failed to load wellness settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async (newSettings: WellnessSettings) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Failed to save wellness settings:', error);
    }
  };

  return {
    wellnessChecks: {
      morning: settings.morning,
      evening: settings.evening,
    },
    vitalsCheck: settings.vitals,
    isLoading,
    updateSettings: saveSettings,
  };
};
