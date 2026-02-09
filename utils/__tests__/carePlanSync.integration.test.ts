// ============================================================================
// CARE PLAN SYNC INTEGRATION TEST
// Covers all correction steps from the Care Plan ↔ Now Page sync fix:
//   1. Auto-creation of CarePlan regimen from config
//   2. Inactive items re-activation for vitals/mood/meals buckets
//   3. Medication inactive item re-activation
//   4. syncLogToInstance bridge for vitals/mood/meals
//   5. Notification scheduling guard for past times
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ensureDailyInstances } from '../../services/carePlanGenerator';
import {
  getActiveCarePlan,
  listCarePlanItems,
  listDailyInstances,
  upsertCarePlanItem,
  createCarePlan,
  DEFAULT_PATIENT_ID,
  logInstanceCompletion,
} from '../../storage/carePlanRepo';
import { saveCarePlanConfig, getCarePlanConfig } from '../../storage/carePlanConfigRepo';
import { createDefaultCarePlanConfig } from '../../types/carePlanConfig';
import { syncLogToInstance } from '../instanceSync';
import { generateUniqueId } from '../idGenerator';

// ============================================================================
// HELPERS
// ============================================================================

const TODAY = '2025-06-15';
const NOW_ISO = '2025-06-15T10:00:00.000Z';

/**
 * Build a CarePlanConfig with specified buckets enabled
 */
function buildConfig(overrides: {
  meds?: boolean;
  vitals?: boolean;
  meals?: boolean;
  mood?: boolean;
  medications?: Array<{ name: string; dosage: string }>;
}) {
  const config = createDefaultCarePlanConfig(DEFAULT_PATIENT_ID);

  if (overrides.meds) {
    config.meds.enabled = true;
    config.meds.medications = (overrides.medications || []).map(m => ({
      id: generateUniqueId(),
      name: m.name,
      dosage: m.dosage,
      timesOfDay: ['morning' as const],
      active: true,
      createdAt: NOW_ISO,
      updatedAt: NOW_ISO,
    }));
  }

  if (overrides.vitals) {
    config.vitals.enabled = true;
    config.vitals.vitalTypes = ['bp', 'hr'];
    config.vitals.timesOfDay = ['morning'];
  }

  if (overrides.meals) {
    config.meals.enabled = true;
    config.meals.timesOfDay = ['morning', 'midday', 'evening'];
  }

  if ((overrides as any).mood) {
    (config as any).mood = { enabled: true, timesOfDay: ['morning'], priority: 'recommended' };
  }

  return config;
}

// ============================================================================
// TEST SUITE
// ============================================================================

describe('Care Plan Sync Integration', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date(NOW_ISO));
    // jest.setup.js handles global.resetAllMockStores in beforeEach
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ==========================================================================
  // 1. AUTO-CREATION OF CARE PLAN REGIMEN FROM CONFIG
  // ==========================================================================

  describe('Auto-creation of CarePlan regimen from config', () => {
    it('should auto-create regimen when config exists but regimen does not', async () => {
      // Setup: Config exists with vitals + mood, but no regimen
      const config = buildConfig({ vitals: true, mood: true });
      await saveCarePlanConfig(config);

      // Precondition: no regimen
      const before = await getActiveCarePlan(DEFAULT_PATIENT_ID);
      expect(before).toBeNull();

      // Act: run generator
      const instances = await ensureDailyInstances(DEFAULT_PATIENT_ID, TODAY);

      // Assert: regimen auto-created
      const after = await getActiveCarePlan(DEFAULT_PATIENT_ID);
      expect(after).not.toBeNull();
      expect(after!.status).toBe('active');

      // Assert: instances generated for enabled buckets
      expect(instances.length).toBeGreaterThan(0);
      const types = new Set(instances.map(i => i.itemType));
      expect(types.has('vitals')).toBe(true);
      expect(types.has('mood')).toBe(true);
    });

    it('should return empty array when no config and no regimen exist', async () => {
      const instances = await ensureDailyInstances(DEFAULT_PATIENT_ID, TODAY);
      expect(instances).toEqual([]);
    });
  });

  // ==========================================================================
  // 2. INACTIVE ITEMS RE-ACTIVATION FOR VITALS/MOOD/MEALS
  // ==========================================================================

  describe('Inactive bucket items re-activation', () => {
    it('should re-activate inactive vitals items when vitals bucket is enabled', async () => {
      // Setup: create regimen with an INACTIVE vitals CarePlanItem
      const carePlan = await createCarePlan(DEFAULT_PATIENT_ID);
      const inactiveVitalsItem = {
        id: generateUniqueId(),
        carePlanId: carePlan.id,
        type: 'vitals' as const,
        name: 'Check vitals',
        priority: 'recommended' as const,
        active: false, // INACTIVE
        schedule: {
          frequency: 'daily' as const,
          times: [{
            id: generateUniqueId(),
            kind: 'exact' as const,
            label: 'morning' as const,
            at: '08:00',
          }],
        },
        emoji: '📊',
        createdAt: NOW_ISO,
        updatedAt: NOW_ISO,
      };
      await upsertCarePlanItem(inactiveVitalsItem);

      // Setup: config has vitals enabled
      const config = buildConfig({ vitals: true });
      await saveCarePlanConfig(config);

      // Precondition: item is inactive
      const itemsBefore = await listCarePlanItems(carePlan.id, { activeOnly: true });
      expect(itemsBefore.filter(i => i.type === 'vitals')).toHaveLength(0);

      // Act
      await ensureDailyInstances(DEFAULT_PATIENT_ID, TODAY);

      // Assert: item re-activated
      const itemsAfter = await listCarePlanItems(carePlan.id, { activeOnly: true });
      expect(itemsAfter.filter(i => i.type === 'vitals').length).toBeGreaterThanOrEqual(1);

      // Assert: instances generated
      const instances = await listDailyInstances(DEFAULT_PATIENT_ID, TODAY);
      expect(instances.some(i => i.itemType === 'vitals')).toBe(true);
    });

    it('should deactivate mood items since mood is now captured by wellness checks', async () => {
      const carePlan = await createCarePlan(DEFAULT_PATIENT_ID);
      const activeMoodItem = {
        id: generateUniqueId(),
        carePlanId: carePlan.id,
        type: 'mood' as const,
        name: 'Mood check-in',
        priority: 'recommended' as const,
        active: true,
        schedule: {
          frequency: 'daily' as const,
          times: [{
            id: generateUniqueId(),
            kind: 'exact' as const,
            label: 'morning' as const,
            at: '08:00',
          }],
        },
        emoji: '😊',
        createdAt: NOW_ISO,
        updatedAt: NOW_ISO,
      };
      await upsertCarePlanItem(activeMoodItem);

      const config = buildConfig({ mood: true });
      await saveCarePlanConfig(config);

      // Act
      await ensureDailyInstances(DEFAULT_PATIENT_ID, TODAY);

      // Assert: mood item deactivated, no mood instances generated
      const items = await listCarePlanItems(carePlan.id, { activeOnly: true });
      expect(items.some(i => i.type === 'mood')).toBe(false);

      const instances = await listDailyInstances(DEFAULT_PATIENT_ID, TODAY);
      expect(instances.some(i => i.itemType === 'mood')).toBe(false);
    });

    it('should re-activate inactive meal items when meals bucket is enabled', async () => {
      const carePlan = await createCarePlan(DEFAULT_PATIENT_ID);

      // Create 3 inactive meal items (Breakfast, Lunch, Dinner)
      for (const name of ['Breakfast', 'Lunch', 'Dinner']) {
        await upsertCarePlanItem({
          id: generateUniqueId(),
          carePlanId: carePlan.id,
          type: 'nutrition',
          name,
          priority: 'recommended',
          active: false,
          schedule: {
            frequency: 'daily',
            times: [{
              id: generateUniqueId(),
              kind: 'exact',
              label: 'morning',
              at: '08:00',
            }],
          },
          emoji: '🍽️',
          createdAt: NOW_ISO,
          updatedAt: NOW_ISO,
        });
      }

      const config = buildConfig({ meals: true });
      await saveCarePlanConfig(config);

      // Precondition
      const before = await listCarePlanItems(carePlan.id, { activeOnly: true });
      expect(before.filter(i => i.type === 'nutrition')).toHaveLength(0);

      // Act
      await ensureDailyInstances(DEFAULT_PATIENT_ID, TODAY);

      // Assert: all meal items re-activated
      const after = await listCarePlanItems(carePlan.id, { activeOnly: true });
      expect(after.filter(i => i.type === 'nutrition').length).toBeGreaterThanOrEqual(3);

      // Assert: instances generated
      const instances = await listDailyInstances(DEFAULT_PATIENT_ID, TODAY);
      expect(instances.filter(i => i.itemType === 'nutrition').length).toBeGreaterThanOrEqual(3);
    });
  });

  // ==========================================================================
  // 3. MEDICATION INACTIVE ITEM RE-ACTIVATION
  // ==========================================================================

  describe('Medication inactive item re-activation', () => {
    it('should re-activate inactive medication items matching config meds', async () => {
      const carePlan = await createCarePlan(DEFAULT_PATIENT_ID);

      // Create an inactive medication CarePlanItem
      const medItemId = generateUniqueId();
      const configMedId = generateUniqueId();
      await upsertCarePlanItem({
        id: medItemId,
        carePlanId: carePlan.id,
        type: 'medication',
        name: 'Vitamin D 2000IU',
        priority: 'required',
        active: false, // INACTIVE
        schedule: {
          frequency: 'daily',
          times: [{
            id: generateUniqueId(),
            kind: 'exact',
            label: 'morning',
            at: '08:00',
          }],
        },
        medicationDetails: {
          medicationId: configMedId,
          dose: '2000IU',
        },
        emoji: '💊',
        createdAt: NOW_ISO,
        updatedAt: NOW_ISO,
      });

      // Setup config with matching medication
      const config = buildConfig({ meds: true });
      config.meds.medications = [{
        id: configMedId,
        name: 'Vitamin D',
        dosage: '2000IU',
        timesOfDay: ['morning'],
        active: true,
        createdAt: NOW_ISO,
        updatedAt: NOW_ISO,
      }];
      await saveCarePlanConfig(config);

      // Precondition: medication item is inactive
      const before = await listCarePlanItems(carePlan.id, { activeOnly: true });
      expect(before.filter(i => i.type === 'medication')).toHaveLength(0);

      // Act
      await ensureDailyInstances(DEFAULT_PATIENT_ID, TODAY);

      // Assert: medication item re-activated
      const after = await listCarePlanItems(carePlan.id, { activeOnly: true });
      const activeMeds = after.filter(i => i.type === 'medication');
      expect(activeMeds.length).toBeGreaterThanOrEqual(1);
      expect(activeMeds.some(i => i.name.includes('Vitamin D'))).toBe(true);

      // Assert: instances generated for the medication
      const instances = await listDailyInstances(DEFAULT_PATIENT_ID, TODAY);
      expect(instances.some(i => i.itemType === 'medication')).toBe(true);
    });
  });

  // ==========================================================================
  // 4. syncLogToInstance BRIDGE
  // ==========================================================================

  describe('syncLogToInstance bridge', () => {
    let carePlanId: string;

    beforeEach(async () => {
      // Setup a full care plan with all bucket types
      const config = buildConfig({
        vitals: true,
        mood: true,
        meals: true,
      });
      await saveCarePlanConfig(config);

      // Generate instances (auto-creates regimen + items)
      await ensureDailyInstances(DEFAULT_PATIENT_ID, TODAY);

      const carePlan = await getActiveCarePlan(DEFAULT_PATIENT_ID);
      carePlanId = carePlan!.id;
    });

    it('should complete a vitals instance when vitals are logged', async () => {
      // Precondition: pending vitals instance exists
      const instancesBefore = await listDailyInstances(DEFAULT_PATIENT_ID, TODAY);
      const pendingVitals = instancesBefore.filter(
        i => i.itemType === 'vitals' && i.status === 'pending'
      );
      expect(pendingVitals.length).toBeGreaterThanOrEqual(1);

      // Act: bridge log to instance
      const result = await syncLogToInstance('vitals', TODAY, {
        type: 'vitals',
        systolic: 120,
        diastolic: 80,
      });

      // Assert: instance marked completed
      expect(result).toBe(true);
      const instancesAfter = await listDailyInstances(DEFAULT_PATIENT_ID, TODAY);
      const completedVitals = instancesAfter.filter(
        i => i.itemType === 'vitals' && i.status === 'completed'
      );
      expect(completedVitals).toHaveLength(1);
    });

    it('should complete a mood instance when mood is logged', async () => {
      const instancesBefore = await listDailyInstances(DEFAULT_PATIENT_ID, TODAY);
      const pendingMood = instancesBefore.filter(
        i => i.itemType === 'mood' && i.status === 'pending'
      );
      expect(pendingMood.length).toBeGreaterThanOrEqual(1);

      // Act
      const result = await syncLogToInstance('mood', TODAY, {
        type: 'mood',
        mood: 4,
      });

      // Assert
      expect(result).toBe(true);
      const instancesAfter = await listDailyInstances(DEFAULT_PATIENT_ID, TODAY);
      const completedMood = instancesAfter.filter(
        i => i.itemType === 'mood' && i.status === 'completed'
      );
      expect(completedMood).toHaveLength(1);
    });

    it('should complete a specific meal instance by name', async () => {
      const instancesBefore = await listDailyInstances(DEFAULT_PATIENT_ID, TODAY);
      const pendingMeals = instancesBefore.filter(
        i => i.itemType === 'nutrition' && i.status === 'pending'
      );
      // Should have Breakfast, Lunch, Dinner
      expect(pendingMeals.length).toBeGreaterThanOrEqual(3);

      // Act: log Breakfast
      const result = await syncLogToInstance('nutrition', TODAY, {
        type: 'nutrition',
        mealType: 'breakfast',
      }, { itemName: 'Breakfast' });

      // Assert: only Breakfast completed, Lunch + Dinner still pending
      expect(result).toBe(true);
      const instancesAfter = await listDailyInstances(DEFAULT_PATIENT_ID, TODAY);
      const completedMeals = instancesAfter.filter(
        i => i.itemType === 'nutrition' && i.status === 'completed'
      );
      const pendingMealsAfter = instancesAfter.filter(
        i => i.itemType === 'nutrition' && i.status === 'pending'
      );
      expect(completedMeals).toHaveLength(1);
      expect(completedMeals[0].itemName).toBe('Breakfast');
      expect(pendingMealsAfter.length).toBeGreaterThanOrEqual(2);
    });

    it('should return false when no matching pending instance exists', async () => {
      // Act: try to sync a type with no instances
      const result = await syncLogToInstance('hydration', TODAY, undefined);
      expect(result).toBe(false);
    });

    it('should not double-complete an already completed instance', async () => {
      // First sync completes the instance
      await syncLogToInstance('vitals', TODAY, {
        type: 'vitals',
        systolic: 120,
        diastolic: 80,
      });

      // Second sync should find no pending instances of this type
      const result = await syncLogToInstance('vitals', TODAY, {
        type: 'vitals',
        systolic: 130,
        diastolic: 85,
      });
      expect(result).toBe(false);
    });
  });

  // ==========================================================================
  // 5. FULL END-TO-END: Config → Instances → Log → Completion
  // ==========================================================================

  describe('End-to-end: config to completion', () => {
    it('should generate instances for all enabled buckets and complete them via sync', async () => {
      // Setup: config with vitals + mood + meals
      const config = buildConfig({
        vitals: true,
        mood: true,
        meals: true,
      });
      await saveCarePlanConfig(config);

      // Generate instances
      const instances = await ensureDailyInstances(DEFAULT_PATIENT_ID, TODAY);
      expect(instances.length).toBeGreaterThanOrEqual(5); // 1 vitals + 1 mood + 3 meals

      // Count by type
      const typeCount = instances.reduce((acc, i) => {
        acc[i.itemType] = (acc[i.itemType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      expect(typeCount['vitals']).toBeGreaterThanOrEqual(1);
      expect(typeCount['mood']).toBeGreaterThanOrEqual(1);
      expect(typeCount['nutrition']).toBeGreaterThanOrEqual(3);

      // Complete vitals
      await syncLogToInstance('vitals', TODAY, { type: 'vitals', systolic: 120, diastolic: 80 });

      // Complete mood
      await syncLogToInstance('mood', TODAY, { type: 'mood', mood: 4 });

      // Complete all meals
      await syncLogToInstance('nutrition', TODAY, { type: 'nutrition', mealType: 'breakfast' }, { itemName: 'Breakfast' });
      await syncLogToInstance('nutrition', TODAY, { type: 'nutrition', mealType: 'lunch' }, { itemName: 'Lunch' });
      await syncLogToInstance('nutrition', TODAY, { type: 'nutrition', mealType: 'dinner' }, { itemName: 'Dinner' });

      // Verify all instances completed
      const final = await listDailyInstances(DEFAULT_PATIENT_ID, TODAY);
      const pending = final.filter(i => i.status === 'pending');
      const completed = final.filter(i => i.status === 'completed');

      expect(pending).toHaveLength(0);
      expect(completed.length).toBeGreaterThanOrEqual(5);
    });

    it('should handle bucket toggle off → on cycle without losing the ability to generate instances', async () => {
      // Step 1: Enable vitals
      const config = buildConfig({ vitals: true });
      await saveCarePlanConfig(config);

      const instances1 = await ensureDailyInstances(DEFAULT_PATIENT_ID, TODAY);
      expect(instances1.some(i => i.itemType === 'vitals')).toBe(true);

      // Step 2: Disable vitals (simulates user toggling off)
      config.vitals.enabled = false;
      await saveCarePlanConfig(config);

      // Regenerate on a new day to get items deactivated
      const tomorrow = '2025-06-16';
      jest.setSystemTime(new Date('2025-06-16T10:00:00.000Z'));
      await ensureDailyInstances(DEFAULT_PATIENT_ID, tomorrow);

      // Verify vitals item is now inactive
      const carePlan = await getActiveCarePlan(DEFAULT_PATIENT_ID);
      const itemsInactive = await listCarePlanItems(carePlan!.id, { activeOnly: true });
      expect(itemsInactive.filter(i => i.type === 'vitals')).toHaveLength(0);

      // Step 3: Re-enable vitals (simulates user toggling back on)
      config.vitals.enabled = true;
      await saveCarePlanConfig(config);

      const dayAfter = '2025-06-17';
      jest.setSystemTime(new Date('2025-06-17T10:00:00.000Z'));
      const instances3 = await ensureDailyInstances(DEFAULT_PATIENT_ID, dayAfter);

      // Assert: vitals instances regenerated (re-activation worked)
      expect(instances3.some(i => i.itemType === 'vitals')).toBe(true);

      // Verify the item was re-activated (not a new one created)
      const itemsFinal = await listCarePlanItems(carePlan!.id, { activeOnly: false });
      const allVitals = itemsFinal.filter(i => i.type === 'vitals');
      // Should have exactly 1 vitals item (re-activated, not duplicated)
      expect(allVitals).toHaveLength(1);
      expect(allVitals[0].active).toBe(true);
    });
  });

  // ==========================================================================
  // 6. NOTIFICATION GUARD (UNIT-LEVEL CHECK)
  // ==========================================================================

  describe('Notification scheduling guard for past times', () => {
    it('should not throw when scheduling is triggered for items with all buckets', async () => {
      // This test verifies that ensureDailyInstances doesn't crash
      // when notification rescheduling is triggered (the guard in
      // notificationService.ts prevents scheduling for past times)
      const config = buildConfig({
        meds: true,
        vitals: true,
        mood: true,
        meals: true,
        medications: [{ name: 'Aspirin', dosage: '81mg' }],
      });
      await saveCarePlanConfig(config);

      // Set time to AFTER the scheduled times (all items default to morning 08:00)
      // This would trigger the notification guard for past times
      jest.setSystemTime(new Date('2025-06-15T20:00:00.000Z'));

      // Act: should not throw
      const instances = await ensureDailyInstances(DEFAULT_PATIENT_ID, TODAY);
      expect(instances.length).toBeGreaterThan(0);
    });
  });
});
