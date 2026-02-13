// ============================================================================
// SYMPTOM STORAGE UTILITIES
// AsyncStorage operations for symptom logging
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logError } from './devLog';

export interface SymptomLog {
  id: string;
  symptom: string;
  severity: number; // 1-10 scale
  description?: string;
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
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(symptoms));
  } catch (error) {
    logError('symptomStorage.saveSymptom', error);
    throw error;
  }
}

export async function getSymptoms(): Promise<SymptomLog[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
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
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    logError('symptomStorage.deleteSymptom', error);
    return false;
  }
}
