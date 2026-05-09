// ============================================================================
// Phase 10.3.x — activity.tsx migrated to CarePlanConfigScreen.
//
// Pre-10.3: SafeAreaView + LinearGradient wrapper, hand-rolled header
// row with a back button + tiny-caps "ACTIVITY" banner, then a body-
// level "Activity" title + subtitle pair.
//
// Post-10.3: <CarePlanConfigScreen chrome="gradient"> owns the chrome
// (header + back button + scroll body). The "ACTIVITY" caps banner is
// gone, and the body-level title section is gone — the title +
// subtitle live on the primitive's header where they belong.
// Body content (priority, activity types, info card, notifications)
// is unchanged.
//
// Pinned contracts:
//   1. Imports CarePlanConfigScreen.
//   2. Renders <CarePlanConfigScreen> as the wrapper.
//   3. chrome="gradient" (or default, which resolves to gradient).
//   4. Drops legacy SafeAreaView + LinearGradient + custom-header
//      plumbing imports.
//   5. The tiny-caps "ACTIVITY" banner is gone from the source.
//   6. No patient-name interpolation.
//   7. No orange-family hex literals.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = readFileSync(
  join(__dirname, '../..', 'app/care-plan/activity.tsx'),
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

describe('Phase 10.3.x — activity.tsx migrated to CarePlanConfigScreen', () => {
  it('contract 1: imports CarePlanConfigScreen', () => {
    expect(SRC).toMatch(
      /import\s*\{\s*CarePlanConfigScreen\s*\}\s*from\s*['"][^'"]+\/components\/care-plan\/CarePlanConfigScreen['"]/,
    );
  });

  it('contract 2: uses CarePlanConfigScreen as the wrapper', () => {
    expect(SRC).toMatch(/<CarePlanConfigScreen[\s\S]*?>[\s\S]*?<\/CarePlanConfigScreen>/);
  });

  it('contract 3: chrome resolves to gradient (default or explicit)', () => {
    // The bucket-config family is the gradient chrome. Either explicit
    // chrome="gradient" or the absent prop (default = 'gradient') is OK.
    const hasExplicit = /chrome=['"`]gradient['"`]/.test(SRC);
    const hasOtherChrome = /chrome=['"`](?:aurora-care|aurora-support|aurora-log)['"`]/.test(SRC);
    expect(hasOtherChrome).toBe(false);
    // If the consumer omits chrome, default is gradient — that's fine.
    expect(hasExplicit || !hasOtherChrome).toBe(true);
  });

  it('contract 4: drops legacy SafeAreaView + LinearGradient imports', () => {
    expect(codeOnly).not.toMatch(/from ['"]react-native-safe-area-context['"]/);
    expect(codeOnly).not.toMatch(/from ['"]expo-linear-gradient['"]/);
  });

  it('contract 5: tiny-caps "ACTIVITY" banner is gone', () => {
    expect(codeOnly).not.toMatch(/<Text[^>]*>\s*ACTIVITY\s*<\/Text>/);
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
