// ============================================================================
// Phase 10.4 — CarePlanConfigScreen pattern audit.
//
// Verifies that the CarePlanConfigScreen migration landed correctly
// across every in-scope app/care-plan/<bucket>.tsx config screen. Same
// shape as the Phase 9.6 LogScreen audit: programmatic assertions named
// after the file under test so failures are diagnostic.
//
// In-scope set: app/care-plan/*.tsx EXCEPT
//   • _layout.tsx                — routing chrome, not a config screen
//   • index.tsx, manage.tsx,
//     meds.tsx                   — Phase 11 deferrals (sev-3)
//   • setup/ (directory)         — wizard sub-flow, separate primitive
//
// Pinned contracts:
//
//   1. Every in-scope screen imports CarePlanConfigScreen OR carries
//      a `// CarePlanConfig exception:` comment. No third state.
//   2. Any exception comment carries the three-part template
//      (pattern that doesn't fit / why migration would degrade UX /
//      Revisit when:). Currently zero in scope; this is forward-looking.
//   3. No `${patient...}` interpolation in any in-scope screen
//      (decorative or substantive). Patient context lives at the
//      Care Plan ownership level, not per-screen.
//   4. No standalone `<Text>Core</Text>` or `<Text>Required</Text>`
//      badge labels — replaced by section eyebrows per the wellness
//      migration pattern. Priority radios that interpolate
//      `{option.label}` are unaffected (templated children, not
//      literal string children).
//   5. No orange-family hex literals — the 3-accent budget is sage /
//      lavender / criticalAlert.
//   6. No legacy chrome imports in any screen that consumes
//      CarePlanConfigScreen. Specifically: no LinearGradient,
//      SubScreenHeader, or AuroraBackground imports — the primitive
//      owns those.
// ============================================================================

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const CARE_PLAN_DIR = join(ROOT, 'app/care-plan');

// ----------------------------------------------------------------------------
// Discover the audit set
// ----------------------------------------------------------------------------

const PHASE_11_DEFERRALS = new Set(['index.tsx', 'manage.tsx', 'meds.tsx']);
const FILE_EXCLUSIONS = new Set(['_layout.tsx', ...PHASE_11_DEFERRALS]);

const IN_SCOPE_FILES: string[] = readdirSync(CARE_PLAN_DIR)
  .filter((f) => {
    const full = join(CARE_PLAN_DIR, f);
    if (statSync(full).isDirectory()) return false; // skip setup/
    if (!f.endsWith('.tsx')) return false;
    return !FILE_EXCLUSIONS.has(f);
  })
  .map((f) => `app/care-plan/${f}`)
  .sort();

const read = (rel: string): string => readFileSync(join(ROOT, rel), 'utf8');

// Strip line + block comments so audits scanning code semantics don't
// false-match against historical-context comment blocks.
function codeOnly(src: string): string {
  const lines = src.split('\n');
  let inBlock = false;
  const out: string[] = [];
  for (const line of lines) {
    let l = line;
    if (inBlock) {
      const e = l.indexOf('*/');
      if (e >= 0) { inBlock = false; l = l.slice(e + 2); } else continue;
    }
    const bs = l.indexOf('/*');
    if (bs >= 0) {
      const be = l.indexOf('*/', bs + 2);
      if (be >= 0) l = l.slice(0, bs) + l.slice(be + 2);
      else { inBlock = true; l = l.slice(0, bs); }
    }
    const lc = l.indexOf('//');
    if (lc >= 0) l = l.slice(0, lc);
    out.push(l);
  }
  return out.join('\n');
}

interface FileInfo {
  path: string;
  src: string;
  body: string; // code-only body
  importsCarePlanConfig: boolean;
  hasExceptionComment: boolean;
  exceptionBlock: string | null;
}

function analyse(rel: string): FileInfo {
  const src = read(rel);
  const body = codeOnly(src);
  const importsCarePlanConfig =
    /import\s*\{[^}]*\bCarePlanConfigScreen\b[^}]*\}\s*from\s*['"][^'"]+\/components\/care-plan\/CarePlanConfigScreen['"]/.test(body);
  // Exception comments live in the file header; capture from the first
  // "// CarePlanConfig exception:" through the next blank or "// =" boundary.
  const m = src.match(/\/\/\s*CarePlanConfig exception:[\s\S]*?(?=\n\s*\n|\n\/\/\s*=)/);
  return {
    path: rel,
    src,
    body,
    importsCarePlanConfig,
    hasExceptionComment: m !== null,
    exceptionBlock: m ? m[0] : null,
  };
}

const FILES: FileInfo[] = IN_SCOPE_FILES.map(analyse);

// ----------------------------------------------------------------------------
// Tests
// ----------------------------------------------------------------------------

describe('Phase 10.4 — CarePlanConfigScreen pattern audit', () => {
  it('discovered the expected care-plan in-scope universe (9 screens)', () => {
    // 8 sev-2 screens migrated in 10.3 + wellness from 10.2.
    expect(FILES.map((f) => f.path)).toEqual([
      'app/care-plan/activity.tsx',
      'app/care-plan/errands.tsx',
      'app/care-plan/meals.tsx',
      'app/care-plan/self-care.tsx',
      'app/care-plan/shifts.tsx',
      'app/care-plan/sleep.tsx',
      'app/care-plan/vitals.tsx',
      'app/care-plan/water.tsx',
      'app/care-plan/wellness.tsx',
    ]);
  });

  describe('Contract 1 — every in-scope file is migrated OR documented as exception', () => {
    for (const f of FILES) {
      it(`${f.path}: imports CarePlanConfigScreen OR carries a // CarePlanConfig exception: comment`, () => {
        const ok = f.importsCarePlanConfig || f.hasExceptionComment;
        if (!ok) {
          throw new Error(
            `${f.path} has neither a CarePlanConfigScreen import nor a // CarePlanConfig exception: comment.\n` +
            `Either migrate the screen via the CarePlanConfigScreen primitive (see Phase 10.3.x ` +
            `commits) or add an exception comment with the three-part template (what doesn't fit / ` +
            `why migration would degrade UX / Revisit when: <unblocker>).`,
          );
        }
        expect(ok).toBe(true);
      });
    }
  });

  describe('Contract 2 — every exception comment carries the three-part template', () => {
    const TEMPLATE_PARTS: Array<{ name: string; re: RegExp }> = [
      { name: 'pattern that doesn\'t fit', re: /(doesn'?t fit|pattern\b)/i },
      { name: 'reason migration would degrade UX or expand primitive', re: /(degrade UX|primitive (expansion|extension)|out of (Phase 10 )?scope|exceed(ing|ed)? the .*threshold|wizard|fallback contract)/i },
      { name: 'Revisit when clause', re: /Revisit when[:\s]/i },
    ];

    // Phase 10 Stage 10.3.x left zero exceptions in scope. The contract
    // is forward-looking: if anyone adds a deferral exception comment
    // later, the three-part template is enforced.
    const screensWithExceptions = FILES.filter(
      (f) => f.hasExceptionComment && !f.importsCarePlanConfig,
    );

    it('zero deferral exception comments at Phase 10 close (forward-looking contract)', () => {
      // Documents the audit's starting state. If this fails because a
      // future commit added an exception, the three-part-template
      // assertions below will fire too — this assertion just signals
      // the shift in regime.
      expect(screensWithExceptions.length).toBe(0);
    });

    for (const f of screensWithExceptions) {
      describe(f.path, () => {
        for (const part of TEMPLATE_PARTS) {
          it(`exception comment includes ${part.name}`, () => {
            const block = f.exceptionBlock ?? '';
            if (!part.re.test(block)) {
              throw new Error(
                `${f.path} exception comment is missing the "${part.name}" element.\n` +
                `Phase 10.3 spec'd a three-part template:\n` +
                `  (a) <pattern that doesn't fit>\n` +
                `  (b) <why forced migration would degrade UX or require primitive expansion>\n` +
                `  (c) Revisit when: <specific unblocker>\n\n` +
                `Block found:\n${block.slice(0, 400)}`,
              );
            }
            expect(block).toMatch(part.re);
          });
        }
      });
    }
  });

  describe('Contract 3 — no patient-name interpolation in any in-scope screen', () => {
    for (const f of FILES) {
      it(`${f.path}: no \${patient...} interpolation, no patientName/activePatient/usePatient`, () => {
        const violations: string[] = [];
        if (/\$\{[a-zA-Z_]*[Pp]atient[A-Za-z]*\}/.test(f.body)) violations.push('${patient*} template literal');
        if (/\$\{patient\}/.test(f.body)) violations.push('${patient} template literal');
        if (/\bpatientName\b/.test(f.body)) violations.push('patientName identifier');
        if (/\bactivePatient\b/.test(f.body)) violations.push('activePatient identifier');
        if (/\busePatient\b/.test(f.body)) violations.push('usePatient hook call');
        if (violations.length > 0) {
          throw new Error(
            `${f.path} reaches into patient context: ${violations.join(', ')}.\n` +
            `Care Plan config screens are patient-agnostic — patient context lives at the ` +
            `Care Plan ownership level, not per-screen. Drop the interpolation; use stable ` +
            `copy that doesn't echo the active patient name.`,
          );
        }
        expect(violations).toEqual([]);
      });
    }
  });

  describe('Contract 4 — no standalone "Core" or "Required" badge labels', () => {
    // Pin: literal-string children inside <Text>...</Text>. Templated
    // children like <Text>{option.label}</Text> are unaffected — they
    // resolve at runtime via the PRIORITY_OPTIONS table and remain a
    // legitimate priority radio.
    const CORE_BADGE = /<Text[^>]*>\s*Core\s*<\/Text>/;
    const REQUIRED_BADGE = /<Text[^>]*>\s*Required\s*<\/Text>/;

    for (const f of FILES) {
      it(`${f.path}: no standalone <Text>Core</Text> badge`, () => {
        if (CORE_BADGE.test(f.body)) {
          throw new Error(
            `${f.path} still renders <Text>Core</Text> as a row-level badge.\n` +
            `Replaced by section eyebrows ("ALWAYS TRACKED" / "ADD MORE") in the wellness ` +
            `migration. Drop the badge; group always-on rows under an eyebrow heading.`,
          );
        }
        expect(f.body).not.toMatch(CORE_BADGE);
      });

      it(`${f.path}: no standalone <Text>Required</Text> badge`, () => {
        if (REQUIRED_BADGE.test(f.body)) {
          throw new Error(
            `${f.path} still renders <Text>Required</Text> as a literal-string badge.\n` +
            `If this is a priority radio, the label should come from PRIORITY_OPTIONS via ` +
            `{option.label}, not a hardcoded string. Otherwise drop the badge.`,
          );
        }
        expect(f.body).not.toMatch(REQUIRED_BADGE);
      });
    }
  });

  describe('Contract 5 — no orange-family hex literals', () => {
    const ORANGE_HEX = /#FF8C42|#F97316|#EA580C|#FB7185|#FFA500|#FB923C/i;

    for (const f of FILES) {
      it(`${f.path}: no orange-family hex literal`, () => {
        if (ORANGE_HEX.test(f.body)) {
          throw new Error(
            `${f.path} contains an orange-family hex literal in code.\n` +
            `Decorative orange is forbidden — the 3-accent budget is sage / lavender / ` +
            `criticalAlert. Drop the literal or route through a token.`,
          );
        }
        expect(f.body).not.toMatch(ORANGE_HEX);
      });
    }
  });

  describe('Contract 6 — no legacy chrome imports in migrated screens', () => {
    for (const f of FILES) {
      if (!f.importsCarePlanConfig) continue; // exception screens skipped
      it(`${f.path}: no LinearGradient import (primitive owns chrome)`, () => {
        const re = /from\s+['"]expo-linear-gradient['"]/;
        if (re.test(f.body)) {
          throw new Error(
            `${f.path} imports expo-linear-gradient while consuming CarePlanConfigScreen.\n` +
            `The primitive owns the gradient chrome — drop the LinearGradient import.`,
          );
        }
        expect(f.body).not.toMatch(re);
      });

      it(`${f.path}: no SubScreenHeader import (primitive owns header)`, () => {
        const re = /from\s+['"][^'"]*\/components\/SubScreenHeader['"]/;
        if (re.test(f.body)) {
          throw new Error(
            `${f.path} imports SubScreenHeader while consuming CarePlanConfigScreen.\n` +
            `The primitive renders its own header — drop the SubScreenHeader import.`,
          );
        }
        expect(f.body).not.toMatch(re);
      });

      it(`${f.path}: no AuroraBackground import (primitive owns aurora chrome)`, () => {
        const re = /from\s+['"][^'"]*\/components\/aurora\/AuroraBackground['"]/;
        if (re.test(f.body)) {
          throw new Error(
            `${f.path} imports AuroraBackground while consuming CarePlanConfigScreen.\n` +
            `The primitive renders aurora chrome via the chrome="aurora-*" prop — ` +
            `drop the direct AuroraBackground import.`,
          );
        }
        expect(f.body).not.toMatch(re);
      });

      it(`${f.path}: no SafeAreaView import from react-native-safe-area-context (primitive owns safe-area)`, () => {
        const re = /from\s+['"]react-native-safe-area-context['"]/;
        if (re.test(f.body)) {
          throw new Error(
            `${f.path} imports SafeAreaView from react-native-safe-area-context while ` +
            `consuming CarePlanConfigScreen. The primitive wraps in SafeAreaView itself — ` +
            `drop the direct import.`,
          );
        }
        expect(f.body).not.toMatch(re);
      });
    }
  });
});
