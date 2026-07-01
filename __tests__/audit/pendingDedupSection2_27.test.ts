// ============================================================================
// Phase 27 F3 — Pending dedup contract for Section 2 (Objective).
//
// REPRODUCTION (failing contract written BEFORE the dedup fix).
//
// Symptom (device-confirmed F1 simulator gate, 2026-05-21): pending
// medications (Warfarin "5:00 PM — not yet" and Gabapentin) currently
// appear in BOTH Section 2 "What was logged" AND Section 4 "For the next
// caregiver → Still Pending". Same per-event data surfaced twice across
// the SOAP arc.
//
// Banked Journal-cleanup canon: pending shows ONCE, in Section 4's
// "Still pending" list. Section 2 lists logged-only events; pending
// rows get suppressed there.
//
// Root cause: three of the four Section-2 narratives render pending
// status today:
//   • MedicationsNarrative — pending → "scheduled time — not yet"
//   • VitalsNarrative      — scheduled-not-recorded → "Check vitals
//                            scheduled for {time} — not yet recorded."
//   • MealsNarrative       — pending → "{names} scheduled." copy line
//   • MoodWellnessNarrative — no pending surfaces (no fix needed)
//
// Fix path: each narrative gains a `loggedOnly` prop. When true, it
// filters out pending entries before rendering. Section 2 in
// journal.tsx passes `loggedOnly` to every narrative consumer.
//
// AFTER F2's narrative + Section 2 refactor, all assertions go green.
// Until then, this test stands as the reproduction.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');

const journalSrc = readFileSync(join(ROOT, 'app/(tabs)/journal.tsx'), 'utf8');
const medsNarrativeSrc = readFileSync(
  join(ROOT, 'components/journal/MedicationsNarrative.tsx'),
  'utf8',
);
const vitalsNarrativeSrc = readFileSync(
  join(ROOT, 'components/journal/VitalsNarrative.tsx'),
  'utf8',
);
const mealsNarrativeSrc = readFileSync(
  join(ROOT, 'components/journal/MealsNarrative.tsx'),
  'utf8',
);

// Strip comments so commit-narrative mentions of `loggedOnly` don't
// false-positive against the actual prop declaration / consumption.
function strip(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const journalStripped = strip(journalSrc);
const medsStripped = strip(medsNarrativeSrc);
const vitalsStripped = strip(vitalsNarrativeSrc);
const mealsStripped = strip(mealsNarrativeSrc);

describe('Phase 27 F3 — pending dedup (Section 2 logged-only)', () => {
  // --------------------------------------------------------------------------
  // Narrative API — each pending-surfacing narrative MUST accept loggedOnly
  // --------------------------------------------------------------------------

  it('MedicationsNarrative declares a `loggedOnly` prop in its Props interface', () => {
    // The prop is the dedup hook — without it the narrative has no
    // way to suppress pending rows. Declaration in the Props
    // interface (not just usage somewhere) makes the API explicit and
    // catches accidental removal.
    expect(medsStripped).toMatch(/loggedOnly\??\s*:\s*boolean/);
  });

  it('VitalsNarrative declares a `loggedOnly` prop in its Props interface', () => {
    expect(vitalsStripped).toMatch(/loggedOnly\??\s*:\s*boolean/);
  });

  it('MealsNarrative declares a `loggedOnly` prop in its Props interface', () => {
    expect(mealsStripped).toMatch(/loggedOnly\??\s*:\s*boolean/);
  });

  // --------------------------------------------------------------------------
  // Narrative behavior — loggedOnly must drive a pending filter
  // --------------------------------------------------------------------------

  it('MedicationsNarrative gates the "not yet" pending-status branch on !loggedOnly', () => {
    // Pre-F3 MedicationsNarrative renders all four statuses
    // (completed / pending / skipped / missed). The pending branch
    // produces "scheduled time — not yet" — the exact text the device
    // gate showed duplicated. Post-F3 the source must reference
    // loggedOnly in a guard that suppresses the pending render path.
    // Implementation flexibility: filter / conditional / status-check
    // — any shape that leaves loggedOnly textually adjacent to a
    // `pending` reference satisfies the contract.
    const usesLoggedOnlyNearPending =
      /loggedOnly[\s\S]{0,300}\bpending\b/.test(medsStripped) ||
      /\bpending\b[\s\S]{0,300}loggedOnly/.test(medsStripped);
    expect(usesLoggedOnlyNearPending).toBe(true);
  });

  it('VitalsNarrative gates the "scheduled / not yet recorded" branch on !loggedOnly', () => {
    // Pre-F3 renders "Check vitals scheduled for {time} — not yet
    // recorded." in the scheduled-not-recorded branch. Post-F3 the
    // branch must be guarded by loggedOnly (i.e., when loggedOnly,
    // skip the scheduled-only render and return null).
    const usesLoggedOnlyNearScheduled =
      /loggedOnly[\s\S]{0,300}scheduled/i.test(vitalsStripped) ||
      /scheduled[\s\S]{0,300}loggedOnly/i.test(vitalsStripped);
    expect(usesLoggedOnlyNearScheduled).toBe(true);
  });

  it('MealsNarrative gates the pending "scheduled" copy on !loggedOnly', () => {
    // Pre-F3 the meals narrative includes pending meals in the
    // "{names} scheduled." copy line. Post-F3 the pending branch
    // collapses when loggedOnly.
    const usesLoggedOnlyNearPending =
      /loggedOnly[\s\S]{0,400}pending/i.test(mealsStripped) ||
      /pending[\s\S]{0,400}loggedOnly/i.test(mealsStripped);
    expect(usesLoggedOnlyNearPending).toBe(true);
  });

  // --------------------------------------------------------------------------
  // journal.tsx Section 2 — must pass loggedOnly to every narrative
  // --------------------------------------------------------------------------

  // Journal rebuild S2 (journal-aligned) — the loggedOnly narratives are
  // RETIRED from §2. The middle "What was logged" now renders explicit log
  // rows (JournalLoggedRows) that surface pending items AS gold "Due" rows
  // (and missed as coral rows) — pending is no longer suppressed/deduped, it's
  // shown in the record, matching the mockup. So the per-narrative loggedOnly
  // wiring in journal.tsx is gone. (The narrative components keep their
  // loggedOnly prop for other consumers — the 6 component-level contracts
  // above still pass.)
  it('journal.tsx §2 no longer wires the loggedOnly narratives (log rows replace them)', () => {
    expect(journalStripped).not.toMatch(/<MedicationsNarrative[\s\S]{0,200}loggedOnly/);
    expect(journalStripped).not.toMatch(/<VitalsNarrative[\s\S]{0,200}loggedOnly/);
    expect(journalStripped).not.toMatch(/<MealsNarrative[\s\S]{0,200}loggedOnly/);
    // pending surfaces in the record now, via the stamped log rows
    expect(journalStripped).toMatch(/<JournalLoggedRows/);
  });

  // --------------------------------------------------------------------------
  // Section 2 empty-state copy — present in source (Q-27.9 lock)
  // --------------------------------------------------------------------------

  it('Section 2 carries warm empty-state copy for all-pending days (Q-27.9)', () => {
    // R5 / Q-27.9 lock: when nothing is logged yet today (all rows
    // gate off after pending dedup), Section 2 renders a warm empty-
    // state line in witness voice — NOT a collapsed blank. The exact
    // copy is implementation-decided (e.g., "Nothing logged yet today")
    // but must exist in source for the empty-state branch to render.
    // Source-grep on a sentinel substring ("Nothing logged" suggested
    // default).
    expect(journalStripped).toMatch(/Nothing logged/i);
  });
});
