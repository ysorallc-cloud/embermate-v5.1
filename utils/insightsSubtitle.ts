// ============================================================================
// INSIGHTS SUBTITLE — Phase 15.8
//
// Pure function that picks the Insights header subtitle copy. Two
// variants:
//   • Visit-anchored: "For {patientName}'s visit with {provider}
//     · {N} days away" — when an appointment exists in the canonical
//     14-day upcoming window AND both patientName and provider are
//     usable. The countdown ("N days away") is phrased to NOT collide
//     with the range selector's data-window day count (7/14/30d).
//   • Default daysOfData chain: the pre-15.8 copy keyed on how much
//     history exists ("Log a few days...", "Building Dad's picture
//     — N days in.", "What the last N days are showing.").
//
// Witness voice: subtitles are observational and factual. Never
// "Get ready for..." or "Don't forget..." — urgency framing is
// out of register for Insights.
//
// "Your loved one" placeholder check: understand.tsx emits the
// literal string "your loved one" when activePatient.name is the
// default "Patient" or missing. We treat that as unusable for the
// visit-anchored variant — "For your loved one's visit with..."
// reads awkwardly. The default daysOfData chain handles the
// no-anchor case gracefully.
//
// Provider rendered as-is (no credential stripping). The form
// validates `>= 2` chars and trims; nothing else in the app
// modifies provider strings on display.
// ============================================================================

import { possessive } from './text/possessive';

export interface InsightsSubtitleInputs {
  daysOfData: number;
  patientName: string;
  upcomingAppointment: {
    provider: string;
    daysUntil: number;
  } | null;
}

const PLACEHOLDER_PATIENT_NAME = 'your loved one';
const MIN_PROVIDER_LENGTH = 2;

function isUsableName(name: string): boolean {
  return Boolean(name) && name.trim() !== '' && name !== PLACEHOLDER_PATIENT_NAME;
}

function isUsableProvider(provider: string): boolean {
  return Boolean(provider) && provider.trim().length >= MIN_PROVIDER_LENGTH;
}

// Visit countdown — phrased as "N days away" (not bare "N days") so it reads
// as a countdown to the appointment, not the Insights data-range window the
// selector controls. "today" stays bare (no "away").
function daysLabel(n: number): string {
  if (n === 0) return 'today';
  if (n === 1) return '1 day away';
  return `${n} days away`;
}

function defaultSubtitle(daysOfData: number, patientName: string): string {
  if (daysOfData === 0) {
    return 'Log a few days of meds and mood, and patterns will start to surface.';
  }
  if (daysOfData < 7) {
    return `Building ${possessive(patientName)} picture — ${daysOfData} day${daysOfData !== 1 ? 's' : ''} in.`;
  }
  if (daysOfData < 30) {
    return `What the last ${daysOfData} days are showing.`;
  }
  return 'What the last 30 days are showing.';
}

export function computeInsightsSubtitle(inp: InsightsSubtitleInputs): string {
  const { daysOfData, patientName, upcomingAppointment } = inp;

  if (
    upcomingAppointment &&
    isUsableName(patientName) &&
    isUsableProvider(upcomingAppointment.provider)
  ) {
    return `For ${possessive(patientName)} visit with ${upcomingAppointment.provider} · ${daysLabel(upcomingAppointment.daysUntil)}`;
  }

  return defaultSubtitle(daysOfData, patientName);
}
