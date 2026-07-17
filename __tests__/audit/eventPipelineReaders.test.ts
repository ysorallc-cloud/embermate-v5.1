// ============================================================================
// Phase 11.7.5 — events-pipeline reader audit (post-Phase 11.7).
//
// Two related audits:
//
//   (A) getDailyOutcomes consumers must pair with a useDataListener
//       so the outcomes state refreshes on instance-pipeline writes.
//       11.7.1 fixed app/(tabs)/journal.tsx; this audit pins that
//       no NEW consumers slip in without the listener.
//
//   (B) Inventory of events-only readers across the codebase. Phase
//       11.7.4 migrated UpcomingVisitInsightsCard to a union read.
//       Other surfaces still on the events-only path are documented
//       below — they may share the same bug class, but a fix per
//       surface is its own scoped commit (out of 11.7 scope per the
//       phase plan: "Don't extract the union helper as a side
//       effect of 11.7. Trigger has fired multiple times but the
//       extraction is paired with the canonical refactor work").
//
// The audit is forward-looking: a future commit migrating any of the
// listed surfaces should remove its name from the documented-readers
// list AND add a per-surface contract.
// ============================================================================

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');

function* walkSourceFiles(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.git' || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      yield* walkSourceFiles(full);
    } else if (/\.(tsx?|jsx?)$/.test(entry) && !full.includes(`${ROOT}/__tests__`)) {
      yield full;
    }
  }
}

function readSrc(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

// ----------------------------------------------------------------------------
// Audit A — getDailyOutcomes consumers must pair with useDataListener
// ----------------------------------------------------------------------------

describe('Phase 11.7.5 — getDailyOutcomes consumers paired with useDataListener', () => {
  const consumers: string[] = [];
  for (const dir of ['app', 'components', 'hooks']) {
    for (const file of walkSourceFiles(join(ROOT, dir))) {
      const src = readFileSync(file, 'utf8');
      if (/\bgetDailyOutcomes\s*\(/.test(src)) {
        consumers.push(file.replace(`${ROOT}/`, ''));
      }
    }
  }

  it('discovered the expected consumer set (journal.tsx only at Phase 11.7 close)', () => {
    // 11.7.1 fixed the only known consumer. New consumers should be
    // added to this expected set AND must pair with the listener.
    expect(consumers).toEqual(['app/(tabs)/journal.tsx']);
  });

  for (const consumer of consumers) {
    it(`${consumer}: also imports useDataListener (refresh-on-event paired)`, () => {
      const src = readSrc(consumer);
      // Pin: every getDailyOutcomes consumer must import
      // useDataListener so outcomes refresh on instance-pipeline
      // writes. Without it, the staleness bug 11.7.1 fixed returns.
      expect(src).toMatch(/import\s*\{[^}]*\buseDataListener\b[^}]*\}\s*from\s*['"][^'"]+\/lib\/events['"]/);
    });

    it(`${consumer}: a refresh call site exists for getDailyOutcomes`, () => {
      const src = readSrc(consumer);
      // The previous contract pinned that useDataListener is
      // imported. This contract pins that the file ALSO contains
      // a refresh call site — either calling getDailyOutcomes
      // directly inside a listener handler, or via a wrapper named
      // refreshOutcomes (the convention 11.7.1 established).
      // Lazy-paren matching across the listener body is brittle
      // (inner parens close the regex early), so we just pin the
      // call site exists in the file and rely on code review for
      // listener-handler placement.
      expect(src).toMatch(/\brefreshOutcomes\s*\(\s*\)/);
    });
  }
});

// ----------------------------------------------------------------------------
// Audit B — events-only readers inventory (forward-looking documentation)
// ----------------------------------------------------------------------------

// Each entry is a surface that still reads ONLY from
// getEventsByDateRange (no paired listDailyInstancesRange / instance
// pipeline read). Same bug class as Phase 5.13.5 / 11.5.1 / 11.7.4
// fixed elsewhere — sample-data writes that flow through the
// instance pipeline are invisible to these readers.
//
// Documented here so the inventory is grep-able and future migration
// commits can remove entries one at a time. Out of Phase 11.7 scope
// per the phase plan; the canonical-storage refactor in Phase 17
// either retires these or migrates them in bulk.
const EVENT_ONLY_READERS_DOCUMENTED = [
  // You tab — reads mood_logged events for the caregiver's own check-in
  // history (the MoodStrip). The /caregiver-wellness sub-screen that formerly
  // owned this read was retired in the You-tab restructure; the You tab is now
  // the event-only mood reader (getEventsByDateRange in refreshMoodDays).
  'app/(tabs)/support.tsx',

  // Nearby-days-with-records hook — drives JournalEmptyDay's
  // "nearby days" continuity affordance. Events-only; instance-only
  // days won't surface as "having records". Same bug class as
  // 11.7.4. Fix shape: mirror computeDataCoverage's union pattern.
  'hooks/useNearbyDaysWithRecords.ts',

  // Visit Prep hydration/nutrition section — reads meal_logged
  // events. Sample-data meals go through the instance pipeline
  // (itemType === 'nutrition'), so this section is empty in
  // sample-data mode. Fix shape: union with itemType === 'nutrition'
  // completed instances.
  'services/hydrationNutrition.ts',

  // Visit Prep symptom progression — reads symptom_reported events.
  // Symptoms are stored as events (via saveSymptom + emit), so
  // this is event-pipeline-correct. Listed for completeness.
  'services/symptomChangeDetection.ts',

  // Visit Prep functional issues — reads multiple event types for
  // accessibility/mobility cues. Most of those event types do not
  // have an instance counterpart, so this is largely
  // event-pipeline-correct. Listed for completeness.
  'services/functionalIssueExtraction.ts',

  // Journal "What changed today" — reads events for day-level
  // change detection. Event-level deltas are the conceptual unit
  // here; instance-pipeline data wouldn't change the shape of the
  // detection. Listed for completeness.
  'services/dayLevelChanges.ts',

  // Generic events hook — primitive infrastructure for any event-
  // pipeline reader. Not a surface; consumers wrap or query it.
  'hooks/useEvents.ts',
] as const;

describe('Phase 11.7.5 — events-only readers inventory (documentation)', () => {
  it('all documented event-only reader files exist on disk', () => {
    // If a documented file is removed, the audit still passes (no
    // entry to verify), but the comment in this test reminds the
    // reader to keep the inventory current.
    for (const rel of EVENT_ONLY_READERS_DOCUMENTED) {
      const full = join(ROOT, rel);
      expect(() => statSync(full)).not.toThrow();
    }
  });

  it('documented event-only readers actually call getEventsByDateRange', () => {
    // Pin that the inventory accurately reflects current reads.
    // Drift here means the inventory is stale.
    for (const rel of EVENT_ONLY_READERS_DOCUMENTED) {
      const src = readSrc(rel);
      expect(src).toMatch(/getEventsByDateRange\b/);
    }
  });

  it('UpcomingVisitInsightsCard is NOT in the inventory (migrated in 11.7.4)', () => {
    // Regression-pin: 11.7.4 added a union read via
    // utils/visitCoverage. The card itself still imports
    // getEventsByDateRange but pairs it with listDailyInstancesRange.
    // Listing it would falsely flag the migration as undone.
    const inventory = EVENT_ONLY_READERS_DOCUMENTED as readonly string[];
    expect(
      inventory.includes('components/insights/UpcomingVisitInsightsCard.tsx'),
    ).toBe(false);
  });
});
