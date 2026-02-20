// ============================================================================
// DATA RETENTION
// Configurable retention policy for log events with automatic purging
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLogEvents } from './logEvents';
import { safeSetItem } from './safeStorage';
import { logError } from './devLog';
import { getTodayDateString } from '../services/carePlanGenerator';

// ============================================================================
// TYPES
// ============================================================================

export type RetentionPolicy = number | 'forever'; // number = days

export interface RetentionOption {
  label: string;
  value: RetentionPolicy;
  description: string;
}

export const RETENTION_OPTIONS: RetentionOption[] = [
  { label: 'Keep Forever', value: 'forever', description: 'Never delete logged events' },
  { label: '1 Year', value: 365, description: 'Remove events older than 1 year' },
  { label: '6 Months', value: 180, description: 'Remove events older than 6 months' },
  { label: '90 Days', value: 90, description: 'Remove events older than 90 days' },
];

// ============================================================================
// STORAGE KEYS
// ============================================================================

const RETENTION_POLICY_KEY = '@embermate_retention_policy';
const LAST_PURGE_KEY = '@embermate_last_purge_date';
const LOG_EVENTS_KEY = '@embermate_log_events';

// ============================================================================
// POLICY MANAGEMENT
// ============================================================================

/**
 * Get the current retention policy (default: 'forever')
 */
export async function getRetentionPolicy(): Promise<RetentionPolicy> {
  try {
    const value = await AsyncStorage.getItem(RETENTION_POLICY_KEY);
    if (!value) return 'forever';

    const parsed = JSON.parse(value);
    return parsed as RetentionPolicy;
  } catch {
    return 'forever';
  }
}

/**
 * Set the retention policy
 */
export async function setRetentionPolicy(policy: RetentionPolicy): Promise<void> {
  await AsyncStorage.setItem(RETENTION_POLICY_KEY, JSON.stringify(policy));
}

// ============================================================================
// PURGE LOGIC
// ============================================================================

/**
 * Purge log events older than the retention period.
 * Exempts: medicalInfo, medication definitions, carePlanConfig (only log events are purged).
 * Returns the number of events removed.
 */
export async function purgeOldData(): Promise<number> {
  const policy = await getRetentionPolicy();
  if (policy === 'forever') return 0;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - policy);
  const cutoffISO = cutoffDate.toISOString().split('T')[0]; // YYYY-MM-DD

  const events = await getLogEvents();
  const kept = events.filter(e => e.date >= cutoffISO);
  const removed = events.length - kept.length;

  if (removed > 0) {
    await safeSetItem(LOG_EVENTS_KEY, kept);
  }

  // Record the purge timestamp
  await AsyncStorage.setItem(LAST_PURGE_KEY, getTodayDateString());

  return removed;
}

/**
 * Run purge if it hasn't been done today.
 * Safe to call on every app launch — exits early if already ran today.
 */
export async function purgeIfNeeded(): Promise<void> {
  try {
    const lastPurge = await AsyncStorage.getItem(LAST_PURGE_KEY);
    const today = getTodayDateString();

    if (lastPurge === today) return;

    await purgeOldData();
  } catch (error) {
    logError('dataRetention.purgeIfNeeded', error);
  }
}

/**
 * Get a human-readable label for the current retention policy
 */
export function getRetentionLabel(policy: RetentionPolicy): string {
  const option = RETENTION_OPTIONS.find(o => o.value === policy);
  return option?.label ?? 'Keep Forever';
}
