// ============================================================================
// CENTRAL STORAGE - Unified storage for Log page and Quick Check-In
// Ensures both interfaces use the same data source
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logError } from './devLog';

// Maximum entries per log array to prevent unbounded AsyncStorage growth
const MAX_LOG_ENTRIES = 1000;

// Storage keys
const KEYS = {
  MEDICATION_LOGS: '@embermate_central_med_logs',
  VITALS_LOGS: '@embermate_central_vitals_logs',
  MOOD_LOGS: '@embermate_central_mood_logs',
  SYMPTOM_LOGS: '@embermate_central_symptom_logs',
  SLEEP_LOGS: '@embermate_central_sleep_logs',
  MEALS_LOGS: '@embermate_central_meals_logs',
  WATER_LOGS: '@embermate_central_water_logs',
  NOTES_LOGS: '@embermate_central_notes_logs',
};

// ============================================================================
// INTERFACES
// ============================================================================

export interface MedicationLog {
  id: string;
  timestamp: string;
  medicationIds: string[];
  sideEffects?: string[];
}

export interface VitalsLog {
  id: string;
  timestamp: string;
  systolic?: number;
  diastolic?: number;
  heartRate?: number;
  glucose?: number;
  weight?: number;
  temperature?: number;
  oxygen?: number;
}

export interface MoodLog {
  id: string;
  timestamp: string;
  mood: number | null;
  energy: number | null;
  pain: number | null;
}

export interface SymptomLog {
  id: string;
  timestamp: string;
  symptoms: string[];
  severity?: number;
  notes?: string;
}

export interface SleepLog {
  id: string;
  timestamp: string;
  hours: number;
  quality: number; // 1-5
  notes?: string;
}

export interface MealsLog {
  id: string;
  timestamp: string;
  meals: string[]; // 'Breakfast', 'Lunch', 'Dinner', 'Snack'
  description?: string;
}

export interface WaterLog {
  id: string;
  timestamp: string;
  glasses: number;
}

export interface NotesLog {
  id: string;
  timestamp: string;
  content: string;
  isVoice?: boolean;
}

// ============================================================================
// MEDICATION FUNCTIONS
// ============================================================================

export const saveMedicationLog = async (data: Omit<MedicationLog, 'id'>): Promise<void> => {
  try {
    const existingData = await AsyncStorage.getItem(KEYS.MEDICATION_LOGS);
    const logs: MedicationLog[] = existingData ? JSON.parse(existingData) : [];

    const newLog: MedicationLog = {
      id: Date.now().toString(),
      ...data,
    };

    logs.unshift(newLog);
    if (logs.length > MAX_LOG_ENTRIES) logs.length = MAX_LOG_ENTRIES;
    await AsyncStorage.setItem(KEYS.MEDICATION_LOGS, JSON.stringify(logs));
  } catch (error) {
    logError('centralStorage.saveMedicationLog', error);
    throw error;
  }
};

export const getMedicationLogs = async (): Promise<MedicationLog[]> => {
  try {
    const data = await AsyncStorage.getItem(KEYS.MEDICATION_LOGS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    logError('centralStorage.getMedicationLogs', error);
    return [];
  }
};

export const getTodayMedicationLog = async (): Promise<MedicationLog | null> => {
  try {
    const logs = await getMedicationLogs();
    const today = new Date().toDateString();
    return logs.find(log => new Date(log.timestamp).toDateString() === today) || null;
  } catch (error) {
    logError('centralStorage.getTodayMedicationLog', error);
    return null;
  }
};

// ============================================================================
// VITALS FUNCTIONS
// ============================================================================

export const saveVitalsLog = async (data: Omit<VitalsLog, 'id'>): Promise<void> => {
  try {
    const existingData = await AsyncStorage.getItem(KEYS.VITALS_LOGS);
    const logs: VitalsLog[] = existingData ? JSON.parse(existingData) : [];

    const newLog: VitalsLog = {
      id: Date.now().toString(),
      ...data,
    };

    logs.unshift(newLog);
    if (logs.length > MAX_LOG_ENTRIES) logs.length = MAX_LOG_ENTRIES;
    await AsyncStorage.setItem(KEYS.VITALS_LOGS, JSON.stringify(logs));
  } catch (error) {
    logError('centralStorage.saveVitalsLog', error);
    throw error;
  }
};

export const getVitalsLogs = async (): Promise<VitalsLog[]> => {
  try {
    const data = await AsyncStorage.getItem(KEYS.VITALS_LOGS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    logError('centralStorage.getVitalsLogs', error);
    return [];
  }
};

export const getTodayVitalsLog = async (): Promise<VitalsLog | null> => {
  try {
    const logs = await getVitalsLogs();
    const today = new Date().toDateString();
    return logs.find(log => new Date(log.timestamp).toDateString() === today) || null;
  } catch (error) {
    logError('centralStorage.getTodayVitalsLog', error);
    return null;
  }
};

// ============================================================================
// MOOD FUNCTIONS
// ============================================================================

export const saveMoodLog = async (data: Omit<MoodLog, 'id'>): Promise<void> => {
  try {
    const existingData = await AsyncStorage.getItem(KEYS.MOOD_LOGS);
    const logs: MoodLog[] = existingData ? JSON.parse(existingData) : [];

    const newLog: MoodLog = {
      id: Date.now().toString(),
      ...data,
    };

    logs.unshift(newLog);
    if (logs.length > MAX_LOG_ENTRIES) logs.length = MAX_LOG_ENTRIES;
    await AsyncStorage.setItem(KEYS.MOOD_LOGS, JSON.stringify(logs));
  } catch (error) {
    logError('centralStorage.saveMoodLog', error);
    throw error;
  }
};

export const getMoodLogs = async (): Promise<MoodLog[]> => {
  try {
    const data = await AsyncStorage.getItem(KEYS.MOOD_LOGS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    logError('centralStorage.getMoodLogs', error);
    return [];
  }
};

export const getTodayMoodLog = async (): Promise<MoodLog | null> => {
  try {
    const logs = await getMoodLogs();
    const today = new Date().toDateString();
    return logs.find(log => new Date(log.timestamp).toDateString() === today) || null;
  } catch (error) {
    logError('centralStorage.getTodayMoodLog', error);
    return null;
  }
};

// ============================================================================
// SYMPTOM FUNCTIONS
// ============================================================================

export const saveSymptomLog = async (data: Omit<SymptomLog, 'id'>): Promise<void> => {
  try {
    const existingData = await AsyncStorage.getItem(KEYS.SYMPTOM_LOGS);
    const logs: SymptomLog[] = existingData ? JSON.parse(existingData) : [];

    const newLog: SymptomLog = {
      id: Date.now().toString(),
      ...data,
    };

    logs.unshift(newLog);
    if (logs.length > MAX_LOG_ENTRIES) logs.length = MAX_LOG_ENTRIES;
    await AsyncStorage.setItem(KEYS.SYMPTOM_LOGS, JSON.stringify(logs));
  } catch (error) {
    logError('centralStorage.saveSymptomLog', error);
    throw error;
  }
};

export const getSymptomLogs = async (): Promise<SymptomLog[]> => {
  try {
    const data = await AsyncStorage.getItem(KEYS.SYMPTOM_LOGS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    logError('centralStorage.getSymptomLogs', error);
    return [];
  }
};

export const getTodaySymptomLog = async (): Promise<SymptomLog | null> => {
  try {
    const logs = await getSymptomLogs();
    const today = new Date().toDateString();
    return logs.find(log => new Date(log.timestamp).toDateString() === today) || null;
  } catch (error) {
    logError('centralStorage.getTodaySymptomLog', error);
    return null;
  }
};

// ============================================================================
// SLEEP FUNCTIONS
// ============================================================================

export const saveSleepLog = async (data: Omit<SleepLog, 'id'>): Promise<void> => {
  try {
    const existingData = await AsyncStorage.getItem(KEYS.SLEEP_LOGS);
    const logs: SleepLog[] = existingData ? JSON.parse(existingData) : [];

    const newLog: SleepLog = {
      id: Date.now().toString(),
      ...data,
    };

    logs.unshift(newLog);
    if (logs.length > MAX_LOG_ENTRIES) logs.length = MAX_LOG_ENTRIES;
    await AsyncStorage.setItem(KEYS.SLEEP_LOGS, JSON.stringify(logs));
  } catch (error) {
    logError('centralStorage.saveSleepLog', error);
    throw error;
  }
};

export const getSleepLogs = async (): Promise<SleepLog[]> => {
  try {
    const data = await AsyncStorage.getItem(KEYS.SLEEP_LOGS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    logError('centralStorage.getSleepLogs', error);
    return [];
  }
};

export const getTodaySleepLog = async (): Promise<SleepLog | null> => {
  try {
    const logs = await getSleepLogs();
    const today = new Date().toDateString();
    return logs.find(log => new Date(log.timestamp).toDateString() === today) || null;
  } catch (error) {
    logError('centralStorage.getTodaySleepLog', error);
    return null;
  }
};

// ============================================================================
// MEALS FUNCTIONS
// ============================================================================

export const saveMealsLog = async (data: Omit<MealsLog, 'id'>): Promise<void> => {
  try {
    const existingData = await AsyncStorage.getItem(KEYS.MEALS_LOGS);
    const logs: MealsLog[] = existingData ? JSON.parse(existingData) : [];

    const newLog: MealsLog = {
      id: Date.now().toString(),
      ...data,
    };

    logs.unshift(newLog);
    if (logs.length > MAX_LOG_ENTRIES) logs.length = MAX_LOG_ENTRIES;
    await AsyncStorage.setItem(KEYS.MEALS_LOGS, JSON.stringify(logs));
  } catch (error) {
    logError('centralStorage.saveMealsLog', error);
    throw error;
  }
};

export const getMealsLogs = async (): Promise<MealsLog[]> => {
  try {
    const data = await AsyncStorage.getItem(KEYS.MEALS_LOGS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    logError('centralStorage.getMealsLogs', error);
    return [];
  }
};

export const getTodayMealsLog = async (): Promise<MealsLog | null> => {
  try {
    const logs = await getMealsLogs();
    const today = new Date().toDateString();
    return logs.find(log => new Date(log.timestamp).toDateString() === today) || null;
  } catch (error) {
    logError('centralStorage.getTodayMealsLog', error);
    return null;
  }
};

// ============================================================================
// WATER FUNCTIONS
// ============================================================================

export const saveWaterLog = async (data: Omit<WaterLog, 'id'>): Promise<void> => {
  try {
    const existingData = await AsyncStorage.getItem(KEYS.WATER_LOGS);
    const logs: WaterLog[] = existingData ? JSON.parse(existingData) : [];

    const newLog: WaterLog = {
      id: Date.now().toString(),
      ...data,
    };

    logs.unshift(newLog);
    if (logs.length > MAX_LOG_ENTRIES) logs.length = MAX_LOG_ENTRIES;
    await AsyncStorage.setItem(KEYS.WATER_LOGS, JSON.stringify(logs));
  } catch (error) {
    logError('centralStorage.saveWaterLog', error);
    throw error;
  }
};

export const getWaterLogs = async (): Promise<WaterLog[]> => {
  try {
    const data = await AsyncStorage.getItem(KEYS.WATER_LOGS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    logError('centralStorage.getWaterLogs', error);
    return [];
  }
};

export const getTodayWaterLog = async (): Promise<WaterLog | null> => {
  try {
    const logs = await getWaterLogs();
    const today = new Date().toDateString();
    return logs.find(log => new Date(log.timestamp).toDateString() === today) || null;
  } catch (error) {
    logError('centralStorage.getTodayWaterLog', error);
    return null;
  }
};

export const updateTodayWaterLog = async (glasses: number): Promise<void> => {
  try {
    const existingData = await AsyncStorage.getItem(KEYS.WATER_LOGS);
    const logs: WaterLog[] = existingData ? JSON.parse(existingData) : [];
    const today = new Date().toDateString();

    // Find and update today's log, or create a new one
    const todayIndex = logs.findIndex(log => new Date(log.timestamp).toDateString() === today);

    if (todayIndex >= 0) {
      logs[todayIndex].glasses = glasses;
    } else {
      logs.unshift({
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        glasses,
      });
    }

    await AsyncStorage.setItem(KEYS.WATER_LOGS, JSON.stringify(logs));
  } catch (error) {
    logError('centralStorage.updateTodayWaterLog', error);
    throw error;
  }
};

// ============================================================================
// NOTES FUNCTIONS
// ============================================================================

export const saveNotesLog = async (data: Omit<NotesLog, 'id'>): Promise<void> => {
  try {
    const existingData = await AsyncStorage.getItem(KEYS.NOTES_LOGS);
    const logs: NotesLog[] = existingData ? JSON.parse(existingData) : [];

    const newLog: NotesLog = {
      id: Date.now().toString(),
      ...data,
    };

    logs.unshift(newLog);
    if (logs.length > MAX_LOG_ENTRIES) logs.length = MAX_LOG_ENTRIES;
    await AsyncStorage.setItem(KEYS.NOTES_LOGS, JSON.stringify(logs));
  } catch (error) {
    logError('centralStorage.saveNotesLog', error);
    throw error;
  }
};

export const getNotesLogs = async (): Promise<NotesLog[]> => {
  try {
    const data = await AsyncStorage.getItem(KEYS.NOTES_LOGS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    logError('centralStorage.getNotesLogs', error);
    return [];
  }
};

export const getTodayNotesLog = async (): Promise<NotesLog | null> => {
  try {
    const logs = await getNotesLogs();
    const today = new Date().toDateString();
    return logs.find(log => new Date(log.timestamp).toDateString() === today) || null;
  } catch (error) {
    logError('centralStorage.getTodayNotesLog', error);
    return null;
  }
};

// ============================================================================
// COMBINED STATUS FUNCTIONS
// ============================================================================

export interface TodayLogStatus {
  medications: boolean;
  vitals: boolean;
  mood: boolean;
  symptoms: boolean;
  sleep: boolean;
  meals: boolean;
  water: boolean;
  notes: boolean;
}

export const getTodayLogStatus = async (): Promise<TodayLogStatus> => {
  try {
    const [meds, vitals, mood, symptoms, sleep, meals, water, notes] = await Promise.all([
      getTodayMedicationLog(),
      getTodayVitalsLog(),
      getTodayMoodLog(),
      getTodaySymptomLog(),
      getTodaySleepLog(),
      getTodayMealsLog(),
      getTodayWaterLog(),
      getTodayNotesLog(),
    ]);

    return {
      medications: !!meds,
      vitals: !!vitals,
      mood: !!mood,
      symptoms: !!symptoms,
      sleep: !!sleep,
      meals: !!meals,
      water: !!water,
      notes: !!notes,
    };
  } catch (error) {
    logError('centralStorage.getTodayLogStatus', error);
    return {
      medications: false,
      vitals: false,
      mood: false,
      symptoms: false,
      sleep: false,
      meals: false,
      water: false,
      notes: false,
    };
  }
};
