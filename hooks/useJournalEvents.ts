// ============================================================================
// USE JOURNAL EVENTS — Transforms log data into EventLogEntry[] for a date
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { getEventsByDate } from '../storage/eventRepo';
import { getMedicationLogs } from '../utils/medicationStorage';
import { getTodayVitalsLog, getTodayMoodLog, getTodayMealsLog, getTodaySleepLog } from '../utils/centralStorage';
import { getMorningWellness, getEveningWellness } from '../utils/wellnessCheckStorage';
import { logError } from '../utils/devLog';
import type { EventLogEntry } from '../components/journal/DetailedEventLog';

// ============================================================================
// HELPERS
// ============================================================================

function formatTime(isoOrTime: string): string {
  try {
    const d = new Date(isoOrTime);
    if (!isNaN(d.getTime())) {
      const h = d.getHours();
      const m = d.getMinutes();
      const ampm = h >= 12 ? 'pm' : 'am';
      const hour = h % 12 || 12;
      return `${hour}:${String(m).padStart(2, '0')}${ampm}`;
    }
  } catch {}
  return '';
}

function generateId(prefix: string, index: number): string {
  return `${prefix}-${index}`;
}

// ============================================================================
// HOOK
// ============================================================================

export function useJournalEvents(date: string) {
  const [events, setEvents] = useState<EventLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      const entries: EventLogEntry[] = [];

      // Load from unified event store
      const careEvents = await getEventsByDate(date, 'default');

      for (const evt of careEvents) {
        const time = formatTime(evt.timestamp);

        switch (evt.type) {
          case 'medication_taken':
          case 'medication_skipped': {
            const name = (evt.metadata?.medicationName as string) || 'Medication';
            const dosage = (evt.metadata?.dosage as string) || '';
            entries.push({
              id: evt.id,
              time,
              title: evt.type === 'medication_taken' ? 'Medication taken' : 'Medication skipped',
              detail: dosage ? `${name} ${dosage}` : name,
              status: evt.type === 'medication_taken' ? 'completed' : 'skipped',
            });
            break;
          }
          case 'vitals_recorded': {
            const m = evt.metadata || {};
            const parts: string[] = [];
            if (m.systolic && m.diastolic) parts.push(`BP ${m.systolic}/${m.diastolic}`);
            if (m.heartRate) parts.push(`HR ${m.heartRate} bpm`);
            if (m.temperature) parts.push(`Temp ${m.temperature}°F`);
            if (m.oxygenSaturation || m.oxygen) parts.push(`O2 ${m.oxygenSaturation || m.oxygen}%`);
            entries.push({
              id: evt.id,
              time,
              title: 'Vitals recorded',
              detail: parts.join(' · ') || 'Vitals checked',
              status: 'completed',
            });
            break;
          }
          case 'meal_logged': {
            const mealType = (evt.metadata?.mealType as string) || 'Meal';
            const quality = (evt.metadata?.quality as string) || '';
            const label = mealType.charAt(0).toUpperCase() + mealType.slice(1);
            entries.push({
              id: evt.id,
              time,
              title: `${label} logged`,
              detail: quality ? `${label} · ${quality}` : label,
              status: 'completed',
            });
            break;
          }
          case 'hydration_logged': {
            const glasses = evt.value ?? evt.metadata?.glasses ?? 0;
            entries.push({
              id: evt.id,
              time,
              title: 'Water logged',
              detail: `${glasses} glass${glasses !== 1 ? 'es' : ''}`,
              status: 'completed',
            });
            break;
          }
          case 'sleep_logged': {
            const hours = evt.metadata?.hours ?? evt.value ?? 0;
            const quality = (evt.metadata?.quality as string) || '';
            entries.push({
              id: evt.id,
              time,
              title: 'Sleep logged',
              detail: quality ? `${hours} hours · ${quality}` : `${hours} hours`,
              status: 'completed',
            });
            break;
          }
          case 'mood_logged': {
            const label = (evt.metadata?.label as string) || '';
            const score = evt.value ?? evt.metadata?.score ?? '';
            entries.push({
              id: evt.id,
              time,
              title: 'Mood check-in',
              detail: label ? `${label} (${score}/5)` : `Score: ${score}/5`,
              status: 'completed',
            });
            break;
          }
          case 'wellness_check': {
            const checkType = (evt.metadata?.checkType as string) || 'Check';
            const responses = evt.metadata?.responses as any;
            const parts: string[] = [];
            if (responses?.type === 'breathing_exercise') {
              parts.push(`Breathing exercise · ${responses.cycles || 4} cycles`);
            } else {
              if (responses?.mood != null) parts.push(`Mood: ${responses.mood}`);
              if (responses?.sleepQuality != null) parts.push(`Sleep: ${responses.sleepQuality}/5`);
              if (responses?.painLevel != null) parts.push(`Pain: ${responses.painLevel}`);
            }
            entries.push({
              id: evt.id,
              time,
              title: `${checkType.charAt(0).toUpperCase() + checkType.slice(1)} wellness check`,
              detail: parts.join(' · ') || 'Completed',
              status: 'completed',
            });
            break;
          }
          case 'symptom_reported': {
            const symptom = (evt.metadata?.symptomName as string) || 'Symptom';
            const severity = (evt.metadata?.severity as string) || '';
            entries.push({
              id: evt.id,
              time,
              title: 'Symptom reported',
              detail: severity ? `${symptom} · ${severity}` : symptom,
              status: 'completed',
            });
            break;
          }
          case 'note_added': {
            entries.push({
              id: evt.id,
              time,
              title: 'Note added',
              detail: evt.notes || '',
              status: 'completed',
            });
            break;
          }
          default: {
            entries.push({
              id: evt.id,
              time,
              title: evt.type.replace(/_/g, ' '),
              detail: evt.notes || '',
              status: evt.status === 'skipped' ? 'skipped' : 'completed',
            });
          }
        }
      }

      // Sort chronologically
      entries.sort((a, b) => a.time.localeCompare(b.time));
      setEvents(entries);
    } catch (err) {
      logError('useJournalEvents.loadEvents', err);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  return { events, loading, refresh: loadEvents };
}
