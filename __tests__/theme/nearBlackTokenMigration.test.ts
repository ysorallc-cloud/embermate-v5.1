// ============================================================================
// Phase 8.5 — Guard: no near-black token consumers (backgroundDeep,
// backgroundDark, cardBackground, inputBackground).
//
// These tokens were #000 / #111 — pre-Phase-0 near-black palette. They
// don't compose with the warm sage palette: a #111 card on a #1f201c page
// reads as a hole. Phase 8.5 migrates the four remaining consumers to
// canonical Phase 0 surfaces (background / glass) and Phase 8.6 removes
// the orphaned tokens.
// ============================================================================

import { execSync } from 'child_process';
import { join } from 'path';

const ROOT = join(__dirname, '../..');

function grepHits(pattern: string): string[] {
  try {
    const out = execSync(
      `grep -rEn '${pattern}' app components contexts --include='*.tsx' --include='*.ts' || true`,
      { cwd: ROOT, encoding: 'utf8' },
    );
    return out.split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

describe('Phase 8.5 — near-black token consumers are gone', () => {
  it('no Colors.backgroundDeep references remain', () => {
    const hits = grepHits('(Colors|c|colors)\\.backgroundDeep\\b');
    if (hits.length > 0) {
      throw new Error(
        `${hits.length} backgroundDeep reference(s) — migrate to Colors.background:\n  ${hits.join('\n  ')}`,
      );
    }
  });

  it('no Colors.backgroundDark references remain', () => {
    const hits = grepHits('(Colors|c|colors)\\.backgroundDark\\b');
    expect(hits.length).toBe(0);
  });

  it('no Colors.cardBackground references remain', () => {
    const hits = grepHits('(Colors|c|colors)\\.cardBackground\\b');
    if (hits.length > 0) {
      throw new Error(
        `${hits.length} cardBackground reference(s) — migrate to colors.glass:\n  ${hits.join('\n  ')}`,
      );
    }
  });

  it('no Colors.inputBackground references remain', () => {
    const hits = grepHits('(Colors|c|colors)\\.inputBackground\\b');
    expect(hits.length).toBe(0);
  });
});
