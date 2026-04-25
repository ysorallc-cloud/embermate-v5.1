// ============================================================================
// VISIT PREP PDF — Shareable 1-page care summary for doctor visits
// Data assembly + HTML template + PDF generation via expo-print
// ============================================================================

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { getMedications } from '../utils/medicationStorage';
import { getVitalsInRange, VitalReading } from '../utils/vitalsStorage';
import { listDailyInstancesRange, DEFAULT_PATIENT_ID } from '../storage/carePlanRepo';
import { getReflection, StoredReflection } from '../storage/reflectionStorage';
import { logError } from '../utils/devLog';

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

export interface VisitPrepData {
  header: {
    patientName: string;
    caregiverName?: string;
    dateRange: string;
    generatedAt: string;
  };
  adherence: AdherenceEntry[];
  vitals: VitalEntry[];
  wellness: {
    avgMood: string;
    sleepNote: string;
    patterns: string[];
  };
  journalHighlights: string[];
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

  // Header
  const header = {
    patientName,
    caregiverName,
    dateRange: formatDateRange(dateRange.start, dateRange.end),
    generatedAt: new Date().toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    }),
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

  // Questions
  const questions = config.includeQuestions ? config.questions.trim() : '';

  // Footer
  const footer = 'Generated by EmberMate · Not a medical record · Private to this device';

  return { header, adherence, vitals, wellness, journalHighlights, questions, footer };
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

  const vitalsRows = data.vitals.map(v => `
    <tr>
      <td>${v.label}</td>
      <td>${v.latestValue}</td>
      <td>${trendArrow(v.trend)}</td>
      <td>${v.outOfRange > 0 ? v.outOfRange : '–'}</td>
    </tr>
  `).join('');

  const highlights = data.journalHighlights.length > 0
    ? data.journalHighlights.map(h => `<li>${h}</li>`).join('')
    : '<li style="color: #999;">No flagged entries in this period.</li>';

  const questionsHtml = data.questions
    ? data.questions.split('\n').filter(q => q.trim()).map(q => `<li>${q.trim()}</li>`).join('')
    : '<li style="color: #999;">None added.</li>';

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
  ` : ''}

  ${data.vitals.length > 0 ? `
  <h2>Vitals</h2>
  <table>
    <tr><th>Vital</th><th>Latest</th><th>Trend</th><th>Out of Range</th></tr>
    ${vitalsRows}
  </table>
  ` : ''}

  <h2>Wellness</h2>
  <div class="wellness-row">
    <div class="wellness-item">
      <div class="wellness-label">Check-ins</div>
      <div class="wellness-value">${data.wellness.avgMood}</div>
    </div>
  </div>

  <h2>Journal Highlights</h2>
  <ul>${highlights}</ul>

  <h2>Questions for This Visit</h2>
  <ul>${questionsHtml}</ul>

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

    return true;
  } catch (err) {
    logError('visitPrepPdf.generateAndShare', err);
    return false;
  }
}
