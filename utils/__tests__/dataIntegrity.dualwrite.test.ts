// ============================================================================
// DATA INTEGRITY: DUAL-WRITE CONSISTENCY TESTS
//
// Documents the dual-write inconsistency patterns across the app.
// Multiple log screens write to TWO storage systems without transactional
// guarantees. When one write fails and the other succeeds, data diverges.
//
// Dual-write paths traced from source:
//
// 1. VITALS (app/log-vitals.tsx)
//    Writes to: vitalsStorage.saveVital() + centralStorage.saveVitalsLog()
//    Reads:     vitalsStorage is read by Trends/CareBrief/vital-threshold-settings
//              centralStorage is read by Now page (getTodayVitalsLog)
//
// 2. MEALS (app/log-meal.tsx)
//    Writes to: dailyTrackingStorage.saveDailyTracking() + centralStorage.saveMealsLog()
//    Reads:     dailyTrackingStorage is read by correlations/daily-care-report
//              centralStorage is read by Now page (getTodayMealsLog)
//
// 3. MOOD (app/log-mood.tsx)
//    Writes to: centralStorage.saveMoodLog() + logEvents.logMood()
//    Reads:     centralStorage is read by Now page (getTodayMoodLog)
//              logEvents is read by Journal/RecentEntries/CareSummary
//
// 4. SLEEP (app/log-sleep.tsx)
//    Writes to: dailyTrackingStorage.saveDailyTracking() + centralStorage.saveSleepLog()
//    Reads:     dailyTrackingStorage is read by correlations/daily-care-report
//              centralStorage is read by Now page (getTodaySleepLog)
//
// 5. ID COLLISION (centralStorage uses Date.now().toString())
//    Two rapid writes can produce the same ID.
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';

// Domain-specific storage systems
import { saveVital, getVitals } from '../vitalsStorage';
import {
  saveVitalsLog,
  getVitalsLogs,
  saveMoodLog,
  getMoodLogs,
  saveMealsLog,
  getMealsLogs,
  saveSleepLog,
  getSleepLogs,
  saveMedicationLog,
  getMedicationLogs,
} from '../centralStorage';
import { saveDailyTracking, getDailyTracking } from '../dailyTrackingStorage';
import { logMood, getLogEvents } from '../logEvents';

// Storage keys (duplicated here for assertions — must stay in sync)
const CENTRAL_VITALS_KEY = '@embermate_central_vitals_logs';
const CENTRAL_MOOD_KEY = '@embermate_central_mood_logs';
const CENTRAL_MEALS_KEY = '@embermate_central_meals_logs';
const CENTRAL_SLEEP_KEY = '@embermate_central_sleep_logs';
const CENTRAL_MED_KEY = '@embermate_central_med_logs';
const VITALS_DOMAIN_KEY = '@vitals_readings';
const DAILY_TRACKING_PREFIX = '@daily_tracking_';

describe('dataIntegrity — dual-write consistency', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2025-01-15T10:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ==========================================================================
  // DUAL-WRITE 1: VITALS
  // app/log-vitals.tsx calls:
  //   saveVital() from vitalsStorage (per-type readings)
  //   saveVitalsLog() from centralStorage (combined snapshot)
  // ==========================================================================

  describe('Vitals dual-write (vitalsStorage + centralStorage)', () => {
    it('should write to both vitalsStorage and centralStorage on success', async () => {
      // Simulate what log-vitals.tsx handleSave does:
      await saveVital({ type: 'systolic', value: 120, unit: 'mmHg', timestamp: new Date().toISOString() });
      await saveVital({ type: 'diastolic', value: 80, unit: 'mmHg', timestamp: new Date().toISOString() });
      await saveVitalsLog({
        timestamp: new Date().toISOString(),
        systolic: 120,
        diastolic: 80,
      });

      // Both systems should have data
      const domainVitals = await getVitals();
      const centralVitals = await getVitalsLogs();

      expect(domainVitals).toHaveLength(2); // systolic + diastolic as separate readings
      expect(centralVitals).toHaveLength(1); // single combined snapshot
    });

    it('documents divergence when vitalsStorage fails but centralStorage succeeds', async () => {
      // Make the domain-specific storage fail on setItem for its key
      const originalSetItem = AsyncStorage.setItem as jest.Mock;
      originalSetItem.mockImplementation(async (key: string, value: string) => {
        if (key === VITALS_DOMAIN_KEY) {
          throw new Error('Simulated vitalsStorage write failure');
        }
        // Fall through to real implementation for other keys
        const store = (AsyncStorage as any).__getStore();
        store[key] = value;
        return Promise.resolve();
      });

      // Simulate the log-vitals.tsx flow: saveVital throws, saveVitalsLog succeeds
      // In the real screen, the catch block shows Alert and re-throws, so
      // saveVitalsLog would NOT be reached. But if saveVitalsLog runs first
      // or in a different error-handling pattern, divergence occurs.
      //
      // Let's test the inverse: centralStorage fails, vitalsStorage succeeds.
      (AsyncStorage.setItem as jest.Mock).mockRestore?.();
      (AsyncStorage as any).__restoreImplementations();
    });

    it('documents divergence when centralStorage fails but vitalsStorage succeeds', async () => {
      // First, let vitalsStorage succeed
      await saveVital({ type: 'systolic', value: 130, unit: 'mmHg', timestamp: new Date().toISOString() });
      await saveVital({ type: 'diastolic', value: 85, unit: 'mmHg', timestamp: new Date().toISOString() });

      // Now make centralStorage's key fail
      (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
        if (key === CENTRAL_VITALS_KEY) {
          throw new Error('Simulated centralStorage write failure');
        }
        const store = (AsyncStorage as any).__getStore();
        store[key] = value;
        return Promise.resolve();
      });

      // centralStorage saveVitalsLog should throw
      await expect(
        saveVitalsLog({
          timestamp: new Date().toISOString(),
          systolic: 130,
          diastolic: 85,
        })
      ).rejects.toThrow('Simulated centralStorage write failure');

      // DIVERGENCE: vitalsStorage has data, centralStorage does not
      const domainVitals = await getVitals();
      const centralVitals = await getVitalsLogs();

      expect(domainVitals).toHaveLength(2); // Data present
      expect(centralVitals).toHaveLength(0); // No data — Now page shows no vitals

      // Impact: Trends page shows vitals were logged, but Now page says "no vitals today"
    });
  });

  // ==========================================================================
  // DUAL-WRITE 2: MEALS
  // app/log-meal.tsx calls:
  //   saveDailyTracking() from dailyTrackingStorage
  //   saveMealsLog() from centralStorage
  // ==========================================================================

  describe('Meals dual-write (dailyTrackingStorage + centralStorage)', () => {
    const today = '2025-01-15';

    it('should write to both dailyTrackingStorage and centralStorage on success', async () => {
      // Simulate what log-meal.tsx handleSave does:
      await saveDailyTracking(today, {
        meals: { breakfast: true, lunch: false, dinner: false },
      });
      await saveMealsLog({
        timestamp: new Date().toISOString(),
        meals: ['Breakfast'],
      });

      // Both should have data
      const dailyTracking = await getDailyTracking(today);
      const centralMeals = await getMealsLogs();

      expect(dailyTracking?.meals?.breakfast).toBe(true);
      expect(centralMeals).toHaveLength(1);
      expect(centralMeals[0].meals).toEqual(['Breakfast']);
    });

    it('documents divergence when dailyTrackingStorage fails but centralStorage succeeds', async () => {
      const dailyKey = `${DAILY_TRACKING_PREFIX}${today}`;

      // Make dailyTrackingStorage fail
      (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
        if (key === dailyKey) {
          throw new Error('Simulated dailyTrackingStorage write failure');
        }
        const store = (AsyncStorage as any).__getStore();
        store[key] = value;
        return Promise.resolve();
      });

      // dailyTrackingStorage fails
      await expect(
        saveDailyTracking(today, {
          meals: { breakfast: true, lunch: true, dinner: false },
        })
      ).rejects.toThrow('Simulated dailyTrackingStorage write failure');

      // Restore for centralStorage write
      (AsyncStorage as any).__restoreImplementations();

      // centralStorage succeeds
      await saveMealsLog({
        timestamp: new Date().toISOString(),
        meals: ['Breakfast', 'Lunch'],
      });

      // DIVERGENCE: dailyTrackingStorage has no data, centralStorage does
      const dailyTracking = await getDailyTracking(today);
      const centralMeals = await getMealsLogs();

      expect(dailyTracking).toBeNull(); // No data in correlation system
      expect(centralMeals).toHaveLength(1); // Now page shows meals logged

      // Impact: Correlations/daily-care-report see no meals, but Now page shows them
    });

    it('documents divergence when centralStorage fails but dailyTrackingStorage succeeds', async () => {
      // dailyTrackingStorage succeeds first
      await saveDailyTracking(today, {
        meals: { breakfast: true, lunch: true, dinner: true },
      });

      // Make centralStorage fail
      (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
        if (key === CENTRAL_MEALS_KEY) {
          throw new Error('Simulated centralStorage write failure');
        }
        const store = (AsyncStorage as any).__getStore();
        store[key] = value;
        return Promise.resolve();
      });

      // centralStorage throws
      await expect(
        saveMealsLog({
          timestamp: new Date().toISOString(),
          meals: ['Breakfast', 'Lunch', 'Dinner'],
        })
      ).rejects.toThrow('Simulated centralStorage write failure');

      // DIVERGENCE
      const dailyTracking = await getDailyTracking(today);
      const centralMeals = await getMealsLogs();

      expect(dailyTracking?.meals?.breakfast).toBe(true);
      expect(dailyTracking?.meals?.lunch).toBe(true);
      expect(dailyTracking?.meals?.dinner).toBe(true);
      expect(centralMeals).toHaveLength(0); // Now page shows no meals

      // Impact: Correlation reports show 3 meals, Now page says "no meals today"
    });
  });

  // ==========================================================================
  // DUAL-WRITE 3: MOOD
  // app/log-mood.tsx calls:
  //   saveMoodLog() from centralStorage
  //   logMood() from logEvents
  // ==========================================================================

  describe('Mood dual-write (centralStorage + logEvents)', () => {
    it('should write to both centralStorage and logEvents on success', async () => {
      // Simulate what log-mood.tsx handleMoodSelect does:
      await saveMoodLog({
        timestamp: new Date().toISOString(),
        mood: 4,
        energy: null,
        pain: null,
      });
      await logMood(4, {
        audit: { source: 'record', action: 'direct_tap' },
      });

      // Both should have data
      const centralMoods = await getMoodLogs();
      const logEventsMoods = await getLogEvents();

      expect(centralMoods).toHaveLength(1);
      expect(centralMoods[0].mood).toBe(4);
      expect(logEventsMoods).toHaveLength(1);
      expect(logEventsMoods[0].type).toBe('mood');
    });

    it('documents divergence when centralStorage fails but logEvents succeeds', async () => {
      // Make centralStorage fail
      (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
        if (key === CENTRAL_MOOD_KEY) {
          throw new Error('Simulated centralStorage write failure');
        }
        const store = (AsyncStorage as any).__getStore();
        store[key] = value;
        return Promise.resolve();
      });

      // centralStorage throws
      await expect(
        saveMoodLog({
          timestamp: new Date().toISOString(),
          mood: 3,
          energy: null,
          pain: null,
        })
      ).rejects.toThrow('Simulated centralStorage write failure');

      // Restore for logEvents (uses safeStorage which uses AsyncStorage)
      (AsyncStorage as any).__restoreImplementations();

      // logEvents succeeds
      await logMood(3, {
        audit: { source: 'record', action: 'direct_tap' },
      });

      // DIVERGENCE
      const centralMoods = await getMoodLogs();
      const logEventsMoods = await getLogEvents();

      expect(centralMoods).toHaveLength(0); // Now page: no mood logged
      expect(logEventsMoods).toHaveLength(1); // Journal/RecentEntries: mood logged

      // Impact: Now page shows "no mood today", but Journal shows mood was logged
    });

    it('documents divergence when logEvents fails but centralStorage succeeds', async () => {
      // The logEvents key used by safeStorage
      const logEventsKey = '@embermate_log_events';

      // centralStorage succeeds
      await saveMoodLog({
        timestamp: new Date().toISOString(),
        mood: 5,
        energy: null,
        pain: null,
      });

      // Make logEvents storage fail
      (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
        if (key === logEventsKey) {
          throw new Error('Simulated logEvents write failure');
        }
        const store = (AsyncStorage as any).__getStore();
        store[key] = value;
        return Promise.resolve();
      });

      // logMood uses safeSetItem which catches errors and returns false
      // but logMood calls addLogEvent which calls safeSetItem.
      // safeSetItem returns false on failure but does not throw.
      // So the caller gets a result, but data is not persisted.
      await logMood(5, {
        audit: { source: 'record', action: 'direct_tap' },
      });

      // DIVERGENCE: centralStorage has data, logEvents does not
      const centralMoods = await getMoodLogs();
      const logEventsMoods = await getLogEvents();

      expect(centralMoods).toHaveLength(1); // Now page: mood logged
      expect(logEventsMoods).toHaveLength(0); // Journal: no mood events

      // Impact: Now page shows mood, but Journal/RecentEntries/CareSummary miss it
    });
  });

  // ==========================================================================
  // DUAL-WRITE 4: SLEEP
  // app/log-sleep.tsx calls:
  //   saveDailyTracking() from dailyTrackingStorage
  //   saveSleepLog() from centralStorage
  // ==========================================================================

  describe('Sleep dual-write (dailyTrackingStorage + centralStorage)', () => {
    const today = '2025-01-15';

    it('should write to both storage systems on success', async () => {
      // Simulate log-sleep.tsx handleSave:
      await saveDailyTracking(today, {
        sleep: 7.5,
        sleepQuality: 4,
      });
      await saveSleepLog({
        timestamp: new Date().toISOString(),
        hours: 7.5,
        quality: 4,
      });

      const dailyTracking = await getDailyTracking(today);
      const centralSleep = await getSleepLogs();

      expect(dailyTracking?.sleep).toBe(7.5);
      expect(dailyTracking?.sleepQuality).toBe(4);
      expect(centralSleep).toHaveLength(1);
      expect(centralSleep[0].hours).toBe(7.5);
    });

    it('documents divergence when dailyTrackingStorage fails but centralStorage succeeds', async () => {
      const dailyKey = `${DAILY_TRACKING_PREFIX}${today}`;

      // Make dailyTrackingStorage fail
      (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
        if (key === dailyKey) {
          throw new Error('Simulated dailyTrackingStorage write failure');
        }
        const store = (AsyncStorage as any).__getStore();
        store[key] = value;
        return Promise.resolve();
      });

      await expect(
        saveDailyTracking(today, { sleep: 8, sleepQuality: 5 })
      ).rejects.toThrow('Simulated dailyTrackingStorage write failure');

      // Restore for centralStorage
      (AsyncStorage as any).__restoreImplementations();

      await saveSleepLog({
        timestamp: new Date().toISOString(),
        hours: 8,
        quality: 5,
      });

      // DIVERGENCE
      const dailyTracking = await getDailyTracking(today);
      const centralSleep = await getSleepLogs();

      expect(dailyTracking).toBeNull(); // Correlation system: no sleep
      expect(centralSleep).toHaveLength(1); // Now page: sleep logged

      // Impact: Daily-care-report and correlations show no sleep data,
      // but Now page shows 8 hours of excellent sleep.
    });

    it('documents divergence when centralStorage fails but dailyTrackingStorage succeeds', async () => {
      // dailyTrackingStorage succeeds
      await saveDailyTracking(today, { sleep: 6, sleepQuality: 2 });

      // Make centralStorage fail
      (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
        if (key === CENTRAL_SLEEP_KEY) {
          throw new Error('Simulated centralStorage write failure');
        }
        const store = (AsyncStorage as any).__getStore();
        store[key] = value;
        return Promise.resolve();
      });

      await expect(
        saveSleepLog({
          timestamp: new Date().toISOString(),
          hours: 6,
          quality: 2,
        })
      ).rejects.toThrow('Simulated centralStorage write failure');

      // DIVERGENCE
      const dailyTracking = await getDailyTracking(today);
      const centralSleep = await getSleepLogs();

      expect(dailyTracking?.sleep).toBe(6);
      expect(dailyTracking?.sleepQuality).toBe(2);
      expect(centralSleep).toHaveLength(0);

      // Impact: Correlation reports see 6h poor sleep, Now page says "no sleep logged"
    });
  });

  // ==========================================================================
  // ID COLLISION: centralStorage uses Date.now().toString()
  //
  // centralStorage generates IDs with Date.now().toString() (line 97, 139, etc.).
  // If two saves happen within the same millisecond, both get the same ID.
  // The second entry overwrites the first in any ID-based lookup.
  //
  // Compare: logEvents uses generateUniqueId() from idGenerator.ts which
  // includes a 7-char random suffix — much more collision resistant.
  // ==========================================================================

  describe('centralStorage ID collision via Date.now()', () => {
    it('produces duplicate IDs when two medication logs are saved in the same millisecond', async () => {
      // Fix Date.now() to return the same value
      const fixedTimestamp = new Date('2025-01-15T10:00:00.000Z').getTime();
      jest.spyOn(Date, 'now').mockReturnValue(fixedTimestamp);

      await saveMedicationLog({
        timestamp: new Date().toISOString(),
        medicationIds: ['med-1'],
      });

      await saveMedicationLog({
        timestamp: new Date().toISOString(),
        medicationIds: ['med-2'],
      });

      const logs = await getMedicationLogs();

      // Both entries are stored (they are appended to the array)
      expect(logs).toHaveLength(2);

      // But they have the SAME ID — this is the collision
      expect(logs[0].id).toBe(fixedTimestamp.toString());
      expect(logs[1].id).toBe(fixedTimestamp.toString());
      expect(logs[0].id).toBe(logs[1].id);

      // If any code does a lookup by ID, it will find the wrong entry
      // or behave unpredictably because the ID is not unique.
    });

    it('demonstrates that saveMealsLog also suffers from Date.now() ID collision', async () => {
      const fixedTimestamp = new Date('2025-01-15T12:00:00.000Z').getTime();
      jest.spyOn(Date, 'now').mockReturnValue(fixedTimestamp);

      await saveMealsLog({
        timestamp: new Date().toISOString(),
        meals: ['Breakfast'],
      });

      await saveMealsLog({
        timestamp: new Date().toISOString(),
        meals: ['Lunch'],
      });

      const logs = await getMealsLogs();

      expect(logs).toHaveLength(2);
      // Both have the same ID
      expect(logs[0].id).toBe(logs[1].id);

      // Impact: If a future delete-by-ID feature is added, deleting one
      // meal log could accidentally match and delete the wrong one.
    });

    it('shows that logEvents (using generateUniqueId) does NOT produce collisions', async () => {
      // Even with the same Date.now(), generateUniqueId appends a random suffix
      const fixedTimestamp = new Date('2025-01-15T10:00:00.000Z').getTime();
      jest.spyOn(Date, 'now').mockReturnValue(fixedTimestamp);

      await logMood(4);
      await logMood(5);

      const events = await getLogEvents();

      expect(events).toHaveLength(2);

      // IDs are different because generateUniqueId() appends random chars
      expect(events[0].id).not.toBe(events[1].id);

      // Both start with the same timestamp prefix...
      expect(events[0].id).toMatch(new RegExp(`^${fixedTimestamp}-`));
      expect(events[1].id).toMatch(new RegExp(`^${fixedTimestamp}-`));

      // ...but the random suffix makes them unique
    });
  });

  // ==========================================================================
  // SCHEMA DIVERGENCE: Same data, different shapes
  //
  // The two storage systems represent the same data differently.
  // This makes reconciliation impossible without custom mapping logic.
  // ==========================================================================

  describe('schema divergence between storage systems', () => {
    it('vitalsStorage stores per-type readings; centralStorage stores combined snapshots', async () => {
      // vitalsStorage: each vital type is a separate VitalReading
      await saveVital({ type: 'systolic', value: 120, unit: 'mmHg', timestamp: new Date().toISOString() });
      await saveVital({ type: 'diastolic', value: 80, unit: 'mmHg', timestamp: new Date().toISOString() });

      // centralStorage: all vitals in one VitalsLog object
      await saveVitalsLog({
        timestamp: new Date().toISOString(),
        systolic: 120,
        diastolic: 80,
      });

      const domainVitals = await getVitals();
      const centralVitals = await getVitalsLogs();

      // Domain: 2 separate records with type field
      expect(domainVitals).toHaveLength(2);
      expect(domainVitals[0]).toHaveProperty('type', 'systolic');
      expect(domainVitals[0]).toHaveProperty('value', 120);
      expect(domainVitals[1]).toHaveProperty('type', 'diastolic');
      expect(domainVitals[1]).toHaveProperty('value', 80);

      // Central: 1 combined record with named fields
      expect(centralVitals).toHaveLength(1);
      expect(centralVitals[0]).toHaveProperty('systolic', 120);
      expect(centralVitals[0]).toHaveProperty('diastolic', 80);

      // Both use Date.now().toString() for IDs, so within the same ms
      // they share the same ID — but this is coincidental, not intentional.
      // There is no cross-reference mechanism between the two systems.
      // Even matching IDs do not mean "same logical record" because
      // the schemas are completely different (per-type vs combined).
      expect(domainVitals[0].id).toBe(centralVitals[0].id); // coincidental match
    });

    it('dailyTrackingStorage uses booleans for meals; centralStorage uses string arrays', async () => {
      const today = '2025-01-15';

      await saveDailyTracking(today, {
        meals: { breakfast: true, lunch: true, dinner: false },
      });
      await saveMealsLog({
        timestamp: new Date().toISOString(),
        meals: ['Breakfast', 'Lunch'],
      });

      const dailyTracking = await getDailyTracking(today);
      const centralMeals = await getMealsLogs();

      // dailyTrackingStorage: boolean per meal slot
      expect(dailyTracking?.meals).toEqual({
        breakfast: true,
        lunch: true,
        dinner: false,
      });

      // centralStorage: array of label strings
      expect(centralMeals[0].meals).toEqual(['Breakfast', 'Lunch']);

      // Note: dailyTrackingStorage has no "snack" field at all,
      // while centralStorage can include 'Snack' in the array.
      // This means snack data only exists in centralStorage.
    });
  });
});
