// ============================================================================
// MEDICATION STORAGE UTILITIES
// AsyncStorage CRUD operations for medications
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkMultipleInteractions, DrugInteraction } from './drugInteractions';
import { safeGetItem, safeSetItem } from './safeStorage';
import { generateUniqueId } from './idGenerator';
import { logError } from './devLog';
import { getTodayDateString } from '../services/carePlanGenerator';

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

  // Reminder settings
  reminderEnabled?: boolean;
  reminderMinutesBefore?: number; // Minutes before scheduled time to send reminder (0 = at scheduled time)
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
const LAST_RESET_DATE_KEY = '@embermate_last_med_reset';

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

/**
 * Get all medications
 * Automatically resets daily "taken" status if it's a new day
 */
export async function getMedications(): Promise<Medication[]> {
  try {
    // Check if we need to reset daily status
    await checkAndResetDaily();

    const medications = await safeGetItem<Medication[]>(MEDICATIONS_KEY, []);

    // If empty, return default medications for first-time users
    if (medications.length === 0) {
      const hasSeenOnboarding = await AsyncStorage.getItem('@embermate_onboarding_complete');
      if (!hasSeenOnboarding) {
        return getDefaultMedications();
      }
    }

    return medications;
  } catch (error) {
    logError('medicationStorage.getMedications', error);
    return [];
  }
}

/**
 * Check if it's a new day and reset medication status if needed
 */
async function checkAndResetDaily(): Promise<void> {
  try {
    const today = getTodayDateString(); // YYYY-MM-DD
    const lastResetDate = await AsyncStorage.getItem(LAST_RESET_DATE_KEY);

    if (lastResetDate !== today) {
      // It's a new day, reset all medication taken status
      await resetDailyMedicationStatus();
      await AsyncStorage.setItem(LAST_RESET_DATE_KEY, today);
    }
  } catch (error) {
    logError('medicationStorage.checkAndResetDaily', error);
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
    logError('medicationStorage.getMedication', error);
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

    // Generate unique ID that won't collide
    const newMedication: Medication = {
      ...medication,
      id: generateUniqueId(),
      createdAt: new Date().toISOString(),
    };

    medications.push(newMedication);

    // Use safe storage to prevent corruption
    const success = await safeSetItem(MEDICATIONS_KEY, medications);

    if (!success) {
      throw new Error('Failed to save medication to storage');
    }

    return newMedication;
  } catch (error) {
    logError('medicationStorage.createMedication', error);
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
      console.warn(`Medication with id ${id} not found`);
      return null;
    }

    medications[index] = { ...medications[index], ...updates };

    const success = await safeSetItem(MEDICATIONS_KEY, medications);

    if (!success) {
      logError('medicationStorage.updateMedication', 'Failed to save updated medication');
      return null;
    }

    return medications[index];
  } catch (error) {
    logError('medicationStorage.updateMedication', error);
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
    logError('medicationStorage.deleteMedication', error);
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
    logError('medicationStorage.markMedicationTaken', error);
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

    await safeSetItem(MEDICATION_LOGS_KEY, trimmedLogs);
  } catch (error) {
    logError('medicationStorage.logMedicationEvent', error);
  }
}

/**
 * Get all medication logs
 */
export async function getMedicationLogs(): Promise<MedicationLog[]> {
  return await safeGetItem<MedicationLog[]>(MEDICATION_LOGS_KEY, []);
}

/**
 * Get logs for a specific medication
 */
export async function getMedicationLogsById(medicationId: string): Promise<MedicationLog[]> {
  try {
    const logs = await getMedicationLogs();
    return logs.filter(log => log.medicationId === medicationId);
  } catch (error) {
    logError('medicationStorage.getMedicationLogsById', error);
    return [];
  }
}

/**
 * Calculate adherence rate for a medication
 * Automatically detects how many times per day the medication is scheduled
 */
export async function calculateAdherence(
  medicationId: string,
  days: number = 7
): Promise<number> {
  try {
    const medication = await getMedication(medicationId);
    if (!medication) return 0;

    const logs = await getMedicationLogsById(medicationId);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const recentLogs = logs.filter(
      log => new Date(log.timestamp) >= cutoffDate && log.taken
    );

    // Count how many times this medication name is scheduled per day
    const allMedications = await getMedications();
    const dosesPerDay = allMedications.filter(
      med => med.name.toLowerCase() === medication.name.toLowerCase() && med.active
    ).length;

    const expectedDoses = days * dosesPerDay;
    const takenDoses = recentLogs.length;

    return Math.round((takenDoses / expectedDoses) * 100);
  } catch (error) {
    logError('medicationStorage.calculateAdherence', error);
    return 0;
  }
}

/**
 * Calculate adherence rate by medication name (across all doses)
 */
export async function calculateAdherenceByName(
  medicationName: string,
  days: number = 7
): Promise<number> {
  try {
    const allMedications = await getMedications();
    const matchingMeds = allMedications.filter(
      med => med.name.toLowerCase() === medicationName.toLowerCase() && med.active
    );

    if (matchingMeds.length === 0) return 0;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Get logs for all matching medication IDs
    const allLogs = await getMedicationLogs();
    const recentLogs = allLogs.filter(
      log =>
        matchingMeds.some(med => med.id === log.medicationId) &&
        new Date(log.timestamp) >= cutoffDate &&
        log.taken
    );

    const dosesPerDay = matchingMeds.length;
    const expectedDoses = days * dosesPerDay;
    const takenDoses = recentLogs.length;

    return Math.round((takenDoses / expectedDoses) * 100);
  } catch (error) {
    logError('medicationStorage.calculateAdherenceByName', error);
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
    await safeSetItem(MEDICATIONS_KEY, defaults);
  } catch (error) {
    logError('medicationStorage.resetMedications', error);
  }
}

/**
 * Reset daily medication status
 * Call this at midnight to reset all "taken" flags
 *
 * IMPORTANT: Reads directly from storage to avoid infinite recursion.
 * DO NOT call getMedications() here - it triggers checkAndResetDaily()
 * which calls this function again, causing stack overflow/OOM.
 */
export async function resetDailyMedicationStatus(): Promise<void> {
  try {
    // Read directly from storage - DO NOT use getMedications() to avoid recursion
    const medications = await safeGetItem<Medication[]>(MEDICATIONS_KEY, []);
    const reset = medications.map(med => ({ ...med, taken: false }));
    await safeSetItem(MEDICATIONS_KEY, reset);
  } catch (error) {
    logError('medicationStorage.resetDailyMedicationStatus', error);
  }
}

/**
 * Default medications for initial setup
 * NOTE: These are demo medications shown on first launch
 */
function getDefaultMedications(): Medication[] {
  const now = new Date().toISOString();
  return [
    {
      id: generateUniqueId(),
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
      id: generateUniqueId(),
      name: 'Lisinopril',
      dosage: '10mg',
      time: '08:00',
      timeSlot: 'morning',
      taken: false,
      notes: 'Blood pressure medication',
      active: true,
      createdAt: now,
      pillsRemaining: 90,
      daysSupply: 90,
    },
    {
      id: generateUniqueId(),
      name: 'Vitamin D',
      dosage: '1000IU',
      time: '08:00',
      timeSlot: 'morning',
      taken: false,
      active: true,
      createdAt: now,
    },
    {
      id: generateUniqueId(),
      name: 'Aspirin',
      dosage: '81mg',
      time: '12:00',
      timeSlot: 'afternoon',
      taken: false,
      notes: 'With lunch',
      active: true,
      createdAt: now,
      pillsRemaining: 5,
      daysSupply: 5, // Low to demonstrate refill warning
    },
    {
      id: generateUniqueId(),
      name: 'Metformin',
      dosage: '500mg',
      time: '18:00',
      timeSlot: 'evening',
      taken: false,
      notes: 'With dinner (evening dose)',
      active: true,
      createdAt: now,
      pillsRemaining: 60,
      daysSupply: 30,
    },
    {
      id: generateUniqueId(),
      name: 'Amlodipine',
      dosage: '5mg',
      time: '18:00',
      timeSlot: 'evening',
      taken: false,
      notes: 'Calcium channel blocker',
      active: true,
      createdAt: now,
      pillsRemaining: 30,
      daysSupply: 30,
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
    logError('medicationStorage.getMedicationsNeedingRefill', error);
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
    logError('medicationStorage.updateMedicationSupply', error);
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
    logError('medicationStorage.addMedicationRefill', error);
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
    logError('medicationStorage.checkDuplicateMedication', error);
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
    logError('medicationStorage.checkMedicationInteractions', error);
    return [];
  }
}
