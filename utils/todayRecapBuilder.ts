// ============================================================================
// TODAY RECAP BUILDER — Phase 11.8.1
//
// Replaces the count-based output of buildDayNarrative for the
// Journal Today path with value-based prose. Reuses the assemble-
// VisitPrepData shape, scoped to a single day.
//
// Pre-fix the journal subtitle and NarrativeSnapshot read
// buildDayNarrative(dateKey, { factualOnly: true }), which produced
// lines like "1 vitals reading recorded. 2 wellness checks recorded."
// — counts only, no values. Caregivers need the actual reading
// (BP 132/82) and the actual wellness signal (alert, good mood) to
// hand off the day, not a tally.
//
// Per-section policy:
//   • medication: "X/Y morning meds taken on time" when all in a
//     single window; "X/Y medications taken" otherwise; partial
//     counts call out remaining.
//   • vitals: latest value per type, ordered (BP / HR / Glucose /
//     Weight / etc.) with the earliest reading's clock time as the
//     section label. Falls through silently when no parseable
//     numeric values exist (avoids "BP NaN/NaN" fabrication).
//   • wellness: mood/energy descriptor from LogEntry.data when
//     present; falls back to "<window> check" count phrasing when
//     no payload exists.
//   • nutrition: per-meal status enumeration (Breakfast eaten,
//     Lunch pending, …).
//
// Tone: observation-only. No interpretive vocabulary
// (concerning / alarming / stable / normal). Same forbidden-vocab
// spirit as narrativeSummaryBuilder factualOnly.
//
// Patient-agnostic: the builder reads no PatientContext / patient
// name. Same Phase 10 rule that pinned the care-plan / witness
// builders carries forward.
// ============================================================================

import { listDailyInstances, listLogsByDate, DEFAULT_PATIENT_ID } from '../storage/carePlanRepo';
import { getVitalsInRange } from './vitalsStorage';
import { logError } from './devLog';
import type { DailyCareInstance, LogEntry } from '../types/carePlan';
import type { VitalReading } from './vitalsStorage';

export interface TodayRecapSection {
  /** Display label, e.g. "Medications", "Vitals (8a)", "Wellness", "Meals". */
  label: string;
  /** Value-based prose for the section. */
  text: string;
  /** Canonical itemType — drives ordering and consumer styling. */
  itemType: 'medication' | 'vitals' | 'wellness' | 'nutrition' | 'sleep' | 'hydration' | string;
}

export interface TodayRecap {
  hasData: boolean;
  sections: TodayRecapSection[];
  /** Compact one-line value-based subtitle for the Journal header.
   *  Empty string when no sections. */
  subtitle: string;
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function clockLabel(d: Date): string {
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'p' : 'a';
  h = h % 12; if (h === 0) h = 12;
  return m === 0 ? `${h}${ampm}` : `${h}:${String(m).padStart(2, '0')}${ampm}`;
}

function moodLabel(score: number | undefined): string | null {
  if (typeof score !== 'number' || !Number.isFinite(score)) return null;
  if (score >= 5) return 'great mood';
  if (score >= 4) return 'good mood';
  if (score >= 3) return 'okay mood';
  if (score >= 2) return 'low mood';
  return 'rough mood';
}

function mealStatusVerb(status: string): string {
  switch (status) {
    case 'completed': return 'eaten';
    case 'skipped':   return 'skipped';
    case 'missed':    return 'missed';
    default:          return 'pending';
  }
}

function titleCase(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}

/** Latest-value-per-type collapse over the day's vitals readings. */
function latestPerType(readings: VitalReading[]): Map<string, VitalReading> {
  const out = new Map<string, VitalReading>();
  for (const r of readings) {
    const prev = out.get(r.type);
    if (!prev || r.timestamp > prev.timestamp) out.set(r.type, r);
  }
  return out;
}

// ----------------------------------------------------------------------------
// Per-section builders
// ----------------------------------------------------------------------------

function buildMedicationSection(instances: DailyCareInstance[]): TodayRecapSection | null {
  const meds = instances.filter((i) => i.itemType === 'medication');
  if (meds.length === 0) return null;
  const completed = meds.filter((i) => i.status === 'completed' || i.status === 'skipped').length;
  const total = meds.length;

  // If all meds are in one window AND all completed → "morning meds taken on time".
  const windows = new Set(meds.map((i) => i.windowLabel));
  const allDone = completed === total;

  let text: string;
  if (allDone && windows.size === 1) {
    const win = Array.from(windows)[0] || 'morning';
    text = `${completed}/${total} ${win} meds taken on time`;
  } else if (allDone) {
    text = `${completed}/${total} medications taken`;
  } else {
    const remaining = total - completed;
    text = `${completed}/${total} medications taken · ${remaining} still pending`;
  }
  return { label: 'Medications', text, itemType: 'medication' };
}

function buildVitalsSection(readings: VitalReading[]): TodayRecapSection | null {
  if (readings.length === 0) return null;
  const valid = readings.filter((r) => Number.isFinite(r.value));
  if (valid.length === 0) return null;
  const latest = latestPerType(valid);

  // Build value tokens in a stable, clinical reading order.
  const parts: string[] = [];
  const sys = latest.get('systolic');
  const dia = latest.get('diastolic');
  if (sys && dia) parts.push(`BP ${Math.round(sys.value)}/${Math.round(dia.value)}`);
  else if (sys) parts.push(`Systolic ${Math.round(sys.value)}`);
  else if (dia) parts.push(`Diastolic ${Math.round(dia.value)}`);

  const hr = latest.get('heartRate');
  if (hr) parts.push(`HR ${Math.round(hr.value)}`);

  const glucose = latest.get('glucose');
  if (glucose) parts.push(`Glucose ${Math.round(glucose.value)}`);

  const weight = latest.get('weight');
  if (weight) parts.push(`Weight ${Math.round(weight.value)}`);

  const oxygen = latest.get('oxygen');
  if (oxygen) parts.push(`O₂ ${Math.round(oxygen.value)}%`);

  const temp = latest.get('temperature');
  if (temp) {
    const v = temp.value;
    parts.push(`Temp ${v % 1 === 0 ? v : v.toFixed(1)}°`);
  }

  if (parts.length === 0) return null;

  const earliest = valid.reduce(
    (min, r) => (r.timestamp < min.timestamp ? r : min),
    valid[0],
  );
  const label = `Vitals (${clockLabel(new Date(earliest.timestamp))})`;
  return { label, text: parts.join(' · '), itemType: 'vitals' };
}

function buildWellnessSection(
  instances: DailyCareInstance[],
  logs: LogEntry[],
): TodayRecapSection | null {
  const wellness = instances.filter((i) => i.itemType === 'wellness');
  if (wellness.length === 0) return null;

  // Pair instances with logs by dailyInstanceId.
  const logByInstance = new Map<string, LogEntry>();
  for (const l of logs) {
    if (l.dailyInstanceId) logByInstance.set(l.dailyInstanceId, l);
  }

  // Collect mood/energy phrases for completed wellness checks.
  const phrases: string[] = [];
  let completedCount = 0;
  for (const i of wellness) {
    if (i.status !== 'completed') continue;
    completedCount += 1;
    const l = logByInstance.get(i.id);
    const data = l?.data as any;
    if (data && data.type === 'mood') {
      const mood = moodLabel(data.mood);
      const energy = typeof data.energy === 'number'
        ? `energy ${data.energy}/5`
        : null;
      const window = i.windowLabel || 'morning';
      const moodPart = mood ? `${mood}` : null;
      const parts = [moodPart, energy].filter(Boolean) as string[];
      if (parts.length > 0) {
        phrases.push(`${titleCase(window)} check — ${parts.join(', ')}`);
      } else {
        phrases.push(`${titleCase(window)} check`);
      }
    } else {
      // No payload → count-style fallback per the section's contract.
      phrases.push(`${titleCase(i.windowLabel || 'morning')} check`);
    }
  }

  if (phrases.length === 0 && wellness.length > 0) {
    // No completed checks — surface what's pending so the section
    // still appears in the recap rather than vanishing.
    const pending = wellness.filter((i) => i.status === 'pending').length;
    if (pending > 0) {
      return { label: 'Wellness', text: `${pending} check pending`, itemType: 'wellness' };
    }
    return null;
  }

  return { label: 'Wellness', text: phrases.join('. '), itemType: 'wellness' };
}

function buildMealsSection(instances: DailyCareInstance[]): TodayRecapSection | null {
  const meals = instances.filter((i) => i.itemType === 'nutrition');
  if (meals.length === 0) return null;

  // Group by mealType (denormalized into itemName) and report status
  // verbatim. e.g. "Breakfast eaten. Lunch pending. Dinner pending."
  const lines = meals.map((i) => `${titleCase(i.itemName)} ${mealStatusVerb(i.status)}`);
  return { label: 'Meals', text: lines.join('. '), itemType: 'nutrition' };
}

// ----------------------------------------------------------------------------
// Public entry point
// ----------------------------------------------------------------------------

function buildSubtitle(sections: TodayRecapSection[]): string {
  if (sections.length === 0) return '';
  // Compact subtitle — pick the most informative section's text.
  // Order of priority: medication > vitals > wellness > nutrition.
  const order: TodayRecapSection['itemType'][] = [
    'medication', 'vitals', 'wellness', 'nutrition',
  ];
  for (const key of order) {
    const s = sections.find((sec) => sec.itemType === key);
    if (s) return s.text;
  }
  return sections[0].text;
}

export async function buildTodayRecap(
  dateKey: string,
  options: { patientId?: string } = {},
): Promise<TodayRecap> {
  try {
    const patientId = options.patientId ?? DEFAULT_PATIENT_ID;
    // Pull all three pipelines in parallel.
    const startISO = new Date(`${dateKey}T00:00:00`).toISOString();
    const endISO = new Date(`${dateKey}T23:59:59`).toISOString();
    const [instances, logs, vitals] = await Promise.all([
      listDailyInstances(patientId, dateKey),
      listLogsByDate(patientId, dateKey),
      getVitalsInRange(startISO, endISO),
    ]);

    const sections: TodayRecapSection[] = [];
    const med = buildMedicationSection(instances);
    if (med) sections.push(med);
    const vit = buildVitalsSection(vitals);
    if (vit) sections.push(vit);
    const well = buildWellnessSection(instances, logs);
    if (well) sections.push(well);
    const meals = buildMealsSection(instances);
    if (meals) sections.push(meals);

    return {
      hasData: sections.length > 0,
      sections,
      subtitle: buildSubtitle(sections),
    };
  } catch (err) {
    logError('todayRecapBuilder.buildTodayRecap', err);
    return { hasData: false, sections: [], subtitle: '' };
  }
}
