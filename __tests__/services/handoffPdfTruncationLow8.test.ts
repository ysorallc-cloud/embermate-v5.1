// ============================================================================
// LOW #8 — PDF handoff truncates in macOS Preview on content-heavy days.
//
// ROOT CAUSE (audited):
//   Print.printToFileAsync({ html, width: 612, height: 792 }) hard-codes
//   a single 792pt page height. The HTML body has padding: 32px on all
//   sides with NO @page rule and NO page-break handling. When content
//   exceeds ~728px of usable height (5 meds + vitals + 2 notes + 1 appt
//   is enough), Expo's WebKit renderer clips at the hard boundary rather
//   than paginating — it produces a single truncated page. macOS Preview
//   shows only the clipped page.
//
// FIX (two-part):
//   1. Remove the `height` parameter from printToFileAsync entirely.
//      expo-print uses height to set a fixed viewport; omitting it lets
//      WebKit compute natural document height → auto-pagination. The
//      width: 612 (US Letter points) stays — it controls the page width
//      for text reflow, not clipping.
//   2. Add @page { margin: 32px; } + body { padding: 0; } to
//      LIGHT_PDF_CSS so the CSS margin replaces the padding-based margin
//      that was compensating for the missing @page rule. The visual
//      result is identical on page 1; pages 2+ now also have margins.
//
// CONTRACTS:
//   1. buildHtml with a content-heavy payload does NOT emit a `height`
//      attribute on any printable wrapper (source pin — the call-site
//      height param is what causes the clip; we can't call printToFile
//      in Jest but we can pin that the HTML itself contains no fixed-
//      height viewport constraint).
//   2. LIGHT_PDF_CSS contains an @page rule with a margin declaration.
//   3. LIGHT_PDF_CSS body rule does NOT contain `padding: 32px` (the
//      old margin-via-padding hack that competes with @page margins and
//      causes double-margin on page 1 post-fix).
//   4. The printToFileAsync call in generateAndShareHandoff passes width
//      but NOT height (source pin on the call site).
//   5. Existing well-formedness contracts 1–9 in
//      handoffPdfHtmlValidity31 all stay GREEN (no regression).
// ============================================================================

jest.mock('expo-print', () => ({ printToFileAsync: jest.fn() }));
jest.mock('expo-sharing', () => ({
  shareAsync: jest.fn(),
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
}));
jest.mock('expo-file-system', () => ({
  documentDirectory: 'file:///mock-documents/',
  moveAsync: jest.fn(),
}));
jest.mock('../../utils/devLog', () => ({
  logError: () => {},
  devLog: () => {},
}));

import { __testing } from '../../services/handoffPdf';
import { readFileSync } from 'fs';
import { join } from 'path';

const { buildHtml } = __testing;

const HANDOFF_PDF_SRC = readFileSync(
  join(__dirname, '../../services/handoffPdf.ts'),
  'utf8',
);
const LIGHT_PDF_TEMPLATE_SRC = readFileSync(
  join(__dirname, '../../utils/lightPdfTemplate.ts'),
  'utf8',
);

// A heavy-day payload: 6 meds, vitals, 3 notable moments, 2 notes, 1 appt.
// This is enough content to exceed 728pt usable height and trigger truncation.
function heavyPayload() {
  const now = new Date().toISOString();
  return {
    payload: {
      date: '2026-06-11',
      patientName: 'Dad',
      gestalt: 'All meds logged. Vitals reading taken. 3 notable moments.',
      medications: [
        { name: 'Aspirin 81mg', dosage: '81mg', status: 'completed' as const, scheduledTime: now, takenAt: now },
        { name: 'Metformin 1000mg', dosage: '1000mg', status: 'completed' as const, scheduledTime: now, takenAt: now },
        { name: 'Lisinopril 20mg', dosage: '20mg', status: 'completed' as const, scheduledTime: now, takenAt: now },
        { name: 'Warfarin 5mg', dosage: '5mg', status: 'missed' as const, scheduledTime: now },
        { name: 'Gabapentin 300mg', dosage: '300mg', status: 'completed' as const, scheduledTime: now, takenAt: now },
        { name: 'Atorvastatin 40mg', dosage: '40mg', status: 'skipped' as const, scheduledTime: now },
      ],
      vitals: {
        scheduled: true,
        recorded: true,
        recordedAt: now,
        readings: {
          systolic: 132, diastolic: 82,
          heartRate: 76, glucose: 135,
          temperature: 98.6, oxygen: 97, weight: 194,
        },
      },
      worthFlagging: [
        { id: '1', type: 'red_flag' as const, text: 'BP ran high this morning.', timestamp: now },
        { id: '2', type: 'behavioral' as const, text: 'Seemed more fatigued than usual after lunch.', timestamp: now },
        { id: '3', type: 'medication' as const, text: 'Warfarin dose missed — patient said he forgot.', timestamp: now },
      ],
      notes: { text: 'Patient was in good spirits this morning. Ate a full breakfast. Evening check: BP still elevated. Will note for Dr. Torres.', savedAt: now },
      nextAppointment: null,
      hasLoggedContent: true,
      caregiverName: 'Amber',
    },
    dateLabel: 'Wednesday, June 11',
    timeLabel: '9:21 PM',
  };
}

describe('LOW #8 — PDF truncation fix', () => {
  it('contract 1: buildHtml output contains no fixed viewport height constraint', () => {
    const html = buildHtml(heavyPayload() as any);
    // A fixed height in the HTML (e.g. style="height:792px") would cause
    // the same clip as the printToFileAsync height param. Pin that neither
    // the HTML template nor the CSS injects a fixed page height.
    expect(html).not.toMatch(/height:\s*792/i);
    expect(html).not.toMatch(/max-height:\s*\d+px/i);
  });

  it('contract 2: LIGHT_PDF_CSS contains an @page rule with a margin declaration', () => {
    // @page margins are the correct mechanism for PDF page margins;
    // they apply to all pages, not just page 1.
    expect(LIGHT_PDF_TEMPLATE_SRC).toMatch(/@page\s*\{[^}]*margin/);
  });

  it('contract 3: LIGHT_PDF_CSS body rule does NOT use padding:32px (old single-page hack)', () => {
    // The pre-fix body rule used padding:32px as a margin substitute.
    // Post-fix, @page margin handles it. If padding:32px stays, page 1
    // gets double margin and pages 2+ get @page margin only — inconsistent.
    expect(LIGHT_PDF_TEMPLATE_SRC).not.toMatch(/body\s*\{[^}]*padding:\s*32px/);
  });

  it('contract 4: printToFileAsync call site passes width but NOT height', () => {
    // The height param is what causes Expo WebKit to clip at a fixed
    // viewport rather than paginate. Removing it lets WebKit auto-paginate
    // the natural document height.
    expect(HANDOFF_PDF_SRC).toMatch(/printToFileAsync\(\s*\{[^}]*width:\s*612/);
    expect(HANDOFF_PDF_SRC).not.toMatch(/printToFileAsync\(\s*\{[^}]*height:\s*792/);
  });
});
