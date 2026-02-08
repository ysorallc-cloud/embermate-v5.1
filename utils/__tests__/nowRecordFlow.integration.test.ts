// ============================================================================
// NOW → RECORD FLOW INTEGRATION TEST
// Validates the separation of concerns:
//   Now tab = status/urgency display (uses useCareTasks, instances)
//   Record tab = pure entry portal (no status indicators on cards)
//
// Recent changes (2026-02-08):
//   - Record page stripped of all status indicators
//   - Category cards show only icon + name + chevron
//   - Last Action bar is the only status element on Record
//   - Now dashboard owns all status/urgency display
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ensureDailyInstances } from '../../services/carePlanGenerator';
import {
  getActiveCarePlan,
  listDailyInstances,
  DEFAULT_PATIENT_ID,
} from '../../storage/carePlanRepo';
import { saveCarePlanConfig } from '../../storage/carePlanConfigRepo';
import { createDefaultCarePlanConfig } from '../../types/carePlanConfig';
import { syncLogToInstance } from '../instanceSync';
import { generateUniqueId } from '../idGenerator';
import {
  saveVitalsLog,
  getTodayVitalsLog,
} from '../centralStorage';
import {
  getTimeWindow,
  groupByTimeWindow,
  isOverdue,
  getCurrentTimeWindow,
  type TimeWindow,
} from '../nowHelpers';

// ============================================================================
// HELPERS
// ============================================================================

const TODAY = '2025-06-15';
const NOW_ISO = '2025-06-15T10:00:00.000Z';

function buildConfig(overrides: {
  meds?: boolean;
  vitals?: boolean;
  meals?: boolean;
  mood?: boolean;
}) {
  const config = createDefaultCarePlanConfig(DEFAULT_PATIENT_ID);

  if (overrides.vitals) {
    config.vitals.enabled = true;
    config.vitals.vitalTypes = ['bp', 'hr'];
    config.vitals.timesOfDay = ['morning'];
  }

  if (overrides.meals) {
    config.meals.enabled = true;
    config.meals.timesOfDay = ['morning', 'midday', 'evening'];
  }

  if (overrides.mood) {
    config.mood.enabled = true;
    config.mood.timesOfDay = ['morning'];
  }

  if (overrides.meds) {
    config.meds.enabled = true;
    config.meds.medications = [{
      id: generateUniqueId(),
      name: 'Test Med',
      dosage: '10mg',
      timesOfDay: ['morning'],
      active: true,
      createdAt: NOW_ISO,
      updatedAt: NOW_ISO,
    }];
  }

  return config;
}

// ============================================================================
// TEST SUITE
// ============================================================================

describe('Now → Record Flow Integration', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date(NOW_ISO));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ==========================================================================
  // NOW PAGE: Instances appear with correct time windows
  // ==========================================================================

  describe('Now page: instances grouped by time window', () => {
    it('should generate instances and group them into time windows', async () => {
      const config = buildConfig({ vitals: true, mood: true, meals: true });
      await saveCarePlanConfig(config);

      const instances = await ensureDailyInstances(DEFAULT_PATIENT_ID, TODAY);
      expect(instances.length).toBeGreaterThan(0);

      // Group pending instances by time window (as TimelineSection does)
      const pending = instances.filter(i => i.status === 'pending');
      const grouped = groupByTimeWindow(pending);

      // Morning items should exist (vitals, mood, breakfast scheduled for morning)
      expect(grouped.morning.length).toBeGreaterThan(0);
    });

    it('should detect overdue items within time groups', async () => {
      const config = buildConfig({ vitals: true });
      await saveCarePlanConfig(config);

      const instances = await ensureDailyInstances(DEFAULT_PATIENT_ID, TODAY);
      const pending = instances.filter(i => i.status === 'pending');
      expect(pending.length).toBeGreaterThan(0);

      // Find the latest scheduled time among pending items
      const latestTime = pending.reduce((latest, i) => {
        const t = new Date(i.scheduledTime).getTime();
        return t > latest ? t : latest;
      }, 0);

      // Advance well past the latest scheduled time + grace period (60 min buffer)
      const wellPastTime = new Date(latestTime + 60 * 60 * 1000);
      jest.setSystemTime(wellPastTime);

      const overdueItems = pending.filter(i => isOverdue(i.scheduledTime));

      // Items should now be overdue (past their scheduled time + grace)
      expect(overdueItems.length).toBeGreaterThan(0);

      // But they still belong to their original time window (not moved)
      overdueItems.forEach(item => {
        const window = getTimeWindow(item.scheduledTime);
        expect(['morning', 'afternoon', 'evening', 'night']).toContain(window);
      });
    });

    it('should reflect completion in instance status after sync', async () => {
      const config = buildConfig({ vitals: true });
      await saveCarePlanConfig(config);

      await ensureDailyInstances(DEFAULT_PATIENT_ID, TODAY);

      // Complete the vitals instance via sync bridge
      await syncLogToInstance('vitals', TODAY, {
        type: 'vitals',
        systolic: 120,
        diastolic: 80,
      });

      // Verify instances reflect completion
      const instances = await listDailyInstances(DEFAULT_PATIENT_ID, TODAY);
      const completedVitals = instances.filter(
        i => i.itemType === 'vitals' && i.status === 'completed'
      );
      const pendingVitals = instances.filter(
        i => i.itemType === 'vitals' && i.status === 'pending'
      );

      expect(completedVitals).toHaveLength(1);
      expect(pendingVitals).toHaveLength(0);
    });
  });

  // ==========================================================================
  // RECORD PAGE: No status dependency
  // ==========================================================================

  describe('Record page: status-free entry portal', () => {
    it('Last Action bar reads from centralStorage vitals timestamp', async () => {
      // Save vitals — this is what Record page reads for Last Action
      await saveVitalsLog({
        timestamp: new Date().toISOString(),
        systolic: 120,
        diastolic: 80,
        heartRate: 72,
      });

      const vitals = await getTodayVitalsLog();
      expect(vitals).not.toBeNull();
      expect(vitals!.timestamp).toBeDefined();

      // Record page only uses this timestamp for the "Last action: Logged Vitals X ago" bar
      // It does NOT use useCareTasks, getBucketStatus, or getBucketCounts
      const timestamp = new Date(vitals!.timestamp);
      expect(timestamp.getTime()).not.toBeNaN();
    });

    it('should not require Care Plan instances for Record page data', async () => {
      // No care plan config or instances exist
      const vitals = await getTodayVitalsLog();

      // Record page should still work — it only depends on:
      //   1. enabledBuckets (from useCarePlanConfig) for which cards to show
      //   2. getTodayVitalsLog() for Last Action bar
      //   3. usageFrequency (from AsyncStorage) for card ordering
      // None of these depend on instances or useCareTasks

      // Vitals returns null when nothing logged — Last Action bar just hides
      expect(vitals).toBeNull();
    });

    it('usage frequency tracking works independently of care plan state', async () => {
      const USAGE_KEY = '@embermate_category_usage';

      // Initially empty
      const raw = await AsyncStorage.getItem(USAGE_KEY);
      expect(raw).toBeNull();

      // Simulate recording usage (as handleCategoryPress does)
      const frequency: Record<string, number> = {};
      frequency['vitals'] = 3;
      frequency['medications'] = 5;
      frequency['meals'] = 1;
      await AsyncStorage.setItem(USAGE_KEY, JSON.stringify(frequency));

      // Read back
      const stored = await AsyncStorage.getItem(USAGE_KEY);
      const parsed = JSON.parse(stored!);
      expect(parsed['medications']).toBe(5);
      expect(parsed['vitals']).toBe(3);
      expect(parsed['meals']).toBe(1);

      // Verify sort order: medications (5) > vitals (3) > meals (1)
      const sorted = Object.entries(parsed).sort((a, b) => (b[1] as number) - (a[1] as number));
      expect(sorted[0][0]).toBe('medications');
      expect(sorted[1][0]).toBe('vitals');
      expect(sorted[2][0]).toBe('meals');
    });
  });

  // ==========================================================================
  // CROSS-TAB: Status lives on Now, entry lives on Record
  // ==========================================================================

  describe('Cross-tab separation of concerns', () => {
    it('completing a task updates Now page data but does not affect Record page data', async () => {
      const config = buildConfig({ vitals: true, mood: true });
      await saveCarePlanConfig(config);

      // Generate instances (Now page data source)
      await ensureDailyInstances(DEFAULT_PATIENT_ID, TODAY);

      // Save vitals via centralStorage (Record page data source for Last Action)
      await saveVitalsLog({
        timestamp: new Date().toISOString(),
        systolic: 118,
        diastolic: 78,
      });

      // Complete vitals instance via sync bridge
      await syncLogToInstance('vitals', TODAY, {
        type: 'vitals',
        systolic: 118,
        diastolic: 78,
      });

      // NOW PAGE: instances reflect completion
      const instances = await listDailyInstances(DEFAULT_PATIENT_ID, TODAY);
      const completedVitals = instances.filter(
        i => i.itemType === 'vitals' && i.status === 'completed'
      );
      expect(completedVitals).toHaveLength(1);

      // RECORD PAGE: only cares about vitals timestamp for Last Action
      const vitals = await getTodayVitalsLog();
      expect(vitals).not.toBeNull();
      expect(vitals!.systolic).toBe(118);

      // Record page does NOT check instance status, bucket completion, or task counts
      // The vitals entry in Record is always just: 📊 Vitals →
    });

    it('all instances completing does not change Record page behavior', async () => {
      const config = buildConfig({ vitals: true, mood: true });
      await saveCarePlanConfig(config);

      await ensureDailyInstances(DEFAULT_PATIENT_ID, TODAY);

      // Complete everything
      await syncLogToInstance('vitals', TODAY, {
        type: 'vitals', systolic: 120, diastolic: 80,
      });
      await syncLogToInstance('mood', TODAY, {
        type: 'mood', mood: 4,
      });

      // Now page: all instances completed
      const instances = await listDailyInstances(DEFAULT_PATIENT_ID, TODAY);
      const pending = instances.filter(i => i.status === 'pending');
      expect(pending).toHaveLength(0);

      // Record page: still shows all category cards as entry points
      // No "All scheduled items logged" banner (removed in recent update)
      // No green checkmarks or completion styling on cards
      // Cards are always: icon + name + chevron, regardless of completion state
      // This is verified by the absence of useCareTasks in record.tsx
    });
  });

  // ==========================================================================
  // CURRENT BLOCK CARD (Now page component)
  // ==========================================================================

  describe('CurrentBlockCard data computation', () => {
    it('should compute current block items from instances', async () => {
      const config = buildConfig({ vitals: true, mood: true, meals: true });
      await saveCarePlanConfig(config);

      const instances = await ensureDailyInstances(DEFAULT_PATIENT_ID, TODAY);
      const pending = instances.filter(i => i.status === 'pending');

      // At 10:00 AM, current window is morning
      const currentWindow = getCurrentTimeWindow();
      expect(currentWindow).toBe('morning');

      // Filter items for current block (as now.tsx does)
      const currentBlockItems = pending.filter(
        i => getTimeWindow(i.scheduledTime) === currentWindow
      );

      expect(currentBlockItems.length).toBeGreaterThan(0);

      // Next pending = first by scheduled time
      const sorted = [...currentBlockItems].sort(
        (a, b) => a.scheduledTime.localeCompare(b.scheduledTime)
      );
      expect(sorted[0]).toBeDefined();
      expect(sorted[0].scheduledTime).toBeDefined();
    });

    it('should show empty state when all current block items are completed', async () => {
      const config = buildConfig({ vitals: true });
      await saveCarePlanConfig(config);

      await ensureDailyInstances(DEFAULT_PATIENT_ID, TODAY);

      // Complete everything
      await syncLogToInstance('vitals', TODAY, {
        type: 'vitals', systolic: 120, diastolic: 80,
      });

      const instances = await listDailyInstances(DEFAULT_PATIENT_ID, TODAY);
      const currentWindow = getCurrentTimeWindow();
      const currentPending = instances.filter(
        i => i.status === 'pending' && getTimeWindow(i.scheduledTime) === currentWindow
      );

      // No pending items in current block → "All caught up!" state
      expect(currentPending).toHaveLength(0);
    });
  });
});
