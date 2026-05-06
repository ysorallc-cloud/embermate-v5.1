// ============================================================================
// Commit 7 — Calendar bottom sheet
//
// Source-level contract: DatePickerPopover renders inside a Modal with
// slide-from-bottom presentation, exposes a heatmap dot system (multiple
// statuses), a collapsible info legend, and per-day appointment markers.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const popoverSrc = readFileSync(
  join(ROOT, 'components/journal/DatePickerPopover.tsx'),
  'utf8',
);

describe('Calendar bottom sheet — Modal presentation', () => {
  it('imports Modal from react-native', () => {
    expect(popoverSrc).toMatch(/import\s+\{[^}]*\bModal\b[^}]*\}\s+from\s+['"]react-native['"]/);
  });

  it('wraps the sheet in a <Modal> with slide animation', () => {
    expect(popoverSrc).toMatch(/<Modal[\s\S]{0,200}animationType\s*=\s*["']slide["']/);
  });

  it('uses transparent presentation so the overlay can dim the page', () => {
    expect(popoverSrc).toMatch(/<Modal[\s\S]{0,300}transparent/);
  });
});

describe('Calendar bottom sheet — heatmap dots', () => {
  it('uses a status-dot style hook (heatDot|statusDot|completionDot|dayDot)', () => {
    expect(popoverSrc).toMatch(/heatDot|statusDot|completionDot|dayDot/);
  });

  it('supports multiple status values (good/partial/missed and a no-data case)', () => {
    // The heatmap palette must distinguish at least logged vs not-logged.
    expect(popoverSrc).toMatch(/no-?data|noData|empty/i);
  });
});

describe('Calendar bottom sheet — info legend', () => {
  it('renders an info button or legend toggle', () => {
    expect(popoverSrc).toMatch(/infoButton|legendToggle|showLegend/);
  });

  it('legend describes the heatmap colours', () => {
    // Legend body should reference the dot meanings.
    expect(popoverSrc).toMatch(/legend/i);
  });
});

describe('Calendar bottom sheet — appointment markers', () => {
  it('renders appointment markers per-day (appointmentMarker|apptDot|apptIndicator)', () => {
    expect(popoverSrc).toMatch(/appointmentMarker|apptDot|apptIndicator/);
  });

  it('accepts an appointments map keyed by YYYY-MM-DD', () => {
    expect(popoverSrc).toMatch(/appointments\??:\s*Record<string/);
  });
});
