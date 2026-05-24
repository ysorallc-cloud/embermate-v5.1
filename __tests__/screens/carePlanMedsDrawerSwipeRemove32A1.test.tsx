// ============================================================================
// Phase 32A.1 F3 — swipe-to-Remove with soft-delete (Q-32A.1 lock).
//
// Brief (user-locked this session):
//   "swipe reveals a labeled 'Remove' button + confirmation — NOT
//    swipe-to-instant-delete (accidental swipe on a med is high-stakes).
//    And 'remove' should mark inactive / preserve history, not hard-
//    delete the record, so past handoffs keep it."
//
// Flow:
//   1. User swipes the row left → reveals a "Remove" labeled button
//      behind it (PanResponder + Animated translateX).
//   2. Tap "Remove" → Alert.alert confirmation surface.
//   3. Confirm → updateMedication(med.id, { active: false }) — SOFT-
//      DELETE. The record stays in storage; daily-instance generation
//      skips it; handoff/history reads still see it. Same effect as
//      the Switch toggle (Q-32A.1.5) but via a more deliberate
//      gesture path.
//   4. Cancel → close the swipe (row returns to position); no write.
//
// Critical non-destructive pin: NO removeMedication call in the
// drawer source. That was the subscreen's behavior (hard-delete);
// 32A.1 retires it in favor of the soft-delete path.
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

describe('Phase 32A.1 F3 — swipe-to-Remove gesture (soft-delete via active=false)', () => {
  // --------------------------------------------------------------------------
  // Gesture mechanics — PanResponder + Animated translateX
  // --------------------------------------------------------------------------

  it('contract 1: imports PanResponder + Animated from react-native', () => {
    expect(STRIPPED).toMatch(/import\s*\{[^}]*\bPanResponder\b[^}]*\}\s*from\s*['"]react-native['"]/);
    expect(STRIPPED).toMatch(/import\s*\{[^}]*\bAnimated\b[^}]*\}\s*from\s*['"]react-native['"]/);
  });

  it('contract 2: per-row PanResponder is created (one gesture handler per med row)', () => {
    expect(STRIPPED).toMatch(/PanResponder\.create\s*\(/);
  });

  it('contract 3: Animated.View wraps the row body so translateX reveals the action behind it', () => {
    expect(STRIPPED).toMatch(/<Animated\.View\b/);
  });

  // --------------------------------------------------------------------------
  // Remove button — labeled, NOT swipe-to-instant-delete
  // --------------------------------------------------------------------------

  it('contract 4: a "Remove" labeled button renders behind the swipe (NOT instant-delete)', () => {
    // The button itself must have a Remove label/accessibility text;
    // tapping it (not the swipe gesture) triggers the action.
    expect(STRIPPED).toMatch(/<Text[^>]*>\s*Remove\s*<\/Text>|accessibilityLabel=["'][^"']*Remove[^"']*["']/);
  });

  // --------------------------------------------------------------------------
  // Confirmation — Alert.alert before any write
  // --------------------------------------------------------------------------

  it('contract 5: Remove button taps fire Alert.alert before any storage write', () => {
    // The subscreen wrapped the destructive action in Alert.alert with
    // Cancel + Remove buttons. F3 preserves the confirmation step;
    // tap-to-Remove must not bypass it.
    expect(STRIPPED).toMatch(/Alert\.alert\s*\(/);
  });

  // --------------------------------------------------------------------------
  // CRITICAL — soft-delete only. NO removeMedication call anywhere.
  // --------------------------------------------------------------------------

  it('contract 6 (NON-DESTRUCTIVE LOCK): drawer does NOT call removeMedication anywhere', () => {
    // Q-32A.1 lock — Remove should mark inactive, not hard-delete.
    // The subscreen's removeMedication path is retired entirely; only
    // the soft-delete (updateMedication { active: false }) survives.
    expect(STRIPPED).not.toMatch(/\bremoveMedication\b/);
  });

  it('contract 7: Remove confirmation writes via updateMedication with active: false', () => {
    // The destructive confirmation must call updateMedication setting
    // active=false. Same write the Switch toggle uses; the gesture
    // path differs (deliberate swipe + confirm) but the storage write
    // is identical.
    expect(STRIPPED).toMatch(/updateMedication\s*\([^)]*,\s*\{\s*active\s*:\s*false/);
  });

  // --------------------------------------------------------------------------
  // Alert structure — Cancel + Remove buttons
  // --------------------------------------------------------------------------

  it('contract 8: Alert.alert offers a Cancel button (no-op) alongside the Remove button', () => {
    // The Alert structure surfaces a Cancel that closes the swipe
    // without writing. Pin both button labels (Cancel + Remove)
    // present in the Alert text — they're the two-option destructive
    // dialog pattern this codebase used in the subscreen.
    expect(STRIPPED).toMatch(/text:\s*['"]Cancel['"]/);
    // The Remove button inside the Alert (could be `text: 'Remove'`
    // or similar destructive-styled button).
    expect(STRIPPED).toMatch(/text:\s*['"]Remove['"]/);
  });
});
