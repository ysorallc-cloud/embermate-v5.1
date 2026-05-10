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
import { saveNotesLog } from './centralStorage';
import { saveDailyTracking } from './dailyTrackingStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeGetItem, safeSetItem, encryptedSetRaw } from './safeStorage';
import { scopedKey } from './storageKeys';
import { Medication } from './medicationStorage';
import { DataOrigin } from './sampleDataManager';
import { StorageKeys } from './storageKeys';
import {
  CarePlan,
  CarePlanItem,
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
import { emitDataUpdate } from '../lib/events';
import { EVENT } from '../lib/eventNames';
import { createDefaultCarePlanConfig } from '../types/carePlanConfig';
import { ensureDailyInstances, getTodayDateString } from '../services/carePlanGenerator';
import { decideHistoricalSeedStatus, historicalSeedDataPayload } from './sampleDataHistoricalSeedShape';

const SAMPLE_DATA_INITIALIZED_KEY = StorageKeys.SAMPLE_DATA_INITIALIZED;

// ============================================================================
// PHASE 11.7.2 — SAMPLE-SEED SHAPE VERSION
// ============================================================================
//
// Monotonically incrementing integer that represents the shape of the
// sample-data seed produced by initializeSampleData() +
// generateSampleCorrelationData(). Bumped in code whenever the seed
// shape changes — for example:
//
//   v1 — Phase 11.7.2 baseline (post-11.6 medication-instance seed,
//        post-11.5.3 correlation-engine inputs).
//   v2 — Phase 11.7.3a (LogEntryData payloads on sleep / hydration /
//        wellness historical completions so the Insights aggregator
//        can decode avgSleepHours / avgHydrationPerDay).
//
// On app open, migrateSampleSeedShape() compares the persisted version
// against this constant. When stored < current, it clears
// SAMPLE_DATA_INITIALIZED + SAMPLE_CORRELATION_GENERATED so the next
// sample-data init runs from scratch under current logic. Existing
// testers who pulled the new build automatically re-seed without a
// manual reset.
//
// First-launch default is 0 (missing key), so the migration fires once
// when this commit ships, refreshing already-seeded testers under
// 11.6's medication-instance shape.
//
export const SAMPLE_SEED_SHAPE_VERSION = 2;

export interface SampleSeedShapeMigrationResult {
  migrated: boolean;
  fromVersion: number;
  toVersion: number;
}

/**
 * If the persisted seed-shape version is older than the current code
 * version, clear the init flags so the next initializeSampleData() and
 * generateSampleCorrelationData() calls run again under current logic.
 * Returns a result object for telemetry / debugging.
 *
 * Wired into appStartup BEFORE the sampleData phase so the cleared
 * flags are honoured on the same launch.
 */
export async function migrateSampleSeedShape(): Promise<SampleSeedShapeMigrationResult> {
  try {
    const stored = await safeGetItem<number>(
      StorageKeys.SAMPLE_SEED_SHAPE_VERSION,
      0,
    );
    if (stored >= SAMPLE_SEED_SHAPE_VERSION) {
      return {
        migrated: false,
        fromVersion: stored,
        toVersion: SAMPLE_SEED_SHAPE_VERSION,
      };
    }
    // Clear both seed-init flags so the next initializeSampleData() and
    // generateSampleCorrelationData() runs from scratch.
    await AsyncStorage.removeItem(SAMPLE_DATA_INITIALIZED_KEY);
    await AsyncStorage.removeItem(StorageKeys.SAMPLE_CORRELATION_GENERATED);
    // Persist the new version so subsequent launches don't re-migrate.
    await safeSetItem(
      StorageKeys.SAMPLE_SEED_SHAPE_VERSION,
      SAMPLE_SEED_SHAPE_VERSION,
    );
    devLog(
      `[migrateSampleSeedShape] Seed shape ${stored} → ${SAMPLE_SEED_SHAPE_VERSION}, init flags cleared`,
    );
    return {
      migrated: true,
      fromVersion: stored,
      toVersion: SAMPLE_SEED_SHAPE_VERSION,
    };
  } catch (error) {
    logError('sampleDataGenerator.migrateSampleSeedShape', error);
    return {
      migrated: false,
      fromVersion: -1,
      toVersion: SAMPLE_SEED_SHAPE_VERSION,
    };
  }
}

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
      name: 'Maria',
      role: 'family',
      relationship: 'Spouse',
      email: 'maria.sample@email.com',
      phone: '+1 (555) 111-2222',
      permissions: {
        canView: true,
        canEdit: true,
        canMarkMedications: true,
        canScheduleAppointments: true,
        canAddNotes: true,
        canExport: true,
      },
      invitedAt: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      joinedAt: new Date(now.getTime() - 89 * 24 * 60 * 60 * 1000).toISOString(),
      avatarColor: Colors.green,
      lastActive: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
    }),
    withSampleOrigin({
      id: 'cg-2',
      name: 'James',
      role: 'family',
      relationship: 'Son',
      email: 'james.sample@email.com',
      phone: '+1 (555) 333-4444',
      permissions: {
        canView: true,
        canEdit: false,
        canMarkMedications: false,
        canScheduleAppointments: false,
        canAddNotes: false,
        canExport: false,
      },
      invitedAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      joinedAt: new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000).toISOString(),
      avatarColor: Colors.blue,
      lastActive: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
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
      performedBy: 'Maria',
      performedById: 'cg-1',
      timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      details: { medications: ['Aspirin', 'Metformin', 'Lisinopril'] },
    }),
    withSampleOrigin({
      id: 'act-2',
      type: 'vital_logged',
      performedBy: 'James',
      performedById: 'cg-2',
      timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
      details: { vitalType: 'blood pressure', value: '132/82' },
    }),
    withSampleOrigin({
      id: 'act-3',
      type: 'note_added',
      performedBy: 'Maria',
      performedById: 'cg-1',
      timestamp: new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString(),
      details: { action: 'added note about evening medication confusion' },
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
      name: 'Warfarin',
      dosage: '5mg',
      time: '7:00 PM',
      timeSlot: 'evening' as const,
      taken: false,
      active: true,
      createdAt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      pillsRemaining: 20,
      daysSupply: 30,
      notes: 'Blood thinner — INR check weekly',
    }),
    withSampleOrigin({
      id: 'med-2',
      name: 'Aspirin',
      dosage: '81mg',
      time: '8:00 AM',
      timeSlot: 'morning' as const,
      taken: true,
      active: true,
      createdAt: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString(),
      lastTaken: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
      pillsRemaining: 55,
      daysSupply: 90,
      notes: 'Low-dose, take with breakfast',
    }),
    withSampleOrigin({
      id: 'med-3',
      name: 'Metformin',
      dosage: '1000mg',
      time: '8:00 AM',
      timeSlot: 'morning' as const,
      taken: true,
      active: true,
      createdAt: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      lastTaken: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
      pillsRemaining: 28,
      daysSupply: 30,
      notes: 'Take with food — diabetes management',
    }),
    withSampleOrigin({
      id: 'med-4',
      name: 'Lisinopril',
      dosage: '20mg',
      time: '8:00 AM',
      timeSlot: 'morning' as const,
      taken: true,
      active: true,
      createdAt: new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000).toISOString(),
      lastTaken: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
      pillsRemaining: 15,
      daysSupply: 30,
      notes: 'Blood pressure medication',
    }),
    withSampleOrigin({
      id: 'med-5',
      name: 'Gabapentin',
      dosage: '300mg',
      time: '9:00 PM',
      timeSlot: 'evening' as const,
      taken: false,
      active: true,
      createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      pillsRemaining: 25,
      daysSupply: 30,
      notes: 'Nerve pain — take at bedtime',
    }),
    withSampleOrigin({
      id: 'med-6',
      name: 'Lorazepam',
      dosage: '0.5mg',
      time: 'As needed',
      timeSlot: 'bedtime' as const,
      taken: false,
      active: true,
      createdAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      pillsRemaining: 4,
      daysSupply: 30,
      notes: 'Anxiety PRN — max 2x per day. LOW SUPPLY.',
    }),
  ];
};

// ============================================================================
// SAMPLE VITALS (Last 30 days)
// ============================================================================

export const getSampleVitals = () => {
  const now = new Date();

  const day1 = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const day2 = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
  const day3 = now;

  return [
    // Day 1 — critical glucose, elevated BP, low SpO2
    withSampleOrigin({ id: 'sv-d1-sys', type: 'systolic', value: 158, unit: 'mmHg', timestamp: day1.toISOString() }),
    withSampleOrigin({ id: 'sv-d1-dia', type: 'diastolic', value: 95, unit: 'mmHg', timestamp: day1.toISOString() }),
    withSampleOrigin({ id: 'sv-d1-hr', type: 'heartRate', value: 105, unit: 'bpm', timestamp: day1.toISOString() }),
    withSampleOrigin({ id: 'sv-d1-glu', type: 'glucose', value: 260, unit: 'mg/dL', timestamp: day1.toISOString() }),
    withSampleOrigin({ id: 'sv-d1-o2', type: 'oxygen', value: 93, unit: '%', timestamp: day1.toISOString() }),
    withSampleOrigin({ id: 'sv-d1-temp', type: 'temperature', value: 100.2, unit: '°F', timestamp: day1.toISOString() }),
    withSampleOrigin({ id: 'sv-d1-wt', type: 'weight', value: 195, unit: 'lbs', timestamp: day1.toISOString() }),

    // Day 2 — improving but still flagged
    withSampleOrigin({ id: 'sv-d2-sys', type: 'systolic', value: 145, unit: 'mmHg', timestamp: day2.toISOString() }),
    withSampleOrigin({ id: 'sv-d2-dia', type: 'diastolic', value: 88, unit: 'mmHg', timestamp: day2.toISOString() }),
    withSampleOrigin({ id: 'sv-d2-hr', type: 'heartRate', value: 90, unit: 'bpm', timestamp: day2.toISOString() }),
    withSampleOrigin({ id: 'sv-d2-glu', type: 'glucose', value: 180, unit: 'mg/dL', timestamp: day2.toISOString() }),
    withSampleOrigin({ id: 'sv-d2-o2', type: 'oxygen', value: 94, unit: '%', timestamp: day2.toISOString() }),
    withSampleOrigin({ id: 'sv-d2-temp', type: 'temperature', value: 99.8, unit: '°F', timestamp: day2.toISOString() }),
    withSampleOrigin({ id: 'sv-d2-wt', type: 'weight', value: 195, unit: 'lbs', timestamp: day2.toISOString() }),

    // Day 3 (today) — mostly normal
    withSampleOrigin({ id: 'sv-d3-sys', type: 'systolic', value: 132, unit: 'mmHg', timestamp: day3.toISOString() }),
    withSampleOrigin({ id: 'sv-d3-dia', type: 'diastolic', value: 82, unit: 'mmHg', timestamp: day3.toISOString() }),
    withSampleOrigin({ id: 'sv-d3-hr', type: 'heartRate', value: 76, unit: 'bpm', timestamp: day3.toISOString() }),
    withSampleOrigin({ id: 'sv-d3-glu', type: 'glucose', value: 135, unit: 'mg/dL', timestamp: day3.toISOString() }),
    withSampleOrigin({ id: 'sv-d3-o2', type: 'oxygen', value: 97, unit: '%', timestamp: day3.toISOString() }),
    withSampleOrigin({ id: 'sv-d3-temp', type: 'temperature', value: 98.6, unit: '°F', timestamp: day3.toISOString() }),
    withSampleOrigin({ id: 'sv-d3-wt', type: 'weight', value: 194, unit: 'lbs', timestamp: day3.toISOString() }),
  ];
};

/**
 * Get sample vitals as centralStorage VitalsLog entries (one per day).
 * This is what the Journal/Calendar/Baselines read from.
 */
export const getSampleVitalsLogs = () => {
  const now = new Date();
  const day1 = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const day2 = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
  const day3 = now;

  return [
    withSampleOrigin({ id: 'svl-d1', timestamp: day1.toISOString(), systolic: 158, diastolic: 95, heartRate: 105, glucose: 260, oxygen: 93, temperature: 100.2, weight: 195 }),
    withSampleOrigin({ id: 'svl-d2', timestamp: day2.toISOString(), systolic: 145, diastolic: 88, heartRate: 90, glucose: 180, oxygen: 94, temperature: 99.8, weight: 195 }),
    withSampleOrigin({ id: 'svl-d3', timestamp: day3.toISOString(), systolic: 132, diastolic: 82, heartRate: 76, glucose: 135, oxygen: 97, temperature: 98.6, weight: 194 }),
  ];
};

// ============================================================================
// SAMPLE MOOD/WELLNESS DATA (Last 30 days)
// ============================================================================

export const getSampleMoodLogs = () => {
  const now = new Date();
  const day1 = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const day2 = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
  const day3 = now;

  return [
    withSampleOrigin({ mood: 'tired', note: 'Rough night, knee pain woke him up twice', timestamp: new Date(day1.setHours(7, 30)).toISOString() }),
    withSampleOrigin({ mood: 'okay', note: 'Better after morning meds kicked in', timestamp: new Date(day1.setHours(14, 0)).toISOString() }),
    withSampleOrigin({ mood: 'anxious', note: 'Worried about upcoming lab results', timestamp: new Date(day2.setHours(9, 0)).toISOString() }),
    withSampleOrigin({ mood: 'calm', note: 'Good visit with James, seemed relaxed after', timestamp: new Date(day2.setHours(17, 0)).toISOString() }),
    withSampleOrigin({ mood: 'anxious', note: 'Pre-appointment nerves, Dr. Kim today at 2:30', timestamp: new Date(day3.setHours(10, 0)).toISOString() }),
  ];
};

// ============================================================================
// SAMPLE APPOINTMENTS
// ============================================================================

export const getSampleAppointments = () => {
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  return [
    withSampleOrigin({
      id: 'appt-1',
      date: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      time: '10:00 AM',
      provider: 'Dr. Patel',
      specialty: 'Cardiology',
      location: 'Heart & Vascular Center',
      notes: 'INR was 2.4, within range. Continue Warfarin 5mg. Recheck in 4 weeks.',
      confirmed: true,
    }),
    withSampleOrigin({
      id: 'appt-2',
      date: today,
      time: '2:30 PM',
      provider: 'Dr. Kim',
      specialty: 'Endocrinology',
      location: 'Diabetes & Metabolism Clinic',
      notes: 'Bring glucose log. Discuss A1C results.',
      confirmed: true,
    }),
    withSampleOrigin({
      id: 'appt-3',
      date: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      time: '9:00 AM',
      provider: 'Dr. Torres',
      specialty: 'Primary Care',
      location: 'Family Medical Clinic',
      notes: 'Annual physical',
      confirmed: false,
    }),
    withSampleOrigin({
      id: 'appt-4',
      date: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      time: '3:00 PM',
      provider: 'Dr. Singh',
      specialty: 'Orthopedics',
      location: 'Joint & Spine Center',
      notes: 'Knee follow-up — bring X-ray CD',
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
    // Only create medication samples here — meals, wellness, and vitals
    // are auto-created by syncOtherBucketsWithConfig() to avoid duplicates
    const sampleItems: CarePlanItem[] = [
      // Aspirin 81mg (morning)
      {
        id: 'sample-med-aspirin',
        carePlanId,
        type: 'medication',
        name: 'Aspirin 81mg',
        instructions: 'Low-dose, take with breakfast',
        priority: 'required',
        active: true,
        emoji: '💊',
        medicationDetails: { medicationId: 'med-2', dose: '81mg', instructions: 'Low-dose, take with breakfast' },
        schedule: {
          frequency: 'daily',
          times: [{
            id: 'med-aspirin-window',
            kind: 'window',
            label: 'morning' as TimeWindowLabel,
            start: DEFAULT_TIME_WINDOWS.morning.start,
            end: DEFAULT_TIME_WINDOWS.morning.end,
          }],
        },
        createdAt: now,
        updatedAt: now,
      },
      // Metformin 1000mg (morning)
      {
        id: 'sample-med-metformin',
        carePlanId,
        type: 'medication',
        name: 'Metformin 1000mg',
        instructions: 'Take with food — diabetes management',
        priority: 'required',
        active: true,
        emoji: '💊',
        medicationDetails: { medicationId: 'med-3', dose: '1000mg', instructions: 'Take with food — diabetes management' },
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
      // Lisinopril 20mg (morning)
      {
        id: 'sample-med-lisinopril',
        carePlanId,
        type: 'medication',
        name: 'Lisinopril 20mg',
        instructions: 'Blood pressure medication',
        priority: 'required',
        active: true,
        emoji: '💊',
        medicationDetails: { medicationId: 'med-4', dose: '20mg', instructions: 'Blood pressure medication' },
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
      // Warfarin 5mg (evening)
      {
        id: 'sample-med-warfarin',
        carePlanId,
        type: 'medication',
        name: 'Warfarin 5mg',
        instructions: 'Blood thinner — INR check weekly',
        priority: 'required',
        active: true,
        emoji: '💊',
        medicationDetails: { medicationId: 'med-1', dose: '5mg', instructions: 'Blood thinner — INR check weekly' },
        schedule: {
          frequency: 'daily',
          times: [{
            id: 'med-warfarin-window',
            kind: 'window',
            label: 'evening' as TimeWindowLabel,
            start: DEFAULT_TIME_WINDOWS.evening.start,
            end: DEFAULT_TIME_WINDOWS.evening.end,
          }],
        },
        createdAt: now,
        updatedAt: now,
      },
      // Gabapentin 300mg (evening)
      {
        id: 'sample-med-gabapentin',
        carePlanId,
        type: 'medication',
        name: 'Gabapentin 300mg',
        instructions: 'Nerve pain — take at bedtime',
        priority: 'required',
        active: true,
        emoji: '💊',
        medicationDetails: { medicationId: 'med-5', dose: '300mg', instructions: 'Nerve pain — take at bedtime' },
        schedule: {
          frequency: 'daily',
          times: [{
            id: 'med-gabapentin-window',
            kind: 'window',
            label: 'evening' as TimeWindowLabel,
            start: DEFAULT_TIME_WINDOWS.evening.start,
            end: DEFAULT_TIME_WINDOWS.evening.end,
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
// SAMPLE MEDICATION LOGS (14 days of adherence history)
// ============================================================================

/**
 * Seed 14 days of medication logs for sample meds (Lisinopril, Metformin, Atorvastatin).
 * Writes to the same scopedKey(CENTRAL_MED_LOGS) that getMedicationLogs() reads from,
 * so Visit Prep adherence calculations work correctly (~85-93%).
 */
async function seedSampleMedicationLogs(): Promise<void> {
  const meds = [
    { id: 'med-1', name: 'Warfarin', evening: true },
    { id: 'med-2', name: 'Aspirin' },
    { id: 'med-3', name: 'Metformin' },
    { id: 'med-4', name: 'Lisinopril' },
    { id: 'med-5', name: 'Gabapentin', evening: true },
  ];

  const logs: Array<{
    id: string;
    timestamp: string;
    medicationIds: string[];
    origin: DataOrigin;
  }> = [];

  const now = new Date();

  for (let day = 0; day < 14; day++) {
    const date = new Date(now.getTime() - day * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];

    for (const med of meds) {
      // ~90% adherence: skip roughly 1 in 10
      const taken = Math.random() > 0.1;
      if (!taken) continue;

      const hour = (med as any).evening ? 21 : 8; // Evening meds at 9 PM, others morning
      const logTime = new Date(date);
      logTime.setHours(hour, Math.floor(Math.random() * 30), 0, 0);

      logs.push({
        id: `sample-medlog-${med.id}-${dateStr}`,
        timestamp: logTime.toISOString(),
        medicationIds: [med.id],
        origin: 'sample',
      });
    }
  }

  // Write to centralStorage key (used by Visit Prep adherence calculations)
  const key = scopedKey(StorageKeys.CENTRAL_MED_LOGS, DEFAULT_PATIENT_ID);
  await encryptedSetRaw(key, JSON.stringify(logs));

  // Also write to medicationStorage key (used by Now page legacy med count)
  const legacyLogs = logs.map(log => ({
    medicationId: log.medicationIds[0],
    timestamp: log.timestamp,
    taken: true,
    notes: undefined,
  }));
  const legacyKey = scopedKey(StorageKeys.MEDICATION_LOGS, DEFAULT_PATIENT_ID);
  await safeSetItem(legacyKey, legacyLogs);

  devLog(`[SampleDataGenerator] Seeded ${logs.length} medication log entries over 14 days`);
}

// ============================================================================
// SAMPLE PATIENT PROFILE
// ============================================================================

async function seedSamplePatientProfile(): Promise<void> {
  const { saveMedicalInfo } = await import('./medicalInfo');

  await safeSetItem(StorageKeys.PATIENT_NAME, 'Dad');
  await safeSetItem(StorageKeys.PATIENT_RELATIONSHIP, 'Father');
  await safeSetItem(StorageKeys.PATIENT_GENDER, 'Male');
  // No age stored — HIPAA compliance

  await saveMedicalInfo({
    bloodType: 'O+',
    allergies: ['Sulfa drugs', 'Shellfish'],
    diagnoses: [
      { condition: 'Atrial Fibrillation', status: 'active' },
      { condition: 'Type 2 Diabetes', status: 'active' },
      { condition: 'Osteoarthritis', status: 'active' },
      { condition: 'Anxiety', status: 'active' },
    ],
    surgeries: [
      { procedure: 'Knee Replacement', date: '2021', notes: 'Left knee, recovered well' },
      { procedure: 'Appendectomy', date: '1998', notes: '' },
    ],
    hospitalizations: [],
    currentMedications: [
      { name: 'Warfarin', dosage: '5mg' },
      { name: 'Aspirin', dosage: '81mg' },
      { name: 'Metformin', dosage: '1000mg' },
      { name: 'Lisinopril', dosage: '20mg' },
      { name: 'Gabapentin', dosage: '300mg' },
      { name: 'Lorazepam', dosage: '0.5mg' },
    ],
    emergencyNotes: 'On blood thinners (Warfarin) — notify ER immediately. Allergic to Sulfa drugs and Shellfish. Primary caregiver: Maria (555) 111-2222',
  });
}

// ============================================================================
// INITIALIZE ALL SAMPLE DATA
// ============================================================================

export const initializeSampleData = async (): Promise<boolean> => {
  try {
    // Check if already initialized
    const initialized = await safeGetItem<string | null>(SAMPLE_DATA_INITIALIZED_KEY, null);
    if (initialized === 'true') {
      return false;
    }

    // Save medications
    await safeSetItem(StorageKeys.MEDICATIONS, getSampleMedications());

    // Save vitals to both storage layers:
    // 1. @vitals_readings — individual readings (used by vitalsStorage.ts, Insights, Visit Prep)
    await safeSetItem('@vitals_readings', getSampleVitals());
    // 2. CENTRAL_VITALS_LOGS — daily aggregates (used by Journal, Calendar, Baselines)
    const vitalsLogKey = scopedKey(StorageKeys.CENTRAL_VITALS_LOGS, DEFAULT_PATIENT_ID);
    await encryptedSetRaw(vitalsLogKey, JSON.stringify(getSampleVitalsLogs()));

    // Save mood logs
    await safeSetItem(StorageKeys.CENTRAL_MOOD_LOGS, getSampleMoodLogs());

    // Save appointments
    await safeSetItem(StorageKeys.APPOINTMENTS, getSampleAppointments());

    // Save caregivers
    await safeSetItem(StorageKeys.CAREGIVERS, getSampleCaregivers());

    // Populate patient profile (name, diagnoses, allergies, surgeries)
    await seedSamplePatientProfile();

    // Seed 14 days of medication logs for adherence history
    await seedSampleMedicationLogs();

    // Seed sample symptom
    await saveSymptom({
      symptom: 'Knee stiffness',
      severity: 5,
      bodyLocation: 'Left knee',
      description: 'Worse after sitting, improves with movement. Morning stiffness lasting ~2 hours.',
      timestamp: new Date().toISOString(),
      date: getTodayDateString(),
    });

    // Seed sample note (caregiver observation)
    await saveNotesLog({
      content: 'Dad seemed confused about his evening meds. Double-checked Warfarin dose with pharmacy — confirmed 5mg is correct. Will label the pill organizer more clearly.',
      timestamp: new Date().toISOString(),
    });

    // Create sample CarePlanConfig with key buckets enabled
    // IMPORTANT: Config must be saved BEFORE createSampleCarePlanItems() so that
    // syncMedicationItemsWithConfig() in ensureDailyInstances() doesn't deactivate
    // the sample medication CarePlanItems (it checks config.meds.medications).
    const config = createDefaultCarePlanConfig(DEFAULT_PATIENT_ID);
    const now = new Date().toISOString();
    const sampleMeds = getSampleMedications();
    // Core 4 are already enabled by default — just add sample medications and vitals config
    config.meds = {
      ...config.meds,
      medications: sampleMeds
        .filter(m => m.id !== 'med-6') // Exclude Lorazepam (PRN, not scheduled)
        .map(m => ({
          id: m.id,
          name: m.name,
          dosage: m.dosage,
          instructions: m.notes || '',
          timesOfDay: [m.timeSlot === 'evening' || m.timeSlot === 'bedtime' ? 'evening' as const : 'morning' as const],
          active: true,
          createdAt: m.createdAt || now,
          updatedAt: now,
        })),
    };
    config.vitals = { ...config.vitals, vitalTypes: ['bp', 'hr', 'spo2', 'glucose', 'temp', 'weight'] };
    // meals and wellness already enabled by default in createDefaultCarePlanConfig
    // Phase 11.9.1 — sleep + water default to enabled: false in
    // createDefaultCarePlanConfig (DEFAULT_BUCKET_CONFIG / DEFAULT_WATER_CONFIG).
    // syncOtherBucketsWithConfig gates sleep CarePlanItem creation on
    // sleep.enabled === true; without this override, the historical
    // seed loop never sees a sleep instance to write a payload to,
    // and Insights surfaces "Sleep · 14 days missing" indefinitely.
    // Water/hydration needs both this override AND a sync case in
    // carePlanGenerator.ts (added in 11.9.2).
    config.sleep = { ...config.sleep, enabled: true };
    config.water = { ...config.water, enabled: true };
    await saveCarePlanConfig(config);

    // Mark migration as complete to prevent duplicate items from old-format medications
    await safeSetItem(StorageKeys.MIGRATION_STATUS_V1, JSON.stringify({
      medicationsToCarePlan: true,
      rhythmToRegimen: true,
      lastMigrationDate: new Date().toISOString(),
      version: 1,
    }));

    // Create sample Care Plan items (medication CarePlanItems)
    await createSampleCarePlanItems();

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

    // Seed 14 days of historical instance completions for the surfaces
    // that read listDailyInstancesRange (Insights medication adherence
    // grid, Visit Prep, getDistinctInstanceCompletionDays, narrative
    // builder past-day reads).
    //
    // Phase 11.6 — extended from wellness/sleep/hydration only to
    // include medication at ~90% adherence (matching
    // seedSampleMedicationLogs's 0.1 skip rate). The decision is
    // delegated to decideHistoricalSeedStatus so the per-itemType
    // policy is testable in isolation and the medication-parity fix
    // is co-located with its contract.
    try {
      for (let daysAgo = 1; daysAgo <= 14; daysAgo++) {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - daysAgo);
        const dateStr = pastDate.toISOString().split('T')[0];

        const pastInstances = await ensureDailyInstances(DEFAULT_PATIENT_ID, dateStr);

        for (const inst of pastInstances) {
          if (inst.status !== 'pending') continue;
          const decision = decideHistoricalSeedStatus(inst.itemType);
          if (decision == null) continue;
          const data = historicalSeedDataPayload(inst.itemType);
          await logInstanceCompletion(
            DEFAULT_PATIENT_ID,
            dateStr,
            inst.id,
            decision,
            data,
          );
        }
      }
      devLog('[initializeSampleData] Seeded 14 days of historical instances (wellness/sleep/hydration/medication)');
    } catch (error) {
      logError('initializeSampleData.historicalData', error);
      // Non-critical — don't block initialization
    }

    // Phase 11.5.3 — seed correlation engine inputs: 14 days of
    // dailyTracking (mood/sleep/hydration/pain), trend symptoms
    // (Pain/Fatigue/Nausea/Dizziness), and per-day medication logs.
    // Read by detectCorrelations() and getAllInsights() — without
    // this, Insights middle-section renders empty in sample-data
    // mode even though the data shape exists. The function is
    // idempotent via SAMPLE_CORRELATION_GENERATED.
    try {
      await generateSampleCorrelationData();
    } catch (error) {
      logError('initializeSampleData.correlationData', error);
      // Non-critical — don't block initialization
    }

    // Mark as initialized
    await safeSetItem(SAMPLE_DATA_INITIALIZED_KEY, 'true');

    // Wake up any subscribers (useSampleMode, Now banner, Settings entry) so
    // the example-mode affordances appear immediately after onboarding's
    // "Keep exploring" hand-off — without forcing a manual screen refresh.
    emitDataUpdate(EVENT.MEDICATION);
    emitDataUpdate(EVENT.PATIENT);

    return true;
  } catch (error) {
    logError('sampleDataGenerator.initializeSampleData', error);
    return false;
  }
};

// Reset sample data (clear everything, then reseed fresh)
export const resetSampleData = async (): Promise<void> => {
  // Import clearSampleData to properly clean up all tagged sample records
  const { clearSampleData } = await import('./sampleDataManager');

  // Clear ALL existing sample data first
  await clearSampleData();

  // Remove the initialized flag (clearSampleData doesn't remove this)
  await AsyncStorage.removeItem(SAMPLE_DATA_INITIALIZED_KEY);

  // Also clear the "sample data cleared" marker so the banner system resets
  await AsyncStorage.removeItem('@embermate_sample_data_cleared');

  // Clear any user-entered patient data that would conflict
  await AsyncStorage.multiRemove([
    StorageKeys.PATIENT_NAME,
    StorageKeys.PATIENT_RELATIONSHIP,
    StorageKeys.PATIENT_GENDER,
    'medical_info',
  ]);

  // Re-initialize with the correct sample data
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
  // Idempotency guard: skip if correlation data already exists
  const correlationFlag = await safeGetItem<string | null>(StorageKeys.SAMPLE_CORRELATION_GENERATED, null);
  if (correlationFlag === 'true') {
    devLog('Sample correlation data already exists, skipping generation');
    return;
  }

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

  // Mark as generated to prevent duplicate runs
  await safeSetItem(StorageKeys.SAMPLE_CORRELATION_GENERATED, 'true');

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
    key.startsWith('@daily_tracking_') ||
    key.startsWith('@medication_logs_') ||
    key === '@correlation_cache'
  );

  await AsyncStorage.multiRemove(keysToRemove);
  await AsyncStorage.removeItem(StorageKeys.SAMPLE_CORRELATION_GENERATED);

  // Remove sample-origin entries from the global symptoms array
  await removeSampleSymptoms();

  devLog(`Cleared ${keysToRemove.length} keys + sample symptoms`);
}

/**
 * Remove sample-origin entries from the global symptoms array.
 */
async function removeSampleSymptoms(): Promise<number> {
  try {
    const symptoms = await safeGetItem<any[]>(StorageKeys.SYMPTOMS, []);
    if (symptoms.length === 0) return 0;
    const userOnly = symptoms.filter(s => s.origin !== 'sample');
    const removed = symptoms.length - userOnly.length;
    if (removed > 0) {
      await safeSetItem(StorageKeys.SYMPTOMS, userOnly);
      devLog(`[removeSampleSymptoms] Removed ${removed} sample symptoms`);
    }
    return removed;
  } catch (error) {
    logError('removeSampleSymptoms', error);
    return 0;
  }
}

/**
 * Remove duplicate entries from the global symptoms array.
 * Duplicates share the same symptom + timestamp + severity.
 */
export async function deduplicateSampleSymptoms(): Promise<number> {
  try {
    const symptoms = await safeGetItem<any[]>(StorageKeys.SYMPTOMS, []);
    if (symptoms.length === 0) return 0;
    const seen = new Set<string>();
    const deduped = symptoms.filter(s => {
      const key = `${s.symptom}|${s.timestamp}|${s.severity}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const removed = symptoms.length - deduped.length;
    if (removed > 0) {
      await safeSetItem(StorageKeys.SYMPTOMS, deduped);
      devLog(`[deduplicateSampleSymptoms] Removed ${removed} duplicate symptoms`);
    }
    return removed;
  } catch (error) {
    logError('deduplicateSampleSymptoms', error);
    return 0;
  }
}

/**
 * Check if sample data exists
 */
export async function hasSampleData(): Promise<boolean> {
  try {
    const symptoms = await safeGetItem<any[]>(StorageKeys.SYMPTOMS, []);
    const sampleCount = symptoms.filter(s => s.origin === 'sample').length;
    return sampleCount >= 7;
  } catch {
    return false;
  }
}

// Export alias for backwards compatibility
export { generateSampleCorrelationData as generateSampleData };
