// ============================================================================
// DAILY TRACKING STORAGE UTILITY
// Local AsyncStorage only - tracks hydration, mood, sleep
// Used for correlation detection
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DailyTrackingLog {
  date: string; // ISO format YYYY-MM-DD
  hydration: number | null; // Cups of water (0-20)
  mood: number | null; // 0-10 scale (0=terrible, 10=excellent)
  sleep: number | null; // Hours of sleep (0-24)
}

const STORAGE_KEY_PREFIX = '@daily_tracking_';

/**
 * Save daily tracking log
 */
export async function saveDailyTracking(
  date: string,
  trackingData: Partial<DailyTrackingLog>
): Promise<void> {
  try {
    const key = `${STORAGE_KEY_PREFIX}${date}`;
    const existing = await getDailyTracking(date);
    const updated = { ...existing, date, ...trackingData };
    await AsyncStorage.setItem(key, JSON.stringify(updated));
  } catch (error) {
    console.error('Error saving daily tracking:', error);
    throw error;
  }
}

/**
 * Get daily tracking for a specific date
 */
export async function getDailyTracking(date: string): Promise<DailyTrackingLog | null> {
  try {
    const key = `${STORAGE_KEY_PREFIX}${date}`;
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error loading daily tracking:', error);
    return null;
  }
}

/**
 * Get daily tracking logs for a date range
 */
export async function getDailyTrackingLogs(
  startDate: string,
  endDate: string
): Promise<DailyTrackingLog[]> {
  try {
    const logs: DailyTrackingLog[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const log = await getDailyTracking(dateStr);
      if (log) {
        logs.push(log);
      }
    }
    
    return logs;
  } catch (error) {
    console.error('Error loading daily tracking logs:', error);
    return [];
  }
}

/**
 * Delete daily tracking for a specific date
 */
export async function deleteDailyTracking(date: string): Promise<void> {
  try {
    const key = `${STORAGE_KEY_PREFIX}${date}`;
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error('Error deleting daily tracking:', error);
    throw error;
  }
}
