// ============================================================================
// 2_CORE_UX Fix 8 — Complete Inline Med Confirm
//
// Phase 35 Slice 3-D (commit 2/3) — REFRESHED after the unification:
// the parallel Phase-1D undoToast (with its `undoItem` state + the
// separate UI block + direct `updateDailyInstanceStatus(..., 'pending')`
// call) has been RETIRED. handleQuickConfirm now routes through the
// shared `LogToast` pattern (same `setLogToast` state used by
// handleQuickLog and handleQuickSkip) and the canonical
// `undoInstanceCompletion` (storage/carePlanRepo.ts) — single source
// of truth across all four trigger paths, soft-deletes the LogEntry
// per the hide-not-delete standing rule. The pinned shape below
// reflects the unified pattern.
// ============================================================================
//
// Asserts the full wiring path for one-tap medication confirm:
//
//   1. now.tsx defines `handleQuickConfirm` and passes it to <NowTimeline>
//   2. now.tsx routes the post-confirm undo through the unified
//      `LogToast` (setLogToast / dismissLogToast) — NOT the retired
//      `undoItem` / `setUndoItem` pattern
//   3. The toast's onUndo invokes the canonical
//      `undoInstanceCompletion(DEFAULT_PATIENT_ID, today, instance.id)`
//      — NOT the legacy `updateDailyInstanceStatus(..., 'pending')`
//      revert-only call
//   4. TimelineSection's pending-row branch renders a Confirm button
//      for medication (and nutrition) items, with long-press fallback
//      to the full log screen
//   5. Non-medication, non-nutrition items still render the regular
//      "Log" button (no quick confirm path)
//
// Pure structural assertions — runtime behavior is exercised in the
// existing now/TimelineSection rendering tests + the Slice 3-D
// integration round-trip at
// __tests__/integration/logEntrySoftDelete35S3D.test.ts.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

describe('Inline med confirm — now.tsx wiring', () => {
  const src = read('app/(tabs)/now.tsx');

  it('defines handleQuickConfirm via useCallback', () => {
    expect(src).toMatch(/const handleQuickConfirm\s*=\s*useCallback\(async \(instance:/);
  });

  it('handleQuickConfirm calls completeInstance with the correct outcome per item type', () => {
    // Medication branch saves with `taken`; nutrition with `completed` +
    // mealType; everything else defaults to `completed`. Don't pin exact
    // ordering, just verify the three branches exist.
    const start = src.indexOf('const handleQuickConfirm');
    const block = src.slice(start, start + 1500);
    expect(block).toMatch(/itemType === 'medication'/);
    expect(block).toMatch(/completeInstance\([^)]*'taken'/);
    expect(block).toMatch(/itemType === 'nutrition'/);
    expect(block).toMatch(/completeInstance\([^)]*'completed'/);
  });

  it('handleQuickConfirm fires haptic feedback on success', () => {
    expect(src).toMatch(/hapticSuccess\(\)/);
  });

  it('handleQuickConfirm pushes onto the unified LogToast (NOT the retired undoItem state)', () => {
    // Slice 3-D unification: the post-confirm toast is the same
    // setLogToast call used by handleQuickLog / handleQuickSkip.
    // The retired setUndoItem path is gone — the assertion below
    // pins both the new wiring AND its absence.
    const start = src.indexOf('const handleQuickConfirm');
    const block = src.slice(start, start + 1800);
    expect(block).toMatch(/setLogToast\(\s*\{/);
    expect(block).toMatch(/instanceId:\s*instance\.id/);
    expect(block).toMatch(/message:\s*`\$\{instance\.itemName\}\s+confirmed`/);
    expect(block).not.toMatch(/setUndoItem\(/);
  });

  it("handleQuickConfirm's onUndo invokes the canonical undoInstanceCompletion (NOT the legacy updateDailyInstanceStatus revert-only call)", () => {
    // The canonical fn lives in storage/carePlanRepo.ts and does
    // three atomic things: tombstone the LogEntry, clear
    // instance.logId, revert status to 'pending'. The Phase-1D
    // `updateDailyInstanceStatus(..., 'pending')` call survived
    // only on the handleQuickConfirm path pre-3-D; its removal
    // here closes the dual-source-of-truth gap audited in Slice
    // 3-D.
    const start = src.indexOf('const handleQuickConfirm');
    const block = src.slice(start, start + 1800);
    expect(block).toMatch(/onUndo:\s*async\s*\(\)\s*=>\s*\{/);
    expect(block).toMatch(/await\s+undoInstanceCompletion\(\s*DEFAULT_PATIENT_ID\s*,\s*today\s*,\s*instance\.id\s*\)/);
    expect(block).not.toMatch(/updateDailyInstanceStatus\([\s\S]*?'pending'/);
  });

  it('passes onQuickConfirm to <NowTimeline>', () => {
    expect(src).toMatch(/<NowTimeline[\s\S]*?onQuickConfirm=\{handleQuickConfirm\}/);
  });

  it('the Phase-1D undoItem / undoToast wiring is retired (no orphan state, no orphan JSX, no orphan styles)', () => {
    // Forward-guard against accidental reintroduction of the
    // dual undo path. Each branch of the pre-3-D shape should be
    // absent from now.tsx after the unification:
    //   • the useState declaration
    //   • the conditional JSX block
    //   • the style record
    // The shared LogToast pattern owns the surface end-to-end.
    expect(src).not.toMatch(/setUndoItem\(/);
    expect(src).not.toMatch(/const \[undoItem,\s*setUndoItem\]/);
    expect(src).not.toMatch(/\{undoItem && \(/);
    expect(src).not.toMatch(/undoToast: \{/);
  });
});

describe('Inline med confirm — TimelineSection render', () => {
  const src = read('components/now/TimelineSection.tsx');

  it('declares onQuickConfirm in the props interface', () => {
    expect(src).toMatch(/onQuickConfirm\?\:\s*\(instance:\s*any\)\s*=>\s*Promise<void>/);
  });

  it('destructures onQuickConfirm in the component signature', () => {
    expect(src).toMatch(/^\s*onQuickConfirm,\s*$/m);
  });

  it('pending-row branch renders Confirm button for medication or nutrition items when handler is supplied', () => {
    expect(src).toMatch(
      /\(instance\.itemType === 'medication' \|\| instance\.itemType === 'nutrition'\) && onQuickConfirm/,
    );
  });

  it('Confirm onPress calls onQuickConfirm with the instance', () => {
    expect(src).toMatch(/onPress=\{\(\)\s*=>\s*onQuickConfirm\(instance\)\}/);
  });

  it('long-press on the Confirm button falls back to onItemPress (full log screen)', () => {
    expect(src).toMatch(/onLongPress=\{\(\)\s*=>\s*onItemPress\(instance\)\}/);
  });

  it('Confirm button label is "Confirm" for medications and "Logged" for meals', () => {
    expect(src).toMatch(/instance\.itemType === 'medication'\s*\?\s*'Confirm'\s*:\s*'Logged'/);
  });

  it('non-medication, non-nutrition items still render the regular Log button', () => {
    // The fallback branch of the conditional preserves the old logButton
    // shape. Look for the `: (` then a TouchableOpacity with logButton style.
    const confirmIdx = src.indexOf('confirmButtonText');
    const fallbackIdx = src.indexOf(') : (', confirmIdx);
    expect(fallbackIdx).toBeGreaterThan(-1);
    const fallbackBlock = src.slice(fallbackIdx, fallbackIdx + 600);
    expect(fallbackBlock).toContain('styles.logButton');
    expect(fallbackBlock).toContain('Log');
  });

  it('confirmButton style uses the accent token', () => {
    const start = src.indexOf('confirmButton: {');
    const block = src.slice(start, start + 300);
    expect(block).toMatch(/backgroundColor:\s*c\.accent/);
  });
});
