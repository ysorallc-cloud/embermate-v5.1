// ============================================================================
// Phase 32A.1 F8 — visual fix: Edit toggle lifts from drawer to header row.
//
// STOP C walk feedback:
//   "In the Medications drawer, the 'Edit' control sits on its own row
//    BETWEEN the 'Medications' header and the med list, creating too
//    much gap and visually separating header from list (reads as two
//    zones, not one drawer). Move Edit inline to the header row
//    (right-aligned, same line as Medications/caret) ... Meds should
//    tuck directly under the header as one contained unit. Visual-
//    only; don't change the Edit behavior."
//
// Architectural consequence (the only way to render Edit in the header
// row, which lives in care-plan/index.tsx, while the drawer is a
// separate file):
//   - editMode state LIFTS from MedicationsDrawer (where F6 placed it)
//     up to app/care-plan/index.tsx (alongside medsExpanded — the
//     other meds-row UI state already lifted up at F1).
//   - MedicationsDrawer accepts `editMode` as a prop instead of owning
//     it. Drops the internal useState + the Edit/Done toggle render.
//   - care-plan/index.tsx's Medications header row gains a sibling
//     touchable for Edit/Done, gated on (medsExpanded && hasMeds).
//
// Behavior unchanged: same Edit/Done labels, same minus-circle reveal
// on each row, same soft-delete confirmation flow. F3 swipe + F6
// minus tap + F2 active toggle all keep working identically.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const INDEX_SRC = readFileSync(join(ROOT, 'app/care-plan/index.tsx'), 'utf8');
const DRAWER_SRC = readFileSync(
  join(ROOT, 'components/careplan/drawers/MedicationsDrawer.tsx'),
  'utf8',
);

function stripComments(s: string): string {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
}

const INDEX_STRIPPED = stripComments(INDEX_SRC);
const DRAWER_STRIPPED = stripComments(DRAWER_SRC);

describe('Phase 32A.1 F8 — Edit toggle lifts to Medications header row (visual fix)', () => {
  // --------------------------------------------------------------------------
  // State lift — medsEditMode now lives in care-plan/index.tsx
  // --------------------------------------------------------------------------

  it('contract 1: care-plan/index.tsx declares medsEditMode boolean state (default false)', () => {
    expect(INDEX_STRIPPED).toMatch(/const\s*\[\s*medsEditMode\s*,\s*setMedsEditMode\s*\]\s*=\s*useState[<(]?[\w]*[>]?\(\s*false\s*\)/);
  });

  it('contract 2: MedicationsDrawer no longer owns editMode internally (state retired)', () => {
    // The drawer's pre-F8 useState for editMode is gone — the parent
    // owns it now. Pin absence so a future refactor doesn't silently
    // duplicate state.
    expect(DRAWER_STRIPPED).not.toMatch(/const\s*\[\s*editMode\s*,\s*setEditMode\s*\]\s*=\s*useState/);
  });

  it('contract 3: MedicationsDrawer accepts editMode as a prop', () => {
    // The drawer's prop interface declares editMode boolean. The
    // parent (care-plan/index.tsx) controls it via the lifted state;
    // the drawer just reads and threads it through to MedRow.
    expect(DRAWER_STRIPPED).toMatch(/editMode\s*:\s*boolean/);
  });

  // --------------------------------------------------------------------------
  // Edit toggle moves out of the drawer body into the header row
  // --------------------------------------------------------------------------

  it('contract 4: drawer no longer renders an Edit/Done toggle row (visual gap retired)', () => {
    // The pre-F8 editToggleRow + Edit/Done text rendering moved up to
    // the home screen header row. Pin absence in the drawer so a
    // future revert can't silently re-introduce the in-drawer Edit
    // row that created the visual gap STOP C surfaced.
    expect(DRAWER_STRIPPED).not.toMatch(/editToggleRow/);
    // The Edit/Done text rendering also moves out — pin absence.
    // (Comments are stripped already so the file's docstring can
    // still describe the move without false-positiving.)
    expect(DRAWER_STRIPPED).not.toMatch(/['"`]Edit['"`]\s*:\s*['"`]Done['"`]|\?\s*['"`]Done['"`]\s*:\s*['"`]Edit['"`]/);
  });

  it('contract 5: care-plan/index.tsx renders Edit/Done toggle in the meds header zone', () => {
    // Edit + Done text literals must appear in care-plan/index.tsx
    // alongside setMedsEditMode (the toggle handler). Anchor on the
    // JSX call site `setMedsEditMode(...)` (with parens), NOT the
    // useState declaration — the declaration appears earlier in the
    // file and a window around it would miss the actual toggle JSX.
    const idx = INDEX_STRIPPED.search(/setMedsEditMode\s*\(/);
    expect(idx).toBeGreaterThan(-1);
    // 1500-char window around the call — captures the JSX toggle
    // rendering the Edit/Done label.
    const window = INDEX_STRIPPED.slice(
      Math.max(0, idx - 800),
      Math.min(INDEX_STRIPPED.length, idx + 800),
    );
    expect(window).toMatch(/['"`]Edit['"`]/);
    expect(window).toMatch(/['"`]Done['"`]/);
  });

  it('contract 6: Edit toggle visibility is gated on medsExpanded AND meds count > 0', () => {
    // The toggle must only render when (1) the drawer is open (else
    // there's nothing to edit on-screen) and (2) there's at least
    // one med (else there's nothing to edit at all). Pin both gates.
    // Anchor on the JSX call site `setMedsEditMode(...)` (with parens),
    // NOT the useState declaration. The declaration appears earlier
    // in the file; a window around it would miss the actual toggle
    // JSX that renders the Edit/Done label + the visibility gates.
    const idx = INDEX_STRIPPED.search(/setMedsEditMode\s*\(/);
    expect(idx).toBeGreaterThan(-1);
    // 1600-char back window — the meds-count helper / showEditToggle
    // computation sits ~25-30 lines above the JSX call site (inside
    // the map block's prelude); 800 wasn't enough to reach it.
    const window = INDEX_STRIPPED.slice(
      Math.max(0, idx - 1600),
      Math.min(INDEX_STRIPPED.length, idx + 800),
    );
    // medsExpanded gate must be present (visibility tied to drawer
    // open state).
    expect(window).toMatch(/medsExpanded/);
    // A meds-count check — either `.length > 0` against medications,
    // or `medications.length` in a conditional. Accept any pattern
    // that reads "non-empty meds".
    expect(window).toMatch(/medications\??\.length|hasMeds|medsCount/);
  });

  // --------------------------------------------------------------------------
  // Plumbing — care-plan/index.tsx passes editMode down to MedicationsDrawer
  // --------------------------------------------------------------------------

  it('contract 7: care-plan/index.tsx passes editMode prop to <MedicationsDrawer />', () => {
    // The drawer mount receives the lifted state as a prop. Pin the
    // prop forwarding so a future refactor can't silently break the
    // drawer's per-row minus-circle gating.
    expect(INDEX_STRIPPED).toMatch(/<MedicationsDrawer\s[^>]*editMode=\{[^}]*medsEditMode[^}]*\}/);
  });

  // --------------------------------------------------------------------------
  // F6 behavior preserved — minus circles still gated on editMode,
  // single soft-delete handler, no removeMedication anywhere.
  // --------------------------------------------------------------------------

  it('contract 8: MedRow still receives + reads editMode (minus-circle reveal preserved)', () => {
    // F6 wired MedRow to render the leading minus-circle when its
    // editMode prop is true. That contract survives F8 — only the
    // SOURCE of editMode changes (was drawer-local useState, now
    // forwarded from the lifted parent state).
    expect(DRAWER_STRIPPED).toMatch(/editMode\s*&&/);
  });

  it('contract 9: NON-DESTRUCTIVE — still no removeMedication anywhere in the drawer (F8 doesn\'t regress F3/F6)', () => {
    expect(DRAWER_STRIPPED).not.toMatch(/\bremoveMedication\b/);
  });

  it('contract 10: still exactly ONE updateMedication({active:false}) site in the drawer (F6 invariant)', () => {
    // F6 enforced this — one soft-delete write path shared by the
    // swipe Alert and the minus-circle Alert. F8 must not introduce
    // a second site.
    const matches = DRAWER_STRIPPED.match(/updateMedication\s*\(\s*[^)]*,\s*\{\s*active\s*:\s*false/g) ?? [];
    expect(matches.length).toBe(1);
  });
});
