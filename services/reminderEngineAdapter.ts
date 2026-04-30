// ============================================================================
// REMINDER ENGINE ADAPTER
//
// Thin translator between v6.7 ReminderPreferences and the per-instance
// scheduling shape the existing notification engine
// (utils/notificationService.ts) consumes. Lets the new Reminders settings
// drive per-category advance offsets, quiet-hours suppression, and sound
// channel selection without rewriting the engine in place — the engine
// just calls into this helper for its inputs.
// ============================================================================

import {
  type ReminderPreferences,
  type AdvanceMinutes,
  type SoundChoice,
  type PerCategoryAdvance,
  getReminderPreferences,
} from './reminderPreferencesRepo';

export type ReminderCategory = keyof PerCategoryAdvance;

/** Maps a CarePlanItem.type → the category whose advance setting governs it. */
const ITEM_TYPE_TO_CATEGORY: Record<string, ReminderCategory> = {
  medication: 'medications',
  vitals: 'vitals',
  wellness: 'wellness',
  nutrition: 'meals',
  meal: 'meals',
  appointment: 'appointments',
};

/** Resolve the advance-minutes setting for a given item type. */
export function advanceMinutesForCategory(
  prefs: ReminderPreferences,
  itemType: string,
): AdvanceMinutes {
  const category = ITEM_TYPE_TO_CATEGORY[itemType];
  if (!category) return prefs.perCategoryAdvance.medications; // sensible fallback
  return prefs.perCategoryAdvance[category];
}

/**
 * Compute the trigger time for a reminder, honouring the per-category
 * advance. Returns null when the category is set to "off".
 */
export function computeTriggerTime(
  prefs: ReminderPreferences,
  scheduledTime: Date,
  itemType: string,
): Date | null {
  const advance = advanceMinutesForCategory(prefs, itemType);
  if (advance == null) return null;
  return new Date(scheduledTime.getTime() - advance * 60 * 1000);
}

/**
 * Should the reminder be suppressed because the trigger time falls inside
 * the user's quiet hours? Critical reminders bypass when allowCritical is
 * on and the caller passes `critical: true`.
 *
 * The window can wrap midnight (start=22, end=7) — both halves are honoured.
 */
export function isInQuietHours(
  prefs: ReminderPreferences,
  triggerTime: Date,
  options: { critical?: boolean } = {},
): boolean {
  const q = prefs.quietHours;
  if (!q.enabled) return false;
  if (options.critical && q.allowCritical) return false;
  const day = triggerTime.getDay();
  const isWeekend = day === 0 || day === 6;
  if (q.weekendsOnly && !isWeekend) return false;

  const hour = triggerTime.getHours();
  if (q.startHour <= q.endHour) {
    return hour >= q.startHour && hour < q.endHour;
  }
  // Wrap-around (e.g. 22:00 → 07:00 next day).
  return hour >= q.startHour || hour < q.endHour;
}

/**
 * Resolve the iOS notification sound name for the user's preference.
 * Returns undefined when 'silent' so the platform falls through to vibration.
 */
export function resolveSoundName(sound: SoundChoice): string | undefined {
  switch (sound) {
    case 'gentle':
      // The actual gentle.caf asset would be bundled when the engine wiring
      // ships; for v6.7 we map to the iOS default until then.
      return 'default';
    case 'standard':
      return 'default';
    case 'silent':
      return undefined;
  }
}

/**
 * Async convenience wrapper — the engine's hot path can call this to get a
 * ready-to-schedule descriptor without juggling the prefs object itself.
 */
export async function resolveReminderPlan(
  scheduledTime: Date,
  itemType: string,
  options: { critical?: boolean } = {},
): Promise<{
  triggerTime: Date;
  sound: string | undefined;
  shouldSchedule: boolean;
} | { shouldSchedule: false; reason: 'off' | 'quiet-hours' | 'past' }> {
  const prefs = await getReminderPreferences();
  const triggerTime = computeTriggerTime(prefs, scheduledTime, itemType);
  if (!triggerTime) return { shouldSchedule: false, reason: 'off' };
  if (triggerTime.getTime() <= Date.now() + 30_000) {
    return { shouldSchedule: false, reason: 'past' };
  }
  if (isInQuietHours(prefs, triggerTime, options)) {
    return { shouldSchedule: false, reason: 'quiet-hours' };
  }
  return {
    triggerTime,
    sound: resolveSoundName(prefs.sound),
    shouldSchedule: true,
  };
}
