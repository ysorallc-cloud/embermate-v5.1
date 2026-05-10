// ============================================================================
// STILL-PENDING FORMATTER — Phase 11.8.3
//
// Pure formatting layer for the Journal Today "Still Pending" card.
// Takes the day's instance list, filters to pending, sorts by
// scheduledTime, and returns formatted display rows.
//
// Pre-fix the Journal Today view didn't surface what's still left to
// do. Caregivers opening the page mid-day saw what had happened but
// not what they still needed to handle. This formatter feeds a card
// that closes that gap so the handoff to the next caregiver is
// obvious.
//
// Extracted as a pure function so the time-formatting + sort logic
// is testable without mounting React.
// ============================================================================

import type { DailyCareInstance } from '../types/carePlan';

export interface PendingTonightItem {
  /** Stable id for React keys. */
  id: string;
  /** Display name for the row. */
  name: string;
  /** Clock label, 12-hour with AM/PM ("12:30 PM" / "8:00 AM"). */
  time: string;
  /** Raw scheduled timestamp — preserved for downstream sorts. */
  scheduledTime: string;
  /** itemType for downstream styling / filtering. */
  itemType: string;
}

function clockLabel(d: Date): string {
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12; if (h === 0) h = 12;
  return m === 0 ? `${h}:00 ${ampm}` : `${h}:${m < 10 ? '0' : ''}${m} ${ampm}`;
}

export function formatStillPendingTonight(
  instances: DailyCareInstance[],
): PendingTonightItem[] {
  const pending = instances.filter((i) => i.status === 'pending');
  // Sort by scheduledTime ascending — earliest first.
  pending.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
  return pending.map((i) => ({
    id: i.id,
    name: i.itemName,
    time: clockLabel(new Date(i.scheduledTime)),
    scheduledTime: i.scheduledTime,
    itemType: i.itemType,
  }));
}
