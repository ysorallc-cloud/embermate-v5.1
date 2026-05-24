// ============================================================================
// Phase 32A.1 F4 — quick-add BEHIND the "+ Add medication" affordance.
//
// Q-32A.1.1 lock:
//   "DON'T embed the bulky panel inline. Move quick-add BEHIND the
//    '+ Add medication' affordance: tapping '+ Add' offers the
//    common-med quick path + a 'full form →' escape. Preserves
//    fast-add UX without ~250pt of permanent drawer bulk. If that
//    proves awkward in build, fall back to DROP (all adds via form)
//    — but try behind-the-button first."
//
// Flow:
//   1. Drawer default: list + "+ Add medication" button at bottom
//      (NO quick-add panel visible — drawer stays compact).
//   2. Tap "+ Add medication" → the button row swaps to a quick-add
//      mini-form (common-med picker + dosage + time slot + Add
//      button + "Full form →" escape link).
//   3. Add submit → calls addMedication via useCarePlanConfig; toast
//      confirms; mini-form collapses back to "+ Add medication".
//   4. "Full form →" link → routes to /medication-form?source=careplan
//      (the escape path for richer adds).
//   5. Close/cancel → mini-form collapses without writing.
//
// The subscreen's QuickAddPanel was always-visible-as-collapsible —
// always took drawer real estate. F4's reveal-on-tap pattern keeps
// the drawer compact for the dominant case (user is reading meds,
// not adding).
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

describe('Phase 32A.1 F4 — quick-add behind the + Add medication button', () => {
  // --------------------------------------------------------------------------
  // State — default closed; tap "+ Add" reveals the quick-add mini-form
  // --------------------------------------------------------------------------

  it('contract 1: drawer declares a quickAddOpen boolean state, default false', () => {
    // Default false — drawer stays compact until the user explicitly
    // taps "+ Add medication" to reveal the quick-add panel.
    expect(STRIPPED).toMatch(/const\s*\[\s*quickAddOpen\s*,\s*setQuickAddOpen\s*\]\s*=\s*useState[<(]?[\w]*[>]?\(\s*false\s*\)/);
  });

  it('contract 2: tapping "+ Add medication" toggles quickAddOpen → true', () => {
    // The "+ Add medication" button's onPress now sets the quickAdd
    // open state rather than routing directly to /medication-form.
    // (Routing to /medication-form is now the escape path inside the
    // revealed panel, via "Full form →".)
    expect(STRIPPED).toMatch(/setQuickAddOpen\s*\(\s*true\s*\)/);
  });

  // --------------------------------------------------------------------------
  // Mini-form contents — common-med picker + dosage + time + Add + escape
  // --------------------------------------------------------------------------

  it('contract 3: quick-add mini-form imports COMMON_MEDICATIONS for the picker', () => {
    // Reuse the canonical common-meds list from the medication form
    // helpers — same source the subscreen's QuickAddPanel used + the
    // /medication-form dropdown uses. Single source of truth.
    expect(STRIPPED).toMatch(/COMMON_MEDICATIONS/);
  });

  it('contract 4: quick-add mini-form renders only when quickAddOpen is true', () => {
    // The mini-form is conditional — hidden by default.
    expect(STRIPPED).toMatch(/quickAddOpen\s*&&|quickAddOpen\s*\?/);
  });

  it('contract 5: "Full form →" escape link routes to /medication-form?source=careplan', () => {
    // The escape from the quick-add path. Phrasing must include the
    // ↗ arrow + "Full form" copy — same as the subscreen's panel.
    expect(STRIPPED).toMatch(/Full form/);
    // The destination route is the no-id form.
    expect(STRIPPED).toMatch(/['"`]\/medication-form\?source=careplan['"`]/);
  });

  // --------------------------------------------------------------------------
  // Submit — addMedication call writes the new med inline
  // --------------------------------------------------------------------------

  it('contract 6: Add submit calls addMedication via useCarePlanConfig', () => {
    // The quick-add path writes the new med directly through the
    // existing addMedication hook — no /medication-form roundtrip for
    // the common-med case. Pin the addMedication call site.
    expect(STRIPPED).toMatch(/addMedication\s*\(/);
  });

  // --------------------------------------------------------------------------
  // Toast confirmation on success
  // --------------------------------------------------------------------------

  it('contract 7: a toast/confirmation surface fires after a successful add', () => {
    // The subscreen used a setToastMessage / setToastVisible pair.
    // F4 can implement toast feedback any way that surfaces post-add
    // confirmation — a useState-driven message + visible bool, an
    // event emit, or similar. Pin the presence of either pattern.
    expect(STRIPPED).toMatch(/toast|Toast/);
  });

  // --------------------------------------------------------------------------
  // Cancel / close — return to compact state without writing
  // --------------------------------------------------------------------------

  it('contract 8: a close/cancel affordance returns quickAddOpen → false', () => {
    // The mini-form must be dismissable without submitting. Pin
    // setQuickAddOpen(false) being called somewhere reachable from
    // the panel (a Cancel button, a close X, or onClose handler).
    expect(STRIPPED).toMatch(/setQuickAddOpen\s*\(\s*false\s*\)/);
  });
});
