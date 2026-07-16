// ============================================================================
// VITAL-THRESHOLD SINGLE-SOURCE GUARD (STEP 1 — the durable fix)
//
// The vital-threshold-verdict problem: multiple engines each compute their OWN
// fixed vital cutoffs (systolic >= 140, glucose >= 150, avgSystolic > 130, …)
// and emit judgment from them. Every new surface reinvents a cutoff, so
// clinical verdicts keep leaking back in (Gate D was a NET that caught them
// after the fact; this guard is the CURE that makes a 7th site impossible).
//
// The rule this pins: fixed vital-threshold computation may live in EXACTLY
// ONE place — the canonical observation module (utils/vitalsObservation.ts,
// UNIT 2). Everywhere else must call that module, which returns a NEUTRAL
// per-person observation (above/within/below THIS person's usual), never a
// fixed population cutoff and never a verdict.
//
// HOW IT SCANS: over utils/ + services/ (.ts/.tsx), comment content stripped
// (line-preserving so reported line numbers match source), a line is a
// fixed-threshold computation if it has a comparison operator (>,>=,<,<=)
// adjacent to a vital cutoff constant:
//   • PRIMARY constants {130,140,150,180,200,99.5,100.4} — distinctive; they
//     essentially only appear as vital thresholds, so the operator alone flags.
//   • SECONDARY constants {50,60,70,80,90,95,100,120} — common numbers; only
//     flagged when a vital token (systolic/diastolic/glucose/heartRate/temp/…)
//     also appears on the line, to avoid false positives on unrelated numbers.
//
// EXCLUSIONS (legitimate, per spec):
//   • utils/vitalThresholds.ts — population/user-config threshold reference
//     (object literals, not verdict-emitting comparisons).
//   • utils/sampleDataGenerator.ts, utils/sampleData.ts — seed VALUES, not
//     thresholds.
//   • utils/vitalsObservation.ts — the ONE canonical home (UNIT 2).
//   • __tests__ — test files.
//
// STATE: RED today — it names the 6 legacy sites (careSummaryBuilder,
// insightEngine, careInsights, narrativeSummaryBuilder, journalReflections).
// It goes GREEN one file at a time as UNIT 3 migrates each onto the canonical
// module; all-green is the completion signal. Do NOT rename fields to dodge
// it — the root fix is deleting the private cutoff, not hiding the number.
//
// KNOWN LIMIT (documented, not airtight): the scanner matches numeric
// LITERALS adjacent to a comparison operator. A threshold written as a NAMED
// constant (e.g. `const SYS_HIGH = 140; … if (systolic >= SYS_HIGH)`) would
// evade it, since the literal `140` and the comparison sit on different lines.
// This is an accepted trade-off — literal cutoffs are how all 6 legacy sites
// (and the realistic copy-paste 7th) are actually written, and keying on
// literals is what keeps the scanner free of false positives. A named-constant
// cutoff is still a policy violation; it's just not caught mechanically here.
// ============================================================================

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');

const EXCLUDE_FILES = new Set([
  'vitalThresholds.ts',     // population/user-config threshold reference
  'sampleDataGenerator.ts', // seed values, not thresholds
  'sampleData.ts',          // seed values, not thresholds
  'vitalsObservation.ts',   // the ONE canonical home (UNIT 2)
]);

/** Blank out comment CONTENT but preserve newlines so line numbers align. */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/.*$/gm, (_m, p1) => p1);
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === '__tests__' || entry === 'node_modules') continue;
      out.push(...walk(full));
    } else if (
      (entry.endsWith('.ts') || entry.endsWith('.tsx')) &&
      !EXCLUDE_FILES.has(entry)
    ) {
      out.push(full);
    }
  }
  return out;
}

const OP = '(?:>=|<=|>|<)';
const PRIMARY = '(?:130|140|150|180|200|99\\.5|100\\.4)';
const SECONDARY = '(?:50|60|70|80|90|95|100|120)';
const RE_PRIMARY = new RegExp(OP + '\\s*' + PRIMARY + '\\b');
const RE_SECONDARY = new RegExp(OP + '\\s*' + SECONDARY + '\\b');
const RE_VITAL_TOKEN =
  /(systolic|diastolic|glucose|avgSystolic|avgDiastolic|heartRate|\bhr\b|temperature|\btemp\b|oxygen|spo2|\bsys\b|\bdia\b|\bbpm\b|pulse)/i;

function scanForFixedThresholds(): string[] {
  const hits: string[] = [];
  const files = [...walk(join(ROOT, 'utils')), ...walk(join(ROOT, 'services'))];
  for (const file of files) {
    const lines = stripComments(readFileSync(file, 'utf8')).split('\n');
    lines.forEach((line, i) => {
      const primary = RE_PRIMARY.test(line);
      const secondary = RE_SECONDARY.test(line) && RE_VITAL_TOKEN.test(line);
      if (primary || secondary) {
        hits.push(`${file.slice(ROOT.length + 1)}:${i + 1}  ${line.trim()}`);
      }
    });
  }
  return hits;
}

describe('Vital-threshold single-source guard', () => {
  it('no fixed vital-threshold computation outside the canonical module', () => {
    const offenders = scanForFixedThresholds();
    // The assertion diff prints the full offender list (file:line + source),
    // so the completion signal stays legible as UNIT 3 migrates each file off
    // its private cutoffs. Silent once green.
    expect(offenders).toEqual([]);
  });
});
