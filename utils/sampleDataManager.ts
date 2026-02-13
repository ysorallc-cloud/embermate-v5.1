// ============================================================================
// SAMPLE DATA MANAGER
// Centralized management for sample/demo data isolation and clearing
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { emitDataUpdate } from '../lib/events';
import { devLog, logError } from './devLog';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Origin tag for data records
 * - 'sample': Demo/seeded data created by the app
 * - 'user': Data created by the user
 */
export type DataOrigin = 'sample' | 'user';

/**
 * Interface for entities that support origin tagging
 */
export interface OriginTagged {
  origin?: DataOrigin;
}

/**
 * Result of sample data detection
 */
export interface SampleDataStatus {
  hasSampleData: boolean;
  counts: {
    medications: number;
    vitals: number;
    moodLogs: number;
    appointments: number;
    caregivers: number;
    symptoms: number;
    dailyTracking: number;
    notes: number;
  };
  totalSampleRecords: number;
}

// ============================================================================
// STORAGE KEYS
// ============================================================================

const SAMPLE_DATA_KEYS = {
  // Core data
  medications: '@embermate_medications',
  vitals: '@vitals_readings',
  moodLogs: '@embermate_central_mood_logs',
  appointments: '@embermate_appointments',
  caregivers: '@embermate_caregivers',
  notes: '@embermate_notes',
  symptoms: '@embermate_symptoms',

  // CarePlanConfig
  carePlanConfig: '@embermate_careplan_config_v1:default',

  // Initialization flags
  initialized: '@embermate_sample_data_initialized',
  sampleDataCleared: '@embermate_sample_data_cleared',
  firstCarePlanCreated: '@embermate_first_care_plan_created',

  // Prefixes for date-based keys
  prefixes: {
    symptomLogs: '@symptom_logs_',
    dailyTracking: '@daily_tracking_',
    medicationLogs: '@medication_logs_',
    carePlanInstances: '@embermate_instances_v2:',
    carePlanLogs: '@embermate_logs_v2:',
  },
};

// ============================================================================
// DETECTION
// ============================================================================

/**
 * Check if any sample data exists in storage
 * Looks for records with origin === 'sample' or known sample IDs
 */
export async function detectSampleData(): Promise<SampleDataStatus> {
  const counts = {
    medications: 0,
    vitals: 0,
    moodLogs: 0,
    appointments: 0,
    caregivers: 0,
    symptoms: 0,
    dailyTracking: 0,
    notes: 0,
  };

  try {
    // Check medications
    const medsJson = await AsyncStorage.getItem(SAMPLE_DATA_KEYS.medications);
    if (medsJson) {
      const meds = JSON.parse(medsJson);
      counts.medications = meds.filter((m: OriginTagged & { id?: string }) =>
        m.origin === 'sample' || isSampleId(m, 'med-')
      ).length;
    }

    // Check vitals
    const vitalsJson = await AsyncStorage.getItem(SAMPLE_DATA_KEYS.vitals);
    if (vitalsJson) {
      const vitals = JSON.parse(vitalsJson);
      counts.vitals = vitals.filter((v: OriginTagged & { id?: string }) =>
        v.origin === 'sample' || (v.id && v.id.startsWith('vital-'))
      ).length;
    }

    // Check mood logs
    const moodJson = await AsyncStorage.getItem(SAMPLE_DATA_KEYS.moodLogs);
    if (moodJson) {
      const moods = JSON.parse(moodJson);
      counts.moodLogs = moods.filter((m: OriginTagged & { id?: string }) =>
        m.origin === 'sample' || (m.id && m.id.startsWith('mood-'))
      ).length;
    }

    // Check appointments
    const apptsJson = await AsyncStorage.getItem(SAMPLE_DATA_KEYS.appointments);
    if (apptsJson) {
      const appts = JSON.parse(apptsJson);
      counts.appointments = appts.filter((a: OriginTagged & { id?: string }) =>
        a.origin === 'sample' || (a.id && a.id.startsWith('appt-'))
      ).length;
    }

    // Check caregivers
    const caregiversJson = await AsyncStorage.getItem(SAMPLE_DATA_KEYS.caregivers);
    if (caregiversJson) {
      const caregivers = JSON.parse(caregiversJson);
      counts.caregivers = caregivers.filter((c: OriginTagged & { id?: string }) =>
        c.origin === 'sample' || (c.id && c.id.startsWith('cg-'))
      ).length;
    }

    // Check symptoms
    const symptomsJson = await AsyncStorage.getItem(SAMPLE_DATA_KEYS.symptoms);
    if (symptomsJson) {
      const symptoms = JSON.parse(symptomsJson);
      counts.symptoms = symptoms.filter((s: OriginTagged) =>
        s.origin === 'sample'
      ).length;
    }

    // Check date-based keys
    const allKeys = await AsyncStorage.getAllKeys();

    // Count daily tracking with sample data
    const trackingKeys = allKeys.filter(k => k.startsWith(SAMPLE_DATA_KEYS.prefixes.dailyTracking));
    for (const key of trackingKeys) {
      const data = await AsyncStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.origin === 'sample') {
          counts.dailyTracking++;
        }
      }
    }

    // Check notes
    const notesJson = await AsyncStorage.getItem(SAMPLE_DATA_KEYS.notes);
    if (notesJson) {
      const notes = JSON.parse(notesJson);
      counts.notes = notes.filter((n: OriginTagged) =>
        n.origin === 'sample'
      ).length;
    }

  } catch (error) {
    logError('sampleDataManager.detectSampleData', error);
  }

  const totalSampleRecords = Object.values(counts).reduce((sum, count) => sum + count, 0);

  return {
    hasSampleData: totalSampleRecords > 0,
    counts,
    totalSampleRecords,
  };
}

/**
 * Quick check if sample data exists (faster than full detection)
 */
export async function hasSampleData(): Promise<boolean> {
  try {
    // Check if already cleared
    const cleared = await AsyncStorage.getItem(SAMPLE_DATA_KEYS.sampleDataCleared);
    if (cleared === 'true') {
      return false;
    }

    // Quick check - look for sample medications (by origin tag or legacy ID pattern)
    const medsJson = await AsyncStorage.getItem(SAMPLE_DATA_KEYS.medications);
    if (medsJson) {
      const meds = JSON.parse(medsJson);
      const hasSample = meds.some((m: OriginTagged & { id?: string }) =>
        m.origin === 'sample' || (m.id && m.id.startsWith('med-'))
      );
      if (hasSample) return true;
    }

    return false;
  } catch (error) {
    logError('sampleDataManager.hasSampleData', error);
    return false;
  }
}

// ============================================================================
// CLEARING
// ============================================================================

/**
 * Clear all sample data from storage
 * Preserves all user-created data (origin === 'user' or no origin tag)
 */
export async function clearSampleData(): Promise<{
  success: boolean;
  clearedCount: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let clearedCount = 0;

  try {
    devLog('[SampleDataManager] Starting sample data cleanup...');

    // 1. Clear sample medications (preserve user medications)
    clearedCount += await filterSampleFromArray(SAMPLE_DATA_KEYS.medications, 'med-');

    // 2. Clear sample vitals
    clearedCount += await filterSampleFromArray(SAMPLE_DATA_KEYS.vitals, 'vital-');

    // 3. Clear sample mood logs
    clearedCount += await filterSampleFromArray(SAMPLE_DATA_KEYS.moodLogs, 'mood-');

    // 4. Clear sample appointments
    clearedCount += await filterSampleFromArray(SAMPLE_DATA_KEYS.appointments, 'appt-');

    // 5. Clear sample caregivers
    clearedCount += await filterSampleFromArray(SAMPLE_DATA_KEYS.caregivers, 'cg-');

    // 6. Clear sample symptoms
    clearedCount += await filterSampleFromArray(SAMPLE_DATA_KEYS.symptoms);

    // 7. Clear sample notes
    clearedCount += await filterSampleFromArray(SAMPLE_DATA_KEYS.notes);

    // 8. Clear date-based sample data
    const allKeys = await AsyncStorage.getAllKeys();

    // Clear sample symptom logs
    const symptomLogKeys = allKeys.filter(k => k.startsWith(SAMPLE_DATA_KEYS.prefixes.symptomLogs));
    for (const key of symptomLogKeys) {
      const removed = await filterSampleFromArray(key);
      clearedCount += removed;
    }

    // Clear sample daily tracking
    const trackingKeys = allKeys.filter(k => k.startsWith(SAMPLE_DATA_KEYS.prefixes.dailyTracking));
    for (const key of trackingKeys) {
      try {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          const parsed = JSON.parse(data);
          if (parsed.origin === 'sample') {
            await AsyncStorage.removeItem(key);
            clearedCount++;
          }
        }
      } catch (e) {
        errors.push(`Failed to clear ${key}`);
      }
    }

    // Clear sample medication logs
    const medLogKeys = allKeys.filter(k => k.startsWith(SAMPLE_DATA_KEYS.prefixes.medicationLogs));
    for (const key of medLogKeys) {
      const removed = await filterSampleFromArray(key);
      clearedCount += removed;
    }

    // 9. Clear sample CarePlan items (IDs starting with 'sample-')
    const carePlanItemKeys = allKeys.filter(k => k.startsWith('@embermate_regimen_items_v2:'));
    for (const key of carePlanItemKeys) {
      const removed = await filterSampleFromArray(key, 'sample-');
      clearedCount += removed;
    }

    // 10. Clear sample daily instances (generated from sample CarePlan items)
    const instanceKeys = allKeys.filter(k => k.startsWith(SAMPLE_DATA_KEYS.prefixes.carePlanInstances));
    for (const key of instanceKeys) {
      const removed = await filterSampleFromArray(key, 'sample-');
      clearedCount += removed;
    }

    // 11. Clear sample CarePlanConfig
    await AsyncStorage.removeItem(SAMPLE_DATA_KEYS.carePlanConfig);
    clearedCount++;

    // 12. Clear correlation cache (will be regenerated)
    await AsyncStorage.removeItem('@correlation_cache');

    // 13. Mark sample data as cleared
    await AsyncStorage.setItem(SAMPLE_DATA_KEYS.sampleDataCleared, 'true');

    // 14. Emit global refresh event
    emitDataUpdate('sampleDataCleared');

    devLog(`[SampleDataManager] Cleared ${clearedCount} sample records`);

    return {
      success: true,
      clearedCount,
      errors,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    errors.push(errorMsg);
    logError('sampleDataManager.clearSampleData', error);

    return {
      success: false,
      clearedCount,
      errors,
    };
  }
}

/**
 * Filter sample data from an array stored at the given key
 * Returns the number of items removed
 */
async function filterSampleFromArray(key: string, sampleIdPrefix?: string): Promise<number> {
  try {
    const json = await AsyncStorage.getItem(key);
    if (!json) return 0;

    const items = JSON.parse(json);
    if (!Array.isArray(items)) return 0;

    const originalCount = items.length;

    // Keep items that are NOT sample data
    const filtered = items.filter((item: OriginTagged & { id?: string }) => {
      // If has explicit origin tag, use that
      if (item.origin === 'sample') return false;
      if (item.origin === 'user') return true;

      // Fall back to ID prefix check (for legacy data)
      if (sampleIdPrefix && item.id && item.id.startsWith(sampleIdPrefix)) {
        return false;
      }

      // Keep items without origin tag or sample prefix (assumed user data)
      return true;
    });

    const removedCount = originalCount - filtered.length;

    if (removedCount > 0) {
      if (filtered.length > 0) {
        await AsyncStorage.setItem(key, JSON.stringify(filtered));
      } else {
        await AsyncStorage.removeItem(key);
      }
    }

    return removedCount;
  } catch (error) {
    logError('sampleDataManager.filterSampleFromArray', error);
    return 0;
  }
}

/**
 * Helper to check if an item has a sample ID prefix
 */
function isSampleId(item: { id?: string }, prefix: string): boolean {
  return item.id ? item.id.startsWith(prefix) : false;
}

// ============================================================================
// FIRST CARE PLAN DETECTION
// ============================================================================

/**
 * Check if user has created their first real Care Plan
 */
export async function hasCreatedFirstCarePlan(): Promise<boolean> {
  const created = await AsyncStorage.getItem(SAMPLE_DATA_KEYS.firstCarePlanCreated);
  return created === 'true';
}

/**
 * Mark that user has created their first Care Plan
 */
export async function markFirstCarePlanCreated(): Promise<void> {
  await AsyncStorage.setItem(SAMPLE_DATA_KEYS.firstCarePlanCreated, 'true');
}

/**
 * Check if we should prompt user to clear sample data
 * Returns true if:
 * - Sample data exists
 * - User hasn't cleared it yet
 * - User is creating their first real Care Plan
 */
export async function shouldPromptSampleDataClear(): Promise<boolean> {
  const [hasSample, hasCarePlan, cleared] = await Promise.all([
    hasSampleData(),
    hasCreatedFirstCarePlan(),
    AsyncStorage.getItem(SAMPLE_DATA_KEYS.sampleDataCleared),
  ]);

  // Prompt if sample data exists, hasn't been cleared, and first care plan is being created
  return hasSample && !hasCarePlan && cleared !== 'true';
}

// ============================================================================
// RESET (for testing)
// ============================================================================

/**
 * Reset sample data state (for testing purposes)
 */
export async function resetSampleDataState(): Promise<void> {
  await AsyncStorage.multiRemove([
    SAMPLE_DATA_KEYS.sampleDataCleared,
    SAMPLE_DATA_KEYS.firstCarePlanCreated,
  ]);
}
