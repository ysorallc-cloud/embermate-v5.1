// ============================================================================
// CARE WINDOW RULES — pure, LEAF-level constants/functions for the
// missed-vs-pending windowed-boundary rule. Imports nothing from
// carePlanGenerator or carePlanRepo — no storage access, no I/O, data in /
// data out only. Safe for both to import without risk of a cycle.
//
// EXTRACTED (stale-status-write-class closeout, PART A follow-up): Part A
// gave carePlanRepo.undoInstanceCompletion a real dependency on
// getCareItemStatus (utils/careItemStatus.ts), which itself imported these
// two symbols from services/carePlanGenerator.ts — and carePlanGenerator.ts
// already imports from storage/carePlanRepo.ts. That's a genuine cycle:
//   carePlanRepo -> careItemStatus -> carePlanGenerator -> carePlanRepo
// It resolved cleanly under Jest/CommonJS (neither side touches the other's
// exports at module-top-level, only inside function bodies called later),
// but that's not evidence for Metro/Hermes in a release build — a
// partially-initialized module reference on a particular init order is the
// classic circular-import failure mode, and this sits in the undo path of a
// care-data app. Removed rather than verified. Both MISSED_GRACE_PERIOD_
// MINUTES and getDefaultWindowEnd were already pure (a constant, and a
// switch over TimeWindowLabel/DEFAULT_TIME_WINDOWS) — moving them here
// needed no storage access, so the extraction was straightforward.
//
// carePlanGenerator.ts, careItemStatus.ts, and carePlanRepo.ts (via
// careItemStatus.ts) all import from here now — single source of truth,
// not three copies.
// ============================================================================

import { DEFAULT_TIME_WINDOWS, type TimeWindowLabel } from '../types/carePlan';

/** Grace period in minutes before marking as missed (after the window END).
 *  Shared by the WRITER (carePlanGenerator's missed-check) and the READER
 *  (careItemStatus's live-derived overdue cutoff) — both must agree, or an
 *  item is persisted 'missed' at a different instant than the screen would
 *  derive. */
export const MISSED_GRACE_PERIOD_MINUTES = 120; // 2 hours

/** Default end time for a window label. */
export function getDefaultWindowEnd(label: TimeWindowLabel): string {
  switch (label) {
    case 'morning': return DEFAULT_TIME_WINDOWS.morning.end;
    case 'afternoon': return DEFAULT_TIME_WINDOWS.afternoon.end;
    case 'evening': return DEFAULT_TIME_WINDOWS.evening.end;
    case 'night': return DEFAULT_TIME_WINDOWS.night.end;
    default: return '17:00';
  }
}
