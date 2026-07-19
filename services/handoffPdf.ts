// ============================================================================
// HANDOFF PDF — Phase 31 single-day rebuild.
//
// Pre-31 emitted a sparse template body from a today-hardcoded curated
// builder. Phase 31 rebuilds the handoff as a faithful single-day
// itemized PDF, fed by buildHandoffDay(date) so the on-screen Journal
// day and the shared PDF read from the same data. Shares the visit-
// prep light-theme CSS via utils/lightPdfTemplate so both artifacts
// look like one family.
//
// Sections (mirror the Journal SOAP layout):
//   Summary             — Section 1 gestalt sentence
//   What was logged     — Section 2 itemized meds + vitals readings
//   Worth flagging      — Section 3 notable-moments callout (when any)
//   Caregiver notes     — Section 4 consolidated notes (when present)
//   Coming up           — next upcoming appointment (when present)
//
// One tap → OS share sheet. No in-app preview/modal.
// ============================================================================

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { LIGHT_PDF_CSS, escapeHtml } from '../utils/lightPdfTemplate';
import type { HandoffDayPayload } from '../utils/handoffDayBuilder';
import {
  isNotableMeal,
  type MedicationDetail,
  type VitalsDetail,
  type MealsDetail,
} from '../utils/careSummaryBuilder';
import type { NotableMoment } from '../utils/notableMomentsBuilder';
import { logError } from '../utils/devLog';

export interface HandoffPdfData {
  /** The bundled day data — single source the Journal screen also
   *  renders from. Drives every section in the body. */
  payload: HandoffDayPayload;
  /** Header date label — derived from the SELECTED date (not the
   *  generation clock) so past-day shares show the day being shared. */
  dateLabel: string;
  /** Header time label — generation clock, surfaces WHEN the PDF was
   *  produced. Pair-renders next to dateLabel. */
  timeLabel: string;
}

// ----------------------------------------------------------------------------
// Time + status formatters — small helpers, no business logic.
// ----------------------------------------------------------------------------

function formatClock(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const h24 = d.getHours();
  const m = d.getMinutes();
  const meridiem = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const mm = m < 10 ? `0${m}` : String(m);
  return `${h12}:${mm} ${meridiem}`;
}

const STATUS_LABEL: Record<MedicationDetail['status'], string> = {
  completed: 'Taken',
  pending: 'Pending',
  skipped: 'Skipped',
  missed: 'Missed',
};

// ----------------------------------------------------------------------------
// Section renderers — each returns an HTML fragment or '' for empty-state.
// ----------------------------------------------------------------------------

function renderSummary(gestalt: string): string {
  const trimmed = gestalt.trim();
  if (!trimmed) return '';
  return `
  <h2>Summary</h2>
  <p>${escapeHtml(trimmed)}</p>
  `;
}

function titleCase(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}

function renderMedications(meds: MedicationDetail[]): string {
  if (meds.length === 0) return '';
  const rows = meds.map((m) => {
    const scheduled = formatClock(m.scheduledTime);
    const taken = m.takenAt ? formatClock(m.takenAt) : '';
    const statusCell = m.status === 'completed' && taken
      ? `${escapeHtml(STATUS_LABEL[m.status])} at ${escapeHtml(taken)}`
      : escapeHtml(STATUS_LABEL[m.status]);
    // Selected symptoms — the doctor-facing substance. Surfaced under the name
    // (coral) so a flagged side-effect isn't lost in the status column.
    const sideEffects = (m.sideEffects && m.sideEffects.length > 0)
      ? `<div style="font-size:10px; color:#9a3a3a; margin-top:2px;">Side effects: ${escapeHtml(m.sideEffects.map(titleCase).join(', '))}</div>`
      : '';
    return `
    <tr>
      <td>${escapeHtml(m.name)}${sideEffects}</td>
      <td>${escapeHtml(m.dosage ?? '')}</td>
      <td>${escapeHtml(scheduled)}</td>
      <td>${statusCell}</td>
    </tr>`;
  }).join('');
  return `
  <h3 style="font-size:11px; font-weight:600; color:#7a7a8a; margin:8px 0 4px;">Medications</h3>
  <table>
    <tr><th>Medication</th><th>Dose</th><th>Scheduled</th><th>Status</th></tr>
    ${rows}
  </table>
  `;
}

function renderVitals(v: VitalsDetail | null): string {
  if (!v) return '';
  const r = v.readings;
  if (!r || !v.recorded) {
    if (v.scheduled) {
      return `
  <h3 style="font-size:11px; font-weight:600; color:#7a7a8a; margin:8px 0 4px;">Vitals</h3>
  <p style="color:#9a9aa8;">Scheduled — not yet recorded.</p>
      `;
    }
    return '';
  }
  const parts: string[] = [];
  if (r.systolic != null && r.diastolic != null) {
    parts.push(`BP ${r.systolic}/${r.diastolic}`);
  }
  if (r.heartRate != null) parts.push(`HR ${r.heartRate}`);
  if (r.glucose != null) parts.push(`Glucose ${r.glucose}`);
  if (r.temperature != null) parts.push(`Temp ${r.temperature}`);
  if (r.oxygen != null) parts.push(`O₂ ${r.oxygen}%`);
  if (r.weight != null) parts.push(`Weight ${r.weight}`);
  const inline = parts.join(' · ');
  const recordedAt = v.recordedAt ? formatClock(v.recordedAt) : '';
  return `
  <h3 style="font-size:11px; font-weight:600; color:#7a7a8a; margin:8px 0 4px;">Vitals</h3>
  <p>${escapeHtml(inline)}${recordedAt ? ` <span style="color:#9a9aa8;">at ${escapeHtml(recordedAt)}</span>` : ''}</p>
  `;
}

function renderMeals(meals: MealsDetail): string {
  // Only NOTABLE meals reach the doctor — a note, a flaggable appetite, or a
  // miss/skip. Routine "completed, normal appetite, no note" meals are omitted so
  // the handoff isn't cluttered with "Breakfast Good · Lunch Good · Dinner Good".
  // Same predicate as the shareability gate (isNotableMeal) — content ⟺ gate.
  const logged = meals.meals.filter(isNotableMeal);
  if (logged.length === 0) return '';
  const items = logged.map((m) => {
    let line = `<strong>${escapeHtml(m.name)}</strong>`;
    if (m.status === 'completed') {
      const extras: string[] = [];
      if (m.appetite) extras.push(escapeHtml(m.appetite));
      if (m.description) extras.push(escapeHtml(m.description));
      if (extras.length) line += ` — ${extras.join(' · ')}`;
    } else {
      line += ` — ${escapeHtml(m.status === 'missed' ? 'Missed' : 'Skipped')}`;
    }
    return `<li>${line}</li>`;
  }).join('');
  return `
  <h3 style="font-size:11px; font-weight:600; color:#7a7a8a; margin:8px 0 4px;">Meals</h3>
  <ul style="margin:0 0 4px; padding-left:16px;">${items}</ul>
  `;
}

function renderLogged(payload: HandoffDayPayload): string {
  const medsHtml = renderMedications(payload.medications);
  const vitalsHtml = renderVitals(payload.vitals);
  const mealsHtml = renderMeals(payload.meals);
  if (!medsHtml && !vitalsHtml && !mealsHtml) return '';
  return `
  <h2>What was logged</h2>
  ${medsHtml}
  ${vitalsHtml}
  ${mealsHtml}
  `;
}

function renderWorthFlagging(moments: NotableMoment[]): string {
  if (moments.length === 0) return '';
  const items = moments.map((m) => `<li>${escapeHtml(m.text)}</li>`).join('');
  return `
  <div class="callout callout-redflag">
    <h2>Worth flagging</h2>
    <ul>${items}</ul>
  </div>
  `;
}

function renderNotes(notes: HandoffDayPayload['notes']): string {
  if (!notes || !notes.text.trim()) return '';
  return `
  <h2>Caregiver notes</h2>
  <p style="white-space: pre-wrap;">${escapeHtml(notes.text.trim())}</p>
  `;
}

function renderComingUp(appt: HandoffDayPayload['nextAppointment']): string {
  if (!appt) return '';
  return `
  <h2>Coming up</h2>
  <p>${escapeHtml(appt.specialty)} with ${escapeHtml(appt.provider)} — ${escapeHtml(appt.date)}</p>
  `;
}

// ----------------------------------------------------------------------------
// HTML builder
// ----------------------------------------------------------------------------

function buildHtml(data: HandoffPdfData): string {
  const { payload, dateLabel, timeLabel } = data;
  const summaryHtml = renderSummary(payload.gestalt);
  const loggedHtml = renderLogged(payload);
  const worthHtml = renderWorthFlagging(payload.worthFlagging);
  const notesHtml = renderNotes(payload.notes);
  const comingHtml = renderComingUp(payload.nextAppointment);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>${LIGHT_PDF_CSS}</style>
</head>
<body>
  <h1>${escapeHtml(payload.patientName)} — Handoff</h1>
  <div class="subtitle">${escapeHtml(dateLabel)} · ${escapeHtml(timeLabel)}</div>
  <div class="provenance">Caregiver-reported observations · Not a clinical record</div>
  ${summaryHtml}
  ${loggedHtml}
  ${worthHtml}
  ${notesHtml}
  ${comingHtml}
  <div class="footer">EmberMate · Not a medical record · stays on this device unless you share.</div>
</body>
</html>`;
}

/** Generate the single-day handoff PDF and present the OS share sheet. */
export async function generateAndShareHandoff(data: HandoffPdfData): Promise<boolean> {
  try {
    const html = buildHtml(data);
    // LOW #8 fix — height param removed. Passing height:792 set a hard
    // single-page viewport; WebKit clipped content that overflowed rather
    // than paginating. Without height, WebKit computes the natural document
    // height and auto-paginates. width:612 stays (US Letter points, controls
    // text reflow). @page margin in LIGHT_PDF_CSS replaces the old
    // padding:32px body hack. Pinned by handoffPdfTruncationLow8 contract 4.
    const { uri } = await Print.printToFileAsync({ html, width: 612 });
    const stamp = (data.payload.date || new Date().toISOString().slice(0, 10));
    const newUri = `${FileSystem.documentDirectory}EmberMate-Handoff-${stamp}.pdf`;
    await FileSystem.moveAsync({ from: uri, to: newUri });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(newUri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share handoff summary',
        UTI: 'com.adobe.pdf',
      });
    }
    return true;
  } catch (err) {
    logError('handoffPdf.generateAndShare', err);
    return false;
  }
}

export const __testing = { buildHtml };
