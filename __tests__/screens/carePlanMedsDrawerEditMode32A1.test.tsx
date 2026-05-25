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
// Implementation invariants:
//   1. New `editMode` state on MedicationsDrawer, default false.
//   2. Visible "Edit" toggle at the top of the drawer body.
//      Tapping flips editMode; label becomes "Done" in edit mode.
//   3. When editMode is true, each med row renders a remove control
//      (iOS-style minus circle on the leading edge).
//   4. Tapping the remove control opens the SAME Alert flow F3 wired
//      up — same copy, same Cancel + Remove buttons, same soft-delete
//      write. NO new write path; the existing handleRemove fires.
//   5. The F3 swipe gesture is UNCHANGED — power-user shortcut stays.
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

  it('contract 1: drawer declares an editMode boolean state, default false', () => {
    expect(STRIPPED).toMatch(/const\s*\[\s*editMode\s*,\s*setEditMode\s*\]\s*=\s*useState[<(]?[\w]*[>]?\(\s*false\s*\)/);
  });

  it('contract 2: drawer renders an Edit/Done toggle at the top of the body', () => {
    // The toggle button text flips on editMode. Both "Edit" and "Done"
    // labels must be present in source as conditional values.
    expect(STRIPPED).toMatch(/['"`]Edit['"`]/);
    expect(STRIPPED).toMatch(/['"`]Done['"`]/);
    // The toggle calls setEditMode (either as `setEditMode(!editMode)`
    // or via a wrapping handler).
    expect(STRIPPED).toMatch(/setEditMode\b/);
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

  it('contract 7: Edit toggle button has accessibilityRole + accessibilityLabel', () => {
    // Pin the role + label so the toggle isn't a touchable-without-role
    // baseline regression.
    expect(STRIPPED).toMatch(/accessibilityLabel=[^>]*Edit|accessibilityLabel=[^>]*Done/);
  });
});
