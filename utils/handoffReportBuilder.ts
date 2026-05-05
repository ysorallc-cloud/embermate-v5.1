// ============================================================================
// CANONICAL HANDOFF BUILDER — UX restructure (Commit 3)
//
// Single producer of today's handoff text. Structured for a sibling /
// next caregiver — NOT a doctor. The per-event chronological timeline
// retired here; that level of detail belongs in visit prep.
//
// Sections, in order:
//
//   Header line  — always (name · weekday, month day · time)
//   TONE         — bare line, no label, when handoff_tone_{date} is set
//   STILL TO DO  — pending items with specific names (overdueItems)
//   HEADS UP     — flagged items as natural sentences (flaggedItems)
//   COMING UP    — next appointment within 7 days (caregiver lookahead)
//   NOTES        — gated by includeNotes (default true)
//   DONE         — one-line count summary ("3 of 5 meds · 1 vitals · 1 meal")
//   Footer       — privacy line, always
//
// Data sources:
//   patient name → getPatientRegistry() (active patient)
//   tone         → getHandoffTone(date)
//   notes        → getReflection(date)
//   pending      → buildTodaySummary().overdueItems
//   flagged      → buildTodaySummary().flaggedItems
//   appointment  → buildTodaySummary().nextAppointment
//   counts       → buildTodaySummary().medsAdherence + .mealsStatus +
//                  .vitalsReading
// ============================================================================

import { buildTodaySummary, type TodaySummary } from './careSummaryBuilder';
import { getTodayDateString } from '../services/carePlanGenerator';
import { getHandoffTone } from '../storage/handoffToneRepo';
import { getReflection } from '../storage/reflectionStorage';
import { getPatientRegistry } from '../storage/patientRegistry';
import { logError } from './devLog';

// ============================================================================
// TYPES
// ============================================================================

export interface BuildHandoffOptions {
  /** Override "now" — used by tests and by future scheduled-share flows. */
  now?: Date;
  /** Phase 5.7.c — toggle the NOTES section. Defaults to true.
   *  When false, the section is omitted regardless of whether a saved
   *  reflection exists. */
  includeNotes?: boolean;
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

// Caregiver-handoff lookahead is shorter than visit-prep's 14 days —
// caregivers care about what's next this week.
const APPOINTMENT_LOOKAHEAD_DAYS = 7;

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
// DONE — one-line count summary
// ============================================================================

/** Reads from buildTodaySummary() to produce "3 of 5 meds · 1 vitals · 2 meals".
 *  Returns "No items logged today." when nothing has been logged. */
function buildDoneSummaryLine(summary: TodaySummary): string {
  const parts: string[] = [];

  const med = summary.medsAdherence;
  if (med && med.total > 0) {
    parts.push(`${med.taken} of ${med.total} meds`);
  } else if (med && med.taken > 0) {
    parts.push(`${med.taken} meds`);
  }

  if (summary.vitalsReading && summary.vitalsReading.trim().length > 0) {
    parts.push('vitals check');
  }

  const meals = summary.mealsStatus;
  if (meals && meals.logged > 0) {
    parts.push(`${meals.logged} meal${meals.logged === 1 ? '' : 's'}`);
  }

  // Wellness check-ins surface through orientation/painLevel/etc. on
  // TodaySummary but no explicit count field exists. Future-friendly:
  // if any wellness signal is recorded, mark it as one check-in.
  const wellnessSignals = [
    summary.orientation, summary.painLevel, summary.alertness,
    summary.appetite, summary.bowelMovement, summary.bathingStatus,
    summary.mobilityStatus,
  ];
  const hasWellness = wellnessSignals.some(
    (s) => typeof s === 'string' && s.trim().length > 0,
  );
  if (hasWellness) parts.push('wellness check');

  return parts.length > 0 ? parts.join(' · ') : 'No items logged today.';
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

    const [patientName, tone, reflection, summary] = await Promise.all([
      getActivePatientName(),
      getHandoffTone(dateStr),
      getReflection(dateStr),
      buildTodaySummary(),
    ]);

    const lines: string[] = [];

    // Header
    lines.push(formatHeader(patientName, now));

    // TONE — bare line, no label. Sets the day's emotional frame.
    if (tone && tone.trim().length > 0) {
      lines.push('', tone.trim());
    }

    // STILL TO DO — pending items with specific names
    if (summary.overdueItems.length > 0) {
      lines.push('', 'STILL TO DO');
      for (const item of summary.overdueItems) {
        lines.push(item);
      }
    }

    // HEADS UP — flagged items as natural sentences
    if (summary.flaggedItems.length > 0) {
      lines.push('', 'HEADS UP');
      for (const item of summary.flaggedItems) {
        lines.push(item);
      }
    }

    // COMING UP — appointment within 7 days
    if (summary.nextAppointment && isWithinLookahead(summary.nextAppointment.date, now)) {
      lines.push('', 'COMING UP');
      lines.push(formatAppointmentLine(summary.nextAppointment));
    }

    // NOTES — gated by includeNotes (default true)
    const shouldIncludeNotes = opts.includeNotes !== false;
    const notes = (reflection?.text ?? '').trim();
    if (shouldIncludeNotes && notes.length > 0) {
      lines.push('', 'NOTES', notes);
    }

    // DONE — one-line count summary. Always rendered so the recipient
    // sees what was tracked even on quiet days ("No items logged today.").
    lines.push('', 'DONE');
    lines.push(buildDoneSummaryLine(summary));

    // Footer
    lines.push('', FOOTER_LINE);

    return lines.join('\n');
  } catch (error) {
    if (error instanceof ProfileMissingError) throw error;
    logError('buildHandoffReport', error);
    throw error;
  }
}
