// ============================================================================
// SYMPTOM STORAGE UTILITIES
// AsyncStorage operations for symptom logging
// ============================================================================

import { safeGetItem, safeSetItem } from './safeStorage';
import { logError } from './devLog';

export interface SymptomLog {
  id: string;
  symptom: string;
  severity: number; // 1-10 scale
  description?: string;
  bodyLocation?: string;  // For pain: Head, Chest, Back, Hip, etc.
  character?: string;     // For pain: Aching, Sharp, Burning, etc.
  timestamp: string; // ISO datetime
  date: string; // ISO date (YYYY-MM-DD)
}

const STORAGE_KEY = '@embermate_symptoms';

export async function saveSymptom(symptom: Omit<SymptomLog, 'id'>): Promise<void> {
  try {
    const symptoms = await getSymptoms();
    const newSymptom: SymptomLog = {
      ...symptom,
      id: Date.now().toString(),
    };
    symptoms.push(newSymptom);
    await safeSetItem(STORAGE_KEY, symptoms);
  } catch (error) {
    logError('symptomStorage.saveSymptom', error);
    throw error;
  }
}

export async function getSymptoms(): Promise<SymptomLog[]> {
  try {
    return await safeGetItem<SymptomLog[]>(STORAGE_KEY, []);
  } catch (error) {
    logError('symptomStorage.getSymptoms', error);
    return [];
  }
}

export async function getSymptomsByDate(date: string): Promise<SymptomLog[]> {
  try {
    const symptoms = await getSymptoms();
    return symptoms.filter(s => s.date === date);
  } catch (error) {
    logError('symptomStorage.getSymptomsByDate', error);
    return [];
  }
}

export async function deleteSymptom(id: string): Promise<boolean> {
  try {
    const symptoms = await getSymptoms();
    const filtered = symptoms.filter(s => s.id !== id);
    if (filtered.length === symptoms.length) {
      return false; // Symptom not found
    }
    await safeSetItem(STORAGE_KEY, filtered);
    return true;
  } catch (error) {
    logError('symptomStorage.deleteSymptom', error);
    return false;
  }
}
