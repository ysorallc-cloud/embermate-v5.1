// ============================================================================
// useRecentEntries — Fetches last 48h of log events for the Journal feed
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { getLogEventsByDate, LogEvent, LogEventType, MedDoseEvent, VitalsEvent, MoodEvent, MealEvent, HydrationEvent, SleepEvent, SymptomEvent, ActivityEvent, NoteEvent } from '../utils/logEvents';
import { useDataListener } from '../lib/events';
import { formatTimeAgo } from '../constants/microcopy';

// ============================================================================
// TYPES
// ============================================================================

export interface RecentEntry {
  id: string;
  emoji: string;
  label: string;
  detail: string;
  timestamp: string;
  relativeTime: string;
  route: string;
  dateGroup: 'Today' | 'Yesterday';
}

// ============================================================================
// MAPPINGS
// ============================================================================

const EMOJI_MAP: Record<LogEventType, string> = {
  medDose: '\u{1F48A}',
  vitals: '\u{1F4CA}',
  mood: '\u{1F60A}',
  meal: '\u{1F37D}\uFE0F',
  hydration: '\u{1F4A7}',
  sleep: '\u{1F634}',
  symptom: '\u{1FA7A}',
  activity: '\u{1F6B6}',
  note: '\u{1F4DD}',
  appointmentComplete: '\u{1F4C5}',
};

const LABEL_MAP: Record<LogEventType, string> = {
  medDose: 'Medication',
  vitals: 'Vitals',
  mood: 'Mood',
  meal: 'Meal',
  hydration: 'Water',
  sleep: 'Sleep',
  symptom: 'Symptom',
  activity: 'Activity',
  note: 'Note',
  appointmentComplete: 'Appointment',
};

const ROUTE_MAP: Record<LogEventType, string> = {
  medDose: '/medications',
  vitals: '/log-vitals',
  mood: '/log-mood',
  meal: '/log-meal',
  hydration: '/log-water',
  sleep: '/log-sleep',
  symptom: '/log-symptom',
  activity: '/log-activity',
  note: '/log-note',
  appointmentComplete: '/appointments',
};

const MOOD_LABELS: Record<number, string> = {
  1: 'Struggling',
  2: 'Difficult',
  3: 'Managing',
  4: 'Good',
  5: 'Great',
};

// ============================================================================
// DETAIL EXTRACTION
// ============================================================================

function extractDetail(event: LogEvent): string {
  switch (event.type) {
    case 'medDose': {
      const e = event as MedDoseEvent;
      if (!e.taken) return `${e.medicationName} \u2014 Skipped`;
      return `${e.medicationName} \u2014 ${e.dosage}`;
    }
    case 'vitals': {
      const e = event as VitalsEvent;
      const parts: string[] = [];
      if (e.systolic != null && e.diastolic != null) parts.push(`BP: ${e.systolic}/${e.diastolic}`);
      if (e.heartRate != null) parts.push(`HR: ${e.heartRate}`);
      if (e.glucose != null) parts.push(`Glucose: ${e.glucose}`);
      if (e.weight != null) parts.push(`Weight: ${e.weight}`);
      if (e.temperature != null) parts.push(`Temp: ${e.temperature}`);
      if (e.oxygen != null) parts.push(`O\u2082: ${e.oxygen}%`);
      return parts.join(' \u00B7 ') || 'Vitals logged';
    }
    case 'mood': {
      const e = event as MoodEvent;
      const label = MOOD_LABELS[e.mood] || `${e.mood}/5`;
      return `Mood: ${label}`;
    }
    case 'meal': {
      const e = event as MealEvent;
      let detail = e.mealType;
      if (e.appetite) detail += ` \u00B7 Appetite: ${e.appetite}`;
      return detail;
    }
    case 'hydration': {
      const e = event as HydrationEvent;
      return `${e.glasses} glasses`;
    }
    case 'sleep': {
      const e = event as SleepEvent;
      let detail = `${e.hours}h`;
      if (e.quality != null) {
        const qualityLabels: Record<number, string> = { 1: 'Poor', 2: 'Fair', 3: 'Okay', 4: 'Good', 5: 'Great' };
        detail += ` \u00B7 ${qualityLabels[e.quality] || `${e.quality}/5`}`;
      }
      return detail;
    }
    case 'symptom': {
      const e = event as SymptomEvent;
      let detail = e.symptoms.join(', ');
      if (e.severity != null) detail += ` \u00B7 Severity: ${e.severity}/10`;
      return detail;
    }
    case 'activity': {
      const e = event as ActivityEvent;
      let detail = e.activityType;
      if (e.duration != null) detail += ` \u00B7 ${e.duration}min`;
      return detail;
    }
    case 'note': {
      const e = event as NoteEvent;
      if (e.content.length > 50) return e.content.slice(0, 50) + '\u2026';
      return e.content;
    }
    case 'appointmentComplete':
      return 'Completed';
    default:
      return '';
  }
}

// ============================================================================
// HOOK
// ============================================================================

function getDateString(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

function mapEventToEntry(event: LogEvent, dateGroup: 'Today' | 'Yesterday'): RecentEntry {
  return {
    id: event.id,
    emoji: EMOJI_MAP[event.type],
    label: LABEL_MAP[event.type],
    detail: extractDetail(event),
    timestamp: event.timestamp,
    relativeTime: formatTimeAgo(new Date(event.timestamp)),
    route: ROUTE_MAP[event.type],
    dateGroup,
  };
}

export function useRecentEntries() {
  const [entries, setEntries] = useState<RecentEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEntries = useCallback(async () => {
    try {
      const today = getDateString(0);
      const yesterday = getDateString(1);

      const [todayEvents, yesterdayEvents] = await Promise.all([
        getLogEventsByDate(today),
        getLogEventsByDate(yesterday),
      ]);

      const todayEntries = todayEvents.map(e => mapEventToEntry(e, 'Today'));
      const yesterdayEntries = yesterdayEvents.map(e => mapEventToEntry(e, 'Yesterday'));

      const all = [...todayEntries, ...yesterdayEntries].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setEntries(all);
    } catch (error) {
      console.error('Error fetching recent entries:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  useDataListener(() => {
    fetchEntries();
  });

  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchEntries();
  }, [fetchEntries]);

  return { entries, loading, refresh };
}
