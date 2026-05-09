// ============================================================================
// Phase 5.13.5 Stage 1 — Journal narrative reads completions, not just events.
//
// Defect (May 8 device review): user logs items via Now-tab inline-confirm,
// Journal opens to the same day showing both "5 of 12 logged · 2 still to do"
// and "No record from this day. / A quiet day in the record." That contradicts
// itself.
//
// Root cause (verified against narrativeSummaryBuilder.ts:125–268 and
// carePlanRepo.ts:495–551):
//   • logInstanceCompletion writes a LogEntry and updates instance status, but
//     does NOT emit a CareEvent to the event repo.
//   • buildDayNarrative reads from THREE sources: events, instances, reflection.
//     But only **medications** are counted off the instance pipeline (line 138).
//     vitals / wellness / meals / sleep / activity are filtered off events only
//     (lines 144–147), so inline-confirm completions for those types are
//     invisible to the narrative.
//
// The spec said "(or any template)" for the test setup; General Wellness is
// the cleanest reproduction because it enables exactly the bug-affected
// buckets (meals/water/wellness/sleep/activity) and excludes the only one
// that already works through instances (meds). The user's device-review
// screenshot used General Wellness, so this test mirrors the production path.
// ============================================================================

const AsyncStorage = require('@react-native-async-storage/async-storage');

const PATIENT_ID = 'default';
const TEST_DATE = '2026-05-08';

beforeEach(async () => {
  if (AsyncStorage.__resetStore) AsyncStorage.__resetStore();
});

import { applyCarePlanTemplate } from '../../utils/applyCarePlanTemplate';
import { CARE_PLAN_TEMPLATES } from '../../constants/carePlanTemplates';
import { ensureDailyInstances } from '../../services/carePlanGenerator';
import { logInstanceCompletion } from '../../storage/carePlanRepo';
import { buildDayNarrative } from '../../utils/narrativeSummaryBuilder';
import { saveEvent } from '../../storage/eventRepo';

const generalWellness = CARE_PLAN_TEMPLATES.find((t) => t.id === 'general-wellness')!;

describe('Phase 5.13.5 Stage 1 — buildDayNarrative reflects instance completions', () => {
  describe('Setup: General Wellness + 3 instance completions via logInstanceCompletion', () => {
    let narrative: Awaited<ReturnType<typeof buildDayNarrative>>;
    let completedTypes: string[];

    beforeAll(async () => {
      if (AsyncStorage.__resetStore) AsyncStorage.__resetStore();
      await applyCarePlanTemplate(generalWellness, PATIENT_ID);
      const instances = await ensureDailyInstances(PATIENT_ID, TEST_DATE);

      // Pick three instances spanning wellness + meals + (sleep or activity).
      // General Wellness doesn't enable meds/vitals, but the spec language
      // ("spanning meds + vitals + wellness types") is template-dependent —
      // with this template we get wellness/meals/sleep/activity instead.
      // The bug surfaces for ALL non-meds types; spanning three of them
      // matches the spec's intent of "at least 3 instances spanning multiple
      // types of completion."
      const byType = (t: string) => instances.find((i) => i.itemType === t);
      const wellnessInstance = byType('wellness');
      const nutritionInstance = byType('nutrition');
      const sleepInstance = byType('sleep') || byType('activity');

      completedTypes = [];
      if (wellnessInstance) {
        await logInstanceCompletion(PATIENT_ID, TEST_DATE, wellnessInstance.id, 'completed');
        completedTypes.push('wellness');
      }
      if (nutritionInstance) {
        await logInstanceCompletion(PATIENT_ID, TEST_DATE, nutritionInstance.id, 'completed');
        completedTypes.push('nutrition');
      }
      if (sleepInstance) {
        await logInstanceCompletion(PATIENT_ID, TEST_DATE, sleepInstance.id, 'completed');
        completedTypes.push(sleepInstance.itemType);
      }

      narrative = await buildDayNarrative(TEST_DATE, { factualOnly: true });
    });

    it('precondition: at least 3 instances were completed via logInstanceCompletion', () => {
      expect(completedTypes.length).toBeGreaterThanOrEqual(3);
    });

    // -------------------------------------------------------------------------
    // Contract A — buildDayNarrative reflects completions.
    // -------------------------------------------------------------------------
    it('Contract A: narrative.hasData is true when only the log/instance path was used', () => {
      expect(narrative.hasData).toBe(true);
    });

    it('Contract A: narrative.summary contains a count line for at least one completed type', () => {
      // The factualOnly summary should mention at least one of the types we
      // just completed. Each match must indicate a positive count line, not
      // the empty-day fallback ("No activity was logged on this day.") which
      // contains the bare word "activity".
      const summary = narrative.summary || '';
      const matchesSome =
        /\bmedications? logged/i.test(summary) ||
        /vitals reading/i.test(summary) ||
        /wellness check/i.test(summary) ||
        /\bmeals?\b.*logged/i.test(summary) ||
        /sleep logged/i.test(summary) ||
        /activity logged/i.test(summary);
      expect({ summary, matchesSome }).toEqual({ summary, matchesSome: true });
    });

    // -------------------------------------------------------------------------
    // Contract B — pill counts include completed instances.
    // -------------------------------------------------------------------------
    it('Contract B: narrative.summaryPills.length > 0 when only the log/instance path was used', () => {
      expect(narrative.summaryPills.length).toBeGreaterThan(0);
    });

    it('Contract B: at least one pill reflects a completed type', () => {
      const labels = narrative.summaryPills.map((p) => p.label.toLowerCase()).join(' | ');
      const matchesSome =
        /meds|medications/.test(labels) ||
        /vitals/.test(labels) ||
        /wellness/.test(labels) ||
        /meal/.test(labels) ||
        /sleep/.test(labels) ||
        /activity/.test(labels);
      expect({ labels, matchesSome }).toEqual({ labels, matchesSome: true });
    });
  });

  // ---------------------------------------------------------------------------
  // Contract C — backward-compat with event-repo path.
  // ---------------------------------------------------------------------------
  describe('Contract C: event-repo path remains the source of truth', () => {
    it('narrative reflects an event written directly to the event repo (no instance)', async () => {
      // No template applied → no instances. Write one wellness_check event
      // directly. The narrative must surface it; the fix in Stage 2 must
      // extend, not replace, the event-repo read path.
      await saveEvent({
        type: 'wellness_check',
        timestamp: `${TEST_DATE}T09:00:00.000Z`,
        patientId: PATIENT_ID,
        status: 'completed',
      } as any);

      const narrative = await buildDayNarrative(TEST_DATE, { factualOnly: true });
      expect(narrative.hasData).toBe(true);
      expect(narrative.summary).toMatch(/wellness/i);
    });
  });
});
