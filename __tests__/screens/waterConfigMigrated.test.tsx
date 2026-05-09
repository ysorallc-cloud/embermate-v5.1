// ============================================================================
// Phase 10.3.x — water.tsx migrated to CarePlanConfigScreen.
//
// Pre-10.3: SafeAreaView + LinearGradient wrapper, hand-rolled header
// with a "WATER" tiny-caps banner, body-level "Water" title section.
//
// Post-10.3: <CarePlanConfigScreen chrome="gradient"> owns the chrome.
// Body content (priority, daily goal, units, reminder frequency,
// notifications) is unchanged.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = readFileSync(
  join(__dirname, '../..', 'app/care-plan/water.tsx'),
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

describe('Phase 10.3.x — water.tsx migrated to CarePlanConfigScreen', () => {
  it('contract 1: imports CarePlanConfigScreen', () => {
    expect(SRC).toMatch(
      /import\s*\{\s*CarePlanConfigScreen\s*\}\s*from\s*['"][^'"]+\/components\/care-plan\/CarePlanConfigScreen['"]/,
    );
  });

  it('contract 2: uses CarePlanConfigScreen as the wrapper', () => {
    expect(SRC).toMatch(/<CarePlanConfigScreen[\s\S]*?>[\s\S]*?<\/CarePlanConfigScreen>/);
  });

  it('contract 3: chrome resolves to gradient', () => {
    const hasOtherChrome = /chrome=['"`](?:aurora-care|aurora-support|aurora-log)['"`]/.test(SRC);
    expect(hasOtherChrome).toBe(false);
  });

  it('contract 4: drops legacy SafeAreaView + LinearGradient imports', () => {
    expect(codeOnly).not.toMatch(/from ['"]react-native-safe-area-context['"]/);
    expect(codeOnly).not.toMatch(/from ['"]expo-linear-gradient['"]/);
  });

  it('contract 5: tiny-caps "WATER" banner is gone', () => {
    expect(codeOnly).not.toMatch(/<Text[^>]*>\s*WATER\s*<\/Text>/);
  });

  it('contract 6: no patient-name interpolation in source', () => {
    expect(codeOnly).not.toMatch(/\$\{[a-zA-Z_]*[Pp]atient[A-Za-z]*\}/);
    expect(codeOnly).not.toMatch(/\bpatientName\b/);
    expect(codeOnly).not.toMatch(/\bactivePatient\b/);
    expect(codeOnly).not.toMatch(/\busePatient\b/);
  });

  it('contract 7: no orange-family hex literals', () => {
    expect(codeOnly).not.toMatch(/#FF8C42|#F97316|#EA580C|#FB7185|#FFA500|#FB923C/i);
  });
});
