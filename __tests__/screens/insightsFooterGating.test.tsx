// ============================================================================
// Phase 6.1 — Insights footer disclaimer is gated to the populated state.
//
// On day 1-13 the screen shows the building UI ("Patterns coming") and a
// 0%-progress feel. The "Analysis based on N days · Not a medical diagnosis"
// footer in that context implies analysis the user can't see. It belongs
// only on the populated surface (>= 14 days of data) where there is real
// analysis to disclaim.
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

  it('gates the footer to the populated state via the state classifier', () => {
    // The footer block should sit inside a guard that resolves to
    // populated — either a direct `state === 'populated'` check or a
    // `gating.show*` flag that is only true in populated. The simplest
    // contract: within ~400 chars before the footer text, find a
    // populated reference. Empty + building states must NOT render it.
    const footerIdx = understandSrc.indexOf('Not a medical diagnosis');
    expect(footerIdx).toBeGreaterThan(0);
    const window = understandSrc.slice(Math.max(0, footerIdx - 400), footerIdx);
    expect(window).toMatch(
      /state\s*[!=]==\s*['"]populated['"]|insightsState\s*[!=]==\s*['"]populated['"]|gating\.\w+/,
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
