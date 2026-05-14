// ============================================================================
// Phase 23.2 F3 — patient-name fallback consolidation.
//
// Pre-23.2 the literal "your loved one" was split across capitalization:
//   • Lowercase: Now, Understand, care-plan/*, patient/, onboarding,
//                NowHeader, PatientSwitcherModal, useActivePatientName,
//                insightsSubtitle (all inline literals or named constants).
//   • Titlecase: HandoffSheet (NAME_FALLBACK), journalSubtitle
//                (NAME_FALLBACK), handoffParagraph (NAME_FALLBACK).
//
// The audit confirmed the canonical form is lowercase ("your loved one").
// Phase 23.2 introduces a single canonical constant
// (`utils/lovedOneFallback.ts` exporting `LOVED_ONE_FALLBACK`) and routes
// the three known titlecase NAME_FALLBACK consumers through it. Inline
// lowercase literals in screen files are left in place for a future
// cleanup pass (they're already correct).
//
// Pinned contracts:
//   1. The canonical module exports LOVED_ONE_FALLBACK === 'your loved one'.
//   2. The three previously-titlecase consumers (HandoffSheet,
//      journalSubtitle, handoffParagraph) import the canonical constant
//      and no longer define a local NAME_FALLBACK = 'Your loved one'.
//   3. The titlecase string "Your loved one" does not appear as a
//      *fallback constant value* in any of the three consumers — pin
//      against the most likely re-introduction shape.
// ============================================================================

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const CANONICAL_PATH = join(ROOT, 'utils/lovedOneFallback.ts');

const TARGETS = [
  { name: 'HandoffSheet',     path: join(ROOT, 'components/journal/HandoffSheet.tsx') },
  { name: 'journalSubtitle',  path: join(ROOT, 'utils/journalSubtitle.ts') },
  { name: 'handoffParagraph', path: join(ROOT, 'utils/text/composers/handoffParagraph.ts') },
];

function strip(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('Phase 23.2 F3 — patient-name fallback consolidation', () => {
  it('contract 1: utils/lovedOneFallback.ts exists and exports LOVED_ONE_FALLBACK === "your loved one"', () => {
    expect(existsSync(CANONICAL_PATH)).toBe(true);
    const src = readFileSync(CANONICAL_PATH, 'utf8');
    expect(src).toMatch(/export\s+const\s+LOVED_ONE_FALLBACK\s*=\s*['"]your loved one['"]/);
  });

  it('contract 2: LOVED_ONE_FALLBACK is the runtime-exported lowercase string', () => {
    // Behavioural pin: import the module and check the runtime value.
    // Defends against e.g. a future rename to "Your loved one" via
    // refactor tools that don't update the test regex.
    const mod = require('../../utils/lovedOneFallback');
    expect(mod.LOVED_ONE_FALLBACK).toBe('your loved one');
  });

  TARGETS.forEach(({ name, path }) => {
    describe(`consumer: ${name}`, () => {
      const src = existsSync(path) ? readFileSync(path, 'utf8') : '';
      const stripped = strip(src);

      it('imports LOVED_ONE_FALLBACK from utils/lovedOneFallback', () => {
        expect(stripped).toMatch(/from\s+['"][^'"]*lovedOneFallback['"]/);
        const importBlock = stripped.match(
          /import\s*\{[^}]*\}\s*from\s*['"][^'"]*lovedOneFallback['"]/,
        );
        expect(importBlock).toBeTruthy();
        expect(importBlock![0]).toMatch(/LOVED_ONE_FALLBACK/);
      });

      it('does not define a local NAME_FALLBACK = "Your loved one" constant', () => {
        // The pre-23.2 pattern. Catch reintroduction at the most common
        // shape (const declaration with the titlecase string).
        expect(stripped).not.toMatch(
          /const\s+NAME_FALLBACK\s*=\s*['"]Your loved one['"]/,
        );
      });

      it('does not contain the titlecase "Your loved one" literal as content', () => {
        // After consolidation, the only correct usage is the lowercase
        // canonical constant. The titlecase form should not appear in
        // these three files at all.
        expect(stripped).not.toMatch(/['"]Your loved one['"]/);
      });
    });
  });
});
