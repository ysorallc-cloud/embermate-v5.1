// ============================================================================
// NOW PAGE HELPERS - Pure utility functions and types
// No React dependencies - can be used anywhere
// ============================================================================

import { UPCOMING_WINDOW_MINUTES } from './urgency';

// Re-export constants used by now page consumers
export { UPCOMING_WINDOW_MINUTES };

// Grace period in minutes before an item is considered overdue
export const OVERDUE_GRACE_MINUTES = 30;

// ============================================================================
// TYPES
// ============================================================================

export interface StatData {
  completed: number;
  total: number;
}

export interface TodayStats {
  meds: StatData;
  vitals: StatData;
  meals: StatData;
  water?: StatData;
  sleep?: StatData;
  activity?: StatData;
  wellness?: StatData;
  custom?: StatData;
}

export interface AIInsight {
  icon: string;
  title: string;
  message: string;
  type: 'positive' | 'suggestion' | 'reminder' | 'celebration';
}

// Pattern-based, preventative, and supportive guidance
// NOT: countdown reminders, urgency alerts, "not logged" warnings
export interface CareInsight {
  icon: string;
  title: string;
  message: string;
  type: 'pattern' | 'preventative' | 'reinforcement' | 'dependency';
  confidence: number; // 0-1, only show if >= 0.6
}

// Time window definitions for grouping
export type TimeWindow = 'morning' | 'afternoon' | 'evening' | 'night';

export const TIME_WINDOW_HOURS: Record<TimeWindow, { start: number; end: number; label: string }> = {
  morning: { start: 5, end: 12, label: 'Morning' },
  afternoon: { start: 12, end: 17, label: 'Afternoon' },
  evening: { start: 17, end: 21, label: 'Evening' },
  night: { start: 21, end: 5, label: 'Night' },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Helper to format 24hr time (HH:MM) to display format - with NaN protection
export function formatTime(time24: string): string {
  if (!time24 || typeof time24 !== 'string') return 'Time not set';

  const parts = time24.split(':');
  if (parts.length < 2) return 'Time not set';

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);

  // Validate hours and minutes are valid numbers
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return 'Time not set';
  }

  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
}

// Format a scheduled time (HH:MM or ISO timestamp) as a 12-hour display string
// like "8:30 AM". Returns null for empty / unparseable input — callers can
// treat null as "no upcoming time".
export function formatNextScheduledTime(scheduledTime: string | null | undefined): string | null {
  if (!scheduledTime || typeof scheduledTime !== 'string') return null;

  // HH:MM (or HH:MM:SS) — pass the leading 5 chars to formatTime.
  if (/^\d{2}:\d{2}/.test(scheduledTime)) {
    const out = formatTime(scheduledTime.slice(0, 5));
    return out === 'Time not set' ? null : out;
  }

  // ISO timestamp — extract local hours/minutes and reuse formatTime.
  if (scheduledTime.includes('T')) {
    const d = new Date(scheduledTime);
    if (isNaN(d.getTime())) return null;
    const hh = d.getHours().toString().padStart(2, '0');
    const mm = d.getMinutes().toString().padStart(2, '0');
    const out = formatTime(`${hh}:${mm}`);
    return out === 'Time not set' ? null : out;
  }

  return null;
}

// Helper to check if a scheduled time is overdue
export function isOverdue(scheduledTime: string, graceMinutes: number = OVERDUE_GRACE_MINUTES): boolean {
  if (!scheduledTime) return false;
  const now = new Date();
  let scheduled = new Date(scheduledTime);
  // Handle HH:mm format by anchoring to today's date
  if (isNaN(scheduled.getTime()) && /^\d{2}:\d{2}$/.test(scheduledTime)) {
    const todayStr = now.toISOString().slice(0, 10);
    scheduled = new Date(`${todayStr}T${scheduledTime}:00`);
  }
  // Handle invalid dates
  if (isNaN(scheduled.getTime())) return false;
  // Add grace period to scheduled time
  const graceCutoff = new Date(scheduled.getTime() + graceMinutes * 60 * 1000);
  return now > graceCutoff;
}

// Helper to check if scheduled time is in the future
export function isFuture(scheduledTime: string): boolean {
  if (!scheduledTime) return false;
  const now = new Date();
  let scheduled = new Date(scheduledTime);
  // Handle HH:mm format by anchoring to today's date
  if (isNaN(scheduled.getTime()) && /^\d{2}:\d{2}$/.test(scheduledTime)) {
    const todayStr = now.toISOString().slice(0, 10);
    scheduled = new Date(`${todayStr}T${scheduledTime}:00`);
  }
  // Handle invalid dates
  if (isNaN(scheduled.getTime())) return false;
  return scheduled > now;
}

// Helper to parse time for display (handles both ISO and HH:mm formats) - with NaN protection
// Returns null if time is invalid (for cleaner display)
export function parseTimeForDisplay(scheduledTime: string): string | null {
  if (!scheduledTime || typeof scheduledTime !== 'string') return null;

  // If it's an ISO timestamp, parse it
  if (scheduledTime.includes('T')) {
    const date = new Date(scheduledTime);
    // Validate the date is valid
    if (isNaN(date.getTime())) return null;

    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  }
  // Otherwise assume HH:mm format
  const formatted = formatTime(scheduledTime);
  return formatted === 'Time not set' ? null : formatted;
}

// Helper to get route for instance item type (from regimen system)
export function getRouteForInstanceType(itemType: string): string {
  switch (itemType) {
    case 'medication': return '/medication-confirm';
    case 'vitals': return '/log-vitals';
    case 'nutrition': return '/log-meal';
    case 'mood': return '/log-mood';
    case 'sleep': return '/log-sleep';
    case 'hydration': return '/log-water';
    case 'activity': return '/log-activity';
    case 'wellness': return '/silent-vitals'; // v6.7 — single-screen capture replaces the 5-page wizard. Evening still routes via Now's windowLabel branch.
    case 'appointment': return '/appointments';
    case 'custom':
    default:
      return '/log-note';
  }
}

// Route a wellness DailyCareInstance by its time window. Evening keeps its
// dedicated multi-field wizard (/log-evening-wellness); morning / afternoon /
// night land on the single-screen /silent-vitals capture (the v6.7 reframe).
// Centralized here — instead of inlined in the Now timeline tap handler — so
// the destination is unit-testable and a malformed/missing windowLabel can
// never resolve to an empty pathname ("routes nowhere"); it falls through to
// the always-registered /silent-vitals capture. See
// __tests__/ui/morningCheckinRoute.test.ts.
export function getRouteForWellnessInstance(instance: { windowLabel?: string | null }): string {
  return instance?.windowLabel === 'evening' ? '/log-evening-wellness' : '/silent-vitals';
}

// Get time window for a scheduled time
export function getTimeWindow(scheduledTime: string): TimeWindow {
  let date = new Date(scheduledTime);
  // Handle HH:mm format
  if (isNaN(date.getTime()) && /^\d{2}:\d{2}$/.test(scheduledTime)) {
    const todayStr = new Date().toISOString().slice(0, 10);
    date = new Date(`${todayStr}T${scheduledTime}:00`);
  }
  if (isNaN(date.getTime())) return 'morning';

  const hour = date.getHours();

  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

// Get current time window
export function getCurrentTimeWindow(): TimeWindow {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

// Format time window range for display (e.g., "8:00 AM – 12:00 PM")
export function getTimeWindowDisplayRange(window: TimeWindow): string {
  const { start, end } = TIME_WINDOW_HOURS[window];
  const formatHour = (h: number) => {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:00 ${ampm}`;
  };
  return `${formatHour(start)} \u2013 ${formatHour(end)}`;
}

// Group instances by time window
export function groupByTimeWindow(instances: any[]): Record<TimeWindow, any[]> {
  const groups: Record<TimeWindow, any[]> = {
    morning: [],
    afternoon: [],
    evening: [],
    night: [],
  };

  instances.forEach(instance => {
    const window = getTimeWindow(instance.scheduledTime);
    groups[window].push(instance);
  });

  // Sort each group by scheduled time
  Object.keys(groups).forEach(key => {
    groups[key as TimeWindow].sort((a, b) =>
      a.scheduledTime.localeCompare(b.scheduledTime)
    );
  });

  return groups;
}
