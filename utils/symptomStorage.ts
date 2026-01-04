// ============================================================================
// SYMPTOM STORAGE UTILITY
// Local AsyncStorage only - no database, no cloud
// Tracks daily symptom logs for correlation detection
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SymptomLog {
  date: string; // ISO format YYYY-MM-DD
  pain: number | null; // 0-10 scale
  fatigue: number | null; // 0-10 scale
  nausea: number | null; // 0-10 scale
  dizziness: number | null; // 0-10 scale
  other: string | null; // Free text
}

const STORAGE_KEY_PREFIX = '@symptom_logs_';

/**
 * Save symptom log for a specific date
 */
export async function saveSymptomLog(
  date: string,
  symptomData: Partial<SymptomLog>
): Promise<void> {
  try {
    const key = `${STORAGE_KEY_PREFIX}${date}`;
    const existing = await getSymptomLog(date);
    const updated = { ...existing, date, ...symptomData };
    await AsyncStorage.setItem(key, JSON.stringify(updated));
  } catch (error) {
    console.error('Error saving symptom log:', error);
    throw error;
  }
}

/**
 * Get symptom log for a specific date
 */
export async function getSymptomLog(date: string): Promise<SymptomLog | null> {
  try {
    const key = `${STORAGE_KEY_PREFIX}${date}`;
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error loading symptom log:', error);
    return null;
  }
}

/**
 * Get symptom logs for a date range
 */
export async function getSymptomLogs(
  startDate: string,
  endDate: string
): Promise<SymptomLog[]> {
  try {
    const logs: SymptomLog[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const log = await getSymptomLog(dateStr);
      if (log) {
        logs.push(log);
      }
    }
    
    return logs;
  } catch (error) {
    console.error('Error loading symptom logs:', error);
    return [];
  }
}

/**
 * Delete symptom log for a specific date
 */
export async function deleteSymptomLog(date: string): Promise<void> {
  try {
    const key = `${STORAGE_KEY_PREFIX}${date}`;
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error('Error deleting symptom log:', error);
    throw error;
  }
}

/**
 * Get all symptom log dates (for listing)
 */
export async function getAllSymptomLogDates(): Promise<string[]> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const symptomKeys = allKeys.filter(key => key.startsWith(STORAGE_KEY_PREFIX));
    return symptomKeys
      .map(key => key.replace(STORAGE_KEY_PREFIX, ''))
      .sort()
      .reverse(); // Most recent first
  } catch (error) {
    console.error('Error loading symptom log dates:', error);
    return [];
  }
}
