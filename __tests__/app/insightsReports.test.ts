// ============================================================================
// Insights Reports Section — Structure tests
//
// Pre-15.11 this file pinned the three reportCards (Provider prep /
// Care report / Medication report) each carrying icon/title/subtitle
// + a per-card Share button. Phase 15.11 consolidated the trio into
// a single Share CTA + ShareSheet action sheet.
//
// Phase 16.4 — ShareSheet runtime mount retired pre-launch (Care/
// Medication report options text-shared with no visible system sheet
// on simulator). Insights now uses a direct button to /visit-prep.
// ShareSheet.tsx stays on disk as intentional orphan; Phase 21 will
// re-mount it when real PDF generation ships.
//
// Contracts below pin the post-16.4 state:
//   • The 3-card structure stays retired.
//   • ShareSheet is NOT mounted in Insights pre-Phase 21.
//   • The Share toast component is still rendered (it serves other
//     share paths like visit-prep-preview).
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';

const insightsPath = path.resolve(__dirname, '../../app/(tabs)/understand.tsx');
const insightsContent = fs.readFileSync(insightsPath, 'utf-8');

describe('Phase 16.4 — Insights Reports: direct Visit Prep button (ShareSheet hidden pre-launch)', () => {
  it('the three-reportCard structure is retired (15.11)', () => {
    // Pre-15.11 styles + per-card text labels gone.
    expect(insightsContent).not.toContain('reportCard:');
    expect(insightsContent).not.toContain('reportIcon:');
    expect(insightsContent).not.toContain('reportTitle:');
    expect(insightsContent).not.toContain('reportSubtitle:');
    expect(insightsContent).not.toContain('reportShareBtn:');
  });

  it('Share.share runtime call retired in 16.4 (was wired in 15.11; Phase 21 will restore)', () => {
    // Phase 16.4 — the care/medication handler bodies are no-ops
    // pre-launch. Share import may stay or go.
    expect(insightsContent).not.toContain('Share.share(');
  });

  it('ShareToast component is still mounted (serves other share paths)', () => {
    expect(insightsContent).toContain('ShareToast');
  });

  it('ShareSheet runtime mount is retired in 16.4 (orphan until Phase 21 restores)', () => {
    expect(insightsContent).not.toMatch(/<ShareSheet\b/);
  });
});
