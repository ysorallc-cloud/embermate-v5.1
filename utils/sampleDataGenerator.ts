// ============================================================================
// SAMPLE DATA GENERATOR
// Generates realistic sample data for correlation testing and demo purposes
// Use this to populate 14 days of mock data for development
//
// IMPORTANT: All sample data is tagged with origin: 'sample' for isolation
// User-created data should have origin: 'user'
// ============================================================================

import { devLog, logError } from './devLog';
import { saveSymptom } from './symptomStorage';
import { saveDailyTracking } from './dailyTrackingStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Medication } from './medicationStorage';
import { DataOrigin } from './sampleDataManager';
import {
  CarePlan,
  CarePlanItem,
  CarePlanItemType,
  TimeWindowLabel,
  DEFAULT_TIME_WINDOWS,
} from '../types/carePlan';
import { Colors } from '../theme/theme-tokens';
import {
  createCarePlan,
  upsertCarePlanItem,
  getActiveCarePlan,
  logInstanceCompletion,
  DEFAULT_PATIENT_ID,
} from '../storage/carePlanRepo';
import { saveCarePlanConfig } from '../storage/carePlanConfigRepo';
import { createDefaultCarePlanConfig } from '../types/carePlanConfig';
import { ensureDailyInstances, getTodayDateString } from '../services/carePlanGenerator';

const SAMPLE_DATA_INITIALIZED_KEY = '@embermate_sample_data_initialized';

/**
 * Helper to add origin tag to sample data
 */
function withSampleOrigin<T>(data: T): T & { origin: DataOrigin } {
  return { ...data, origin: 'sample' as DataOrigin };
}

// ============================================================================
// SAMPLE CAREGIVERS (Family & Caregivers - NOT doctors)
// ============================================================================

export const getSampleCaregivers = () => {
  const now = new Date();

  return [
    withSampleOrigin({
      id: 'cg-1',
      name: 'Sarah Chen',
      role: 'family',
      relationship: 'Daughter',
      email: 'sarah.chen@email.com',
      phone: '+1 (555) 123-4567',
      permissions: {
        canView: true,
        canEdit: true,
        canMarkMedications: true,
        canScheduleAppointments: true,
        canAddNotes: true,
        canExport: true,
      },
      invitedAt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      joinedAt: new Date(now.getTime() - 59 * 24 * 60 * 60 * 1000).toISOString(),
      avatarColor: Colors.green,
      lastActive: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
    }),
    withSampleOrigin({
      id: 'cg-2',
      name: 'Michael Chen',
      role: 'family',
      relationship: 'Son',
      email: 'mike.chen@email.com',
      phone: '+1 (555) 234-5678',
      permissions: {
        canView: true,
        canEdit: false,
        canMarkMedications: true,
        canScheduleAppointments: false,
        canAddNotes: true,
        canExport: false,
      },
      invitedAt: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString(),
      joinedAt: new Date(now.getTime() - 44 * 24 * 60 * 60 * 1000).toISOString(),
      avatarColor: Colors.blue,
      lastActive: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(),
    }),
  ];
};

// ============================================================================
// SAMPLE ACTIVITIES
// ============================================================================

export const getSampleActivities = () => {
  const now = new Date();

  return [
    withSampleOrigin({
      id: 'act-1',
      type: 'medication_taken',
      performedBy: 'Sarah',
      performedById: 'cg-1',
      timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      details: { medications: ['Lisinopril', 'Metformin'] },
    }),
    withSampleOrigin({
      id: 'act-2',
      type: 'vital_logged',
      performedBy: 'Michael',
      performedById: 'cg-2',
      timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
      details: { vitalType: 'blood pressure', value: '128/82' },
    }),
    withSampleOrigin({
      id: 'act-3',
      type: 'note_added',
      performedBy: 'Michael',
      performedById: 'cg-2',
      timestamp: new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString(),
      details: { action: 'added note about appetite' },
    }),
  ];
};

// ============================================================================
// SAMPLE MEDICATIONS
// ============================================================================

export const getSampleMedications = (): (Medication & { origin: DataOrigin })[] => {
  const now = new Date();
  return [
    withSampleOrigin({
      id: 'med-1',
      name: 'Lisinopril',
      dosage: '10mg',
      time: '8:00 AM',
      timeSlot: 'morning' as const,
      taken: true,
      active: true,
      createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      lastTaken: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      pillsRemaining: 24,
      daysSupply: 30,
      notes: 'Blood pressure medication',
    }),
    withSampleOrigin({
      id: 'med-2',
      name: 'Metformin',
      dosage: '500mg',
      time: '8:00 AM',
      timeSlot: 'morning' as const,
      taken: true,
      active: true,
      createdAt: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString(),
      lastTaken: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      pillsRemaining: 18,
      daysSupply: 30,
      notes: 'Take with breakfast',
    }),
    withSampleOrigin({
      id: 'med-3',
      name: 'Atorvastatin',
      dosage: '20mg',
      time: '9:00 PM',
      timeSlot: 'evening' as const,
      taken: false,
      active: true,
      createdAt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      pillsRemaining: 22,
      daysSupply: 30,
      notes: 'Cholesterol medication',
    }),
  ];
};

// ============================================================================
// SAMPLE VITALS (Last 30 days)
// ============================================================================

export const getSampleVitals = () => {
  const vitals = [];
  const now = new Date();

  for (let i = 0; i < 14; i++) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString();

    // Systolic BP (trending slightly down - good progress)
    vitals.push(withSampleOrigin({
      id: `vital-sys-${i}`,
      type: 'systolic',
      value: 135 - Math.floor(i * 0.3) + Math.floor(Math.random() * 8 - 4),
      timestamp: dateStr,
      unit: 'mmHg',
    }));

    // Diastolic BP
    vitals.push(withSampleOrigin({
      id: `vital-dia-${i}`,
      type: 'diastolic',
      value: 85 - Math.floor(i * 0.15) + Math.floor(Math.random() * 5 - 2),
      timestamp: dateStr,
      unit: 'mmHg',
    }));

    // Heart rate
    vitals.push(withSampleOrigin({
      id: `vital-hr-${i}`,
      type: 'heartRate',
      value: 72 + Math.floor(Math.random() * 12 - 6),
      timestamp: dateStr,
      unit: 'bpm',
    }));

    // Weight (stable with slight fluctuation)
    if (i % 3 === 0) {
      vitals.push(withSampleOrigin({
        id: `vital-wt-${i}`,
        type: 'weight',
        value: 165 + Math.floor(Math.random() * 4 - 2),
        timestamp: dateStr,
        unit: 'lbs',
      }));
    }

    // Glucose (every other day)
    if (i % 2 === 0) {
      vitals.push(withSampleOrigin({
        id: `vital-glu-${i}`,
        type: 'glucose',
        value: 110 + Math.floor(Math.random() * 25 - 10),
        timestamp: dateStr,
        unit: 'mg/dL',
      }));
    }
  }

  return vitals;
};

// ============================================================================
// SAMPLE MOOD/WELLNESS DATA (Last 30 days)
// ============================================================================

export const getSampleMoodLogs = () => {
  const logs = [];
  const now = new Date();

  for (let i = 0; i < 14; i++) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];

    // Mood trending slightly up
    const baseMood = 3 + Math.floor(i / 7);
    const mood = Math.min(5, Math.max(1, baseMood + Math.floor(Math.random() * 2 - 0.5)));

    logs.push(withSampleOrigin({
      id: `mood-${i}`,
      date: dateStr,
      timestamp: date.toISOString(),
      mood: mood,
      energy: Math.min(5, Math.max(1, mood + Math.floor(Math.random() * 2 - 1))),
      pain: Math.max(0, 3 - Math.floor(Math.random() * 3)),
    }));
  }

  return logs;
};

// ============================================================================
// SAMPLE APPOINTMENTS
// ============================================================================

export const getSampleAppointments = () => {
  const now = new Date();

  return [
    withSampleOrigin({
      id: 'appt-1',
      date: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      time: '10:30 AM',
      provider: 'Dr. Martinez',
      specialty: 'Cardiology',
      location: 'Heart Care Center',
      notes: 'Follow-up on blood pressure. Bring medication list.',
      confirmed: true,
    }),
    withSampleOrigin({
      id: 'appt-2',
      date: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      time: '2:00 PM',
      provider: 'Dr. Thompson',
      specialty: 'Primary Care',
      location: 'Family Medical Clinic',
      notes: 'Annual checkup',
      confirmed: false,
    }),
  ];
};

// ============================================================================
// SAMPLE CARE PLAN ITEMS (Mood, Meals, Vitals)
// ============================================================================

/**
 * Create sample CarePlanItems for mood, meals, and vitals tracking
 * This populates the Care Plan Progress rings on the Now page
 */
export async function createSampleCarePlanItems(): Promise<void> {
  try {
    // Check if there's already an active CarePlan
    let carePlan = await getActiveCarePlan(DEFAULT_PATIENT_ID);

    if (!carePlan) {
      // Create a new CarePlan
      carePlan = await createCarePlan(DEFAULT_PATIENT_ID);
    }

    const now = new Date().toISOString();
    const carePlanId = carePlan.id;

    // Define sample care plan items
    const sampleItems: CarePlanItem[] = [
      // Morning Wellness Check
      {
        id: 'sample-wellness-morning',
        carePlanId,
        type: 'wellness',
        name: 'Morning wellness check',
        instructions: 'How are you feeling this morning?',
        priority: 'recommended',
        active: true,
        emoji: '🌅',
        schedule: {
          frequency: 'daily',
          times: [{
            id: 'wellness-morning-window',
            kind: 'window',
            label: 'morning' as TimeWindowLabel,
            start: DEFAULT_TIME_WINDOWS.morning.start,
            end: DEFAULT_TIME_WINDOWS.morning.end,
          }],
        },
        createdAt: now,
        updatedAt: now,
      },
      // Lisinopril 10mg (morning)
      {
        id: 'sample-med-lisinopril',
        carePlanId,
        type: 'medication',
        name: 'Lisinopril 10mg',
        instructions: 'Blood pressure medication',
        priority: 'required',
        active: true,
        emoji: '💊',
        schedule: {
          frequency: 'daily',
          times: [{
            id: 'med-lisinopril-window',
            kind: 'window',
            label: 'morning' as TimeWindowLabel,
            start: DEFAULT_TIME_WINDOWS.morning.start,
            end: DEFAULT_TIME_WINDOWS.morning.end,
          }],
        },
        createdAt: now,
        updatedAt: now,
      },
      // Metformin 500mg (morning)
      {
        id: 'sample-med-metformin',
        carePlanId,
        type: 'medication',
        name: 'Metformin 500mg',
        instructions: 'Take with breakfast',
        priority: 'required',
        active: true,
        emoji: '💊',
        schedule: {
          frequency: 'daily',
          times: [{
            id: 'med-metformin-window',
            kind: 'window',
            label: 'morning' as TimeWindowLabel,
            start: DEFAULT_TIME_WINDOWS.morning.start,
            end: DEFAULT_TIME_WINDOWS.morning.end,
          }],
        },
        createdAt: now,
        updatedAt: now,
      },
      // Breakfast
      {
        id: 'sample-meal-breakfast',
        carePlanId,
        type: 'nutrition',
        name: 'Breakfast',
        instructions: 'Log breakfast meal',
        priority: 'recommended',
        active: true,
        emoji: '🍳',
        nutritionDetails: { mealType: 'breakfast' },
        schedule: {
          frequency: 'daily',
          times: [{
            id: 'meal-breakfast-window',
            kind: 'window',
            label: 'morning' as TimeWindowLabel,
            start: DEFAULT_TIME_WINDOWS.morning.start,
            end: DEFAULT_TIME_WINDOWS.morning.end,
          }],
        },
        createdAt: now,
        updatedAt: now,
      },
      // Morning Vitals
      {
        id: 'sample-vitals-morning',
        carePlanId,
        type: 'vitals',
        name: 'Morning vitals',
        instructions: 'Check blood pressure and glucose',
        priority: 'recommended',
        active: true,
        emoji: '📊',
        vitalsDetails: { vitalTypes: ['bp', 'glucose', 'heartRate'] },
        schedule: {
          frequency: 'daily',
          times: [{
            id: 'vitals-morning-window',
            kind: 'window',
            label: 'morning' as TimeWindowLabel,
            start: DEFAULT_TIME_WINDOWS.morning.start,
            end: DEFAULT_TIME_WINDOWS.morning.end,
          }],
        },
        createdAt: now,
        updatedAt: now,
      },
    ];

    // Save each item
    for (const item of sampleItems) {
      await upsertCarePlanItem(item);
    }

    devLog('[SampleDataGenerator] Created sample CarePlanItems:', sampleItems.length);
  } catch (error) {
    logError('sampleDataGenerator.createSampleCarePlanItems', error);
  }
}

// ============================================================================
// INITIALIZE ALL SAMPLE DATA
// ============================================================================

export const initializeSampleData = async (): Promise<boolean> => {
  try {
    // Check if already initialized
    const initialized = await AsyncStorage.getItem(SAMPLE_DATA_INITIALIZED_KEY);
    if (initialized === 'true') {
      return false;
    }

    // Save medications
    await AsyncStorage.setItem('@embermate_medications', JSON.stringify(getSampleMedications()));

    // Save vitals
    await AsyncStorage.setItem('@vitals_readings', JSON.stringify(getSampleVitals()));

    // Save mood logs
    await AsyncStorage.setItem('@embermate_central_mood_logs', JSON.stringify(getSampleMoodLogs()));

    // Save appointments
    await AsyncStorage.setItem('@embermate_appointments', JSON.stringify(getSampleAppointments()));

    // Save caregivers
    await AsyncStorage.setItem('@embermate_caregivers', JSON.stringify(getSampleCaregivers()));

    // Create sample Care Plan items (wellness, meds, meals, vitals)
    await createSampleCarePlanItems();

    // Create sample CarePlanConfig with key buckets enabled
    const config = createDefaultCarePlanConfig(DEFAULT_PATIENT_ID);
    config.meds = { ...config.meds, enabled: true };
    config.vitals = { ...config.vitals, enabled: true };
    config.meals = { ...config.meals, enabled: true };
    // wellness is already enabled by default in createDefaultCarePlanConfig
    await saveCarePlanConfig(config);

    // Pre-complete morning instances for a realistic mid-day demo look
    try {
      const today = getTodayDateString();
      const instances = await ensureDailyInstances(DEFAULT_PATIENT_ID, today);

      for (const inst of instances) {
        if (inst.windowLabel === 'morning' && inst.status === 'pending') {
          await logInstanceCompletion(DEFAULT_PATIENT_ID, today, inst.id, 'completed');
        }
      }

      if (__DEV__) {
        const morningCount = instances.filter(i => i.windowLabel === 'morning').length;
        devLog(`[SampleDataGenerator] Pre-completed ${morningCount} morning instances`);
      }
    } catch (error) {
      logError('sampleDataGenerator.initializeSampleData', error);
    }

    // Mark as initialized
    await AsyncStorage.setItem(SAMPLE_DATA_INITIALIZED_KEY, 'true');

    return true;
  } catch (error) {
    logError('sampleDataGenerator.initializeSampleData', error);
    return false;
  }
};

// Reset sample data (for testing)
export const resetSampleData = async (): Promise<void> => {
  await AsyncStorage.removeItem(SAMPLE_DATA_INITIALIZED_KEY);
  await initializeSampleData();
};

/**
 * Generate sample correlation data for testing
 * Creates 30 days of synthetic data with intentional patterns:
 * - Pain correlates negatively with hydration (-0.6 coefficient)
 * - Mood correlates positively with sleep (+0.7 coefficient)
 * - Fatigue correlates negatively with medication adherence (-0.5 coefficient)
 *
 * All generated data is tagged with origin: 'sample' for isolation
 */
export async function generateSampleCorrelationData(): Promise<void> {
  devLog('Generating 14 days of sample correlation data...');

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 14);

  // Batch all data first, then save in bulk to reduce memory pressure
  const symptomBatch: Array<{ symptom: string; severity: number; timestamp: string; date: string; origin: DataOrigin }> = [];
  const dailyTrackingBatch: Array<{ date: string; data: { hydration: number; mood: number; sleep: number; origin: DataOrigin } }> = [];
  const medLogBatch: Array<[string, string]> = [];

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];

    // Generate correlated data with some noise
    const hydration = 4 + Math.random() * 6; // 4-10 cups
    const sleep = 5 + Math.random() * 4; // 5-9 hours
    const medicationAdherence = 60 + Math.random() * 40; // 60-100%

    // Pain negatively correlates with hydration (-0.6)
    const pain = Math.max(0, Math.min(10, 8 - (hydration * 0.6) + (Math.random() * 3)));

    // Mood positively correlates with sleep (+0.7)
    const mood = Math.max(0, Math.min(10, (sleep * 0.9) - 2 + (Math.random() * 2)));

    // Fatigue negatively correlates with medication adherence (-0.5)
    const fatigue = Math.max(0, Math.min(10, 8 - (medicationAdherence * 0.05) + (Math.random() * 2)));

    // Nausea has mild negative correlation with hydration
    const nausea = Math.max(0, Math.min(10, 5 - (hydration * 0.3) + (Math.random() * 3)));

    // Dizziness has weak correlation
    const dizziness = Math.random() * 4; // 0-4 (generally low)

    // Queue symptom logs (one entry per symptom) - tagged with origin
    const timestamp = new Date(dateStr).toISOString();
    if (pain > 2) symptomBatch.push({ symptom: 'Pain', severity: Math.round(pain), timestamp, date: dateStr, origin: 'sample' });
    if (fatigue > 2) symptomBatch.push({ symptom: 'Fatigue', severity: Math.round(fatigue), timestamp, date: dateStr, origin: 'sample' });
    if (nausea > 2) symptomBatch.push({ symptom: 'Nausea', severity: Math.round(nausea), timestamp, date: dateStr, origin: 'sample' });
    if (dizziness > 2) symptomBatch.push({ symptom: 'Dizziness', severity: Math.round(dizziness), timestamp, date: dateStr, origin: 'sample' });

    // Queue daily tracking - tagged with origin
    dailyTrackingBatch.push({
      date: dateStr,
      data: {
        hydration: Math.round(hydration * 10) / 10,
        mood: Math.round(mood * 10) / 10,
        sleep: Math.round(sleep * 10) / 10,
        origin: 'sample',
      },
    });

    // Queue medication logs for adherence calculation - tagged with origin
    const medLogKey = `@medication_logs_${dateStr}`;
    const numMeds = 7;
    const takenCount = Math.round((medicationAdherence / 100) * numMeds);
    const dayTime = new Date(d);
    const medLogs = Array.from({ length: numMeds }, (_, i) => ({
      id: `med-${i}`,
      medicationId: `medication-${i}`,
      date: dateStr,
      timestamp: new Date(dayTime.setHours(8 + i, 0, 0, 0)).toISOString(),
      taken: i < takenCount,
      notes: null,
      origin: 'sample' as DataOrigin,
    }));
    medLogBatch.push([medLogKey, JSON.stringify(medLogs)]);
  }

  // Save all data in batches to reduce memory pressure
  // Save symptoms sequentially (storage util handles array management)
  for (const symptom of symptomBatch) {
    await saveSymptom(symptom);
  }

  // Save daily tracking sequentially
  for (const { date, data } of dailyTrackingBatch) {
    await saveDailyTracking(date, data);
  }

  // Save medication logs in bulk using multiSet
  await AsyncStorage.multiSet(medLogBatch);

  devLog('Sample data generation complete!');
  devLog('Expected correlations:');
  devLog('  - Pain & Hydration: ~-0.6 (negative)');
  devLog('  - Mood & Sleep: ~+0.7 (positive)');
  devLog('  - Fatigue & Med Adherence: ~-0.5 (negative)');
}

/**
 * Clear all sample correlation data
 */
export async function clearSampleCorrelationData(): Promise<void> {
  devLog('Clearing sample correlation data...');

  const allKeys = await AsyncStorage.getAllKeys();
  const keysToRemove = allKeys.filter(key =>
    key.startsWith('@symptom_logs_') ||
    key.startsWith('@daily_tracking_') ||
    key.startsWith('@medication_logs_') ||
    key === '@correlation_cache'
  );

  await AsyncStorage.multiRemove(keysToRemove);
  devLog(`Cleared ${keysToRemove.length} keys`);
}

/**
 * Check if sample data exists
 */
export async function hasSampleData(): Promise<boolean> {
  const allKeys = await AsyncStorage.getAllKeys();
  const symptomKeys = allKeys.filter(key => key.startsWith('@symptom_logs_'));
  return symptomKeys.length >= 7;
}

// Export alias for backwards compatibility
export { generateSampleCorrelationData as generateSampleData };
