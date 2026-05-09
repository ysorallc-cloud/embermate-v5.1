// ============================================================================
// Phase 10.3.x — self-care.tsx migrated to CarePlanConfigScreen.
//
// Pre-10.3: SubScreenHeader + AuroraBackground variant="support".
// Post-10.3: <CarePlanConfigScreen chrome="aurora-support"> owns the
// chrome. Body (preset grid + add form) is unchanged.
//
// Pinned contracts:
//   1. Imports CarePlanConfigScreen.
//   2. Renders <CarePlanConfigScreen> as the wrapper.
//   3. chrome="aurora-support" — the self-care variant.
//   4. Drops the legacy SubScreenHeader + AuroraBackground imports.
//   5. No patient-name interpolation.
//   6. No orange-family hex literals.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = readFileSync(
  join(__dirname, '../..', 'app/care-plan/self-care.tsx'),
  'utf8',
);

const codeOnly = (() => {
  const lines = SRC.split('\n'); let inBlock = false; const out: string[] = [];
  for (const line of lines) {
    let l = line;
    if (inBlock) { const e = l.indexOf('*/'); if (e >= 0) { inBlock = false; l = l.slice(e + 2); } else continue; }
    const bs = l.indexOf('/*');
    if (bs >= 0) { const be = l.indexOf('*/', bs + 2); if (be >= 0) l = l.slice(0, bs) + l.slice(be + 2); else { inBlock = true; l = l.slice(0, bs); } }
    const lc = l.indexOf('//'); if (lc >= 0) l = l.slice(0, lc);
    out.push(l);
  }
  return out.join('\n');
})();

describe('Phase 10.3.x — self-care.tsx migrated to CarePlanConfigScreen', () => {
  it('contract 1: imports CarePlanConfigScreen', () => {
    expect(SRC).toMatch(
      /import\s*\{\s*CarePlanConfigScreen\s*\}\s*from\s*['"][^'"]+\/components\/care-plan\/CarePlanConfigScreen['"]/,
    );
  });

  it('contract 2: uses CarePlanConfigScreen as the wrapper', () => {
    expect(SRC).toMatch(/<CarePlanConfigScreen[\s\S]*?>[\s\S]*?<\/CarePlanConfigScreen>/);
  });

  it('contract 3: chrome="aurora-support" — self-care variant', () => {
    expect(SRC).toMatch(/chrome=['"`]aurora-support['"`]/);
  });

  it('contract 4: drops legacy SubScreenHeader + AuroraBackground imports', () => {
    expect(codeOnly).not.toMatch(/SubScreenHeader/);
    expect(codeOnly).not.toMatch(/AuroraBackground/);
  });

  it('contract 5: no patient-name interpolation in source', () => {
    expect(codeOnly).not.toMatch(/\$\{[a-zA-Z_]*[Pp]atient[A-Za-z]*\}/);
    expect(codeOnly).not.toMatch(/\bpatientName\b/);
    expect(codeOnly).not.toMatch(/\bactivePatient\b/);
    expect(codeOnly).not.toMatch(/\busePatient\b/);
  });

  it('contract 6: no orange-family hex literals', () => {
    expect(codeOnly).not.toMatch(/#FF8C42|#F97316|#EA580C|#FB7185|#FFA500|#FB923C/i);
  });
});
