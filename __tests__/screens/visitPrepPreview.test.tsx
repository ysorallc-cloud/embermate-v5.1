// ============================================================================
// Phase 5.9.d — Visit Prep in-app preview screen.
//
// Source-level contract: the preview screen is the ONLY caller of
// generateAndShareVisitPrep. The config screen's old "Generate PDF" button
// is renamed to "Preview" and navigates to the preview route. Edit
// affordance for "What changed" persists via visitPrepDraftRepo.
// ============================================================================

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const PREVIEW_PATH = join(ROOT, 'app/visit-prep-preview.tsx');

describe('Phase 5.9.d — file contract', () => {
  it('app/visit-prep-preview.tsx exists', () => {
    expect(existsSync(PREVIEW_PATH)).toBe(true);
  });
});

describe('Phase 5.9.d — preview screen source contract', () => {
  const src = existsSync(PREVIEW_PATH) ? readFileSync(PREVIEW_PATH, 'utf8') : '';

  it('exports a default React component', () => {
    expect(src).toMatch(/export\s+default\s+function\s+\w+/);
  });

  it('renders an in-app structured preview using assembleVisitPrepData (Option B)', () => {
    expect(src).toMatch(/from\s+['"][^'"]+visitPrepPdf['"]/);
    expect(src).toMatch(/\bassembleVisitPrepData\b/);
  });

  it('the screen is the only caller of generateAndShareVisitPrep', () => {
    expect(src).toMatch(/\bgenerateAndShareVisitPrep\b/);
  });

  it('renders the canonical section set (header, whatChanged, adherence, vitals, notes, footer)', () => {
    // We pin via render hooks rather than visual content — the screen
    // walks specific data fields. If a section is omitted, this catches it.
    expect(src).toMatch(/data\.whatChanged/);
    expect(src).toMatch(/data\.header\.patientName/);
    expect(src).toMatch(/data\.adherence/);
    expect(src).toMatch(/data\.vitals/);
    expect(src).toMatch(/data\.functionalIssues/);
    expect(src).toMatch(/data\.selectedNotes|data\.journalHighlights/);
    expect(src).toMatch(/data\.patientQuestions/);
    expect(src).toMatch(/data\.footer/);
  });

  it('renders an Edit affordance for the "What changed" section', () => {
    // Either a pencil icon, "Edit" label, or pressable that wraps the
    // observations. Pinned via accessibilityLabel for consistency.
    expect(src).toMatch(/accessibilityLabel=["']Edit what changed["']/i);
  });

  it('saves the edit via saveVisitPrepDraft', () => {
    expect(src).toMatch(/from\s+['"][^'"]+visitPrepDraftRepo['"]/);
    expect(src).toMatch(/saveVisitPrepDraft\s*\(/);
  });

  it('exposes the three action buttons (Generate & share PDF, Adjust toggles, Cancel)', () => {
    expect(src).toMatch(/Generate & share PDF/);
    expect(src).toMatch(/Adjust toggles/);
    expect(src).toMatch(/Cancel/);
  });

  it('Generate & share PDF is the call site of generateAndShareVisitPrep', () => {
    // Locate the Generate button's onPress handler and assert it invokes
    // the share-and-print path. Lenient on the exact handler name.
    expect(src).toMatch(/generateAndShareVisitPrep\s*\(/);
  });

  it('Adjust toggles uses navigateBack (preserves stack-resident config screen state)', () => {
    expect(src).toMatch(/navigateBack\s*\(\s*\)/);
  });
});

describe('Phase 5.9.d — config screen rerouted to preview', () => {
  const configSrc = readFileSync(join(ROOT, 'app/visit-prep.tsx'), 'utf8');

  it('the config screen no longer calls generateAndShareVisitPrep directly', () => {
    // Lifted to the preview screen. A residual import is allowed only
    // for the type symbol VisitPrepConfig — the function-call must be gone.
    expect(configSrc).not.toMatch(/generateAndShareVisitPrep\s*\(/);
  });

  it('the primary button is renamed to "Preview" (not "Generate PDF")', () => {
    expect(configSrc).not.toMatch(/Generate PDF/);
    expect(configSrc).toMatch(/Preview/);
  });

  it('the primary button navigates to /visit-prep-preview', () => {
    expect(configSrc).toMatch(/['"]\/visit-prep-preview['"]/);
  });

  it('the config is stashed before navigation so the preview can read it', () => {
    // We use safeSetItem with a pending-config key. The exact key name
    // is pinned for cross-file integration.
    expect(configSrc).toMatch(/pending_visit_prep_config/);
  });
});

describe('Phase 5.9.d — share-print uniqueness audit guard', () => {
  it('only the preview screen calls generateAndShareVisitPrep', () => {
    // Walk source files; assert no other consumer remains. After 5.9.d,
    // the share path can only fire from the preview screen — no Generate
    // button, no autoshare from anywhere else.
    const SOURCE_DIRS = ['app', 'components', 'services', 'utils', 'storage'];
    const SKIP = new Set(['node_modules', '__tests__', '.git', '.expo']);
    const out: string[] = [];
    function walk(dir: string) {
      try {
        const { readdirSync, statSync } = require('fs');
        for (const name of readdirSync(dir)) {
          if (SKIP.has(name)) continue;
          const full = join(dir, name);
          const s = statSync(full);
          if (s.isDirectory()) walk(full);
          else if (name.endsWith('.ts') || name.endsWith('.tsx')) out.push(full);
        }
      } catch {}
    }
    for (const d of SOURCE_DIRS) walk(join(ROOT, d));

    const offenders: string[] = [];
    for (const f of out) {
      const src = readFileSync(f, 'utf8');
      if (!/\bgenerateAndShareVisitPrep\s*\(/.test(src)) continue;
      const rel = f.replace(ROOT + '/', '');
      // Whitelist: definition site + the new preview screen.
      if (rel === 'services/visitPrepPdf.ts') continue;
      if (rel === 'app/visit-prep-preview.tsx') continue;
      offenders.push(rel);
    }
    expect(offenders).toEqual([]);
  });
});
