// ============================================================================
// DAY COMPLETE STATE
//
// "Done for today" toggle on the Journal HandoffCard. Hides the End of
// Shift card on Now until the next calendar day. Storage key is per-date so
// the next day naturally resets without a job/cron.
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { emitDataUpdate } from '../lib/events';
import { EVENT } from '../lib/eventNames';
import { getTodayDateString } from '../services/carePlanGenerator';
import { logError } from './devLog';

const KEY_PREFIX = 'dayComplete:';

function key(date: string): string {
  return `${KEY_PREFIX}${date}`;
}

/** Mark today (or a specific date) as wrapped up. */
export async function markDayComplete(date?: string): Promise<void> {
  try {
    const target = date ?? getTodayDateString();
    await AsyncStorage.setItem(key(target), 'true');
    emitDataUpdate(EVENT.WELLNESS); // wake End of Shift card listeners
  } catch (error) {
    logError('dayComplete.markDayComplete', error);
  }
}

/** True when the user has tapped "Done for today" on the given date. */
export async function isDayComplete(date?: string): Promise<boolean> {
  try {
    const target = date ?? getTodayDateString();
    const value = await AsyncStorage.getItem(key(target));
    return value === 'true';
  } catch (error) {
    logError('dayComplete.isDayComplete', error);
    return false;
  }
}

/** Test-only helper to clear the flag for a specific date. */
export async function clearDayComplete(date?: string): Promise<void> {
  try {
    const target = date ?? getTodayDateString();
    await AsyncStorage.removeItem(key(target));
  } catch (error) {
    logError('dayComplete.clearDayComplete', error);
  }
}
