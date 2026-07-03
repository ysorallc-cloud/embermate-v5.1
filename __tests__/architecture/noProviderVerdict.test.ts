// ============================================================================
// v1 launch-blocker — NO provider-facing threshold verdicts.
//
// The two provider-facing summary surfaces (care-report, visit-prep-preview)
// must NOT assert a clinical verdict computed from an app-defined threshold on
// a page handed to a provider. "Within/Outside usual range" and "(N out of
// range)" are derived from HARDCODED cutoffs (systolic<130 && diastolic<80,
// etc.) — "usual" is false because the number is not derived from the
// patient's own history. So these are REMOVED, not reworded. Per-person
// deviation language ("above his usual") is deferred to the v1.1 snapshot
// engine, which actually computes the baseline.
//
// This test is the reproduction AND the permanent guard: it source-scans the
// provider-facing surfaces for verdict language. That set is BOTH the two
// preview screens (care-report, visit-prep-preview) AND the EXPORTED Visit Prep
// PDF (services/visitPrepPdf.ts) — the PDF is the artifact the provider actually
// receives, so a threshold verdict there is the same leak, and the screen-only
// guard could not catch it (the two diverged: preview clean, PDF still leaking
// an "Out of Range" column). visitPrepPdf's vitals-table header is a static HTML
// template literal, so the source scan covers the rendered header directly.
//
// It intentionally does NOT scan vital-threshold-settings / interactions (there
// "range"/"high" is a legitimate user-configurable concept) or the in-app
// caregiver views (Now, Insights) — this guard is provider-facing surfaces only.
// The redFlags callout / buildRedFlags is a separate product decision, NOT
// covered here.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const FILES = [
  'app/care-report.tsx',
  'app/visit-prep-preview.tsx',
  'services/visitPrepPdf.ts',
];
const VERDICT = /\b(out of range|outside usual range|within usual range|abnormal|elevated)\b/i;

describe('v1 launch-blocker — no provider-facing threshold verdicts', () => {
  for (const rel of FILES) {
    it(`${rel} renders no clinical verdict derived from an app-defined threshold`, () => {
      const src = readFileSync(join(ROOT, rel), 'utf8');
      const offenders: string[] = [];
      src.split('\n').forEach((line, idx) => {
        if (VERDICT.test(line)) offenders.push(`${rel}:${idx + 1}`);
      });
      expect(offenders).toEqual([]);
    });
  }
});
