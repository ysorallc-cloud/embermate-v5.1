// ============================================================================
// NARRATIVE SUMMARY BUILDER — UX-restructure (Commit 8)
//
// Generates a template-driven prose recap for a past day. Pulls events from
// the local event repository, groups by type, and produces:
//   • A 1-2 sentence summary line
//   • Short summary pills ("All meds", "BP normal", "Wellness OK")
//   • Notable moments worth surfacing (skips, severe symptoms, off-range vitals)
//   • The caregiver's saved note for the day
//
// No LLM, no network. Pure local data composition.
// ============================================================================

import { getEventsByDateRange } from '../storage/eventRepo';
import { getActivePatientId } from '../storage/patientRegistry';
import { getReflection } from '../storage/reflectionStorage';
import { listDailyInstances } from '../storage/carePlanRepo';
import { logError } from './devLog';
import type { CareEvent } from '../types/event';

export type NarrativeTone = 'good' | 'concern' | 'neutral';

export interface NotableMoment {
  icon: string;
  time: string;
  text: string;
  tone: NarrativeTone;
}

export interface DayNarrative {
  dateKey: string;
  hasData: boolean;
  summary: string;
  summaryPills: { label: string; tone: NarrativeTone }[];
  notableMoments: NotableMoment[];
  notes: string | null;
}

export interface BuildDayNarrativeOptions {
  /**
   * Phase 5.12.b — strip interpretive language from `summary` so the output
   * is safe to render as auto-generated content next to user-authored copy.
   *
   * Default `false`: existing callers (NarrativeView past-day mode, handoff,
   * Visit Prep) keep their interpretive output. They carry their own legal
   * hygiene and the interpretive phrasing reads as part of the page voice.
   *
   * Pass `true` from Journal's mood line + narrative snapshot, where the
   * builder output competes with caregiver-authored tone and any auto-gen
   * judgment ("calm day", "vitals stable") would read as the app speaking
   * for the caregiver.
   */
  factualOnly?: boolean;
}

function formatTime(ts: string): string {
  const d = new Date(ts);
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12; if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
}

function eventLabel(e: CareEvent): string {
  const meta = (e.metadata || {}) as Record<string, any>;
  switch (e.type) {
    case 'medication_taken':
      return meta.medicationName
        ? `Took ${meta.medicationName}${meta.dosage ? ` ${meta.dosage}` : ''}`
        : 'Took a medication';
    case 'medication_skipped':
      return meta.medicationName
        ? `Skipped ${meta.medicationName}`
        : 'Skipped a medication';
    case 'meal_logged':
      return meta.mealType
        ? `${String(meta.mealType).charAt(0).toUpperCase()}${String(meta.mealType).slice(1)} logged`
        : 'Meal logged';
    case 'vitals_recorded':
      if (meta.systolic && meta.diastolic) {
        return `BP ${meta.systolic}/${meta.diastolic}`;
      }
      return 'Vitals recorded';
    case 'symptom_reported':
      return meta.symptomName ? `Symptom: ${meta.symptomName}` : 'Symptom reported';
    case 'note_added':
      return 'Note added';
    case 'wellness_check':
      return 'Wellness check completed';
    case 'mood_logged':
      return meta.label ? `Mood: ${meta.label}` : 'Mood logged';
    case 'sleep_logged':
      return meta.hours ? `Slept ${meta.hours}h` : 'Sleep logged';
    case 'hydration_logged':
      return meta.glasses ? `${meta.glasses} glasses water` : 'Hydration logged';
    case 'bathroom_event':
      return 'Bathroom event';
    case 'activity_logged':
      return 'Activity logged';
    case 'appointment_logged':
      return 'Appointment logged';
    default:
      return 'Event';
  }
}

function isNotable(e: CareEvent): NarrativeTone | null {
  const meta = (e.metadata || {}) as Record<string, any>;
  if (e.type === 'medication_skipped') return 'concern';
  if (e.type === 'symptom_reported') {
    const sev = String(meta.severity || '').toLowerCase();
    if (sev === 'severe' || sev === 'moderate') return 'concern';
    return 'neutral';
  }
  if (e.type === 'vitals_recorded') {
    const s = Number(meta.systolic);
    const d = Number(meta.diastolic);
    if ((s && (s < 90 || s >= 140)) || (d && (d < 60 || d >= 90))) return 'concern';
  }
  if (e.type === 'note_added') return 'neutral';
  return null;
}

export async function buildDayNarrative(
  dateKey: string,
  options: BuildDayNarrativeOptions = {},
): Promise<DayNarrative> {
  const factualOnly = options.factualOnly === true;
  try {
    const patientId = await getActivePatientId();
    const [events, instances, reflection] = await Promise.all([
      getEventsByDateRange(dateKey, dateKey, patientId),
      listDailyInstances(patientId, dateKey),
      getReflection(dateKey),
    ]);

    const medInstances = instances.filter((i) => i.itemType === 'medication');
    const medsTaken = medInstances.filter((i) => i.status === 'completed').length;
    const medsTotal = medInstances.length;

    const medsTakenEvents = events.filter((e) => e.type === 'medication_taken').length;
    const medsSkippedEvents = events.filter((e) => e.type === 'medication_skipped').length;
    const vitalsEvents = events.filter((e) => e.type === 'vitals_recorded').length;
    const wellnessEvents = events.filter((e) => e.type === 'wellness_check').length;
    const symptomEvents = events.filter((e) => e.type === 'symptom_reported').length;
    const mealsCount = events.filter((e) => e.type === 'meal_logged').length;

    // Summary pills — short tags shown above the prose summary.
    const summaryPills: { label: string; tone: NarrativeTone }[] = [];
    if (medsTotal > 0) {
      const allDone = medsTaken === medsTotal;
      summaryPills.push({
        label: allDone ? 'All meds' : `${medsTaken}/${medsTotal} meds`,
        tone: allDone ? 'good' : 'concern',
      });
    } else if (medsTakenEvents > 0) {
      summaryPills.push({ label: `${medsTakenEvents} meds`, tone: 'good' });
    }
    if (vitalsEvents > 0) {
      summaryPills.push({ label: 'Vitals logged', tone: 'good' });
    }
    if (wellnessEvents > 0) {
      summaryPills.push({ label: 'Wellness OK', tone: 'good' });
    }
    if (mealsCount > 0) {
      summaryPills.push({ label: `${mealsCount} meals`, tone: 'neutral' });
    }
    if (symptomEvents > 0) {
      summaryPills.push({ label: `${symptomEvents} symptom${symptomEvents === 1 ? '' : 's'}`, tone: 'concern' });
    }

    // Prose summary — one or two sentences synthesising the day.
    // Two flavors: the default (interpretive — "All scheduled medications
    // were taken on time.") and factualOnly (counts/timings only — used by
    // Journal's mood line + auto-recap where the builder output competes
    // with caregiver-authored tone and any judgment would read as the app
    // speaking for the caregiver).
    const sentences: string[] = [];
    if (factualOnly) {
      if (medsTotal > 0) {
        sentences.push(`${medsTaken}/${medsTotal} medications logged.`);
      } else if (medsTakenEvents > 0) {
        sentences.push(`${medsTakenEvents} medication${medsTakenEvents === 1 ? '' : 's'} logged.`);
      }
      if (vitalsEvents > 0) {
        sentences.push(`${vitalsEvents} vitals reading${vitalsEvents === 1 ? '' : 's'} recorded.`);
      }
      if (wellnessEvents > 0) {
        sentences.push(`${wellnessEvents} wellness check${wellnessEvents === 1 ? '' : 's'} recorded.`);
      }
      if (mealsCount > 0) {
        sentences.push(`${mealsCount} meal${mealsCount === 1 ? '' : 's'} logged.`);
      }
      if (symptomEvents > 0) {
        sentences.push(`${symptomEvents} symptom${symptomEvents === 1 ? '' : 's'} reported.`);
      }
      if (medsSkippedEvents > 0) {
        sentences.push(`${medsSkippedEvents} medication skip${medsSkippedEvents === 1 ? '' : 's'} logged.`);
      }
    } else {
      if (medsTotal > 0) {
        if (medsTaken === medsTotal) {
          sentences.push('All scheduled medications were taken on time.');
        } else if (medsTaken > 0) {
          sentences.push(`${medsTaken} of ${medsTotal} medications were taken; ${medsTotal - medsTaken} were missed.`);
        } else {
          sentences.push('Medications were not logged.');
        }
      } else if (medsTakenEvents > 0) {
        sentences.push(`${medsTakenEvents} medication${medsTakenEvents === 1 ? '' : 's'} logged ad-hoc.`);
      }
      if (vitalsEvents > 0 && wellnessEvents > 0) {
        sentences.push('Vitals and wellness check both completed.');
      } else if (vitalsEvents > 0) {
        sentences.push('Vitals recorded.');
      } else if (wellnessEvents > 0) {
        sentences.push('Wellness check completed.');
      }
      if (symptomEvents > 0) {
        sentences.push(`${symptomEvents} symptom${symptomEvents === 1 ? '' : 's'} reported.`);
      }
      if (medsSkippedEvents > 0 && medsTotal === 0) {
        sentences.push(`${medsSkippedEvents} medication skip${medsSkippedEvents === 1 ? '' : 's'} logged.`);
      }
    }
    const summary = sentences.length > 0
      ? sentences.join(' ')
      : 'No activity was logged on this day.';

    // Notable moments — flagged events surfaced inline.
    const notableMoments: NotableMoment[] = [];
    for (const e of events) {
      const tone = isNotable(e);
      if (!tone) continue;
      notableMoments.push({
        icon: e.type === 'medication_skipped' ? '⏭'
          : e.type === 'symptom_reported' ? '⚠'
          : e.type === 'vitals_recorded' ? '🩺'
          : e.type === 'note_added' ? '📝'
          : '•',
        time: formatTime(e.timestamp),
        text: eventLabel(e),
        tone,
      });
    }

    return {
      dateKey,
      hasData: events.length > 0 || medsTotal > 0 || !!reflection?.text,
      summary,
      summaryPills,
      notableMoments,
      notes: reflection?.text?.trim() || null,
    };
  } catch (err) {
    logError('narrativeSummaryBuilder.buildDayNarrative', err);
    return {
      dateKey,
      hasData: false,
      summary: 'Unable to load this day.',
      summaryPills: [],
      notableMoments: [],
      notes: null,
    };
  }
}
