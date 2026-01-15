// ============================================================================
// SYMPTOM STORAGE UTILITIES
// AsyncStorage operations for symptom logging
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';

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
    console.error('Error saving symptom:', error);
    throw error;
  }
}

export async function getSymptoms(): Promise<SymptomLog[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading symptoms:', error);
    return [];
  }
}

export async function getSymptomsByDate(date: string): Promise<SymptomLog[]> {
  try {
    const symptoms = await getSymptoms();
    return symptoms.filter(s => s.date === date);
  } catch (error) {
    console.error('Error getting symptoms by date:', error);
    return [];
  }
}
