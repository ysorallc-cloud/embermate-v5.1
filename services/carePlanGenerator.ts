// ============================================================================
// CARE PLAN GENERATOR SERVICE
// Generates DailyCareInstance records from CarePlan regimen
// Called on app launch, tab focus, and date change
// ============================================================================

import {
  CarePlan,
  CarePlanItem,
  DailyCareInstance,
  TimeWindow,
  TimeWindowLabel,
  DEFAULT_TIME_WINDOWS,
} from '../types/carePlan';
import {
  getActiveCarePlan,
  listCarePlanItems,
  listDailyInstances,
  upsertDailyInstances,
  updateDailyInstanceStatus,
  DEFAULT_PATIENT_ID,
} from '../storage/carePlanRepo';
import { generateUniqueId } from '../utils/idGenerator';

// ============================================================================
// CONFIGURATION
// ============================================================================

// Grace period in minutes before marking as missed
const MISSED_GRACE_PERIOD_MINUTES = 120; // 2 hours

// ============================================================================
// MAIN GENERATION FUNCTION
// ============================================================================

/**
 * Ensure daily instances exist for a given date
 * This is the main entry point - call on app launch, tab focus, date change
 *
 * Algorithm:
 * 1. Fetch active care plan + active items
 * 2. Fetch existing instances for date
 * 3. For each item, compute required instances based on schedule
 * 4. Create new instances only if they don't exist
 * 5. Mark missed instances (past window + grace period)
 * 6. Return all instances sorted by time
 */
export async function ensureDailyInstances(
  patientId: string = DEFAULT_PATIENT_ID,
  date: string
): Promise<DailyCareInstance[]> {
  // 1. Get active care plan
  const carePlan = await getActiveCarePlan(patientId);
  if (!carePlan) {
    return [];
  }

  // 2. Get active items
  const items = await listCarePlanItems(carePlan.id, { activeOnly: true });
  if (items.length === 0) {
    return [];
  }

  // 3. Get existing instances for this date
  const existingInstances = await listDailyInstances(patientId, date);
  const existingMap = new Map<string, DailyCareInstance>();
  for (const instance of existingInstances) {
    // Key by itemId + windowId to detect duplicates
    const key = `${instance.carePlanItemId}:${instance.windowId}`;
    existingMap.set(key, instance);
  }

  // 4. Generate instances for each item
  const newInstances: DailyCareInstance[] = [];
  const now = new Date();

  for (const item of items) {
    // Check if this item should have instances on this date
    if (!shouldGenerateOnDate(item, date)) {
      continue;
    }

    // Generate instance for each time window
    for (const timeWindow of item.schedule.times) {
      const key = `${item.id}:${timeWindow.id}`;
      const existing = existingMap.get(key);

      if (existing) {
        // Instance exists - check if we need to mark it as missed
        if (existing.status === 'pending' && !existing.logId) {
          const instanceTime = parseScheduledTime(existing.scheduledTime, date);
          const endTime = getWindowEndTime(timeWindow, date);

          // Check if past grace period
          const graceEnd = new Date(endTime.getTime() + MISSED_GRACE_PERIOD_MINUTES * 60 * 1000);
          if (now > graceEnd) {
            await updateDailyInstanceStatus(patientId, date, existing.id, 'missed');
          }
        }
      } else {
        // Create new instance
        const scheduledTime = computeScheduledTime(timeWindow, date);
        const instance = createInstance(item, carePlan, timeWindow, date, scheduledTime);
        newInstances.push(instance);
      }
    }
  }

  // 5. Save new instances
  if (newInstances.length > 0) {
    await upsertDailyInstances(patientId, date, newInstances);
  }

  // 6. Return all instances sorted by time
  const allInstances = await listDailyInstances(patientId, date);
  return allInstances.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
}

// ============================================================================
// SCHEDULE MATCHING
// ============================================================================

/**
 * Check if an item should generate instances on a given date
 */
function shouldGenerateOnDate(item: CarePlanItem, date: string): boolean {
  const { frequency, daysOfWeek, skipDates } = item.schedule;

  // Check skip dates
  if (skipDates?.includes(date)) {
    return false;
  }

  // Check frequency rules
  switch (frequency) {
    case 'daily':
      return true;

    case 'weekly':
    case 'custom':
      if (!daysOfWeek || daysOfWeek.length === 0) {
        return true; // No restriction = all days
      }
      const dayOfWeek = new Date(date + 'T12:00:00').getDay();
      return daysOfWeek.includes(dayOfWeek);

    default:
      return true;
  }
}

// ============================================================================
// TIME COMPUTATION
// ============================================================================

/**
 * Compute the scheduled time for an instance
 */
function computeScheduledTime(window: TimeWindow, date: string): string {
  if (window.kind === 'exact' && window.at) {
    return `${date}T${window.at}:00`;
  }

  // For window kind, use the start time
  const startTime = window.start || getDefaultWindowStart(window.label);
  return `${date}T${startTime}:00`;
}

/**
 * Get the end time for a window
 */
function getWindowEndTime(window: TimeWindow, date: string): Date {
  if (window.kind === 'exact' && window.at) {
    // For exact times, end is same as start
    return new Date(`${date}T${window.at}:00`);
  }

  const endTime = window.end || getDefaultWindowEnd(window.label);
  return new Date(`${date}T${endTime}:00`);
}

/**
 * Get default start time for a window label
 */
function getDefaultWindowStart(label: TimeWindowLabel): string {
  switch (label) {
    case 'morning': return DEFAULT_TIME_WINDOWS.morning.start;
    case 'afternoon': return DEFAULT_TIME_WINDOWS.afternoon.start;
    case 'evening': return DEFAULT_TIME_WINDOWS.evening.start;
    case 'night': return DEFAULT_TIME_WINDOWS.night.start;
    default: return '09:00';
  }
}

/**
 * Get default end time for a window label
 */
function getDefaultWindowEnd(label: TimeWindowLabel): string {
  switch (label) {
    case 'morning': return DEFAULT_TIME_WINDOWS.morning.end;
    case 'afternoon': return DEFAULT_TIME_WINDOWS.afternoon.end;
    case 'evening': return DEFAULT_TIME_WINDOWS.evening.end;
    case 'night': return DEFAULT_TIME_WINDOWS.night.end;
    default: return '17:00';
  }
}

/**
 * Parse a scheduled time string to Date
 */
function parseScheduledTime(scheduledTime: string, date: string): Date {
  if (scheduledTime.includes('T')) {
    return new Date(scheduledTime);
  }
  // Assume HH:mm format
  return new Date(`${date}T${scheduledTime}:00`);
}

// ============================================================================
// INSTANCE CREATION
// ============================================================================

/**
 * Create a new DailyCareInstance
 */
function createInstance(
  item: CarePlanItem,
  carePlan: CarePlan,
  window: TimeWindow,
  date: string,
  scheduledTime: string
): DailyCareInstance {
  const now = new Date().toISOString();

  return {
    id: generateUniqueId(),
    carePlanId: carePlan.id,
    carePlanItemId: item.id,
    patientId: carePlan.patientId,
    date,
    scheduledTime,
    windowLabel: window.label,
    windowId: window.id,
    status: 'pending',
    generatedFromVersion: carePlan.version,

    // Denormalized for display
    itemName: item.name,
    itemType: item.type,
    itemEmoji: item.emoji,
    priority: item.priority,
    instructions: item.instructions,

    createdAt: now,
    updatedAt: now,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get today's date string in YYYY-MM-DD format
 */
export function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Check if a time is within a window
 */
export function isTimeInWindow(
  time: Date,
  window: TimeWindow,
  date: string
): boolean {
  if (window.kind === 'exact' && window.at) {
    const exactTime = new Date(`${date}T${window.at}:00`);
    // Within 30 minutes of exact time
    const diff = Math.abs(time.getTime() - exactTime.getTime());
    return diff <= 30 * 60 * 1000;
  }

  const start = window.start || getDefaultWindowStart(window.label);
  const end = window.end || getDefaultWindowEnd(window.label);

  const startTime = new Date(`${date}T${start}:00`);
  const endTime = new Date(`${date}T${end}:00`);

  return time >= startTime && time <= endTime;
}

/**
 * Get current window label based on time
 */
export function getCurrentWindowLabel(time: Date = new Date()): TimeWindowLabel {
  const hours = time.getHours();

  if (hours >= 6 && hours < 12) return 'morning';
  if (hours >= 12 && hours < 17) return 'afternoon';
  if (hours >= 17 && hours < 20) return 'evening';
  return 'night';
}

/**
 * Regenerate instances for today (force refresh)
 */
export async function regenerateTodayInstances(
  patientId: string = DEFAULT_PATIENT_ID
): Promise<DailyCareInstance[]> {
  const today = getTodayDateString();
  return ensureDailyInstances(patientId, today);
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Generate instances for multiple days (e.g., for calendar view)
 */
export async function ensureInstancesForDateRange(
  patientId: string,
  startDate: string,
  endDate: string
): Promise<Map<string, DailyCareInstance[]>> {
  const result = new Map<string, DailyCareInstance[]>();

  const start = new Date(startDate);
  const end = new Date(endDate);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const instances = await ensureDailyInstances(patientId, dateStr);
    result.set(dateStr, instances);
  }

  return result;
}
