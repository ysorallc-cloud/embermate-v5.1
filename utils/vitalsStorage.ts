// ============================================================================
// VITALS STORAGE UTILITY
// Local AsyncStorage for vital signs tracking
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';

export type VitalType =
  | 'glucose'
  | 'systolic'
  | 'diastolic'
  | 'heartRate'
  | 'weight'
  | 'temperature'
  | 'oxygen';

export interface VitalReading {
  id: string;
  type: VitalType;
  value: number;
  timestamp: string; // ISO datetime
  unit: string;
  notes?: string;
}

const STORAGE_KEY = '@vitals_readings';

/**
 * Save a vital reading
 */
export async function saveVital(vital: Omit<VitalReading, 'id'>): Promise<void> {
  try {
    const vitals = await getVitals();
    const newVital: VitalReading = {
      ...vital,
      id: Date.now().toString(),
    };
    vitals.push(newVital);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(vitals));
  } catch (error) {
    console.error('Error saving vital:', error);
    throw error;
  }
}

/**
 * Get all vital readings
 */
export async function getVitals(): Promise<VitalReading[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading vitals:', error);
    return [];
  }
}

/**
 * Get vitals by type
 */
export async function getVitalsByType(type: VitalType): Promise<VitalReading[]> {
  try {
    const vitals = await getVitals();
    return vitals.filter((v) => v.type === type).sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  } catch (error) {
    console.error('Error loading vitals by type:', error);
    return [];
  }
}

/**
 * Get vitals for date range
 */
export async function getVitalsInRange(
  startDate: string,
  endDate: string
): Promise<VitalReading[]> {
  try {
    const vitals = await getVitals();
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();

    return vitals.filter((v) => {
      const timestamp = new Date(v.timestamp).getTime();
      return timestamp >= start && timestamp <= end;
    }).sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  } catch (error) {
    console.error('Error loading vitals in range:', error);
    return [];
  }
}

/**
 * Check if vitals were logged for a specific date
 * Returns the most recent timestamp if vitals exist for that date
 */
export async function getVitalsCompletionForDate(date: string): Promise<Date | null> {
  try {
    const vitals = await getVitals();

    // Filter vitals for the specific date
    const dateVitals = vitals.filter((v) => {
      const vitalDate = new Date(v.timestamp).toISOString().split('T')[0];
      return vitalDate === date;
    });

    if (dateVitals.length === 0) return null;

    // Return the most recent timestamp as completion time
    const mostRecent = dateVitals.reduce((latest, current) => {
      return new Date(current.timestamp) > new Date(latest.timestamp) ? current : latest;
    });

    return new Date(mostRecent.timestamp);
  } catch (error) {
    console.error('Error checking vitals completion:', error);
    return null;
  }
}

/**
 * Delete a vital reading
 */
export async function deleteVital(id: string): Promise<void> {
  try {
    const vitals = await getVitals();
    const filtered = vitals.filter((v) => v.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting vital:', error);
    throw error;
  }
}

/**
 * Clear all vitals
 */
export async function clearVitals(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing vitals:', error);
    throw error;
  }
}

/**
 * Get vitals for a specific date
 */
export async function getVitalsForDate(date: string): Promise<VitalReading[]> {
  try {
    const vitals = await getVitals();
    return vitals.filter((v: VitalReading) => {
      const vitalDate = new Date(v.timestamp).toISOString().split('T')[0];
      return vitalDate === date;
    });
  } catch (error) {
    console.error('Error getting vitals for date:', error);
    return [];
  }
}

/**
 * Get latest vitals by types
 */
export async function getLatestVitalsByTypes(
  types: VitalType[]
): Promise<Record<string, VitalReading | null>> {
  try {
    const vitals = await getVitals();
    const result: Record<string, VitalReading | null> = {};

    for (const type of types) {
      const typeVitals = vitals
        .filter((v: VitalReading) => v.type === type)
        .sort((a: VitalReading, b: VitalReading) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
      result[type] = typeVitals.length > 0 ? typeVitals[0] : null;
    }

    return result;
  } catch (error) {
    console.error('Error getting latest vitals by types:', error);
    return {};
  }
}
