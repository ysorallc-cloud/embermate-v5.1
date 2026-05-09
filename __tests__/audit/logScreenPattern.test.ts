// ============================================================================
// Phase 9.6 — LogScreen pattern audit.
//
// Verifies that the LogScreen pattern landed correctly across every
// app/log-*.tsx file. Catches drift in three forms:
//
//   • A new log-* screen lands without either using LogScreen or
//     declaring an exception (no third state).
//   • An exception comment is added without the three-part template
//     (what doesn't fit / why migration would degrade UX / Revisit when:).
//   • Decorative orange-family hex literals re-appear in a log screen.
//   • A migrated screen drifts away from the unified pattern (legacy
//     contextBanner, legacy `progress.<bucket>.<field>` reads, missing
//     medical disclaimer).
//
// All assertions name the offending file in the failure output so the
// audit is helpful, not opaque. If you migrate or add a log-* screen
// in the future, this audit will tell you exactly what's missing.
//
// Out of scope: migrating medication-confirm (legacy progress consumer
// outside the log-* family), the 8 tracked Phase 9 follow-ups, and the
// three Group C exception screens (each carries its own revisit clause).
// ============================================================================

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const APP = join(ROOT, 'app');

// ----------------------------------------------------------------------------
// Discover the audit set
// ----------------------------------------------------------------------------

const LOG_FILES = readdirSync(APP)
  .filter((f) => /^log-.*\.tsx$/.test(f))
  .map((f) => `app/${f}`)
  .sort();

const read = (rel: string): string => readFileSync(join(ROOT, rel), 'utf8');

// Strip line + block comments so audits that scan code semantics don't
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
  importsLogScreen: boolean;
  hasExceptionComment: boolean;
  exceptionBlock: string | null;
}

function analyse(rel: string): FileInfo {
  const src = read(rel);
  const body = codeOnly(src);
  const importsLogScreen =
    /import\s*\{[^}]*\bLogScreen\b[^}]*\}\s*from\s*['"][^'"]+\/components\/logging\/LogScreen['"]/.test(body);
  // Exception comments live in the file header; capture from the first
  // "// LogScreen exception:" through the next blank or "// =" boundary.
  const m = src.match(/\/\/\s*LogScreen exception:[\s\S]*?(?=\n\s*\n|\n\/\/\s*=)/);
  return {
    path: rel,
    src,
    body,
    importsLogScreen,
    hasExceptionComment: m !== null,
    exceptionBlock: m ? m[0] : null,
  };
}

const FILES: FileInfo[] = LOG_FILES.map(analyse);

// ----------------------------------------------------------------------------
// Tests
// ----------------------------------------------------------------------------

describe('Phase 9.6 — LogScreen pattern audit', () => {
  it('discovered the expected log-* universe', () => {
    expect(FILES.length).toBeGreaterThanOrEqual(10);
  });

  describe('Contract 1 — every log-* file is migrated OR documented as exception', () => {
    for (const f of FILES) {
      it(`${f.path}: imports LogScreen OR carries a // LogScreen exception: comment`, () => {
        const ok = f.importsLogScreen || f.hasExceptionComment;
        if (!ok) {
          throw new Error(
            `${f.path} has neither a LogScreen import nor a // LogScreen exception: comment.\n` +
            `Either migrate the screen via the LogScreen primitive (see Phase 9.5 commits) ` +
            `or add an exception comment with the three-part template (what doesn't fit / why ` +
            `migration would degrade UX / Revisit when: <unblocker>).`,
          );
        }
        expect(ok).toBe(true);
      });
    }
  });

  describe('Contract 2 — every exception comment carries the three-part template', () => {
    const TEMPLATE_PARTS: Array<{ name: string; re: RegExp }> = [
      // (a) What pattern doesn't fit — must explicitly call this out.
      { name: 'pattern that doesn\'t fit', re: /(doesn'?t fit|pattern\b)/i },
      // (b) Why forced migration would degrade UX or expand primitive.
      { name: 'reason migration would degrade UX or expand primitive', re: /(degrade UX|primitive (expansion|extension)|out of (Phase 9 )?scope|exceed(ing|ed)? the .*threshold|fallback contract|focus the wizard was designed)/i },
      // (c) Revisit-when clause naming a specific unblocker.
      { name: 'Revisit when clause', re: /Revisit when[:\s]/i },
    ];

    // Contract 2 applies to "deferral" exception comments — screens that
    // do NOT import LogScreen and use the comment to explain why they
    // weren't migrated. Group B screens (log-symptom + log-pain) wrap in
    // LogScreen AND carry an exception comment; their comment is
    // descriptive (multi-step pair documentation from Phase 9.0), not a
    // deferral rationale. Don't enforce the strict three-part template
    // on those — the comment is informational, not load-bearing.
    const screensWithExceptions = FILES.filter(
      (f) => f.hasExceptionComment && !f.importsLogScreen,
    );

    it('found deferral-style exception comments to audit', () => {
      expect(screensWithExceptions.length).toBeGreaterThan(0);
    });

    for (const f of screensWithExceptions) {
      describe(f.path, () => {
        for (const part of TEMPLATE_PARTS) {
          it(`exception comment includes ${part.name}`, () => {
            const block = f.exceptionBlock ?? '';
            if (!part.re.test(block)) {
              throw new Error(
                `${f.path} exception comment is missing the "${part.name}" element.\n` +
                `Phase 9.5 spec'd a three-part template:\n` +
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

  describe('Contract 3 — no decorative orange-family hex literals in log-* screens', () => {
    // log-pain.tsx legitimately uses Colors.orange in a clinical
    // severity gradient (green → amber → orange → red → rose). The
    // audit treats that token reference as semantic, not decorative,
    // when it appears alongside the rest of the gradient palette.
    const ORANGE_HEX = /#FF8C42|#F97316|#EA580C|#FB7185|#FFA500|#FB923C/i;
    const ORANGE_TOKEN = /\b(?:Colors|colors|c)\.orange\b/;

    for (const f of FILES) {
      it(`${f.path}: no decorative orange-family hex literal`, () => {
        if (ORANGE_HEX.test(f.body)) {
          throw new Error(
            `${f.path} contains an orange-family hex literal in code.\n` +
            `Decorative orange is forbidden — the 3-accent budget is sage / lavender / criticalAlert. ` +
            `If this is a clinical-severity gradient (rare), route through a token and append it to ` +
            `the gradient set (Colors.green/amber/red/rose) so the audit recognises semantic use.`,
          );
        }
        expect(f.body).not.toMatch(ORANGE_HEX);
      });

      it(`${f.path}: orange token use, if any, is part of a clinical severity gradient`, () => {
        if (!ORANGE_TOKEN.test(f.body)) return; // clean — no token reference
        // Token used. Verify it's accompanied by the gradient siblings.
        const hasGradientSet =
          /\b(?:Colors|colors|c)\.green\b/.test(f.body) &&
          /\b(?:Colors|colors|c)\.(amber|warning)\b/.test(f.body) &&
          /\b(?:Colors|colors|c)\.(red|criticalAlert)\b/.test(f.body);
        if (!hasGradientSet) {
          throw new Error(
            `${f.path} references an orange token outside a recognised clinical-severity ` +
            `gradient (must appear alongside green + amber + red/criticalAlert tokens). ` +
            `Either remove the token reference or add the missing gradient siblings.`,
          );
        }
        expect(hasGradientSet).toBe(true);
      });
    }
  });

  describe('Contract 4 — migrated screens have at most one filled-sage primary CTA', () => {
    // Migrated screens delegate the primary CTA to the LogScreen
    // primitive's primaryAction prop. They should NOT define their own
    // saveButton-shaped style block (that was the legacy pattern).
    for (const f of FILES) {
      if (!f.importsLogScreen) continue; // exception screens skipped
      it(`${f.path}: no legacy saveButton style with backgroundColor c.accent`, () => {
        // Pin: the saveButton style key paired with backgroundColor:
        // c.accent / colors.accent is the pattern the migration retired.
        // Allow saveButton: {} only if it doesn't paint with the accent.
        const styleBlock = f.body.match(/saveButton\s*:\s*\{[^}]*\}/s);
        if (!styleBlock) return; // no legacy style — clean
        const hasAccentBg = /backgroundColor\s*:\s*c\.accent\b/.test(styleBlock[0]);
        if (hasAccentBg) {
          throw new Error(
            `${f.path} still defines styles.saveButton with backgroundColor c.accent.\n` +
            `LogScreen primitive owns the primary CTA — drop the legacy saveButton style.`,
          );
        }
        expect(hasAccentBg).toBe(false);
      });
    }
  });

  describe('Contract 5 — migrated screens have a disclaimer at top of children', () => {
    for (const f of FILES) {
      if (!f.importsLogScreen) continue;
      it(`${f.path}: renders a *-disclaimer testID Text node`, () => {
        const hasDisclaimer = /testID=['"`][a-z0-9-]+-disclaimer['"`]/.test(f.body);
        if (!hasDisclaimer) {
          throw new Error(
            `${f.path} is missing the standard disclaimer at the top of LogScreen children.\n` +
            `Pattern: <Text testID="<screen>-disclaimer" style={styles.disclaimer}>For caregiver record-keeping…</Text>`,
          );
        }
        expect(hasDisclaimer).toBe(true);
      });
    }
  });

  describe('Contract 6 — no standalone progress card outside the LogScreen header subtitle', () => {
    for (const f of FILES) {
      if (!f.importsLogScreen) continue;
      it(`${f.path}: no legacy contextBanner style`, () => {
        if (/styles\.contextBanner\b/.test(f.body) || /contextBanner\s*:\s*\{/.test(f.body)) {
          throw new Error(
            `${f.path} still references the legacy contextBanner pattern.\n` +
            `Counter info belongs in the LogScreen header subtitle (countSubtitle prop), ` +
            `not a standalone in-children card.`,
          );
        }
        expect(f.body).not.toMatch(/styles\.contextBanner\b/);
        expect(f.body).not.toMatch(/contextBanner\s*:\s*\{/);
      });

      it(`${f.path}: no legacy progress.<bucket>.<field> reads (vestige of getTodayProgress)`, () => {
        // The pre-9.x counter source. Migrated screens read counts
        // directly from listDailyInstances.
        const re = /\bprogress\.(meds|medications|vitals|meals|water|sleep|activity)\.(completed|expected)\b/;
        if (re.test(f.body)) {
          throw new Error(
            `${f.path} still reads from the legacy progress.<bucket>.<field> shape.\n` +
            `Switch to listDailyInstances filtered to the relevant itemType (see log-vitals or log-meal).`,
          );
        }
        expect(f.body).not.toMatch(re);
      });
    }
  });
});
