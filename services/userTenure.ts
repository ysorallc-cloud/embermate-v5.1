// ============================================================================
// USER TENURE
//
// Drives the time-decay pattern for educational scaffolding (Prompt 6).
// Phases:
//   • new        — 0–30 days since install
//   • experienced — 31–90 days
//   • seasoned   — 91+ days
//
// Stop-condition behaviour: when the install timestamp is missing (e.g. the
// user reset onboarding, or restored from a backup that predates this
// field), the service defaults to 'experienced' so we don't re-show the
// new-caregiver scaffolding to someone who's clearly past it.
// ============================================================================

import { safeGetItem, safeSetItem } from '../utils/safeStorage';
import { logError } from '../utils/devLog';

export const USER_INSTALLED_AT_KEY = '@embermate_user_installed_at_v1';

export type TenurePhase = 'new' | 'experienced' | 'seasoned';

export interface UserTenure {
  /** Days since install. -1 when the install date is missing. */
  days: number;
  phase: TenurePhase;
  /** ISO timestamp of first install — null when missing or malformed. */
  installedAt: string | null;
}

const NEW_DAYS = 30;
const EXPERIENCED_DAYS = 90;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Calendar-day diff between two dates, indifferent to DST. Anchors both
 * inputs to UTC midnight so a 1-hour spring-forward over the period doesn't
 * accidentally lop a day off the count.
 */
function calendarDaysBetween(start: Date, end: Date): number {
  const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.floor((endUtc - startUtc) / MS_PER_DAY);
}

function parseInstalledAt(raw: string | null, now: Date): Date | null {
  if (!raw) return null;
  const parsed = new Date(raw);
  if (isNaN(parsed.getTime())) return null;
  // Future dates are clock-skew nonsense; treat as missing.
  if (parsed.getTime() > now.getTime()) return null;
  return parsed;
}

/**
 * Resolve the caller's tenure phase against `now`. Pass `now` for
 * deterministic tests; production callers can omit it.
 */
export async function getUserTenure(now: Date = new Date()): Promise<UserTenure> {
  let raw: string | null = null;
  try {
    raw = await safeGetItem<string | null>(USER_INSTALLED_AT_KEY, null);
  } catch (err) {
    logError('userTenure.read', err);
  }

  const installed = parseInstalledAt(raw, now);
  if (!installed) {
    return {
      days: -1,
      // Stop condition — missing data defaults to 'experienced' so
      // long-time users restoring from backup don't get re-onboarded.
      phase: 'experienced',
      installedAt: null,
    };
  }

  const days = calendarDaysBetween(installed, now);
  const phase: TenurePhase = days <= NEW_DAYS
    ? 'new'
    : days <= EXPERIENCED_DAYS
      ? 'experienced'
      : 'seasoned';

  return {
    days,
    phase,
    installedAt: installed.toISOString(),
  };
}

/**
 * Write the install timestamp if absent. Idempotent — calling on every app
 * launch is safe; subsequent calls are no-ops.
 */
export async function markInstalledIfMissing(nowMs: number = Date.now()): Promise<void> {
  try {
    const existing = await safeGetItem<string | null>(USER_INSTALLED_AT_KEY, null);
    if (existing) return;
    await safeSetItem(USER_INSTALLED_AT_KEY, new Date(nowMs).toISOString());
  } catch (err) {
    logError('userTenure.mark', err);
  }
}
