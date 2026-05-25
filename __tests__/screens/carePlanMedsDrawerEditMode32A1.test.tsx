// ============================================================================
// Phase 32A.1 F6 — discoverable Edit-mode (iOS list pattern) on top of F3 swipe.
//
// User-locked at STOP B walk:
//   "swipe-to-Remove works and is non-destructive ... BUT: swipe alone
//    is not discoverable — a caregiver wouldn't know removal exists.
//    Add an 'Edit' control at the top of the Medications drawer (iOS
//    list pattern, familiar to the audience). Tapping Edit reveals a
//    remove control on each med row; tapping it runs the SAME confirm
//    → soft-delete (active=false) flow F3 already built. Swipe stays
//    as the power-user shortcut underneath — we're only adding a
//    visible entry point, not changing the delete logic."
//
// Rationale: audience skews older / less app-fluent / stressed.
// Hidden gestures fail them. Edit/Done is the familiar iOS pattern.
//
// F8 REFRAME (STOP-C visual fix):
//   The Edit / Done toggle MOVED out of the drawer body into the meds
//   header row in app/care-plan/index.tsx — the in-drawer Edit row
//   created a visual gap between header and list that read as two
//   zones. The state lifted with it. Behavior is unchanged; only
//   where the toggle lives changed. The F8 test
//   (carePlanMedsEditInHeader32A1.test.tsx) owns the new architectural
//   pins (state in home, toggle in header row, prop drilling to drawer).
//   The contracts below were updated to:
//     • Drop the drawer-local state pin (now in home; F8 owns it).
//     • Drop the drawer-side toggle render pin (now in home; F8 owns it).
//     • Drop the drawer-side accessibility-label pin (now in home; F8).
//     • Keep the contracts that survive the lift unchanged — drawer
//       receives editMode as a prop, MedRow uses it, single soft-
//       delete site, swipe untouched, no removeMedication.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const DRAWER_PATH = join(ROOT, 'components/careplan/drawers/MedicationsDrawer.tsx');
const drawerSrc = readFileSync(DRAWER_PATH, 'utf8');

function stripComments(s: string): string {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
}

const STRIPPED = stripComments(drawerSrc);

describe('Phase 32A.1 F6 — discoverable Edit-mode (iOS list pattern)', () => {
  // --------------------------------------------------------------------------
  // State + Edit/Done toggle
  // --------------------------------------------------------------------------

  it('contract 1 (F8 reframe): editMode is OWNED by app/care-plan/index.tsx, NOT drawer-local', () => {
    // Pre-F8: pinned drawer-local `useState(false)` for editMode.
    // Post-F8: state lifted to the meds header row's parent (the
    // home screen). Drawer reads it as a prop instead. Pin absence
    // in drawer + presence in home — full state-shape pin lives in
    // carePlanMedsEditInHeader32A1.test.tsx contract 1.
    expect(STRIPPED).not.toMatch(/const\s*\[\s*editMode\s*,\s*setEditMode\s*\]\s*=\s*useState/);
  });

  it('contract 2 (F8 reframe): drawer accepts editMode as a prop (no internal toggle render)', () => {
    // Pre-F8: pinned `Edit` / `Done` text in the drawer body.
    // Post-F8: the toggle moved to the meds header row in
    // app/care-plan/index.tsx (right-aligned, same line as the
    // caret). Drawer just consumes the prop. Full toggle-render
    // pin lives in carePlanMedsEditInHeader32A1.test.tsx contract 5.
    expect(STRIPPED).toMatch(/editMode\s*:\s*boolean/);
    expect(STRIPPED).not.toMatch(/setEditMode\b/);
  });

  // --------------------------------------------------------------------------
  // Edit-mode remove control on each row
  // --------------------------------------------------------------------------

  it('contract 3: MedRow accepts an editMode prop to conditionally render the remove control', () => {
    // The per-row component receives editMode so it can render the
    // leading minus-circle (iOS pattern) when in edit mode.
    expect(STRIPPED).toMatch(/editMode\s*[:?]/);
  });

  it('contract 4: edit-mode remove control fires the SAME handleRemove flow (no duplicate delete path)', () => {
    // The new edit-mode minus must call onRemove(med) — the same prop
    // F3 already wired to the parent's handleRemove (which fires
    // Alert.alert → updateMedication { active: false }). Pin that
    // onRemove is invoked from the remove-control's onPress somewhere
    // gated on editMode, AND that there's no second updateMedication-
    // with-active:false call site introduced.
    expect(STRIPPED).toMatch(/onRemove\s*\(/);
    // Only ONE updateMedication({ active: false }) write across the
    // whole drawer source. F3 + F6 share the handler.
    const matches = (STRIPPED.match(/updateMedication\s*\(\s*[^)]*,\s*\{\s*active\s*:\s*false/g) ?? []);
    expect(matches.length).toBe(1);
  });

  // --------------------------------------------------------------------------
  // F3 swipe path UNCHANGED
  // --------------------------------------------------------------------------

  it('contract 5: F3 swipe-to-Remove gesture is untouched (PanResponder + Animated still present)', () => {
    expect(STRIPPED).toMatch(/PanResponder\.create\s*\(/);
    expect(STRIPPED).toMatch(/<Animated\.View\b/);
    // Alert.alert structure from F3 stays.
    expect(STRIPPED).toMatch(/Alert\.alert\s*\(/);
  });

  // --------------------------------------------------------------------------
  // Non-destructive lock preserved
  // --------------------------------------------------------------------------

  it('contract 6: NO removeMedication anywhere in the drawer (F6 doesn\'t reintroduce hard-delete)', () => {
    expect(STRIPPED).not.toMatch(/\bremoveMedication\b/);
  });

  // --------------------------------------------------------------------------
  // Accessibility
  // --------------------------------------------------------------------------

  it('contract 7 (F8 reframe): Edit toggle a11y label moved to the header row in app/care-plan/index.tsx', () => {
    // Pre-F8: the toggle's accessibilityLabel lived in the drawer.
    // Post-F8: it lives in the home screen header row. The drawer no
    // longer renders that toggle — the only Edit/Done labels remain
    // on the per-row MedRow's minus-circle (its accessibilityLabel
    // reads "Remove {med.name}", different copy). Pin the new
    // location instead of the old.
    const INDEX_SRC = readFileSync(
      join(ROOT, 'app/care-plan/index.tsx'),
      'utf8',
    );
    const INDEX_STRIPPED = stripComments(INDEX_SRC);
    expect(INDEX_STRIPPED).toMatch(/accessibilityLabel=\{medsEditMode\s*\?\s*['"][^'"]*Done[^'"]*['"]\s*:\s*['"][^'"]*Edit[^'"]*['"]\}/);
  });
});
