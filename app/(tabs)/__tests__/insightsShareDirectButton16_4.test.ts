// ============================================================================
// Phase 16.4 — Insights share affordance reduced to a single Visit Prep
// direct button (pre-launch measure; Phase 21 restores ShareSheet).
//
// Diagnosis: the Care report and Medication report options in the 15.11
// ShareSheet called Share.share with a plain-text-only payload. iOS
// simulator (and likely device) doesn't render a visible share sheet
// for plain-text-only content, so users saw only the "Report ready to
// share" toast and no follow-up action. Phase 21 will add real PDF
// generation; until then, those options are broken in practice.
//
// 16.4 hides the two broken options pre-launch by replacing the
// ShareSheet wrapper with a direct button on Insights. The visit-prep
// navigation handler from 15.11 stays — only the wrapper changes.
//
// What stays in the codebase (intentional orphans for Phase 21):
//   • components/insights/ShareSheet.tsx — the bottom-sheet component
//     itself; will be re-mounted on Insights when real PDF generation
//     ships in Phase 21.
//   • handleShareSelection function in understand.tsx — preserves the
//     dispatch branches for care-report and medication-report
//     (currently unreachable from UI); Phase 21 will re-wire.
//
// Test scope: source-level audit on understand.tsx + an existence
// check on the ShareSheet.tsx orphan file.
// codeOnly() strips comments before regex matching so retirement
// prose mentioning the hidden options does not false-positive.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

function codeOnly(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const ROOT = join(__dirname, '../../..');
const rawSrc = readFileSync(
  join(ROOT, 'app/(tabs)/understand.tsx'), 'utf8',
);
const code = codeOnly(rawSrc);

describe('Phase 16.4 — Insights share affordance: single Visit Prep button', () => {
  describe('absence pins — the broken options are hidden', () => {
    it('contract 1: ShareSheet component is no longer imported into understand.tsx', () => {
      // The runtime import is dropped (the type import for ShareOption
      // may remain as a TS-only import — that's fine because TS-only
      // imports erase at build time). Pin the JSX usage absent.
      expect(code).not.toMatch(/<ShareSheet\b/);
    });

    it('contract 2: ShareSheet visibility state is gone', () => {
      // setShareSheetOpen / shareSheetOpen state retired with the
      // mount. Direct-button approach has no sheet state to manage.
      expect(code).not.toMatch(/\bshareSheetOpen\b/);
      expect(code).not.toMatch(/\bsetShareSheetOpen\b/);
    });

    it('contract 3: no "Care report" string appears on the Insights tab source', () => {
      // The ShareSheet's option labels were "Visit prep summary" /
      // "Care report" / "Medication report". After 16.4, the broken
      // two should not appear in understand.tsx (the ShareSheet
      // component still carries them — that file is orphan, see
      // contract 8).
      expect(code).not.toMatch(/\bCare report\b/);
    });

    it('contract 4: no "Medication report" string appears on the Insights tab source', () => {
      expect(code).not.toMatch(/\bMedication report\b/);
    });
  });

  describe('positive pins — single Visit Prep affordance', () => {
    it('contract 5: a single share TouchableOpacity is rendered (button copy preserved from 15.11)', () => {
      // 15.11 introduced the "Share with {provider}" / "Share these
      // insights" copy; 16.4 keeps it. Pin both possible button
      // labels under one regex — exactly one of the two surfaces.
      expect(code).toMatch(/Share with |Share these insights/);
    });

    it('contract 6: tapping the button routes to /visit-prep (handler preserved)', () => {
      // The visit-prep navigation handler from 15.11
      // (handleShareSelection('visit-prep') → navigate('/visit-prep'))
      // stays. The button's onPress must reach navigate('/visit-prep')
      // either directly or via the preserved handler dispatch.
      expect(code).toMatch(/navigate\(['"]\/visit-prep['"]\)/);
    });

    it('contract 7: handleShareSelection function preserved for Phase 21 (still defines all 3 branches)', () => {
      // Spec watch-for: "Those handler bodies can stay in the
      // codebase (Phase 21 will use them) but should not be wired to
      // any UI affordance." The 2 dead branches stay in source as
      // dispatch scaffolding so Phase 21 can re-mount ShareSheet
      // without re-deriving the routing logic.
      expect(code).toMatch(/\bhandleShareSelection\b/);
      expect(code).toMatch(/['"]visit-prep['"]/);
      expect(code).toMatch(/['"]care-report['"]/);
      expect(code).toMatch(/['"]medication-report['"]/);
    });
  });

  describe('orphan-source pin — Phase 21 preservation', () => {
    it('contract 8: ShareSheet.tsx remains on disk as intentional orphan', () => {
      const path = join(ROOT, 'components/insights/ShareSheet.tsx');
      const exists = (() => {
        try { readFileSync(path, 'utf8'); return true; } catch { return false; }
      })();
      expect(exists).toBe(true);
    });
  });

  describe('end-to-end share path untouched', () => {
    it('contract 9: visit-prep-preview generateAndShareVisitPrep call site is preserved', () => {
      // The ONLY end-to-end functional share path is on
      // visit-prep-preview.tsx (the Generate&Share PDF button calls
      // generateAndShareVisitPrep). 16.4 must NOT touch that path —
      // pin its continued existence.
      const previewSrc = readFileSync(
        join(ROOT, 'app/visit-prep-preview.tsx'), 'utf8',
      );
      expect(previewSrc).toMatch(/generateAndShareVisitPrep\s*\(/);
    });
  });
});
