// ============================================================================
// VISIT PREP PDF — Shareable 1-page care summary for doctor visits
// Data assembly + HTML template + PDF generation via expo-print
// ============================================================================

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { getMedications } from '../utils/medicationStorage';
import { VitalReading } from '../utils/vitalsStorage';
// Wave-1 clinician convergence (Fix #2): vitals read from the CANONICAL store
// (store B `@embermate_central_vitals_logs`, what Now/Journal read) — not the
// separate store A `@vitals_readings`, which only co-populated by the QuickLog
// dual-write and could silently drift from the screens.
import { getCanonicalVitalReadingsInRange } from '../utils/vitalsCanonical';
import { NO_VITALS_IN_WINDOW } from '../utils/reportVitals';
import {
  listDailyInstancesRange,
  listLogsInRange,
  DEFAULT_PATIENT_ID,
} from '../storage/carePlanRepo';
import { getReflection, StoredReflection } from '../storage/reflectionStorage';
import { logError } from '../utils/devLog';
import {
  detectSymptomChanges,
  type SymptomChange,
} from './symptomChangeDetection';
import {
  extractFunctionalIssues,
  type FunctionalIssue,
} from './functionalIssueExtraction';
import {
  listQuestions,
  clearQuestions,
} from './patientQuestionsRepo';
import {
  listMedicationChanges,
  type MedicationChange,
} from './medicationChangeTracking';
import { buildWhatChanged, type WhatChangedVitalSnapshot } from './whatChanged';
import {
  selectNotesForVisitPrep,
  type SelectedNote,
} from '../utils/visitPrepNoteCuration';
import { getVisitPrepDraft } from '../storage/visitPrepDraftRepo';
import {
  getCaregiverNotes,
  type VisitPrepCaregiverNotes,
} from '../storage/visitPrepCaregiverNotesRepo';
import { buildRedFlags, type RedFlag } from './redFlags';
import {
  buildHydrationNutrition,
  type HydrationNutritionSummary,
} from './hydrationNutrition';
import {
  buildWellnessPatterns,
  type WellnessPatternsSummary,
} from './wellnessPatterns';
import { LIGHT_PDF_CSS } from '../utils/lightPdfTemplate';

// ============================================================================
// PROFILE-MISSING SENTINEL
// ============================================================================

export class ProfileMissingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProfileMissingError';
  }
}

// ============================================================================
// TYPES
// ============================================================================

export interface VisitPrepConfig {
  dateRange: { start: string; end: string };
  includeMeds: boolean;
  includeVitals: boolean;
  includeWellness: boolean;
  includeJournal: boolean;
  includeQuestions: boolean;
  /** Phase 5.10.d — toggle gates for the new sections added in 5.10.a.
   *  Both default true on the config screen. Marked optional so callers
   *  pre-dating this phase don't break. */
  includeRedFlags?: boolean;
  includeHydrationNutrition?: boolean;
  questions: string;
  patientName: string;
  caregiverName?: string;
  /** Phase 16.2 — when present, the assembler reads the caregiver-
   *  fillable block (3 symptoms / 3 functional / 3 questions / daily
   *  activities) from visitPrepCaregiverNotesRepo and renders the
   *  filled values as sub-sections inside Caregiver Notes. Absent →
   *  no caregiver-block content; the auto-extracted sections still
   *  render exactly as before. */
  appointmentId?: string;
}

export interface AdherenceEntry {
  name: string;
  dosage: string;
  rate: number; // 0–100
  missedDays: number;
}

export interface VitalEntry {
  type: string;
  label: string;
  latestValue: string;
  trend: 'up' | 'down' | 'stable' | 'unknown';
  outOfRange: number;
}

export interface SkippedDoseSummary {
  medicationName: string;
  refused: number;
  tooSoon: number;
  other: number;
  total: number;
}

export interface VisitPrepWhatChanged {
  observations: string[];
  /** True when the auto-draft fell back to the deferred message because
   *  the period is under 7 days OR no detectable changes existed. */
  insufficientData: boolean;
  /** True when the user has saved an edited draft via visitPrepDraftRepo. */
  userEdited: boolean;
}

export interface VisitPrepIncludes {
  redFlags: boolean;
  meds: boolean;
  vitals: boolean;
  hydrationNutrition: boolean;
  wellness: boolean;
  notes: boolean;
  questions: boolean;
}

export interface VisitPrepData {
  header: {
    patientName: string;
    /** Caregiver name for footer attribution and back-compat. */
    caregiverName?: string;
    /** Phase 5.8.b — header attribution line ("Prepared by Sarah"). */
    preparedBy: string;
    dateRange: string;
    generatedAt: string;
    periodDays: number;
  };
  /** Phase 5.10.d — toggle state, threaded so renderers can show header
   *  + "no data in window" sentinel when a toggle is ON but data is sparse,
   *  vs. omit entirely when the toggle is OFF. */
  includes: VisitPrepIncludes;
  /** Phase 5.10.a — top-of-page critical/attention callout. Empty array
   *  → caller omits the section entirely. */
  redFlags: RedFlag[];
  /** Phase 5.8.b — "What changed" lede. Editable in 5.7.d preview screen. */
  whatChanged: VisitPrepWhatChanged;
  adherence: AdherenceEntry[];
  /** Skip reasons aggregated from LogEntry.skipReason — surfaced under adherence. */
  skippedDoses: SkippedDoseSummary[];
  vitals: VitalEntry[];
  /** Phase 5.10.a — between Vitals and Sleep/Energy/Mood. null → omit. */
  hydrationNutrition: HydrationNutritionSummary | null;
  /** Phase 5.10.a — replaces legacy `wellness` field. Variance + same-day
   *  correlation across the window vs prior window. */
  wellnessPatterns: WellnessPatternsSummary;
  /** Symptom Progression — was "Symptoms that changed". */
  symptomChanges: SymptomChange[];
  /** True when the period is < 14 days — drives the "more data needed" hint. */
  symptomDataInsufficient: boolean;
  functionalIssues: FunctionalIssue[];
  /** Pulled from patientQuestionsRepo; empty when nothing was logged. */
  patientQuestions: string[];
  questionsEmptyHint: string;
  medicationChanges: MedicationChange[];
  /** Phase 5.8.b — curated notes (3 max, full text, dated, flagged-first). */
  selectedNotes: SelectedNote[];
  /** Legacy: prior thin "Apr 25: <truncated>…" lines. Kept for back-compat
   *  with anything still rendering this slot; new HTML uses selectedNotes. */
  journalHighlights: string[];
  /** Legacy free-text questions (pre-Prompt 5 path). Kept for back-compat. */
  questions: string;
  /** Phase 16.2 — caregiver-fillable block, fetched only when
   *  config.appointmentId is set. Null when the config didn't anchor
   *  to an appointment (e.g. caregiver invoked /visit-prep without
   *  apptId). Filled fields render as sub-sections in Caregiver
   *  Notes; empty fields omitted entirely. */
  caregiverFillable: import('../storage/visitPrepCaregiverNotesRepo').VisitPrepCaregiverNotes | null;
  footer: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function formatDateRange(start: string, end: string): string {
  const fmt = (d: string) =>
    new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return start === end ? fmt(start) : `${fmt(start)} – ${fmt(end)}`;
}

function periodDays(start: string, end: string): number {
  const s = new Date(`${start}T12:00:00`).getTime();
  const e = new Date(`${end}T12:00:00`).getTime();
  return Math.max(1, Math.floor((e - s) / (1000 * 60 * 60 * 24)) + 1);
}

function buildCaregiverDisclaimer(
  days: number,
  caregiverName: string,
): string {
  // Phase 5.8.b — new footer copy. Pinned by visitPrepPdfStructure.test.ts
  // and visitPrepContentParity.test.ts. The caregiver name is required at
  // the call site (assembleVisitPrepData throws ProfileMissingError when
  // missing); this helper trusts its input.
  const dayWord = days === 1 ? 'day' : 'days';
  return (
    `Generated from observations and logs kept by ${caregiverName} over ` +
    `${days} ${dayWord}. This is not a clinical record — please ` +
    `cross-reference with medical history. EmberMate.`
  );
}

function computeTrend(readings: number[]): 'up' | 'down' | 'stable' | 'unknown' {
  if (readings.length < 2) return 'unknown';
  const first = readings.slice(0, Math.ceil(readings.length / 2));
  const second = readings.slice(Math.ceil(readings.length / 2));
  const avg = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;
  const diff = avg(second) - avg(first);
  if (Math.abs(diff) < 2) return 'stable';
  return diff > 0 ? 'up' : 'down';
}

const TREND_ARROW: Record<string, string> = { up: '↑', down: '↓', stable: '→', unknown: '–' };

const VITAL_LABELS: Record<string, string> = {
  systolic: 'Systolic BP',
  diastolic: 'Diastolic BP',
  heartRate: 'Heart Rate',
  glucose: 'Blood Glucose',
  oxygen: 'SpO2',
  temperature: 'Temperature',
  weight: 'Weight',
};

const VITAL_RANGES: Record<string, { low: number; high: number }> = {
  systolic: { low: 90, high: 140 },
  diastolic: { low: 60, high: 90 },
  heartRate: { low: 50, high: 100 },
  glucose: { low: 70, high: 140 },
  oxygen: { low: 92, high: 100 },
  temperature: { low: 97, high: 99.5 },
};

// ============================================================================
// DATA ASSEMBLY
// ============================================================================

export async function assembleVisitPrepData(config: VisitPrepConfig): Promise<VisitPrepData> {
  const { dateRange, patientName, caregiverName } = config;
  const days = periodDays(dateRange.start, dateRange.end);

  // Phase 5.8.b — caregiver name is required for header attribution and
  // footer copy. Empty/missing → ProfileMissingError; the visit-prep entry
  // screen catches this in 5.8.c and surfaces a profile prompt.
  const caregiverTrimmed = (caregiverName ?? '').trim();
  if (caregiverTrimmed.length === 0) {
    throw new ProfileMissingError(
      'Caregiver profile is missing a name. Add it in Settings → Profile before generating Visit Prep.',
    );
  }

  // Header
  const header = {
    patientName,
    caregiverName: caregiverTrimmed,
    preparedBy: caregiverTrimmed,
    dateRange: formatDateRange(dateRange.start, dateRange.end),
    generatedAt: new Date().toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    }),
    periodDays: days,
  };

  // Adherence
  let adherence: AdherenceEntry[] = [];
  if (config.includeMeds) {
    try {
      const meds = await getMedications();
      const activeMeds = meds.filter(m => m.active);
      const instances = await listDailyInstancesRange(
        DEFAULT_PATIENT_ID, dateRange.start, dateRange.end,
      );
      const medInstances = instances.filter(i => i.itemType === 'medication');

      for (const med of activeMeds) {
        const matching = medInstances.filter(
          i => (i.itemName || '').toLowerCase().includes(med.name.toLowerCase()),
        );
        const total = matching.length || 1;
        // Wave-1 clinician convergence — LOCKED DEFINITION: a SKIPPED dose is
        // NOT adherent. Only 'completed' counts toward the rate; skipped (and
        // missed/pending) count AGAINST it. The prior `|| i.status === 'skipped'`
        // credited skips and made a half-skipped med read 100% on a doctor's PDF.
        const completed = matching.filter(
          i => i.status === 'completed',
        ).length;
        const missed = matching.filter(i => i.status === 'missed').length;
        adherence.push({
          name: med.name,
          dosage: med.dosage || '',
          rate: Math.round((completed / total) * 100),
          missedDays: missed,
        });
      }
    } catch (err) {
      logError('visitPrepPdf.adherence', err);
    }
  }

  // Vitals
  let vitals: VitalEntry[] = [];
  if (config.includeVitals) {
    try {
      const startISO = new Date(`${dateRange.start}T00:00:00`).toISOString();
      const endISO = new Date(`${dateRange.end}T23:59:59`).toISOString();
      const readings = await getCanonicalVitalReadingsInRange(startISO, endISO);

      const byType = new Map<string, VitalReading[]>();
      for (const r of readings) {
        const arr = byType.get(r.type) || [];
        arr.push(r);
        byType.set(r.type, arr);
      }

      for (const [type, rds] of byType) {
        const sorted = rds.sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
        );
        const values = sorted.map(r => r.value);
        const latest = sorted[sorted.length - 1];
        const range = VITAL_RANGES[type];
        const outOfRange = range
          ? values.filter(v => v < range.low || v > range.high).length
          : 0;

        vitals.push({
          type,
          label: VITAL_LABELS[type] || type,
          latestValue: `${latest.value}${latest.unit ? ' ' + latest.unit : ''}`,
          trend: computeTrend(values),
          outOfRange,
        });
      }
    } catch (err) {
      logError('visitPrepPdf.vitals', err);
    }
  }

  // Phase 5.10.a — Sleep, Energy & Mood Patterns. Replaces the legacy
  // count-only wellness section. Variance + same-day correlation across
  // current vs equal-length prior window.
  let wellnessPatterns: WellnessPatternsSummary = {
    sleep: null, energy: null, mood: null,
  };
  if (config.includeWellness) {
    try {
      wellnessPatterns = await buildWellnessPatterns({
        patientId: DEFAULT_PATIENT_ID,
        dateRange,
      });
    } catch (err) {
      logError('visitPrepPdf.wellnessPatterns', err);
    }
  }

  // Phase 5.10.a — Hydration & Nutrition. Cup totals + meal full/partial/
  // refused counts + appetite summary. Returns null when both arms are
  // empty.
  // Phase 5.10.d — gated by includeHydrationNutrition (default true).
  // When toggle is OFF, the renderer omits the section entirely.
  // When toggle is ON but data is null, the renderer surfaces a
  // "no hydration or meals logged in this window" sentinel.
  let hydrationNutrition: HydrationNutritionSummary | null = null;
  if (config.includeHydrationNutrition !== false) {
    try {
      hydrationNutrition = await buildHydrationNutrition({
        patientId: DEFAULT_PATIENT_ID,
        dateRange,
      });
    } catch (err) {
      logError('visitPrepPdf.hydrationNutrition', err);
    }
  }

  // Phase 5.8.b — curate notes. Pull all reflections in the window (no
  // truncation), then run the keyword-flag-priority selector. Output is
  // up to 3 notes, full text, dated, oldest-first when displayed.
  let selectedNotes: SelectedNote[] = [];
  let journalHighlights: string[] = []; // legacy back-compat slot
  if (config.includeJournal) {
    try {
      const start = new Date(`${dateRange.start}T12:00:00`);
      const end = new Date(`${dateRange.end}T12:00:00`);
      const allNotes: { date: string; text: string }[] = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const reflection = await getReflection(dateStr);
        if (reflection?.text && reflection.text.trim().length > 0) {
          allNotes.push({ date: dateStr, text: reflection.text });
        }
      }
      selectedNotes = selectNotesForVisitPrep(allNotes, 3);
      // Populate the legacy slot too — short dated lines for any consumer
      // that still reads journalHighlights[]. New HTML uses selectedNotes.
      journalHighlights = selectedNotes.map((n) => {
        const label = new Date(`${n.date}T12:00:00`)
          .toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return `${label}: ${n.text}`;
      });
    } catch (err) {
      logError('visitPrepPdf.journal', err);
    }
  }

  // Questions (legacy free-text path — kept for back-compat callers).
  const questions = config.includeQuestions ? config.questions.trim() : '';

  // ──────────────────────────────────────────────────────────────────────
  // v6.7 — nurse-format sections (Prompt 5)
  // ──────────────────────────────────────────────────────────────────────

  // Skipped doses by reason — pulled from LogEntry.skipReason on completed
  // skip logs. Empty array when nothing was skipped.
  let skippedDoses: SkippedDoseSummary[] = [];
  try {
    const logs = await listLogsInRange(
      DEFAULT_PATIENT_ID, dateRange.start, dateRange.end,
    );
    const byMed = new Map<string, SkippedDoseSummary>();
    for (const log of logs) {
      if (log.outcome !== 'skipped') continue;
      const name = (log.data as any)?.medicationName
        || ((log as any).medicationName)
        || 'Medication';
      const entry = byMed.get(name) || {
        medicationName: name, refused: 0, tooSoon: 0, other: 0, total: 0,
      };
      const reason = log.skipReason || 'other';
      if (reason === 'refused') entry.refused += 1;
      else if (reason === 'too-soon') entry.tooSoon += 1;
      else entry.other += 1;
      entry.total += 1;
      byMed.set(name, entry);
    }
    skippedDoses = Array.from(byMed.values()).sort((a, b) => b.total - a.total);
  } catch (err) {
    logError('visitPrepPdf.skippedDoses', err);
  }

  // Symptoms that changed — first-half vs second-half comparison. The
  // detector returns an empty array for windows under 7 days; the PDF then
  // shows the "more data needed" message instead of the standard empty
  // state, per the Prompt 5 stop condition.
  let symptomChanges: SymptomChange[] = [];
  let symptomDataInsufficient = false;
  try {
    symptomChanges = await detectSymptomChanges(
      DEFAULT_PATIENT_ID,
      { start: dateRange.start, end: dateRange.end },
    );
    if (days < 14) symptomDataInsufficient = true;
  } catch (err) {
    logError('visitPrepPdf.symptomChanges', err);
  }

  // Functional issues — mood / energy / appetite / mobility.
  let functionalIssues: FunctionalIssue[] = [];
  try {
    functionalIssues = await extractFunctionalIssues(
      DEFAULT_PATIENT_ID,
      { start: dateRange.start, end: dateRange.end },
    );
  } catch (err) {
    logError('visitPrepPdf.functionalIssues', err);
  }

  // Questions and concerns — populated from patientQuestionsRepo.
  let patientQuestions: string[] = [];
  try {
    const questionRecords = await listQuestions(DEFAULT_PATIENT_ID);
    patientQuestions = questionRecords.map((q) => q.text);
  } catch (err) {
    logError('visitPrepPdf.patientQuestions', err);
  }
  const questionsEmptyHint = 'Questions and concerns can be jotted down via Care Plan → Questions for the doctor.';

  // What changed after medication updates.
  let medicationChanges: MedicationChange[] = [];
  try {
    medicationChanges = await listMedicationChanges(
      DEFAULT_PATIENT_ID, dateRange.start, dateRange.end,
    );
  } catch (err) {
    logError('visitPrepPdf.medicationChanges', err);
  }

  // Phase 5.8.b — "What changed" lede. Auto-draft from detector outputs;
  // if a saved user-edit exists in visitPrepDraftRepo, use that instead.
  const auto = buildWhatChanged({
    symptomChanges,
    vitals: vitals.map<WhatChangedVitalSnapshot>((v) => ({
      type: v.type,
      label: v.label,
      trend: v.trend,
      outOfRange: v.outOfRange,
    })),
    functionalIssues,
    periodDays: days,
  });
  let userDraft: string | null = null;
  try {
    userDraft = await getVisitPrepDraft(dateRange.end);
  } catch (err) {
    logError('visitPrepPdf.draft', err);
  }
  const whatChanged: VisitPrepWhatChanged = userDraft
    ? { observations: [userDraft], insufficientData: false, userEdited: true }
    : { ...auto, userEdited: false };

  // Phase 5.10.a — Red Flags & Alerts. Surfaces critical/attention items
  // from already-assembled data so the doctor sees them at the top.
  const refusedByMed: Record<string, number> = {};
  for (const s of skippedDoses) {
    if (s.refused > 0) refusedByMed[s.medicationName] = s.refused;
  }
  const sleepDelta =
    wellnessPatterns.sleep && wellnessPatterns.sleep.priorAvg !== null
      ? wellnessPatterns.sleep.avgQuality - wellnessPatterns.sleep.priorAvg
      : 0;
  const notesForFlags = selectedNotes.map((n) => ({ date: n.date, text: n.text }));
  // Phase 5.10.d — gated by includeRedFlags (default true).
  const redFlags = config.includeRedFlags !== false
    ? buildRedFlags({
        adherence, vitals, notesInRange: notesForFlags,
        symptomChanges, sleepDelta, refusedByMed,
      })
    : [];

  // Footer — Phase 5.8.b copy. caregiverTrimmed is non-empty here (we'd
  // have thrown ProfileMissingError otherwise).
  const footer = buildCaregiverDisclaimer(days, caregiverTrimmed);

  // Phase 5.10.d — toggle state threaded for the renderer. Defaults true
  // for the two new (5.10.a) sections so callers pre-dating this phase
  // get the new content automatically.
  const includes: VisitPrepIncludes = {
    redFlags: config.includeRedFlags !== false,
    meds: config.includeMeds,
    vitals: config.includeVitals,
    hydrationNutrition: config.includeHydrationNutrition !== false,
    wellness: config.includeWellness,
    notes: config.includeJournal,
    questions: config.includeQuestions,
  };

  // Phase 16.2 — caregiver-fillable block. Only fetched when the
  // config carries an appointmentId; otherwise null and downstream
  // renderers skip the sub-sections.
  let caregiverFillable: VisitPrepCaregiverNotes | null = null;
  if (config.appointmentId) {
    try {
      caregiverFillable = await getCaregiverNotes(config.appointmentId);
    } catch (err) {
      logError('visitPrepPdf.caregiverFillable', err);
      caregiverFillable = null;
    }
  }

  return {
    header,
    includes,
    redFlags,
    whatChanged,
    adherence,
    skippedDoses,
    vitals,
    hydrationNutrition,
    wellnessPatterns,
    symptomChanges,
    symptomDataInsufficient,
    functionalIssues,
    patientQuestions,
    questionsEmptyHint,
    medicationChanges,
    selectedNotes,
    journalHighlights,
    questions,
    caregiverFillable,
    footer,
  };
}

// ============================================================================
// HTML TEMPLATE
// ============================================================================

function buildHtml(data: VisitPrepData): string {
  const trendArrow = (t: string) => TREND_ARROW[t] || '–';

  const medsRows = data.adherence.map(m => `
    <tr>
      <td>${m.name}</td>
      <td>${m.dosage}</td>
      <td>${m.rate}%</td>
      <td>${m.missedDays > 0 ? m.missedDays + ' day' + (m.missedDays > 1 ? 's' : '') : 'None'}</td>
    </tr>
  `).join('');

  const skippedRows = data.skippedDoses.map(s => `
    <tr>
      <td>${s.medicationName}</td>
      <td>${s.refused || '–'}</td>
      <td>${s.tooSoon || '–'}</td>
      <td>${s.other || '–'}</td>
      <td><strong>${s.total}</strong></td>
    </tr>
  `).join('');

  // v1 launch-blocker — the exported PDF (handed to a provider) renders the
  // FACT only: Vital / Latest / Trend. The dropped verdict column was a
  // threshold count from a fixed cutoff (VitalEntry.outOfRange vs VITAL_RANGES),
  // not the patient's baseline, so it was a false clinical claim here. Trend
  // stays — it's direction-of-change from the readings, not a threshold verdict.
  // VitalEntry.outOfRange remains COMPUTED on the data (v1.1 snapshot engine may
  // repurpose it); this is presentation-only.
  const vitalsRows = data.vitals.map(v => `
    <tr>
      <td>${v.label}</td>
      <td>${v.latestValue}</td>
      <td>${trendArrow(v.trend)}</td>
    </tr>
  `).join('');

  const symptomItems = data.symptomChanges.length > 0
    ? data.symptomChanges.map(s => {
        const tag = s.change === 'new'
          ? 'New'
          : s.change === 'worse'
            ? 'Worse'
            : s.change === 'better'
              ? 'Improving'
              : 'Resolved';
        return `<li><strong>${tag}:</strong> ${s.briefDescription}</li>`;
      }).join('')
    : data.symptomDataInsufficient
      ? '<li style="color: #999;">More data needed — minimum 14 days recommended.</li>'
      : '<li style="color: #999;">No major symptom changes during this period.</li>';

  const SEV_COLORS: Record<string, string> = {
    urgent: '#b94343',
    concerning: '#b07030',
    watch: '#5a7a5e',
  };
  const functionalItems = data.functionalIssues.length > 0
    ? data.functionalIssues.map(i => `
        <li>
          <span style="color:${SEV_COLORS[i.severity] || '#5a7a5e'}; font-weight:600; text-transform:uppercase; font-size:9px; letter-spacing:0.5px;">${i.severity}</span>
          &nbsp;${i.observation}
        </li>
      `).join('')
    : '<li style="color: #999;">No major functional changes.</li>';

  const patientQuestionItems = data.patientQuestions.length > 0
    ? data.patientQuestions.map(q => `<li>${q}</li>`).join('')
    : `<li style="color: #999;">${data.questionsEmptyHint}</li>`;

  const medChangeItems = data.medicationChanges.map(c => {
    const date = new Date(c.changedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    let what = '';
    if (c.kind === 'added') what = `<strong>${c.medicationName}</strong> added (${c.newDosage || 'dose unspecified'})`;
    else if (c.kind === 'removed') what = `<strong>${c.medicationName}</strong> stopped`;
    else what = `<strong>${c.medicationName}</strong> changed: ${c.previousDosage || '–'} → ${c.newDosage || '–'}`;
    return `<li><span style="color:#7a7a8a; font-size:10px;">${date}</span> &nbsp; ${what}</li>`;
  }).join('');

  const highlights = data.journalHighlights.length > 0
    ? data.journalHighlights.map(h => `<li>${h}</li>`).join('')
    : '<li style="color: #999;">No flagged entries in this period.</li>';

  // Phase 5.9.a — "What changed" lede. Renders 1-3 plain-language
  // observations from data.whatChanged.observations. When the period
  // was too short or no patterns surfaced, the deferred message takes
  // the same slot — never a silent omission.
  const whatChangedItems = data.whatChanged.insufficientData
    ? `<li style="color: #999;">${data.whatChanged.observations[0] ?? 'Two weeks of tracking suggested before patterns appear here.'}</li>`
    : data.whatChanged.observations.map(o => `<li>${o}</li>`).join('');

  // Phase 5.10.a — Red Flags & Alerts callout. Top-of-page priority
  // signal for the doctor. Empty list → no callout block at all.
  const redFlagItems = data.redFlags.map((f) => {
    const tag = f.severity === 'critical' ? 'CRITICAL' : 'ATTENTION';
    return `<li><strong style="color:#c14848;">${tag}:</strong> ${f.text}</li>`;
  }).join('');

  // Phase 5.10.a — Hydration & Nutrition body lines.
  const hn = data.hydrationNutrition;
  const hydrationLine = hn?.hydration
    ? `Hydration: ${hn.hydration.avgCupsPerDay.toFixed(1)} cups/day average ` +
      `(target ${hn.hydration.target}). ` +
      (hn.hydration.lowDays.length > 0
        ? `${hn.hydration.lowDays.length} low day${hn.hydration.lowDays.length === 1 ? '' : 's'}.`
        : 'No low days.')
    : '';
  const mealsLine = hn?.meals
    ? `Meals: ${hn.meals.fullMealDays} full day${hn.meals.fullMealDays === 1 ? '' : 's'}, ` +
      `${hn.meals.partialMealDays} partial. ` +
      (hn.meals.refusedMeals.length > 0
        ? `${hn.meals.refusedMeals.length} refused meal${hn.meals.refusedMeals.length === 1 ? '' : 's'}.`
        : '')
    : '';
  const appetiteLine = hn?.appetiteSummary ?? '';

  // Phase 5.10.a — Sleep, Energy & Mood Patterns body lines.
  const wp = data.wellnessPatterns;
  const sleepLine = wp.sleep
    ? `<strong>Sleep:</strong> ${wp.sleep.avgQuality.toFixed(1)}/5 average` +
      (wp.sleep.priorAvg !== null
        ? ` (vs ${wp.sleep.priorAvg.toFixed(1)} prior period)`
        : '') +
      (wp.sleep.poorNights.length > 0
        ? `. ${wp.sleep.poorNights.length} poor night${wp.sleep.poorNights.length === 1 ? '' : 's'}`
        : '') +
      (wp.sleep.earlierWaking ? ' · concentrating in recent days' : '') +
      '.'
    : '';
  const energyLine = wp.energy
    ? `<strong>Energy:</strong> ${wp.energy.afternoonDipDays} low-energy day${wp.energy.afternoonDipDays === 1 ? '' : 's'}` +
      (wp.energy.correlatesWithPoorSleep && wp.energy.correlatesWithPoorSleep > 0
        ? ` (correlates with poor sleep on ${wp.energy.correlatesWithPoorSleep} of those)`
        : '') +
      '.'
    : '';
  const moodLine = wp.mood
    ? `<strong>Mood:</strong> ${wp.mood.difficultMornings.length} difficult morning${wp.mood.difficultMornings.length === 1 ? '' : 's'}.`
    : '';

  // Legacy free-text path. Kept for back-compat callers that still pass
  // `config.questions`; new flows route through patientQuestionsRepo.
  const questionsHtml = data.questions
    ? data.questions.split('\n').filter(q => q.trim()).map(q => `<li>${q.trim()}</li>`).join('')
    : '';

  // Phase 16.2 — caregiver-fillable sub-sections. Each 3-field
  // category renders only when at least one slot is non-empty;
  // filled fields render as bullets in caregiver entry order, empty
  // slots are omitted. The daily-activities response renders as its
  // own labeled sub-section (paragraph, not bulleted) — never
  // commingled with the symptom/functional/question categories.
  const cf = data.caregiverFillable;
  const renderTripleSubsection = (label: string, triple: [string, string, string]): string => {
    const filled = triple
      .map((v, i) => ({ v: v.trim(), i }))
      .filter((x) => x.v.length > 0);
    if (filled.length === 0) return '';
    const items = filled.map((x) => `<li>${x.v}</li>`).join('');
    return `<h3 style="font-size:11px; font-weight:600; color:#7a7a8a; margin:8px 0 4px;">${label}</h3><ul>${items}</ul>`;
  };
  const caregiverSymptomsHtml = cf
    ? renderTripleSubsection('Symptoms changed (caregiver’s view)', cf.symptomsChanged)
    : '';
  const caregiverFunctionalHtml = cf
    ? renderTripleSubsection('Functional changes (caregiver’s view)', cf.functionalChanges)
    : '';
  const caregiverQuestionsHtml = cf
    ? renderTripleSubsection('Questions for the provider', cf.questionsForProvider)
    : '';
  const helpProvidedTrimmed = cf?.helpProvidedThisWeek?.trim() ?? '';
  const helpProvidedHtml = helpProvidedTrimmed.length > 0
    ? `<h3 style="font-size:11px; font-weight:600; color:#7a7a8a; margin:8px 0 4px;">Help provided this week</h3><p>${helpProvidedTrimmed}</p>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>${LIGHT_PDF_CSS}</style>
</head>
<body>
  <h1>Care Summary: ${data.header.patientName}</h1>
  <div class="subtitle">
    ${data.header.dateRange}${data.header.caregiverName ? ' · Prepared by ' + data.header.caregiverName : ''} · ${data.header.generatedAt}
  </div>
  <div class="provenance">Caregiver-reported observations · Not a clinical record</div>

  ${data.includes.redFlags ? (data.redFlags.length > 0 ? `
  <div class="callout callout-redflag">
    <h2>Red Flags &amp; Alerts</h2>
    <ul>${redFlagItems}</ul>
  </div>
  ` : `
  <div class="callout callout-redflag">
    <h2>Red Flags &amp; Alerts</h2>
    <p style="color:#9a9aa8;">No flags raised in this window.</p>
  </div>
  `) : ''}

  <h2>What changed</h2>
  <ul>${whatChangedItems}</ul>

  ${data.includes.meds ? (data.adherence.length > 0 ? `
  <h2>Medication adherence</h2>
  <table>
    <tr><th>Medication</th><th>Dose</th><th>Adherence</th><th>Missed</th></tr>
    ${medsRows}
  </table>
  ${data.skippedDoses.length > 0 ? `
  <h3 style="font-size:11px; font-weight:600; color:#7a7a8a; margin:8px 0 4px;">Skipped doses by reason</h3>
  <table>
    <tr><th>Medication</th><th>Refused</th><th>Too soon</th><th>Other</th><th>Total</th></tr>
    ${skippedRows}
  </table>
  ` : ''}
  ` : `
  <h2>Medication adherence</h2>
  <p style="color:#9a9aa8;">No medications logged in this window.</p>
  `) : ''}

  ${/* Phase 16.1 — medication-correlation content lifted from the end
       of the body to here, grouping all medication-related sections
       together (adherence + skipped doses + correlations) per the
       clinical-standard order. */ ''}
  ${data.medicationChanges.length > 0 ? `
  <h2>What changed after medication updates</h2>
  <ul>${medChangeItems}</ul>
  ` : ''}

  ${data.includes.vitals ? (data.vitals.length > 0 ? `
  <h2>Vitals</h2>
  <table>
    <tr><th>Vital</th><th>Latest</th><th>Trend</th></tr>
    ${vitalsRows}
  </table>
  ` : `
  <h2>Vitals</h2>
  <p style="color:#9a9aa8;">${NO_VITALS_IN_WINDOW}</p>
  `) : ''}

  ${data.includes.hydrationNutrition ? (data.hydrationNutrition ? `
  <div class="callout callout-hydration">
    <h2>Hydration &amp; Nutrition</h2>
    ${hydrationLine ? `<p>${hydrationLine}</p>` : ''}
    ${mealsLine ? `<p>${mealsLine}</p>` : ''}
    ${appetiteLine ? `<p>${appetiteLine}</p>` : ''}
  </div>
  ` : `
  <div class="callout callout-hydration">
    <h2>Hydration &amp; Nutrition</h2>
    <p style="color:#9a9aa8;">No hydration or meals logged in this window.</p>
  </div>
  `) : ''}

  ${/* Phase 16.1 — Symptom progression lifted above Sleep/Mood/Energy.
       Clinical-standard order puts hard clinical signals (symptom
       timeline) above softer pattern signals (sleep/mood/energy). */ ''}
  <h2>Symptom progression</h2>
  <ul>${symptomItems}</ul>

  ${data.includes.wellness ? ((data.wellnessPatterns.sleep || data.wellnessPatterns.energy || data.wellnessPatterns.mood) ? `
  <div class="callout callout-wellness">
    <h2>Sleep, Energy &amp; Mood Patterns</h2>
    ${sleepLine ? `<p>${sleepLine}</p>` : ''}
    ${energyLine ? `<p>${energyLine}</p>` : ''}
    ${moodLine ? `<p>${moodLine}</p>` : ''}
  </div>
  ` : `
  <div class="callout callout-wellness">
    <h2>Sleep, Energy &amp; Mood Patterns</h2>
    <p style="color:#9a9aa8;">No reflections logged in this window.</p>
  </div>
  `) : ''}

  <h2>Functional observations</h2>
  <ul>${functionalItems}</ul>

  ${data.includes.notes ? (data.journalHighlights.length > 0 ? `
  <h2>Caregiver notes</h2>
  <ul>${highlights}</ul>
  ` : `
  <h2>Caregiver notes</h2>
  <p style="color:#9a9aa8;">No notes saved in this window.</p>
  `) : ''}

  ${data.includes.questions ? (data.patientQuestions.length > 0 ? `
  <h2>Questions for this visit</h2>
  <ul>${patientQuestionItems}</ul>
  ` : `
  <h2>Questions for this visit</h2>
  <p style="color:#9a9aa8;">No questions saved for this visit.</p>
  `) : ''}

  ${/* Phase 16.2 — caregiver-fillable sub-sections inside the
       Caregiver Notes block (after the auto-extracted sections).
       Each sub-section emits only when it has filled content; the
       whole block is silent when no appointmentId was threaded. */ ''}
  ${caregiverSymptomsHtml}
  ${caregiverFunctionalHtml}
  ${caregiverQuestionsHtml}
  ${helpProvidedHtml}

  ${/* Phase 16.1 — "What changed after medication updates" relocated
       up under Medications. The original site is intentionally empty
       here. */ ''}

  ${questionsHtml ? `
  <h2 style="font-size:11px; color:#7a7a8a;">Additional questions (this visit)</h2>
  <ul>${questionsHtml}</ul>
  ` : ''}

  <div class="footer">${data.footer}</div>
</body>
</html>`;
}

// ============================================================================
// PDF GENERATION + SHARING
// ============================================================================

export async function generateAndShareVisitPrep(config: VisitPrepConfig): Promise<boolean> {
  try {
    const data = await assembleVisitPrepData(config);
    const html = buildHtml(data);

    const { uri } = await Print.printToFileAsync({ html, width: 612, height: 792 });

    // Rename to a meaningful filename
    const timestamp = new Date().toISOString().slice(0, 10);
    const newUri = `${FileSystem.documentDirectory}EmberMate-VisitPrep-${timestamp}.pdf`;
    await FileSystem.moveAsync({ from: uri, to: newUri });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(newUri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share Visit Prep',
        UTI: 'com.adobe.pdf',
      });
    }

    // Phase 4 — clear the question list so the next visit starts empty.
    // Best-effort: a clear failure shouldn't tank the share success.
    try {
      await clearQuestions(DEFAULT_PATIENT_ID);
    } catch (err) {
      logError('visitPrepPdf.clearQuestions', err);
    }

    return true;
  } catch (err) {
    logError('visitPrepPdf.generateAndShare', err);
    return false;
  }
}
