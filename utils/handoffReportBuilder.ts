// ============================================================================
// CANONICAL HANDOFF BUILDER — Phase 5.8.a
//
// Single producer of today's handoff text. Eight sections, six gated by
// data presence:
//
//   Header line  — always
//   TONE         — gated on user-written one-liner (handoff_tone_{date})
//   NOTES TODAY  — gated on getReflection()
//   DONE TODAY   — gated on logged events for the day
//   STILL TO DO  — gated on overdueItems
//   WORTH KNOWING — gated on flaggedItems
//   COMING UP    — gated on nextAppointment within 14 days
//   Footer       — always
//
// Data sources:
//   patient name → getPatientRegistry() (active patient)
//   tone         → getHandoffTone(date)
//   notes        → getReflection(date)
//   events       → getEventsByDate(date, patientId), value-rich (metadata
//                  carries med name, vitals values, meal quality, etc.)
//   pending      → buildTodaySummary().overdueItems
//   flagged      → buildTodaySummary().flaggedItems
//   appointment  → buildTodaySummary().nextAppointment
// ============================================================================

import { buildTodaySummary } from './careSummaryBuilder';
import { getTodayDateString } from '../services/carePlanGenerator';
import { getHandoffTone } from '../storage/handoffToneRepo';
import { getReflection } from '../storage/reflectionStorage';
import { getEventsByDate } from '../storage/eventRepo';
import { getPatientRegistry } from '../storage/patientRegistry';
import type { CareEvent } from '../types/event';
import { logError } from './devLog';

// ============================================================================
// TYPES
// ============================================================================

export interface BuildHandoffOptions {
  /** Override "now" — used by tests and by future scheduled-share flows. */
  now?: Date;
}

export class ProfileMissingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProfileMissingError';
  }
}

// "Patient" is the literal default-registry placeholder in
// createDefaultRegistry(); users who never set a name end up with this
// value. "Mom" and "your loved one" are NOT sentinels — they're valid
// user-chosen names and treating them as missing would block real
// caregivers.
const PATIENT_PLACEHOLDER_NAMES = new Set(['patient']);
const APPOINTMENT_LOOKAHEAD_DAYS = 14;

// ============================================================================
// HEADER LINE
// ============================================================================

const WEEKDAYS = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday',
  'Thursday', 'Friday', 'Saturday',
];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const SHORT_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SHORT_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function formatHeaderTime(now: Date): string {
  const h24 = now.getHours();
  const m = now.getMinutes();
  const meridiem = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const mm = m < 10 ? `0${m}` : String(m);
  return `${h12}:${mm} ${meridiem}`;
}

function formatHeader(name: string, now: Date): string {
  return `${name} · ${WEEKDAYS[now.getDay()]}, ${MONTHS[now.getMonth()]} ${now.getDate()} · ${formatHeaderTime(now)}`;
}

// ============================================================================
// EVENT-LINE FORMATTER (Option A — read CareEvent.metadata directly)
// ============================================================================

function formatEventTime(iso: string): string {
  const d = new Date(iso);
  const h24 = d.getHours();
  const m = d.getMinutes();
  const meridiem = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const mm = m < 10 ? `0${m}` : String(m);
  return `${h12}:${mm} ${meridiem}`;
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}

function formatEventLine(e: CareEvent): string | null {
  const time = formatEventTime(e.timestamp);
  const meta = (e.metadata ?? {}) as Record<string, unknown>;
  switch (e.type) {
    case 'vitals_recorded': {
      const sys = meta.systolic;
      const dia = meta.diastolic;
      const hr = meta.heartRate;
      if (typeof sys === 'number' && typeof dia === 'number') {
        const tail = typeof hr === 'number' ? `, HR ${hr}` : '';
        return `${time} — BP ${sys}/${dia}${tail}`;
      }
      return `${time} — Vitals recorded`;
    }
    case 'medication_taken': {
      const name = meta.medicationName;
      const dose = meta.dosage;
      if (typeof name === 'string') {
        return typeof dose === 'string' && dose.length > 0
          ? `${time} — ${name} ${dose}`
          : `${time} — ${name}`;
      }
      return `${time} — Medication taken`;
    }
    case 'medication_skipped': {
      const name = meta.medicationName;
      return typeof name === 'string'
        ? `${time} — ${name} skipped`
        : `${time} — Medication skipped`;
    }
    case 'meal_logged': {
      const mealType = meta.mealType;
      const quality = meta.quality;
      const label = typeof mealType === 'string' ? capitalize(mealType) : 'Meal';
      return typeof quality === 'string' && quality.length > 0
        ? `${time} — ${label}, ate ${quality}`
        : `${time} — ${label}`;
    }
    case 'mood_logged': {
      const mood = meta.label ?? meta.score;
      return typeof mood === 'string' || typeof mood === 'number'
        ? `${time} — Mood: ${mood}`
        : `${time} — Mood logged`;
    }
    case 'wellness_check': {
      const checkType = meta.checkType;
      return typeof checkType === 'string'
        ? `${time} — ${capitalize(checkType)} wellness check`
        : `${time} — Wellness check`;
    }
    case 'hydration_logged': {
      const glasses = meta.glasses ?? e.value;
      return typeof glasses === 'number'
        ? `${time} — Hydration: ${glasses} glasses`
        : `${time} — Hydration logged`;
    }
    case 'sleep_logged': {
      const hours = meta.hours;
      return typeof hours === 'number'
        ? `${time} — Sleep: ${hours}h`
        : `${time} — Sleep logged`;
    }
    case 'symptom_reported': {
      const sym = meta.symptomName;
      return typeof sym === 'string'
        ? `${time} — Symptom: ${sym}`
        : `${time} — Symptom reported`;
    }
    case 'note_added':
      return null; // notes show in NOTES TODAY, not as a timeline entry
    default:
      return null;
  }
}

// ============================================================================
// COMING UP — appointment formatter
// ============================================================================

// Parse YYYY-MM-DD as local-noon so JS's UTC interpretation doesn't shift
// the calendar day in non-UTC timezones (a 2026-05-07 ISO string parses as
// May 6 PM in any timezone west of UTC).
function parseLocalDate(yyyymmdd: string): Date {
  const [y, m, d] = yyyymmdd.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0);
}

function formatAppointmentLine(
  appt: { provider: string; specialty: string; date: string },
): string {
  const d = parseLocalDate(appt.date);
  const day = SHORT_WEEKDAYS[d.getDay()];
  const month = SHORT_MONTHS[d.getMonth()];
  return `${appt.specialty} with ${appt.provider} — ${day}, ${month} ${d.getDate()}`;
}

function isWithinLookahead(isoDate: string, now: Date): boolean {
  const appt = parseLocalDate(isoDate);
  const apptMs = new Date(appt.getFullYear(), appt.getMonth(), appt.getDate()).getTime();
  const nowMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const days = Math.floor((apptMs - nowMs) / (1000 * 60 * 60 * 24));
  return days >= 0 && days <= APPOINTMENT_LOOKAHEAD_DAYS;
}

// ============================================================================
// ACTIVE PATIENT
// ============================================================================

async function getActivePatientName(): Promise<string> {
  const reg = await getPatientRegistry();
  const active = reg.patients.find((p) => p.id === reg.activePatientId)
    ?? reg.patients[0];
  const raw = (active?.name ?? '').trim();
  if (raw.length === 0 || PATIENT_PLACEHOLDER_NAMES.has(raw.toLowerCase())) {
    throw new ProfileMissingError(
      'Patient profile is missing a name. Add it in Settings → Profile before sharing a handoff.',
    );
  }
  return raw;
}

// ============================================================================
// BUILDER
// ============================================================================

const FOOTER_LINE = 'From EmberMate · stays on this device unless you share.';

export async function buildHandoffReport(opts: BuildHandoffOptions = {}): Promise<string> {
  try {
    const now = opts.now ?? new Date();
    const dateStr = getTodayDateString();

    const [patientName, tone, reflection, summary, eventsForDay] = await Promise.all([
      getActivePatientName(),
      getHandoffTone(dateStr),
      getReflection(dateStr),
      buildTodaySummary(),
      (async () => {
        const reg = await getPatientRegistry();
        return getEventsByDate(dateStr, reg.activePatientId);
      })(),
    ]);

    const lines: string[] = [];
    lines.push(formatHeader(patientName, now));

    // TONE
    if (tone && tone.trim().length > 0) {
      lines.push('', 'TONE', tone.trim());
    }

    // NOTES TODAY
    const notes = (reflection?.text ?? '').trim();
    if (notes.length > 0) {
      lines.push('', 'NOTES TODAY', notes);
    }

    // DONE TODAY — chronological, value-rich event lines
    const sorted = [...eventsForDay].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
    const eventLines = sorted
      .map((e) => formatEventLine(e))
      .filter((l): l is string => l !== null);
    if (eventLines.length > 0) {
      lines.push('', 'DONE TODAY', ...eventLines);
    }

    // STILL TO DO
    if (summary.overdueItems.length > 0) {
      lines.push('', 'STILL TO DO', ...summary.overdueItems);
    }

    // WORTH KNOWING
    if (summary.flaggedItems.length > 0) {
      lines.push('', 'WORTH KNOWING', ...summary.flaggedItems);
    }

    // COMING UP
    if (summary.nextAppointment && isWithinLookahead(summary.nextAppointment.date, now)) {
      lines.push('', 'COMING UP', formatAppointmentLine(summary.nextAppointment));
    }

    // Footer
    lines.push('', FOOTER_LINE);

    return lines.join('\n');
  } catch (error) {
    if (error instanceof ProfileMissingError) throw error;
    logError('buildHandoffReport', error);
    throw error;
  }
}
