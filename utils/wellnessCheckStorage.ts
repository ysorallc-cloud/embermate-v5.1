// ============================================================================
// WELLNESS CHECK STORAGE
// Store and retrieve wellness check completions
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { MorningWellnessData, EveningWellnessData } from '../types/timeline';
import { updateStreak } from './streakStorage';
import { logError } from './devLog';

const MORNING_WELLNESS_KEY = '@embermate_morning_wellness';
const EVENING_WELLNESS_KEY = '@embermate_evening_wellness';

// ============================================================================
// MORNING WELLNESS
// ============================================================================

export interface StoredMorningWellness extends MorningWellnessData {
  id: string;
  date: string; // yyyy-MM-dd format
  skipped?: boolean;
}

export const saveMorningWellness = async (
  date: string,
  data: MorningWellnessData
): Promise<void> => {
  try {
    const existing = await getAllMorningWellness();
    const id = `morning-${date}-${Date.now()}`;

    const record: StoredMorningWellness = {
      id,
      date,
      ...data,
    };

    // Remove any existing record for this date
    const filtered = existing.filter(w => w.date !== date);
    const updated = [...filtered, record];

    await AsyncStorage.setItem(MORNING_WELLNESS_KEY, JSON.stringify(updated));

    // Update wellness check streak
    await updateStreak('wellnessCheck');
  } catch (error) {
    logError('wellnessCheckStorage.saveMorningWellness', error);
    throw error;
  }
};

export const skipMorningWellness = async (date: string): Promise<void> => {
  try {
    const existing = await getAllMorningWellness();
    const id = `morning-skip-${date}-${Date.now()}`;

    const record: StoredMorningWellness = {
      id,
      date,
      sleepQuality: 3,
      mood: 'managing',
      energyLevel: 3,
      completedAt: new Date(),
      skipped: true,
    };

    // Remove any existing record for this date
    const filtered = existing.filter(w => w.date !== date);
    const updated = [...filtered, record];

    await AsyncStorage.setItem(MORNING_WELLNESS_KEY, JSON.stringify(updated));
  } catch (error) {
    logError('wellnessCheckStorage.skipMorningWellness', error);
    throw error;
  }
};

export const getMorningWellness = async (date: string): Promise<StoredMorningWellness | null> => {
  try {
    const all = await getAllMorningWellness();
    const wellness = all.find(w => w.date === date) || null;

    // Deserialize Date object
    if (wellness && wellness.completedAt) {
      return {
        ...wellness,
        completedAt: new Date(wellness.completedAt),
      };
    }

    return wellness;
  } catch (error) {
    logError('wellnessCheckStorage.getMorningWellness', error);
    return null;
  }
};

export const getAllMorningWellness = async (): Promise<StoredMorningWellness[]> => {
  try {
    const data = await AsyncStorage.getItem(MORNING_WELLNESS_KEY);
    if (!data) return [];

    const parsed = JSON.parse(data);
    // Deserialize Date objects
    return parsed.map((w: any) => ({
      ...w,
      completedAt: w.completedAt ? new Date(w.completedAt) : w.completedAt,
    }));
  } catch (error) {
    logError('wellnessCheckStorage.getAllMorningWellness', error);
    return [];
  }
};

// ============================================================================
// EVENING WELLNESS
// ============================================================================

export interface StoredEveningWellness extends EveningWellnessData {
  id: string;
  date: string; // yyyy-MM-dd format
  skipped?: boolean;
}

export const saveEveningWellness = async (
  date: string,
  data: EveningWellnessData
): Promise<void> => {
  try {
    const existing = await getAllEveningWellness();
    const id = `evening-${date}-${Date.now()}`;

    const record: StoredEveningWellness = {
      id,
      date,
      ...data,
    };

    // Remove any existing record for this date
    const filtered = existing.filter(w => w.date !== date);
    const updated = [...filtered, record];

    await AsyncStorage.setItem(EVENING_WELLNESS_KEY, JSON.stringify(updated));

    // Update wellness check streak
    await updateStreak('wellnessCheck');
  } catch (error) {
    logError('wellnessCheckStorage.saveEveningWellness', error);
    throw error;
  }
};

export const skipEveningWellness = async (date: string): Promise<void> => {
  try {
    const existing = await getAllEveningWellness();
    const id = `evening-skip-${date}-${Date.now()}`;

    const record: StoredEveningWellness = {
      id,
      date,
      mood: 'managing',
      mealsLogged: false,
      dayRating: 3,
      completedAt: new Date(),
      skipped: true,
    };

    // Remove any existing record for this date
    const filtered = existing.filter(w => w.date !== date);
    const updated = [...filtered, record];

    await AsyncStorage.setItem(EVENING_WELLNESS_KEY, JSON.stringify(updated));
  } catch (error) {
    logError('wellnessCheckStorage.skipEveningWellness', error);
    throw error;
  }
};

export const getEveningWellness = async (date: string): Promise<StoredEveningWellness | null> => {
  try {
    const all = await getAllEveningWellness();
    const wellness = all.find(w => w.date === date) || null;

    // Deserialize Date object
    if (wellness && wellness.completedAt) {
      return {
        ...wellness,
        completedAt: new Date(wellness.completedAt),
      };
    }

    return wellness;
  } catch (error) {
    logError('wellnessCheckStorage.getEveningWellness', error);
    return null;
  }
};

export const getAllEveningWellness = async (): Promise<StoredEveningWellness[]> => {
  try {
    const data = await AsyncStorage.getItem(EVENING_WELLNESS_KEY);
    if (!data) return [];

    const parsed = JSON.parse(data);
    // Deserialize Date objects
    return parsed.map((w: any) => ({
      ...w,
      completedAt: w.completedAt ? new Date(w.completedAt) : w.completedAt,
    }));
  } catch (error) {
    logError('wellnessCheckStorage.getAllEveningWellness', error);
    return [];
  }
};
