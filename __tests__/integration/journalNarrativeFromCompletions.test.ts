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

      // Phase 34 F4 reframe — pre-F4 this completed wellness + meals +
      // (sleep OR activity). F4 makes sleep/activity/water v1-hidden, so
      // those instances no longer generate; General Wellness now yields
      // only the v1-visible buckets (wellness + meals, where meals is
      // breakfast/lunch/dinner). That's still ≥3 instances — wellness
      // (morning+evening) + 3 nutrition slots — so the "≥3 completions
      // spanning multiple instances" intent holds. We complete the first
      // three GENERATED instances (all v1-visible by construction, since
      // hidden buckets don't generate) rather than hand-picking types
      // that may be suppressed. Robust to F4 + future hide changes.
      const toComplete = instances.slice(0, 3);
      completedTypes = [];
      for (const inst of toComplete) {
        await logInstanceCompletion(PATIENT_ID, TEST_DATE, inst.id, 'completed');
        completedTypes.push(inst.itemType);
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
