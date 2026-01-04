// ============================================================================
// MEDICATION STORAGE UTILITIES
// AsyncStorage CRUD operations for medications
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkMultipleInteractions, DrugInteraction } from './drugInteractions';

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  time: string;
  timeSlot: 'morning' | 'afternoon' | 'evening' | 'bedtime';
  taken: boolean;
  notes?: string;
  active: boolean;
  createdAt: string;
  lastTaken?: string;
  
  // Refill tracking
  pillsRemaining?: number;
  daysSupply?: number;
  refillDate?: string;
  autoRefill?: boolean;
  pharmacyName?: string;
  prescriptionNumber?: string;
}

export interface InteractionWarning {
  drugs: string[];
  severity: 'high' | 'medium' | 'low';
  warning: string;
  affectedMedications: string[];
}

export interface MedicationLog {
  medicationId: string;
  timestamp: string;
  taken: boolean;
  notes?: string;
}

const MEDICATIONS_KEY = '@embermate_medications';
const MEDICATION_LOGS_KEY = '@embermate_medication_logs';

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

/**
 * Get all medications
 */
export async function getMedications(): Promise<Medication[]> {
  try {
    const data = await AsyncStorage.getItem(MEDICATIONS_KEY);
    if (!data) {
      return getDefaultMedications();
    }
    return JSON.parse(data);
  } catch (error) {
    console.error('Error getting medications:', error);
    return getDefaultMedications();
  }
}

/**
 * Get a single medication by ID
 */
export async function getMedication(id: string): Promise<Medication | null> {
  try {
    const medications = await getMedications();
    return medications.find(m => m.id === id) || null;
  } catch (error) {
    console.error('Error getting medication:', error);
    return null;
  }
}

/**
 * Create a new medication
 */
export async function createMedication(
  medication: Omit<Medication, 'id' | 'createdAt'>
): Promise<Medication> {
  try {
    // Check for duplicate
    const duplicate = await checkDuplicateMedication(medication.name);
    if (duplicate) {
      throw new Error(`Similar medication already exists: ${duplicate.name}`);
    }
    
    const medications = await getMedications();
    const newMedication: Medication = {
      ...medication,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    medications.push(newMedication);
    await AsyncStorage.setItem(MEDICATIONS_KEY, JSON.stringify(medications));
    return newMedication;
  } catch (error) {
    console.error('Error creating medication:', error);
    throw error;
  }
}

/**
 * Update a medication
 */
export async function updateMedication(
  id: string,
  updates: Partial<Medication>
): Promise<Medication | null> {
  try {
    const medications = await getMedications();
    const index = medications.findIndex(m => m.id === id);
    
    if (index === -1) {
      return null;
    }
    
    medications[index] = { ...medications[index], ...updates };
    await AsyncStorage.setItem(MEDICATIONS_KEY, JSON.stringify(medications));
    return medications[index];
  } catch (error) {
    console.error('Error updating medication:', error);
    return null;
  }
}

/**
 * Delete a medication (soft delete by setting active: false)
 */
export async function deleteMedication(id: string): Promise<boolean> {
  try {
    return (await updateMedication(id, { active: false })) !== null;
  } catch (error) {
    console.error('Error deleting medication:', error);
    return false;
  }
}

/**
 * Mark medication as taken
 */
export async function markMedicationTaken(
  id: string,
  taken: boolean = true,
  notes?: string
): Promise<boolean> {
  try {
    const timestamp = new Date().toISOString();
    
    // Update medication status
    const updated = await updateMedication(id, {
      taken,
      lastTaken: taken ? timestamp : undefined,
    });
    
    if (!updated) {
      return false;
    }
    
    // Log the event
    await logMedicationEvent(id, taken, notes);
    
    return true;
  } catch (error) {
    console.error('Error marking medication taken:', error);
    return false;
  }
}

// ============================================================================
// MEDICATION LOGS
// ============================================================================

/**
 * Log a medication event
 */
export async function logMedicationEvent(
  medicationId: string,
  taken: boolean,
  notes?: string
): Promise<void> {
  try {
    const logs = await getMedicationLogs();
    const newLog: MedicationLog = {
      medicationId,
      timestamp: new Date().toISOString(),
      taken,
      notes,
    };
    logs.push(newLog);
    
    // Keep only last 1000 logs to prevent storage overflow
    const trimmedLogs = logs.slice(-1000);
    
    await AsyncStorage.setItem(MEDICATION_LOGS_KEY, JSON.stringify(trimmedLogs));
  } catch (error) {
    console.error('Error logging medication event:', error);
  }
}

/**
 * Get all medication logs
 */
export async function getMedicationLogs(): Promise<MedicationLog[]> {
  try {
    const data = await AsyncStorage.getItem(MEDICATION_LOGS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting medication logs:', error);
    return [];
  }
}

/**
 * Get logs for a specific medication
 */
export async function getMedicationLogsById(medicationId: string): Promise<MedicationLog[]> {
  try {
    const logs = await getMedicationLogs();
    return logs.filter(log => log.medicationId === medicationId);
  } catch (error) {
    console.error('Error getting medication logs:', error);
    return [];
  }
}

/**
 * Calculate adherence rate for a medication
 */
export async function calculateAdherence(
  medicationId: string,
  days: number = 7
): Promise<number> {
  try {
    const logs = await getMedicationLogsById(medicationId);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const recentLogs = logs.filter(
      log => new Date(log.timestamp) >= cutoffDate && log.taken
    );
    
    // Assuming once daily medication
    const expectedDoses = days;
    const takenDoses = recentLogs.length;
    
    return Math.round((takenDoses / expectedDoses) * 100);
  } catch (error) {
    console.error('Error calculating adherence:', error);
    return 0;
  }
}

// ============================================================================
// RESET & DEFAULTS
// ============================================================================

/**
 * Reset medications to default (for demo/testing)
 */
export async function resetMedications(): Promise<void> {
  try {
    const defaults = getDefaultMedications();
    await AsyncStorage.setItem(MEDICATIONS_KEY, JSON.stringify(defaults));
  } catch (error) {
    console.error('Error resetting medications:', error);
  }
}

/**
 * Reset daily medication status
 * Call this at midnight to reset all "taken" flags
 */
export async function resetDailyMedicationStatus(): Promise<void> {
  try {
    const medications = await getMedications();
    const reset = medications.map(med => ({ ...med, taken: false }));
    await AsyncStorage.setItem(MEDICATIONS_KEY, JSON.stringify(reset));
  } catch (error) {
    console.error('Error resetting daily medication status:', error);
  }
}

/**
 * Default medications for initial setup
 */
function getDefaultMedications(): Medication[] {
  const now = new Date().toISOString();
  return [
    {
      id: '1',
      name: 'Metformin',
      dosage: '500mg',
      time: '08:00',
      timeSlot: 'morning',
      taken: false,
      notes: 'With breakfast',
      active: true,
      createdAt: now,
      pillsRemaining: 60,
      daysSupply: 30,
    },
    {
      id: '2',
      name: 'Lisinopril',
      dosage: '10mg',
      time: '08:00',
      timeSlot: 'morning',
      taken: false,
      active: true,
      createdAt: now,
      pillsRemaining: 90,
      daysSupply: 90,
    },
    {
      id: '3',
      name: 'Vitamin D',
      dosage: '1000IU',
      time: '08:00',
      timeSlot: 'morning',
      taken: false,
      active: true,
      createdAt: now,
    },
    {
      id: '4',
      name: 'Aspirin',
      dosage: '81mg',
      time: '12:00',
      timeSlot: 'afternoon',
      taken: false,
      notes: 'With lunch',
      active: true,
      createdAt: now,
      pillsRemaining: 100,
      daysSupply: 100,
    },
    {
      id: '5',
      name: 'Metformin',
      dosage: '500mg',
      time: '18:00',
      timeSlot: 'evening',
      taken: false,
      notes: 'With dinner',
      active: true,
      createdAt: now,
    },
    {
      id: '6',
      name: 'Amlodipine',
      dosage: '5mg',
      time: '18:00',
      timeSlot: 'evening',
      taken: false,
      active: true,
      createdAt: now,
      pillsRemaining: 30,
      daysSupply: 30,
    },
    {
      id: '7',
      name: 'Melatonin',
      dosage: '3mg',
      time: '21:00',
      timeSlot: 'bedtime',
      taken: false,
      notes: '30 min before sleep',
      active: true,
      createdAt: now,
    },
  ];
}

// ============================================================================
// REFILL TRACKING
// ============================================================================

/**
 * Get medications needing refill
 */
export async function getMedicationsNeedingRefill(
  daysWarning: number = 7
): Promise<Medication[]> {
  try {
    const medications = await getMedications();
    return medications.filter(m => 
      m.active && 
      m.daysSupply !== undefined && 
      m.daysSupply <= daysWarning
    );
  } catch (error) {
    console.error('Error getting medications needing refill:', error);
    return [];
  }
}

/**
 * Update medication supply after taking
 */
export async function updateMedicationSupply(
  id: string,
  pillsTaken: number = 1
): Promise<Medication | null> {
  try {
    const medication = await getMedication(id);
    if (!medication || medication.pillsRemaining === undefined) {
      return null;
    }
    
    const newRemaining = Math.max(0, medication.pillsRemaining - pillsTaken);
    const updates: Partial<Medication> = {
      pillsRemaining: newRemaining,
    };
    
    // Recalculate days supply (assuming 1 pill per day for simplicity)
    if (medication.daysSupply !== undefined) {
      updates.daysSupply = newRemaining;
    }
    
    // Set refill date if low
    if (newRemaining <= 7 && !medication.refillDate) {
      const refillDate = new Date();
      refillDate.setDate(refillDate.getDate() + newRemaining);
      updates.refillDate = refillDate.toISOString();
    }
    
    return await updateMedication(id, updates);
  } catch (error) {
    console.error('Error updating medication supply:', error);
    return null;
  }
}

/**
 * Add refill to medication
 */
export async function addMedicationRefill(
  id: string,
  pillsAdded: number,
  daysSupply?: number
): Promise<Medication | null> {
  try {
    const medication = await getMedication(id);
    if (!medication) {
      return null;
    }
    
    const newRemaining = (medication.pillsRemaining || 0) + pillsAdded;
    const updates: Partial<Medication> = {
      pillsRemaining: newRemaining,
      daysSupply: daysSupply || newRemaining,
      refillDate: undefined, // Clear refill date
    };
    
    return await updateMedication(id, updates);
  } catch (error) {
    console.error('Error adding medication refill:', error);
    return null;
  }
}

// ============================================================================
// INTERACTION WARNINGS
// ============================================================================

const KNOWN_INTERACTIONS = [
  {
    drugs: ['warfarin', 'aspirin'],
    severity: 'high' as const,
    warning: 'Increased bleeding risk. Consult doctor before combining these medications.',
  },
  {
    drugs: ['lisinopril', 'spironolactone'],
    severity: 'high' as const,
    warning: 'Risk of high potassium levels (hyperkalemia). Regular blood tests required.',
  },
  {
    drugs: ['metformin', 'alcohol'],
    severity: 'medium' as const,
    warning: 'Avoid alcohol while taking metformin - risk of lactic acidosis.',
  },
  {
    drugs: ['amlodipine', 'grapefruit'],
    severity: 'medium' as const,
    warning: 'Grapefruit can increase amlodipine levels. Avoid grapefruit juice.',
  },
  {
    drugs: ['lisinopril', 'ibuprofen'],
    severity: 'medium' as const,
    warning: 'NSAIDs like ibuprofen can reduce effectiveness of blood pressure medications.',
  },
  {
    drugs: ['levothyroxine', 'calcium'],
    severity: 'low' as const,
    warning: 'Take calcium supplements at least 4 hours apart from thyroid medication.',
  },
];

/**
 * Check for duplicate medications
 */
export async function checkDuplicateMedication(
  name: string
): Promise<Medication | null> {
  try {
    const medications = await getMedications();
    const normalized = name.toLowerCase().trim();
    
    return medications.find(m => 
      m.active && 
      m.name.toLowerCase().includes(normalized)
    ) || null;
  } catch (error) {
    console.error('Error checking duplicate medication:', error);
    return null;
  }
}

/**
 * Check for medication interactions using local drug interactions database
 */
export async function checkMedicationInteractions(): Promise<DrugInteraction[]> {
  try {
    const medications = await getMedications();
    const activeMedicationNames = medications
      .filter(m => m.active)
      .map(m => m.name);
    
    return checkMultipleInteractions(activeMedicationNames);
  } catch (error) {
    console.error('Error checking medication interactions:', error);
    return [];
  }
}
