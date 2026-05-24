// ============================================================================
// Phase 32A.1 F1 — Medications-as-drawer (skeleton + caret + outside-accordion).
//
// 32A scoped meds out ("no visual changes to /care-plan/meds") so Medications
// is the lone inconsistent row on Care Plan home: it has an inline list AND
// a chevron-navigate header that routes to a separate `/care-plan/meds` list
// (redundant — two paths to the same meds). 32A.1 makes Medications behave
// like the other rows: the header taps to expand/collapse a drawer INLINE.
//
// Locks (from this session's audit):
//   - Q-32A.1.2 / 1.3: Medications OUTSIDE the accordion — always shown,
//     independent state. Other 7 drawers keep their one-at-a-time accordion.
//     `medsExpanded` is a SEPARATE state variable from `expandedBucket`.
//   - Default state: open (always-shown semantic — caregiver sees meds
//     immediately on opening Care Plan).
//   - The retired `handleConfigureBucket('meds')` chevron-navigate path
//     goes away. Tap on row toggles `medsExpanded`; nothing navigates to
//     /care-plan/meds from this surface.
//
// F1 scope: row behavior swap + state wiring + caret indicator. The drawer
// BODY (per-row active toggle, swipe-to-remove, quick-add, etc.) lands in
// Slice B (F2-F5). For F1, the existing F4 inline list rendering stays and
// is gated on `medsExpanded`. F2 starts the drawer-component refactor.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const SRC = readFileSync(join(ROOT, 'app/care-plan/index.tsx'), 'utf8');

// Strip comments so structural assertions don't false-positive on
// commentary that names retired symbols by history.
function stripComments(s: string): string {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
}

const STRIPPED = stripComments(SRC);

describe('Phase 32A.1 F1 — Medications row converts to expand/caret', () => {
  // --------------------------------------------------------------------------
  // State — medsExpanded is a separate boolean useState (outside accordion)
  // --------------------------------------------------------------------------

  describe('contract 1: medsExpanded state — separate from accordion, defaults to open', () => {
    it('declares a useState<boolean>(true) for medsExpanded (or equivalent setter pair)', () => {
      // The default-open lock means useState's initial value is `true`.
      // Match the destructured-tuple form: `[medsExpanded, setMedsExpanded] = useState(true)`.
      expect(STRIPPED).toMatch(/const\s*\[\s*medsExpanded\s*,\s*setMedsExpanded\s*\]\s*=\s*useState[<(]?[\w]*[>]?\(\s*true\s*\)/);
    });

    it('medsExpanded is NOT typed as part of the expandedBucket accordion union', () => {
      // The accordion is `expandedBucket: BucketType | null`. medsExpanded
      // must be its own variable (typically `boolean`), not folded into a
      // multi-bucket state shape. Pin that no destructure mixes the two.
      expect(STRIPPED).not.toMatch(/medsExpanded.*expandedBucket|expandedBucket.*medsExpanded/);
    });
  });

  // --------------------------------------------------------------------------
  // Row behavior — tap toggles medsExpanded, NOT handleConfigureBucket
  // --------------------------------------------------------------------------

  describe('contract 2: Medications row taps toggle medsExpanded — does NOT navigate to /care-plan/meds', () => {
    it('the ALWAYS_ON_BUCKETS render block wires the meds-row onPress to a meds-expand handler (not handleConfigureBucket)', () => {
      // Pull a window around the ALWAYS_ON_BUCKETS render block. The
      // meds-row's onPress must invoke EITHER setMedsExpanded directly
      // OR a named meds-expand handler (e.g. handleToggleMedsExpanded)
      // that wraps it. The pre-32A.1 onPress was
      // `handleConfigureBucket(bucket)` which routed to /care-plan/meds —
      // forbid that pattern on this row.
      const idx = STRIPPED.search(/ALWAYS_ON_BUCKETS\.map/);
      expect(idx).toBeGreaterThan(-1);
      const window = STRIPPED.slice(idx, idx + 1500);
      expect(window).toMatch(/setMedsExpanded\b|handleToggleMedsExpanded\b/);
      // And NO handleConfigureBucket invocation on the meds row.
      expect(window).not.toMatch(/onPress=\{[^}]*handleConfigureBucket/);
    });

    it('the meds branch of handleConfigureBucket no longer routes to /care-plan/meds (the list)', () => {
      // The function may stay for non-meds row taps, but the meds case
      // is structurally retired — no navigate('/care-plan/meds') call
      // remains in the source. (The form route /medication-form is a
      // SEPARATE path that survives untouched.)
      expect(STRIPPED).not.toMatch(/navigate\(\s*['"`]\/care-plan\/meds['"`]\s*\)/);
    });
  });

  // --------------------------------------------------------------------------
  // Caret indicator — reflects expanded state instead of pure navigate-chevron
  // --------------------------------------------------------------------------

  describe('contract 3: row shows a caret-style indicator tied to medsExpanded', () => {
    it('the meds-row render references medsExpanded for its indicator (not a static chevron)', () => {
      // The indicator chooses caret-up/caret-down (or rotates) based on
      // medsExpanded. Search the ALWAYS_ON_BUCKETS block window for a
      // medsExpanded-conditional indicator expression.
      const idx = STRIPPED.search(/ALWAYS_ON_BUCKETS\.map/);
      const window = STRIPPED.slice(idx, idx + 1500);
      // Either a ternary on medsExpanded, or a transform/rotate, or a
      // conditional unicode glyph selection.
      expect(window).toMatch(/medsExpanded\s*\?|medsExpanded\s*&&/);
    });
  });

  // --------------------------------------------------------------------------
  // Drawer mount — list rendering gated on medsExpanded
  // --------------------------------------------------------------------------

  describe('contract 4: meds drawer mount is gated on medsExpanded', () => {
    it('the <MedicationsDrawer /> mount is conditional on medsExpanded (F2 reframe — testID moved into the component file)', () => {
      // Pre-32A.1 F2: the inline list with testID="meds-inline-list"
      // lived directly in care-plan/index.tsx; F1 gated it on
      // medsExpanded. F2 extracted the list into MedicationsDrawer.tsx,
      // so the testID now lives in the component. The gate moved with
      // it — `{medsExpanded && <MedicationsDrawer />}`.
      const idx = STRIPPED.search(/<MedicationsDrawer\b/);
      expect(idx).toBeGreaterThan(-1);
      // 200-char window before the JSX captures the conditional.
      const before = STRIPPED.slice(Math.max(0, idx - 200), idx);
      expect(before).toMatch(/medsExpanded\s*&&|medsExpanded\s*\?/);
    });
  });

  // --------------------------------------------------------------------------
  // Accordion isolation — medsExpanded change does NOT affect expandedBucket
  // --------------------------------------------------------------------------

  describe('contract 5: medsExpanded is INDEPENDENT of expandedBucket (outside accordion)', () => {
    // Helper — extract the body of a useCallback-arrow declared as
    // `const <name> = useCallback(...)`. Returns the substring between
    // the opening `(` and the matching closing `)` so the body's brace
    // counting can find a clean range. We use a simple paren-depth walk
    // anchored on the declaration; sufficient for the well-formed
    // handlers in care-plan/index.tsx without bringing in a parser.
    function extractCallback(src: string, name: string): string | null {
      const decl = src.search(new RegExp(`const\\s+${name}\\s*=\\s*useCallback\\s*\\(`));
      if (decl < 0) return null;
      const openParen = src.indexOf('(', decl);
      if (openParen < 0) return null;
      let depth = 0;
      for (let i = openParen; i < src.length; i++) {
        if (src[i] === '(') depth++;
        else if (src[i] === ')') {
          depth--;
          if (depth === 0) return src.slice(openParen + 1, i);
        }
      }
      return null;
    }

    it('handleToggleMedsExpanded body does NOT call setExpandedBucket', () => {
      const body = extractCallback(STRIPPED, 'handleToggleMedsExpanded');
      expect(body).not.toBeNull();
      expect(body!).not.toMatch(/setExpandedBucket\b/);
    });

    it('handleToggleBucket body does NOT call setMedsExpanded (accordion flow leaves meds alone)', () => {
      const body = extractCallback(STRIPPED, 'handleToggleBucket');
      expect(body).not.toBeNull();
      expect(body!).not.toMatch(/setMedsExpanded\b/);
    });

    it('handleConfigureBucket body does NOT call setMedsExpanded (accordion flow leaves meds alone)', () => {
      const body = extractCallback(STRIPPED, 'handleConfigureBucket');
      expect(body).not.toBeNull();
      expect(body!).not.toMatch(/setMedsExpanded\b/);
    });
  });
});
