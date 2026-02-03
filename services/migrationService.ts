// ============================================================================
// MIGRATION SERVICE
// Handles migration from old systems to new regimen-based CarePlan
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMedications, Medication } from '../utils/medicationStorage';
import {
  getActiveCarePlan,
  createCarePlan,
  upsertCarePlanItem,
  listCarePlanItems,
  DEFAULT_PATIENT_ID,
} from '../storage/carePlanRepo';
import {
  CarePlanItem,
  TimeWindow,
  TimeWindowLabel,
} from '../types/carePlan';
import { generateUniqueId } from '../utils/idGenerator';

// ============================================================================
// MIGRATION STATUS TRACKING
// ============================================================================

const MIGRATION_KEY = '@embermate_migration_status_v1';

interface MigrationStatus {
  medicationsToCarePlan: boolean;
  rhythmToRegimen: boolean;
  lastMigrationDate: string;
  version: number;
}

export async function getMigrationStatus(): Promise<MigrationStatus | null> {
  try {
    const status = await AsyncStorage.getItem(MIGRATION_KEY);
    return status ? JSON.parse(status) : null;
  } catch (error) {
    console.error('Error getting migration status:', error);
    return null;
  }
}

async function setMigrationStatus(status: MigrationStatus): Promise<void> {
  try {
    await AsyncStorage.setItem(MIGRATION_KEY, JSON.stringify(status));
  } catch (error) {
    console.error('Error setting migration status:', error);
  }
}

// ============================================================================
// DETECTION
// ============================================================================

/**
 * Check if there are medications that need to be migrated to CarePlanItems
 */
export async function detectMigrationNeeded(): Promise<{
  hasMedicationsToMigrate: boolean;
  medicationsCount: number;
  existingCarePlanItemsCount: number;
}> {
  try {
    // Get all active medications
    const medications = await getMedications();
    const activeMeds = medications.filter(m => m.active !== false);

    // Get existing CarePlan (if any)
    let carePlan = await getActiveCarePlan(DEFAULT_PATIENT_ID);
    let existingItemsCount = 0;

    if (carePlan) {
      const items = await listCarePlanItems(carePlan.id);
      existingItemsCount = items.filter(i => i.type === 'medication').length;
    }

    // Check which medications don't have corresponding CarePlanItems
    const medsWithoutItems = activeMeds.filter(med => {
      if (!carePlan) return true;
      // This will be empty if no items exist
      return existingItemsCount === 0;
    });

    return {
      hasMedicationsToMigrate: medsWithoutItems.length > 0 && existingItemsCount === 0,
      medicationsCount: activeMeds.length,
      existingCarePlanItemsCount: existingItemsCount,
    };
  } catch (error) {
    console.error('Error detecting migration:', error);
    return {
      hasMedicationsToMigrate: false,
      medicationsCount: 0,
      existingCarePlanItemsCount: 0,
    };
  }
}

// ============================================================================
// MIGRATION HELPERS
// ============================================================================

type TimeSlot = 'morning' | 'afternoon' | 'evening' | 'bedtime';

const TIME_SLOT_TO_WINDOW: Record<TimeSlot, TimeWindowLabel> = {
  morning: 'morning',
  afternoon: 'afternoon',
  evening: 'evening',
  bedtime: 'night',
};

const TIME_SLOT_DEFAULTS: Record<TimeSlot, string> = {
  morning: '08:00',
  afternoon: '13:00',
  evening: '18:00',
  bedtime: '22:00',
};

function createTimeWindowForMedication(med: Medication): TimeWindow {
  const timeSlot = (med.timeSlot || 'morning') as TimeSlot;
  const windowLabel = TIME_SLOT_TO_WINDOW[timeSlot] || 'morning';
  const time = med.time || TIME_SLOT_DEFAULTS[timeSlot];

  return {
    id: generateUniqueId(),
    kind: 'exact',
    label: windowLabel,
    at: time,
  };
}

function createCarePlanItemFromMedication(
  med: Medication,
  carePlanId: string
): CarePlanItem {
  const now = new Date().toISOString();
  const timeWindow = createTimeWindowForMedication(med);

  return {
    id: generateUniqueId(),
    carePlanId,
    type: 'medication',
    name: `${med.name} ${med.dosage}`,
    instructions: med.notes || undefined,
    priority: 'required',
    active: med.active !== false,
    schedule: {
      frequency: 'daily',
      times: [timeWindow],
    },
    medicationDetails: {
      medicationId: med.id,
      dose: med.dosage,
      instructions: med.notes || undefined,
    },
    emoji: '💊',
    createdAt: med.createdAt || now,
    updatedAt: now,
  };
}

// ============================================================================
// MIGRATION FUNCTIONS
// ============================================================================

/**
 * Migrate all medications to CarePlanItems
 * This creates a CarePlan if needed and adds all medications as items
 */
export async function migrateMedicationsToCarePlan(): Promise<{
  success: boolean;
  migratedCount: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let migratedCount = 0;

  try {
    // Get all medications
    const medications = await getMedications();
    const activeMeds = medications.filter(m => m.active !== false);

    if (activeMeds.length === 0) {
      return { success: true, migratedCount: 0, errors: [] };
    }

    // Get or create CarePlan
    let carePlan = await getActiveCarePlan(DEFAULT_PATIENT_ID);
    if (!carePlan) {
      carePlan = await createCarePlan(DEFAULT_PATIENT_ID);
    }

    // Get existing CarePlanItems to check for duplicates
    const existingItems = await listCarePlanItems(carePlan.id);
    const existingMedIds = new Set(
      existingItems
        .filter(i => i.type === 'medication' && i.medicationDetails?.medicationId)
        .map(i => i.medicationDetails!.medicationId)
    );

    // Create CarePlanItems for medications that don't have one
    for (const med of activeMeds) {
      try {
        // Skip if already has a CarePlanItem
        if (existingMedIds.has(med.id)) {
          continue;
        }

        const carePlanItem = createCarePlanItemFromMedication(med, carePlan.id);
        await upsertCarePlanItem(carePlanItem);
        migratedCount++;
      } catch (error) {
        const errorMsg = `Failed to migrate medication ${med.name}: ${error}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    // Update migration status
    await setMigrationStatus({
      medicationsToCarePlan: true,
      rhythmToRegimen: false,
      lastMigrationDate: new Date().toISOString(),
      version: 1,
    });

    return {
      success: errors.length === 0,
      migratedCount,
      errors,
    };
  } catch (error) {
    console.error('Error migrating medications:', error);
    return {
      success: false,
      migratedCount,
      errors: [`Migration failed: ${error}`],
    };
  }
}

/**
 * Run all pending migrations
 */
export async function runMigrations(): Promise<{
  success: boolean;
  results: {
    medications: { migratedCount: number; errors: string[] };
  };
}> {
  const detection = await detectMigrationNeeded();

  const results = {
    medications: { migratedCount: 0, errors: [] as string[] },
  };

  if (detection.hasMedicationsToMigrate) {
    const medResult = await migrateMedicationsToCarePlan();
    results.medications = {
      migratedCount: medResult.migratedCount,
      errors: medResult.errors,
    };
  }

  return {
    success: results.medications.errors.length === 0,
    results,
  };
}

/**
 * Check if migration has been completed
 */
export async function isMigrationComplete(): Promise<boolean> {
  const status = await getMigrationStatus();
  return status?.medicationsToCarePlan === true;
}
