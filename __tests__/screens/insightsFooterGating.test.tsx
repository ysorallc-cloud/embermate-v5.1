// ============================================================================
// Phase 6.1 — Insights footer disclaimer is gated to the analysis-present state.
//
// On the pre-data days the screen shows the "PATTERNS COMING" preview. The
// "Analysis based on N days · Not a medical diagnosis" footer in that context
// implies analysis the user can't see. It belongs only where there is real
// analysis to disclaim.
//
// Phase 1 Insights rebuild — the analysis-present surface is now the adherence
// ring, gated by readiness.ready (daysLogged >= MIN_DAYS_FOR_RING + doses > 0).
// The footer tracks the ring: it appears WITH the ring, not on a separate
// day-14 classifier. That's tighter than the old `state === 'populated'` gate,
// which could show data surfaces at days 7-13 with no accompanying disclaimer.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const understandSrc = readFileSync(
  join(ROOT, 'app/(tabs)/understand.tsx'),
  'utf8',
);

describe('Insights footer disclaimer — Phase 6.1', () => {
  it('renders the disclaimer text', () => {
    expect(understandSrc).toMatch(/Not a medical diagnosis/);
  });

  it('gates the footer to the analysis-present (ring-ready) state', () => {
    // The footer block must sit inside a guard that resolves only where real
    // analysis shows: the ring's `readiness.ready` gate, or the legacy
    // populated classifier. Within ~400 chars before the footer text, find
    // that gate. Empty + pre-data states must NOT render it.
    const footerIdx = understandSrc.indexOf('Not a medical diagnosis');
    expect(footerIdx).toBeGreaterThan(0);
    const window = understandSrc.slice(Math.max(0, footerIdx - 400), footerIdx);
    expect(window).toMatch(
      /readiness\.ready|state\s*[!=]==\s*['"]populated['"]|insightsState\s*[!=]==\s*['"]populated['"]|gating\.\w+/,
    );
  });

  it('does NOT render the footer unconditionally inside the ScrollView', () => {
    // The pre-Phase-6.1 layout was a bare <Text style={styles.footerNote}>
    // sitting directly in the ScrollView body, with no gating wrapper.
    // After the fix the footer must be inside a JSX expression that
    // resolves on populated only.
    expect(understandSrc).not.toMatch(
      /\}\s*\n\s*<Text style=\{styles\.footerNote\}>\s*\n\s*Analysis based on/,
    );
  });
});
