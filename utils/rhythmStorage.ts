// ============================================================================
// RHYTHM STORAGE - Inferred baselines from behavior
// Observes patterns, doesn't impose requirements
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMedications } from './medicationStorage';
import { emitDataUpdate } from '../lib/events';

const STORAGE_KEY = '@embermate_rhythm';
const FIRST_USE_KEY = '@embermate_first_use_date';

// ============================================================================
// TYPES
// ============================================================================

export interface Rhythm {
  // Inferred or user-set baselines
  medications: number;      // e.g., 4 doses per day
  vitals: number;          // e.g., 2 checks per day
  meals: number;           // e.g., 3 meals per day

  // Metadata
  isInferred: boolean;     // true = observed from behavior, false = user edited
  inferredDate: string;    // When rhythm was first inferred
  lastEditedDate?: string; // When user manually edited (if ever)
  daysObserved: number;    // Number of days used to infer baseline
}

export interface TodayProgress {
  medications: { completed: number; expected: number };
  vitals: { completed: number; expected: number };
  meals: { completed: number; expected: number };
}

// ============================================================================
// FIRST USE DATE TRACKING
// ============================================================================

export async function getFirstUseDate(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(FIRST_USE_KEY);
  } catch (error) {
    console.error('Error getting first use date:', error);
    return null;
  }
}

export async function setFirstUseDate(): Promise<void> {
  try {
    const existing = await getFirstUseDate();
    if (!existing) {
      await AsyncStorage.setItem(FIRST_USE_KEY, new Date().toISOString());
    }
  } catch (error) {
    console.error('Error setting first use date:', error);
  }
}

export async function getDaysSinceFirstUse(): Promise<number> {
  try {
    const firstUse = await getFirstUseDate();
    if (!firstUse) return 0;

    const daysSince = Math.floor(
      (Date.now() - new Date(firstUse).getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;

    return daysSince;
  } catch (error) {
    console.error('Error calculating days since first use:', error);
    return 0;
  }
}

// ============================================================================
// RHYTHM INFERENCE (Days 1-3)
// ============================================================================

/**
 * Infer rhythm from last 3 days of logging behavior
 * Called automatically on Day 4+
 */
export async function inferRhythmFromBehavior(): Promise<Rhythm | null> {
  try {
    const days = await getDaysSinceFirstUse();
    if (days < 4) return null; // Don't infer until Day 4

    // Get medications for baseline
    const meds = await getMedications();
    const activeMeds = meds.filter(m => m.active !== false);

    // For now, use sensible defaults based on active medications
    // In a full implementation, we'd analyze logs from the past 3 days
    const medsPerDay = activeMeds.length || 4;
    const vitalsPerDay = 2; // Default: morning and evening
    const mealsPerDay = 3;  // Default: breakfast, lunch, dinner

    return {
      medications: medsPerDay,
      vitals: vitalsPerDay,
      meals: mealsPerDay,
      isInferred: true,
      inferredDate: new Date().toISOString(),
      daysObserved: 3,
    };
  } catch (error) {
    console.error('Error inferring rhythm:', error);
    return null;
  }
}

// ============================================================================
// RHYTHM STORAGE
// ============================================================================

export async function getRhythm(): Promise<Rhythm | null> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }

    // No stored rhythm - try to infer on Day 4+
    const days = await getDaysSinceFirstUse();
    if (days >= 4) {
      const inferred = await inferRhythmFromBehavior();
      if (inferred) {
        await saveRhythm(inferred);
        return inferred;
      }
    }

    return null;
  } catch (error) {
    console.error('Error getting rhythm:', error);
    return null;
  }
}

export async function saveRhythm(rhythm: Rhythm): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(rhythm));
    emitDataUpdate('rhythm');
  } catch (error) {
    console.error('Error saving rhythm:', error);
    throw error;
  }
}

export async function updateRhythm(updates: Partial<Rhythm>): Promise<void> {
  try {
    const existing = await getRhythm();
    const updated: Rhythm = {
      ...(existing || { medications: 0, vitals: 0, meals: 0, isInferred: true, inferredDate: new Date().toISOString(), daysObserved: 0 }),
      ...updates,
      isInferred: false, // Once edited, it's no longer inferred
      lastEditedDate: new Date().toISOString(),
    };
    await saveRhythm(updated);
  } catch (error) {
    console.error('Error updating rhythm:', error);
    throw error;
  }
}

export async function clearRhythm(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
    emitDataUpdate('rhythm');
  } catch (error) {
    console.error('Error clearing rhythm:', error);
    throw error;
  }
}

// ============================================================================
// TODAY'S PROGRESS
// ============================================================================

export async function getTodayProgress(): Promise<TodayProgress> {
  try {
    const rhythm = await getRhythm();

    // Import from existing storage
    const { getTodayVitalsLog, getTodayMealsLog } = require('./centralStorage');

    const [todayVitals, todayMeals] = await Promise.all([
      getTodayVitalsLog(),
      getTodayMealsLog(),
    ]);

    // Count medications taken
    const meds = await getMedications();
    const medsTaken = meds.filter(m => m.active !== false && m.taken).length;

    // Count vitals
    let vitalsCount = 0;
    if (todayVitals) {
      if (todayVitals.systolic || todayVitals.diastolic) vitalsCount++;
      if (todayVitals.glucose) vitalsCount++;
      if (todayVitals.heartRate) vitalsCount++;
      if (todayVitals.temperature) vitalsCount++;
      if (todayVitals.oxygen) vitalsCount++;
      if (todayVitals.weight) vitalsCount++;
    }

    // Count meals
    const mealsCount = todayMeals?.meals?.length || 0;

    return {
      medications: {
        completed: medsTaken,
        expected: rhythm?.medications || 0,
      },
      vitals: {
        completed: vitalsCount,
        expected: rhythm?.vitals || 0,
      },
      meals: {
        completed: mealsCount,
        expected: rhythm?.meals || 0,
      },
    };
  } catch (error) {
    console.error('Error getting today progress:', error);
    return {
      medications: { completed: 0, expected: 0 },
      vitals: { completed: 0, expected: 0 },
      meals: { completed: 0, expected: 0 },
    };
  }
}

// ============================================================================
// DEVIATION DETECTION (for Understand page insights)
// ============================================================================

export interface DeviationAnalysis {
  hasDeviation: boolean;
  daysOfDeviation: number;
  categories: {
    medications?: { expected: number; actual: number };
    vitals?: { expected: number; actual: number };
    meals?: { expected: number; actual: number };
  };
}

/**
 * Check if there's been consistent deviation from rhythm over past 5 days
 */
export async function detectDeviation(): Promise<DeviationAnalysis> {
  try {
    const rhythm = await getRhythm();
    if (!rhythm) {
      return { hasDeviation: false, daysOfDeviation: 0, categories: {} };
    }

    // For now, return no deviation
    // In a full implementation, we'd analyze the last 5 days of logs
    return {
      hasDeviation: false,
      daysOfDeviation: 0,
      categories: {},
    };
  } catch (error) {
    console.error('Error detecting deviation:', error);
    return { hasDeviation: false, daysOfDeviation: 0, categories: {} };
  }
}
