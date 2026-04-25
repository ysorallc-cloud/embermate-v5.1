// ============================================================================
// CARE CIRCLE TEASER — Visibility logic for the v7 pre-launch card
// Shows to invested users (14+ days of activity) who haven't dismissed
// or already joined the early-access list.
// ============================================================================

import { getDaysOfData } from './baselineStorage';
import { safeGetItem } from './safeStorage';

const DISMISSED_KEY = 'embermate.careCircle.teaserDismissed';
const JOINED_KEY = 'embermate.careCircle.earlyAccessJoined';
const MIN_DAYS = 14;

/**
 * Should the Care Circle teaser card be visible?
 *
 * Returns true only for invested users (14+ days of logged activity)
 * who haven't dismissed the card or already joined the early-access list.
 */
export async function shouldShowTeaser(): Promise<boolean> {
  const [days, dismissed, joined] = await Promise.all([
    getDaysOfData(),
    safeGetItem<string | null>(DISMISSED_KEY, null),
    safeGetItem<string | null>(JOINED_KEY, null),
  ]);

  if (days < MIN_DAYS) return false;
  if (dismissed === 'true') return false;
  if (joined === 'true') return false;

  return true;
}
