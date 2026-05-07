// ============================================================================
// Phase 8.2 / 8.3 — Guard: no purple* token references in app/ or components/.
//
// The purple* family was migrated 1:1 to caregiverAccent* in Phase 8.2 and
// purpleGlow was dropped in Phase 8.3. After this point the entire purple*
// family is unused; Phase 8.6 removes the token definitions themselves.
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
    return out.split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

describe('Phase 8.2 / 8.3 — purple* family is unused outside theme tokens', () => {
  it('no Colors.purple / c.purple / colors.purple references remain anywhere', () => {
    const hits = grepHits('(Colors|c|colors)\\.purple[A-Za-z]*');
    if (hits.length > 0) {
      throw new Error(
        `${hits.length} stale purple* reference(s) found. Migrate to caregiverAccent* family:\n  ${hits.join('\n  ')}`,
      );
    }
  });
});
