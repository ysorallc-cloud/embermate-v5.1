// __tests__/gates/gateD_noClinicalVerdict.test.ts
// ---------------------------------------------------------------------------
// SAFETY GATE D: caregiver/clinician-facing summaries must not assert clinical
// verdicts against app-defined thresholds. "98.6 F (2 out of range)" is the app
// diagnosing on a page handed to a provider; 98.6 is normal body temperature.
//
// Reproduces today (RED):
//   - app/care-report.tsx uses a `rangeAbnormal` style for vitals (line ~1213,
//     applied ~758).
//   - app/visit-prep-preview.tsx prints "(N out of range)" (line ~345).
//
// Passes (GREEN) once vitals wording routes through the neutral snapshot
// narrative ("above his usual") and the verdict strings/styles are removed.
//
// SCOPE DISCIPLINE: only summary/report/insight RENDER surfaces. Do NOT add
// vital-threshold-settings.tsx (where "range" is a legitimate user-config
// concept, not an assertion about the patient). Widening the list produces
// false positives and the wrong fix.
// ---------------------------------------------------------------------------

import * as fs from 'fs';
import * as path from 'path';

const ROOT = process.cwd();

// TODO(claude-code): confirm the final set after collapsing the report sprawl
// to one Care Summary. These are the surfaces that emit verdicts today.
const SUMMARY_FILES = [
  'app/care-report.tsx',
  'app/visit-prep.tsx',
  'app/visit-prep-preview.tsx',
  'app/provider-prep.tsx',
  'app/(tabs)/understand.tsx',
  // The buildRedFlags critical callout (rendered top-of-page in the PDF and the
  // preview) emitted the same fixed-cutoff "N readings outside the usual range"
  // verdict from its vitals branch. That branch was removed for v1; scan the
  // builder so it cannot regress.
  'services/redFlags.ts',
  // Merged in from the now-deleted __tests__/architecture/noProviderVerdict.test.ts
  // (its overlapping, narrower guard was folded into this broader one). The
  // EXPORTED PDF is the artifact the provider actually receives, so a threshold
  // verdict in its static HTML template is the same leak as one on a screen.
  'services/visitPrepPdf.ts',
  // Retarget (Care Report retired): the Care Report / reportGenerator.ts is gone.
  // The now-PRIMARY provider-facing artifact is the Handoff PDF (Journal Share).
  // Guard its exported HTML renderer so a threshold verdict can't leak there.
  'services/handoffPdf.ts',
  // careSummaryBuilder feeds the CareBrief interpretations (medications /
  // vitals / nutrition) that the Journal status card and share flows read
  // from — a provider-adjacent summary, not just the exported reports. Its
  // directive-language cleanup (removed "monitor glucose closely" /
  // "encourage more fluids" style advice in favor of neutral, factual
  // observations) is guarded here so it can't regress unnoticed.
  'utils/careSummaryBuilder.ts',
];

// Verdict tokens AND the tell-tale style/flag names that drive verdict UI.
const VERDICT = /\b(out of range|outOfRange|abnormal|rangeAbnormal|elevated)\b/i;

describe('Gate D: no clinical verdict in summaries', () => {
  for (const rel of SUMMARY_FILES) {
    it(`${rel} contains no verdict language or verdict styling`, () => {
      const abs = path.join(ROOT, rel);
      if (!fs.existsSync(abs)) return; // file set being reconciled
      const src = fs.readFileSync(abs, 'utf8');
      const offenders = src
        .split('\n')
        .map((line, i) => ({ line, n: i + 1 }))
        .filter(({ line }) => VERDICT.test(line))
        .map(({ line, n }) => `${rel}:${n}  ${line.trim()}`);
      expect(offenders).toEqual([]);
    });
  }
});
