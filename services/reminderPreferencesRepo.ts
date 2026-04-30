// ============================================================================
// REMINDER PREFERENCES REPO
//
// Single source of truth for the v6.7 Reminders settings cluster (timing,
// quiet hours, sound). Pure CRUD over AsyncStorage — the notification
// scheduler reads from here when computing offsets and suppression windows.
//
// Migration: any pre-existing notification settings under the legacy keys
// (notificationsEnabled / notificationDefaultMinutes / quietHoursStart) are
// folded into the new shape on first read. The legacy keys stay in place
// untouched so a rollback would still find them.
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logError } from '../utils/devLog';

const STORAGE_KEY = '@embermate_reminder_preferences_v1';

// `null` means "off" — the notification is suppressed entirely.
export type AdvanceMinutes = 0 | 5 | 15 | 30 | 60 | null;

export type SoundChoice = 'gentle' | 'standard' | 'silent';

export interface PerCategoryAdvance {
  medications: AdvanceMinutes;
  vitals: AdvanceMinutes;
  wellness: AdvanceMinutes;
  meals: AdvanceMinutes;
  /** v7 placeholder — set but unused in v6.7. */
  appointments: AdvanceMinutes;
}

export interface PerCategoryEscalation {
  medications: boolean;
  vitals: boolean;
  wellness: boolean;
  meals: boolean;
}

export interface QuietHoursPreferences {
  enabled: boolean;
  /** 0–23. */
  startHour: number;
  endHour: number;
  weekendsOnly: boolean;
  /** Critical reminders (e.g., past-window medications) bypass quiet hours when true. */
  allowCritical: boolean;
}

export interface ReminderPreferences {
  smartTiming: boolean;
  perCategoryAdvance: PerCategoryAdvance;
  perCategoryEscalation: PerCategoryEscalation;
  quietHours: QuietHoursPreferences;
  sound: SoundChoice;
  respectSystemDND: boolean;
}

export const DEFAULT_REMINDER_PREFERENCES: ReminderPreferences = {
  smartTiming: false,
  perCategoryAdvance: {
    medications: 5,
    vitals: 5,
    wellness: 0,
    meals: null,
    appointments: 60,
  },
  perCategoryEscalation: {
    medications: true,
    vitals: false,
    wellness: false,
    meals: false,
  },
  quietHours: {
    enabled: true,
    startHour: 22,
    endHour: 7,
    weekendsOnly: false,
    allowCritical: true,
  },
  sound: 'gentle',
  respectSystemDND: true,
};

// Deep-merge a partial update into the full shape so callers can patch a
// single nested field without rebuilding the whole object.
function mergePreferences(
  base: ReminderPreferences,
  patch: Partial<ReminderPreferences>,
): ReminderPreferences {
  return {
    ...base,
    ...patch,
    perCategoryAdvance: { ...base.perCategoryAdvance, ...(patch.perCategoryAdvance ?? {}) },
    perCategoryEscalation: { ...base.perCategoryEscalation, ...(patch.perCategoryEscalation ?? {}) },
    quietHours: { ...base.quietHours, ...(patch.quietHours ?? {}) },
  };
}

// Light migration from the legacy notification-settings shape if present.
async function migrateLegacy(): Promise<Partial<ReminderPreferences> | null> {
  try {
    const raw = await AsyncStorage.getItem('@embermate_notification_settings');
    if (!raw) return null;
    const legacy = JSON.parse(raw);
    const patch: Partial<ReminderPreferences> = {};
    if (legacy?.defaultMinutesBefore != null) {
      const m = legacy.defaultMinutesBefore as number;
      const advance: AdvanceMinutes =
        m >= 60 ? 60 : m >= 30 ? 30 : m >= 15 ? 15 : m >= 5 ? 5 : 0;
      patch.perCategoryAdvance = {
        medications: advance,
        vitals: advance,
        wellness: 0,
        meals: null,
        appointments: 60,
      };
    }
    if (legacy?.quietHoursEnabled === true || typeof legacy?.quietHoursStart === 'number') {
      patch.quietHours = {
        enabled: legacy.quietHoursEnabled ?? true,
        startHour: legacy.quietHoursStart ?? 22,
        endHour: legacy.quietHoursEnd ?? 7,
        weekendsOnly: false,
        allowCritical: true,
      };
    }
    if (legacy?.sound && ['gentle', 'standard', 'silent'].includes(legacy.sound)) {
      patch.sound = legacy.sound;
    }
    return patch;
  } catch (error) {
    logError('reminderPreferencesRepo.migrateLegacy', error);
    return null;
  }
}

export async function getReminderPreferences(): Promise<ReminderPreferences> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return mergePreferences(DEFAULT_REMINDER_PREFERENCES, parsed);
    }
    // First read — fold any legacy notification settings in once and persist.
    const legacy = await migrateLegacy();
    if (legacy) {
      const merged = mergePreferences(DEFAULT_REMINDER_PREFERENCES, legacy);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      return merged;
    }
    return DEFAULT_REMINDER_PREFERENCES;
  } catch (error) {
    logError('reminderPreferencesRepo.getReminderPreferences', error);
    return DEFAULT_REMINDER_PREFERENCES;
  }
}

export async function updateReminderPreferences(
  patch: Partial<ReminderPreferences>,
): Promise<ReminderPreferences> {
  const current = await getReminderPreferences();
  const merged = mergePreferences(current, patch);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch (error) {
    logError('reminderPreferencesRepo.updateReminderPreferences', error);
  }
  return merged;
}

export async function resetReminderPreferences(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    logError('reminderPreferencesRepo.resetReminderPreferences', error);
  }
}

// Test-only export — surface the merger so unit tests can verify it
// independently of storage I/O.
export const __testing = { mergePreferences };
