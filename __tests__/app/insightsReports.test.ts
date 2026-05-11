// ============================================================================
// Insights Reports Section — Structure tests
//
// Pre-15.11 this file pinned the three reportCards (Provider prep /
// Care report / Medication report) each carrying icon/title/subtitle
// + a per-card Share button. Phase 15.11 consolidated the trio into
// a single Share CTA + ShareSheet action sheet. The contracts below
// are flipped to retirement pins documenting the consolidation:
//
//   • The 3-card structure is gone.
//   • Share.share + ShareToast wiring survive in handleShareSelection.
//   • The shared options live in the new ShareSheet component (its
//     own test file pins behavior).
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';

const insightsPath = path.resolve(__dirname, '../../app/(tabs)/understand.tsx');
const insightsContent = fs.readFileSync(insightsPath, 'utf-8');

describe('Phase 15.11 — Insights Reports consolidated to a single Share CTA', () => {
  it('the three-reportCard structure is retired', () => {
    // Pre-15.11 styles + per-card text labels gone.
    expect(insightsContent).not.toContain('reportCard:');
    expect(insightsContent).not.toContain('reportIcon:');
    expect(insightsContent).not.toContain('reportTitle:');
    expect(insightsContent).not.toContain('reportSubtitle:');
    expect(insightsContent).not.toContain('reportShareBtn:');
  });

  it('Share.share still wired (handler routes to it from handleShareSelection)', () => {
    expect(insightsContent).toContain('Share.share(');
    expect(insightsContent).toContain('Share,');
  });

  it('ShareToast wiring still present (toast fires before Share.share)', () => {
    expect(insightsContent).toContain('ShareToast');
    expect(insightsContent).toContain('setShareToastVisible(true)');
  });

  it('ShareSheet component is mounted (the new surviving share surface)', () => {
    expect(insightsContent).toMatch(/<ShareSheet\b/);
    expect(insightsContent).toMatch(/from\s+['"][^'"]*components\/insights\/ShareSheet['"]/);
  });
});
