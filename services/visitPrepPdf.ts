// ============================================================================
// VISIT PREP PDF — Shareable 1-page care summary for doctor visits
// Data assembly + HTML template + PDF generation via expo-print
// ============================================================================

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { getMedications } from '../utils/medicationStorage';
import { getVitalsInRange, VitalReading } from '../utils/vitalsStorage';
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
  questions: string;
  patientName: string;
  caregiverName?: string;
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

export interface VisitPrepData {
  header: {
    patientName: string;
    caregiverName?: string;
    dateRange: string;
    generatedAt: string;
    periodDays: number;
  };
  adherence: AdherenceEntry[];
  /** Skip reasons aggregated from LogEntry.skipReason — surfaced under adherence. */
  skippedDoses: SkippedDoseSummary[];
  vitals: VitalEntry[];
  /** New nurse-format sections (Prompt 5). */
  symptomChanges: SymptomChange[];
  /** True when the period is < 14 days — drives the "more data needed" hint. */
  symptomDataInsufficient: boolean;
  functionalIssues: FunctionalIssue[];
  /** Pulled from patientQuestionsRepo; empty when nothing was logged. */
  patientQuestions: string[];
  questionsEmptyHint: string;
  medicationChanges: MedicationChange[];
  wellness: {
    avgMood: string;
    sleepNote: string;
    patterns: string[];
  };
  journalHighlights: string[];
  /** Legacy free-text questions (pre-Prompt 5 path). Kept for back-compat. */
  questions: string;
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
  caregiverName: string | undefined,
): string {
  // v6.7 — anchored copy verified by the tone audit. Don't edit without
  // updating __tests__/services/visitPrepPdfStructure.test.ts.
  const who = caregiverName?.trim() || 'the caregiver';
  return (
    `This data was logged at home over ${days} day${days === 1 ? '' : 's'} ` +
    `by ${who}. It's meant to support conversations with healthcare providers, ` +
    `not replace clinical judgment. Tracking gaps and inconsistencies are noted ` +
    `where present.`
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

  // Header
  const header = {
    patientName,
    caregiverName,
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
        const completed = matching.filter(
          i => i.status === 'completed' || i.status === 'skipped',
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
      const readings = await getVitalsInRange(startISO, endISO);

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

  // Wellness
  const wellness = { avgMood: '–', sleepNote: '–', patterns: [] as string[] };
  if (config.includeWellness) {
    // Wellness data is best-effort — assembled from what's available
    try {
      const instances = await listDailyInstancesRange(
        DEFAULT_PATIENT_ID, dateRange.start, dateRange.end,
      );
      const wellnessInstances = instances.filter(i => i.itemType === 'wellness');
      const total = wellnessInstances.length;
      const done = wellnessInstances.filter(
        i => i.status === 'completed',
      ).length;
      if (total > 0) {
        wellness.avgMood = `${done} of ${total} check-ins completed`;
      }
    } catch (err) {
      logError('visitPrepPdf.wellness', err);
    }
  }

  // Journal highlights
  let journalHighlights: string[] = [];
  if (config.includeJournal) {
    try {
      // Collect reflections from the date range (max 3)
      const start = new Date(`${dateRange.start}T12:00:00`);
      const end = new Date(`${dateRange.end}T12:00:00`);
      const highlights: string[] = [];
      for (let d = new Date(start); d <= end && highlights.length < 3; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const reflection = await getReflection(dateStr);
        if (reflection?.text) {
          const preview = reflection.text.length > 100
            ? reflection.text.slice(0, 100) + '...'
            : reflection.text;
          highlights.push(`${new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: ${preview}`);
        }
      }
      journalHighlights = highlights;
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

  // Footer — v6.7 caregiver disclaimer (replaces the legacy one-liner).
  const footer = buildCaregiverDisclaimer(days, caregiverName);

  return {
    header,
    adherence,
    skippedDoses,
    vitals,
    symptomChanges,
    symptomDataInsufficient,
    functionalIssues,
    patientQuestions,
    questionsEmptyHint,
    medicationChanges,
    wellness,
    journalHighlights,
    questions,
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

  const vitalsRows = data.vitals.map(v => `
    <tr>
      <td>${v.label}</td>
      <td>${v.latestValue}</td>
      <td>${trendArrow(v.trend)}</td>
      <td>${v.outOfRange > 0 ? v.outOfRange : '–'}</td>
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

  // Legacy free-text path. Kept for back-compat callers that still pass
  // `config.questions`; new flows route through patientQuestionsRepo.
  const questionsHtml = data.questions
    ? data.questions.split('\n').filter(q => q.trim()).map(q => `<li>${q.trim()}</li>`).join('')
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, 'Helvetica Neue', sans-serif; color: #1a1a2e; padding: 32px; font-size: 11px; line-height: 1.5; }
    h1 { font-family: Georgia, 'Times New Roman', serif; font-size: 20px; font-weight: 400; color: #1a1a2e; margin-bottom: 4px; }
    .subtitle { font-size: 11px; color: #7a7a8a; margin-bottom: 20px; }
    h2 { font-size: 13px; font-weight: 600; color: #4a6b5d; margin: 16px 0 6px; border-bottom: 1px solid #e2e4e8; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    th { text-align: left; font-size: 10px; font-weight: 600; color: #7a7a8a; letter-spacing: 0.5px; padding: 4px 8px; border-bottom: 1px solid #e2e4e8; }
    td { padding: 4px 8px; font-size: 11px; border-bottom: 1px solid #f0f2f4; }
    ul { padding-left: 16px; margin-bottom: 12px; }
    li { margin-bottom: 4px; }
    .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e4e8; font-size: 9px; color: #9a9aa8; text-align: center; }
    .wellness-row { display: flex; gap: 24px; margin-bottom: 8px; }
    .wellness-item { }
    .wellness-label { font-size: 10px; color: #7a7a8a; }
    .wellness-value { font-size: 12px; font-weight: 500; }
  </style>
</head>
<body>
  <h1>Care Summary: ${data.header.patientName}</h1>
  <div class="subtitle">
    ${data.header.dateRange}${data.header.caregiverName ? ' · Prepared by ' + data.header.caregiverName : ''} · ${data.header.generatedAt}
  </div>

  ${data.adherence.length > 0 ? `
  <h2>Medication Adherence</h2>
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
  ` : ''}

  ${data.vitals.length > 0 ? `
  <h2>Vitals</h2>
  <table>
    <tr><th>Vital</th><th>Latest</th><th>Trend</th><th>Out of Range</th></tr>
    ${vitalsRows}
  </table>
  ` : ''}

  <h2>Symptoms that changed</h2>
  <ul>${symptomItems}</ul>

  <h2>Functional issues</h2>
  <ul>${functionalItems}</ul>

  <h2>Questions and concerns</h2>
  <ul>${patientQuestionItems}</ul>

  ${data.medicationChanges.length > 0 ? `
  <h2>What changed after medication updates</h2>
  <ul>${medChangeItems}</ul>
  ` : ''}

  <h2>Wellness</h2>
  <div class="wellness-row">
    <div class="wellness-item">
      <div class="wellness-label">Check-ins</div>
      <div class="wellness-value">${data.wellness.avgMood}</div>
    </div>
  </div>

  <h2>Caregiver notes</h2>
  <ul>${highlights}</ul>

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
