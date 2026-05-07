// ============================================================================
// Phase 8.2 — Guard: no purple* token references in app/ or components/.
//
// The purple* family was migrated 1:1 to caregiverAccent* in Phase 8.2.
// purpleGlow is the only legacy token still in scope (handled in Phase 8.3).
// This guard catches future code that re-introduces the legacy family.
// ============================================================================

import { execSync } from 'child_process';
import { join } from 'path';

const ROOT = join(__dirname, '../..');

function grepHits(pattern: string): string[] {
  try {
    const out = execSync(
      `grep -rEn '${pattern}' app components --include='*.tsx' --include='*.ts' || true`,
      { cwd: ROOT, encoding: 'utf8' },
    );
    return out
      .split('\n')
      .filter(Boolean)
      // purpleGlow is the lone exception — Phase 8.3 retires it.
      .filter((l) => !/purpleGlow/.test(l));
  } catch {
    return [];
  }
}

describe('Phase 8.2 — purple* family is unused outside theme tokens', () => {
  it('no Colors.purple / c.purple / colors.purple references remain (purpleGlow excepted)', () => {
    const hits = grepHits('(Colors|c|colors)\\.purple[A-Za-z]*');
    if (hits.length > 0) {
      throw new Error(
        `${hits.length} stale purple* reference(s) found. Migrate to caregiverAccent* family:\n  ${hits.join('\n  ')}`,
      );
    }
  });
});
