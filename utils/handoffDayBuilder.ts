// ============================================================================
// HANDOFF DAY BUILDER — Phase 31.
//
// Single source of truth for the Journal Share PDF body. Bundles the
// four DATE-KEYED feeders that the Journal page already renders, so
// the on-screen day and the shared PDF can never drift:
//
//   Section 1 (Subjective) — buildShapeOfDay(date).summary
//   Section 2 (Objective)  — buildCareBrief(date).medications + .vitals
//                            + .meals + .sleep + .hydration
//   Section 3 (Assessment) — buildNotableMoments(date).moments
//   Section 4 (Plan)       — getConsolidatedNotes(date).text
//
// Replaces the pre-31 path through utils/handoffReportBuilder, which
// was today-hardcoded and produced a curated, sparse template that
// never itemized meds or surfaced vitals readings.
//
// Pinned by `__tests__/utils/handoffDayBuilder31.test.ts`.
// ============================================================================

import {
  buildCareBrief,
  type CareBrief,
  type MedicationDetail,
  type VitalsDetail,
  type MealsDetail,
} from './careSummaryBuilder';
import { buildShapeOfDay } from './buildShapeOfDay';
import {
  buildNotableMoments,
  type NotableMoment,
} from './notableMomentsBuilder';
import { getConsolidatedNotes } from './consolidatedNotes';
import { logError } from './devLog';

export interface HandoffDayNotes {
  text: string;
  /** ISO timestamp of the most recent save for the date's note. null when
   *  the value originated from legacy handoffToneRepo (no savedAt). */
  savedAt: string | null;
}

export interface HandoffDayPayload {
  /** YYYY-MM-DD — the calendar day this payload describes. NOT the
   *  generation time. Drives the PDF's date label. */
  date: string;
  /** Active patient's display name. Sourced from buildCareBrief
   *  (which reads patientRegistry); same name the Journal screen
   *  shows. */
  patientName: string;
  /** Section 1 gestalt sentence. Empty string when buildShapeOfDay
   *  reports hasData=false; consumers render an empty-day fallback. */
  gestalt: string;
  /** Section 2 — itemized medication instances with scheduled time,
   *  status, and (when completed) the taken-at timestamp. Same array
   *  the Journal Section 2 rows render from. */
  medications: MedicationDetail[];
  /** Section 2 — vitals scaffold + readings (BP/HR/glucose/temp/oxygen
   *  /weight). Null when the day has no vitals scheduled AND no
   *  reading recorded; consumers skip the vitals block in that case. */
  vitals: VitalsDetail | null;
  /** Section 2 — logged meals with their caregiver-entered substance
   *  (appetite + note/description). Widened into the PDF so the doctor sees
   *  what the caregiver recorded; the PDF renderer surfaces non-pending meals
   *  only. (Meals still do NOT count toward hasLoggedContent — the shareability
   *  gate stays as the Q-C scope lock; this carries CONTENT, not the gate.) */
  meals: MealsDetail;
  /** Section 3 — worth-flagging moments. Empty array when no moment
   *  fires for the date. */
  worthFlagging: NotableMoment[];
  /** Section 4 — caregiver notes via the consolidatedNotes utility
   *  (read-time merge of reflectionStorage + legacy handoffToneRepo).
   *  Null when the date has no notes at all. */
  notes: HandoffDayNotes | null;
  /** Bonus context — next upcoming appointment (or null). Lets the
   *  PDF surface a "Coming up" line without re-querying. */
  nextAppointment: CareBrief['nextAppointment'];
  /** Phase 35 Slice 3-C followup — P2 PDF-content predicate. True iff
   *  the PDF would render at least one piece of LOGGED content:
   *    • a medication with status !== 'pending' (taken/skipped/missed)
   *    • vitals with recorded === true
   *    • a non-empty caregiver note
   *    • at least one worth-flagging moment
   *  The four categories above are exactly what handoffPdf.ts's
   *  renderers emit. Mood / meals / hydration / sleep are NOT counted
   *  (Q-C lock: the handoff PDF is intentionally narrower than the
   *  Journal page — recipient-facing scope only).
   *
   *  Callers use this as the truth gate before invoking PDF generation:
   *  if false, refuse with the caregiver-facing "Nothing to share for
   *  this day yet" Alert instead of producing a real-looking but
   *  content-empty document. (Walk-surfaced bug: pre-flag, scheduled-
   *  but-pending meds + scheduled-not-recorded vitals produced a 22 KB
   *  PDF showing "Status: Pending" rows that recipients could mis-
   *  read as "the caregiver hasn't given meds today.") */
  hasLoggedContent: boolean;
}

/**
 * Bundle the four date-keyed Journal feeders into one payload for the
 * Share PDF builder. Every feeder is invoked with the same `date` arg
 * (date-threading invariant), and the return shape preserves the raw
 * data — no curation, no string templating. PDF builders own copy
 * decisions; this util owns the data contract.
 *
 * Returns null only when buildCareBrief throws (which propagates upstream
 * as a ProfileMissingError so the caller can render an actionable
 * message). All other empty states (no meds, no vitals, no moments,
 * no notes) return a coherent payload with empty arrays / null fields,
 * so the PDF builder can render an "empty day" surface without special
 * casing.
 */
export async function buildHandoffDay(
  date: string,
): Promise<HandoffDayPayload | null> {
  try {
    const [brief, shape, moments, notes] = await Promise.all([
      buildCareBrief(date),
      buildShapeOfDay(date),
      buildNotableMoments(date),
      getConsolidatedNotes(date),
    ]);

    if (!brief) return null;

    const vitalsHasContent =
      brief.vitals && (brief.vitals.scheduled || brief.vitals.recorded || brief.vitals.readings);

    // Phase 35 Slice 3-C followup — P2 PDF-content predicate.
    // Mirrors what handoffPdf.ts's renderers actually emit:
    //   • renderMedications skips status:'pending' rows visually (well,
    //     emits them; that was the bug — recipient saw "Pending" rows).
    //     For the truth gate we count ONLY logged statuses.
    //   • renderVitals emits readings only when recorded === true (the
    //     scheduled-not-recorded branch emits a "scheduled, not recorded"
    //     line; that's chrome, not logged content).
    //   • renderNotes / renderWorthFlagging both skip on empty input.
    // Mood / meals / hydration / sleep are NOT in any PDF renderer
    // (Q-C lock) and therefore NOT in this predicate.
    const meds = brief.medications ?? [];
    const hasLoggedMeds = meds.some((m) => m.status !== 'pending');
    const hasRecordedVitals = brief.vitals?.recorded === true;
    const hasNonEmptyNotes = !!notes && typeof notes.text === 'string' && notes.text.trim().length > 0;
    const flaggedMoments = moments?.moments ?? [];
    const hasFlagging = flaggedMoments.length > 0;
    const hasLoggedContent =
      hasLoggedMeds || hasRecordedVitals || hasNonEmptyNotes || hasFlagging;

    return {
      date,
      patientName: brief.patient?.name ?? 'Patient',
      gestalt: shape.hasData ? shape.summary : '',
      medications: meds,
      vitals: vitalsHasContent ? brief.vitals : null,
      meals: brief.meals ?? { total: 0, meals: [] },
      worthFlagging: flaggedMoments,
      notes: notes ? { text: notes.text, savedAt: notes.savedAt } : null,
      nextAppointment: brief.nextAppointment ?? null,
      hasLoggedContent,
    };
  } catch (err) {
    // ProfileMissingError (from buildCareBrief / patient registry) must
    // propagate so the Share CTA can render an actionable message.
    if (err instanceof Error && err.name === 'ProfileMissingError') throw err;
    logError('buildHandoffDay', err);
    throw err;
  }
}
