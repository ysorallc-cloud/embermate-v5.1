// ============================================================================
// PDF/share output — "Prepared by {caregiverName}" (now-rebuild report-
// completeness card). The care report's PDF/share uses a SEPARATE renderer
// (utils/pdfExport.generateHTML / generatePreviewHTML), so the caregiver
// name must be threaded there too — not just the on-screen view.
//
// Behavior:
//   • ReportData.preparedBy set  → the rendered HTML + preview text include
//     "Prepared by {name}".
//   • preparedBy absent          → no "Prepared by" line (clean omission).
//
// Plus source-pins that care-report wires caregiverName into the on-screen
// line AND all four scope PDF builds (Today / Handoff / VisitPrep / Full).
// ============================================================================

jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
  Platform: { OS: 'ios', select: (o: any) => o.ios ?? o.default },
  Share: { share: jest.fn() },
}));
jest.mock('expo-print', () => ({ printToFileAsync: jest.fn() }));

import { readFileSync } from 'fs';
import { join } from 'path';
import {
  generateHTML,
  generatePreviewHTML,
  ReportData,
} from '../../utils/pdfExport';

const ROOT = join(__dirname, '../..');

const baseData: ReportData = {
  title: 'Daily Care Report',
  period: 'Today',
  periodLabel: 'Generated today',
  summary: 'All stable.',
  details: [],
};

describe('pdfExport — Prepared by line', () => {
  it('contract 1 (HTML, POPULATED): generateHTML includes "Prepared by Amber" when preparedBy is set', () => {
    const html = generateHTML({ ...baseData, preparedBy: 'Amber' });
    expect(html).toContain('Prepared by Amber');
  });

  it('contract 2 (HTML, MISSING): generateHTML omits the line when preparedBy is absent', () => {
    const html = generateHTML(baseData);
    expect(html).not.toContain('Prepared by');
  });

  it('contract 3 (PREVIEW TEXT, POPULATED): generatePreviewHTML includes "Prepared by Amber"', () => {
    const text = generatePreviewHTML({ ...baseData, preparedBy: 'Amber' });
    expect(text).toContain('Prepared by Amber');
  });

  it('contract 4 (PREVIEW TEXT, MISSING): generatePreviewHTML omits the line when preparedBy is absent', () => {
    const text = generatePreviewHTML(baseData);
    expect(text).not.toContain('Prepared by');
  });
});

// The care-report scope-PDF source-pins (contracts 5-6) were retired with the
// Care Report. The pdfExport "Prepared by" mechanism itself stays guarded above;
// Visit Prep's own "Prepared by {caregiverName}" header is exercised by its suite.
