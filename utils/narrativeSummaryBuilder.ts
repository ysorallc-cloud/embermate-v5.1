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
import { getVitalsInRange } from './vitalsStorage';
import { observeVital } from './vitalsObservation';
import { logError } from './devLog';
import type { CareEvent, EventType } from '../types/event';
import type { DailyCareInstance, CarePlanItemType } from '../types/carePlan';

/**
 * Phase 5.13.5 — count completions across both pipelines.
 *
 * A type's count is the union of (a) events of the given event type and
 * (b) completed daily instances of the given itemType, deduplicated by
 * (carePlanItemId, scheduledTime). Most flows only emit one or the other,
 * so the dedup is a precaution against any future flow that writes both.
 *
 * Events don't carry carePlanItemId / scheduledTime as typed fields — we
 * fall back to event id, which won't collide with the instance keyspace.
 * Instances always have both fields, so the cross-source dedup fires only
 * when an event explicitly stamps those keys in its metadata.
 */
function unionCount(
  events: CareEvent[],
  eventType: EventType,
  instances: DailyCareInstance[],
  itemType: CarePlanItemType,
): number {
  const seen = new Set<string>();
  let count = 0;
  for (const e of events) {
    if (e.type !== eventType) continue;
    const meta = (e.metadata || {}) as Record<string, any>;
    const itemId = meta.carePlanItemId;
    const sched = meta.scheduledTime;
    const key = itemId && sched ? `${itemId}:${sched}` : `event:${e.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    count++;
  }
  for (const i of instances) {
    if (i.itemType !== itemType) continue;
    if (i.status !== 'completed') continue;
    const key = `${i.carePlanItemId}:${i.scheduledTime}`;
    if (seen.has(key)) continue;
    seen.add(key);
    count++;
  }
  return count;
}

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

function isNotable(
  e: CareEvent,
  bpBaseline: { systolic: number[]; diastolic: number[] },
): NarrativeTone | null {
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
    // Notable when the reading sits outside THIS person's own usual (above OR
    // below — the original bilateral intent), per-person via the canonical
    // observeVital(). No fixed population cutoff; within-usual or too-little-
    // baseline is not flagged.
    const deviates = (dir?: string) => dir === 'above_usual' || dir === 'below_usual';
    const sysDir = s ? observeVital(s, bpBaseline.systolic).direction : undefined;
    const diaDir = d ? observeVital(d, bpBaseline.diastolic).direction : undefined;
    if (deviates(sysDir) || deviates(diaDir)) return 'concern';
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
    // BP baseline = this person's readings in the 60 days BEFORE this day
    // (anchored at noon so a timezone/DST shift can't pull the boundary a day
    // either way). Feeds the per-person observeVital() notability check below.
    const dayOffset = (n: number): string => {
      const x = new Date(`${dateKey}T12:00:00`);
      x.setDate(x.getDate() - n);
      return x.toISOString().split('T')[0];
    };
    const [events, instances, reflection, bpBaselineReadings] = await Promise.all([
      getEventsByDateRange(dateKey, dateKey, patientId),
      listDailyInstances(patientId, dateKey),
      getReflection(dateKey),
      getVitalsInRange(dayOffset(60), dayOffset(1), patientId),
    ]);
    const bpBaseline = {
      systolic: bpBaselineReadings.filter((r) => r.type === 'systolic').map((r) => r.value),
      diastolic: bpBaselineReadings.filter((r) => r.type === 'diastolic').map((r) => r.value),
    };

    const medInstances = instances.filter((i) => i.itemType === 'medication');
    const medsTaken = medInstances.filter((i) => i.status === 'completed').length;
    const medsTotal = medInstances.length;

    // Meds keep the dedicated medInstances pipeline (above) plus events
    // for ad-hoc logs that don't have an instance behind them.
    const medsTakenEvents = events.filter((e) => e.type === 'medication_taken').length;
    const medsSkippedEvents = events.filter((e) => e.type === 'medication_skipped').length;

    // Phase 5.13.5 — non-meds types now union events with completed instances.
    // Inline-confirm completions on Now-tab write LogEntry + update instance
    // status but don't emit events; pre-fix those completions were invisible.
    const vitalsCount = unionCount(events, 'vitals_recorded', instances, 'vitals');
    const wellnessCount = unionCount(events, 'wellness_check', instances, 'wellness');
    const mealsCount = unionCount(events, 'meal_logged', instances, 'nutrition');
    const sleepCount = unionCount(events, 'sleep_logged', instances, 'sleep');
    const activityCount = unionCount(events, 'activity_logged', instances, 'activity');

    // Symptoms have no instance counterpart — CarePlanItemType doesn't
    // include 'symptom'. Stay event-only.
    const symptomCount = events.filter((e) => e.type === 'symptom_reported').length;

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
    if (vitalsCount > 0) {
      summaryPills.push({ label: 'Vitals logged', tone: 'good' });
    }
    if (wellnessCount > 0) {
      summaryPills.push({ label: 'Wellness OK', tone: 'good' });
    }
    if (mealsCount > 0) {
      summaryPills.push({ label: `${mealsCount} meals`, tone: 'neutral' });
    }
    if (sleepCount > 0) {
      summaryPills.push({ label: `${sleepCount} sleep`, tone: 'neutral' });
    }
    if (activityCount > 0) {
      summaryPills.push({ label: `${activityCount} activity`, tone: 'neutral' });
    }
    if (symptomCount > 0) {
      summaryPills.push({ label: `${symptomCount} symptom${symptomCount === 1 ? '' : 's'}`, tone: 'concern' });
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
      if (vitalsCount > 0) {
        sentences.push(`${vitalsCount} vitals reading${vitalsCount === 1 ? '' : 's'} recorded.`);
      }
      if (wellnessCount > 0) {
        sentences.push(`${wellnessCount} wellness check${wellnessCount === 1 ? '' : 's'} recorded.`);
      }
      if (mealsCount > 0) {
        sentences.push(`${mealsCount} meal${mealsCount === 1 ? '' : 's'} logged.`);
      }
      if (sleepCount > 0) {
        sentences.push(`${sleepCount} sleep entr${sleepCount === 1 ? 'y' : 'ies'} logged.`);
      }
      if (activityCount > 0) {
        sentences.push(`${activityCount} activity log${activityCount === 1 ? '' : 's'}.`);
      }
      if (symptomCount > 0) {
        sentences.push(`${symptomCount} symptom${symptomCount === 1 ? '' : 's'} reported.`);
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
      if (vitalsCount > 0 && wellnessCount > 0) {
        sentences.push('Vitals and wellness check both completed.');
      } else if (vitalsCount > 0) {
        sentences.push('Vitals recorded.');
      } else if (wellnessCount > 0) {
        sentences.push('Wellness check completed.');
      }
      if (sleepCount > 0) {
        sentences.push(`${sleepCount} sleep entr${sleepCount === 1 ? 'y' : 'ies'} logged.`);
      }
      if (activityCount > 0) {
        sentences.push(`${activityCount} activity log${activityCount === 1 ? '' : 's'}.`);
      }
      if (symptomCount > 0) {
        sentences.push(`${symptomCount} symptom${symptomCount === 1 ? '' : 's'} reported.`);
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
      const tone = isNotable(e, bpBaseline);
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
      hasData:
        events.length > 0
        || medsTotal > 0
        || vitalsCount > 0
        || wellnessCount > 0
        || mealsCount > 0
        || sleepCount > 0
        || activityCount > 0
        || symptomCount > 0
        || !!reflection?.text,
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
