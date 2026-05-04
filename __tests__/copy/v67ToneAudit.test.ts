// ============================================================================
// v6.7 holistic tone audit (Prompt 6 Phase 4).
//
// Sweeps caregiver-facing source files for forbidden phrasing and verifies
// that the v6.7 vocabulary anchors land in their respective contexts.
// Clinical artifacts (Visit Prep PDF, audit logs, dev logs, error messages,
// migration code) intentionally retain medical / engineering language and
// are excluded from the caregiver-facing sweep.
// ============================================================================

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative, sep } from 'path';

const ROOT = join(__dirname, '../..');

// ── Sweep scope ─────────────────────────────────────────────────────────────
// Caregiver-facing: tabs, top-level screens, components, settings entries
// (excluding the visit-prep flow + log forms that mirror clinical fields).
const CAREGIVER_DIRS = [
  'app/(tabs)',
  'app/(onboarding)',
  'app/settings',
  'app/care-plan',
  'app/patient',
  'app/silent-vitals.tsx',
  'app/patient-questions.tsx',
  'app/today-scope.tsx',
  'app/quick-log-more.tsx',
  'app/guide-hub.tsx',
  'components/now',
  'components/journal',
  'components/support',
  'components/today',
  'components/aurora',
  'components/sample',
  'components/watchFor',
];

// Clinical / engineering surfaces — intentionally retain precise vocabulary.
const CLINICAL_PATHS = [
  'services/visitPrepPdf.ts',
  'services/handoffPdf.ts',
  'services/symptomChangeDetection.ts',
  'services/functionalIssueExtraction.ts',
  'services/anomalyDetector.ts',
  'services/medicationChangeTracking.ts',
  'app/visit-prep.tsx',
  'app/care-report.tsx',
  'app/correlation-report.tsx',
  'utils/reportBuilders.ts',
  'utils/devLog.ts',
  'utils/text/composers',
];

const SKIP_PATTERNS = [
  /\.test\.tsx?$/,
  /\.snap$/,
  /\bnode_modules\b/,
];

function isClinical(rel: string): boolean {
  return CLINICAL_PATHS.some((c) => rel === c || rel.startsWith(`${c}${sep}`) || rel.startsWith(`${c}/`));
}

function walk(dir: string, acc: string[] = []): string[] {
  const abs = join(ROOT, dir);
  let entries: string[];
  try {
    entries = readdirSync(abs);
  } catch {
    // Path may be a single file rather than a dir.
    if (statSync(abs).isFile()) acc.push(dir);
    return acc;
  }
  for (const entry of entries) {
    const full = join(abs, entry);
    const relPath = relative(ROOT, full);
    if (SKIP_PATTERNS.some((p) => p.test(relPath))) continue;
    let s;
    try {
      s = statSync(full);
    } catch {
      continue;
    }
    if (s.isDirectory()) {
      walk(relPath, acc);
    } else if (/\.(tsx?|jsx?)$/.test(entry)) {
      acc.push(relPath);
    }
  }
  return acc;
}

function stripCommentsAndStrings(src: string): { code: string; userVisible: string } {
  // Strip block + line comments — banned terms in doc comments quote the
  // rule itself, which would otherwise trip the sweep.
  const code = src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
  // User-visible: keep strings/templates (these are what caregivers see).
  return { code, userVisible: code };
}

function gatherCaregiverFiles(): string[] {
  const all = new Set<string>();
  for (const d of CAREGIVER_DIRS) {
    for (const f of walk(d)) {
      if (!isClinical(f)) all.add(f);
    }
  }
  return [...all];
}

const CAREGIVER_FILES = gatherCaregiverFiles();

// Helper — search for `term` (case-insensitive whole-word) inside string
// literals only (between '...', "...", or `...`). Avoids matching variable
// names or test IDs that happen to contain the term.
function findInStringLiterals(src: string, term: string): string[] {
  const lower = term.toLowerCase();
  const hits: string[] = [];
  const re = /(['"`])((?:\\.|(?!\1).)*?)\1/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    const literal = m[2];
    if (literal.toLowerCase().includes(lower)) hits.push(literal);
  }
  return hits;
}

// ── Forbidden — caregiver surfaces ──────────────────────────────────────────
describe('v6.7 tone audit — forbidden phrasing on caregiver surfaces', () => {
  const forbidden: Array<{ term: string; allowExceptions?: string[] }> = [
    { term: 'great job' },
    { term: 'way to go' },
    { term: 'awesome' },
    { term: 'successfully logged' },
    { term: 'submitted' },
    { term: 'configure hydration target' },
    { term: 'manage settings' },
    { term: 'failing short' },
    { term: 'falling short' },
  ];

  for (const { term } of forbidden) {
    it(`no caregiver-facing string contains "${term}"`, () => {
      const violations: string[] = [];
      for (const file of CAREGIVER_FILES) {
        const src = readFileSync(join(ROOT, file), 'utf8');
        const { code } = stripCommentsAndStrings(src);
        const hits = findInStringLiterals(code, term);
        for (const h of hits) violations.push(`${file}: "${h}"`);
      }
      expect(violations).toEqual([]);
    });
  }
});

// ── Required — vocabulary anchors land where they should ───────────────────
describe('v6.7 tone audit — required vocabulary anchors', () => {
  it('"silent vital signs" appears on the silent-vitals capture surface', () => {
    const src = readFileSync(join(ROOT, 'components/now/SilentVitalsCapture.tsx'), 'utf8');
    expect(src.toLowerCase()).toContain('silent vital signs');
  });

  it('"things to watch for" appears on the watchlist surface', () => {
    const src = readFileSync(join(ROOT, 'app/(onboarding)/screens/WatchForScreen.tsx'), 'utf8');
    expect(src.toLowerCase()).toContain('things to watch for');
  });

  it('skip menu uses "refused" / "too soon" / "other"', () => {
    const src = readFileSync(join(ROOT, 'components/now/SkipReasonSheet.tsx'), 'utf8');
    expect(src.toLowerCase()).toContain('refused');
    expect(src.toLowerCase()).toContain('too soon');
    expect(src.toLowerCase()).toContain('other');
  });

  it('hydration row uses "Goal: N cups" / "—", not target-configuration phrasing', () => {
    const src = readFileSync(join(ROOT, 'components/now/HydrationTodayRow.tsx'), 'utf8');
    expect(src).toMatch(/`Goal: \$\{goal\} cup/);
  });
});

// ── Clinical surfaces — verify they retain precise medical language ─────────
describe('v6.7 tone audit — clinical surfaces keep precise vocabulary', () => {
  it('Visit Prep PDF still references "Adherence" and "Medication"', () => {
    const src = readFileSync(join(ROOT, 'services/visitPrepPdf.ts'), 'utf8');
    expect(src).toContain('Medication Adherence');
  });

  it('Visit Prep PDF disclaimer keeps clinical-precision vocabulary', () => {
    // Phase 5.8.b updated the footer copy to attribute caregiver work and
    // ask for cross-reference with medical history; the precision marker
    // moved from "clinical judgment" to "clinical record" + the
    // cross-reference instruction. Either marker is sufficient — both
    // pin the surface to medical-record vocabulary.
    const src = readFileSync(join(ROOT, 'services/visitPrepPdf.ts'), 'utf8');
    const lower = src.toLowerCase();
    expect(
      lower.includes('clinical judgment') ||
        lower.includes('clinical record'),
    ).toBe(true);
    expect(lower).toContain('cross-reference');
  });
});

// ── Audit-completeness check ────────────────────────────────────────────────
describe('v6.7 tone audit — meta', () => {
  it('the caregiver-file list is non-empty (sweep is actually running)', () => {
    expect(CAREGIVER_FILES.length).toBeGreaterThan(20);
  });
});
