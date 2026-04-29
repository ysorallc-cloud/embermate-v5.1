// ============================================================================
// HANDOFF PDF
// Single-page PDF for the next-caregiver handoff. Simpler than the visit
// prep multi-day report — same expo-print + expo-sharing pipeline.
// ============================================================================

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { logError } from '../utils/devLog';

export interface HandoffPdfData {
  patientName: string;
  dateLabel: string;        // e.g. "Sunday, Apr 26"
  timeLabel: string;        // e.g. "10:30 PM"
  outcomesLines: string[];  // pre-formatted ("2 missed: …", "4 logged: …")
  notes: string | null;
  eventLines: string[];     // chronological "[time] — [item]"
}

function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildHtml(data: HandoffPdfData): string {
  const outcomes = data.outcomesLines.map((l) => `<li>${escape(l)}</li>`).join('');
  const events = data.eventLines.map((l) => `<li>${escape(l)}</li>`).join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif; padding: 36px; color: #111; }
    h1 { font-size: 18pt; margin-bottom: 4pt; }
    .meta { font-size: 11pt; color: #555; margin-bottom: 18pt; }
    .eyebrow { font-size: 8pt; letter-spacing: 0.5pt; color: #666; text-transform: uppercase; margin-top: 16pt; margin-bottom: 6pt; }
    ul { padding-left: 18pt; margin: 4pt 0; }
    li { font-size: 11pt; line-height: 1.5; margin-bottom: 2pt; }
    p { font-size: 11pt; line-height: 1.5; margin: 4pt 0 0 0; }
    .notes { background: #f5f5f5; border-radius: 6pt; padding: 10pt 12pt; }
    .footer { font-size: 9pt; color: #999; margin-top: 28pt; text-align: center; }
  </style></head><body>
    <h1>${escape(data.patientName)} — Handoff</h1>
    <div class="meta">${escape(data.dateLabel)} · ${escape(data.timeLabel)}</div>
    <div class="eyebrow">Today's outcomes</div>
    <ul>${outcomes}</ul>
    ${data.notes ? `<div class="eyebrow">Handoff notes</div><div class="notes">${escape(data.notes)}</div>` : ''}
    ${data.eventLines.length > 0 ? `<div class="eyebrow">Today's events</div><ul>${events}</ul>` : ''}
    <div class="footer">EmberMate · Not a medical record</div>
  </body></html>`;
}

/** Generate a handoff PDF and present the iOS share sheet. */
export async function generateAndShareHandoff(data: HandoffPdfData): Promise<boolean> {
  try {
    const html = buildHtml(data);
    const { uri } = await Print.printToFileAsync({ html, width: 612, height: 792 });
    const stamp = new Date().toISOString().slice(0, 10);
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
