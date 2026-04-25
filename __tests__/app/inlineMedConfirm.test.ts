// ============================================================================
// 2_CORE_UX Fix 8 — Complete Inline Med Confirm
// ============================================================================
//
// Asserts the full wiring path for one-tap medication confirm + undo toast:
//
//   1. now.tsx defines `handleQuickConfirm` and passes it to <TimelineSection>
//   2. now.tsx renders the undo toast bound to `undoItem` state
//   3. TimelineSection's pending-row branch renders a Confirm button for
//      medication (and nutrition) items, with long-press fallback to the
//      full log screen
//   4. Non-medication, non-nutrition items still render the regular "Log"
//      button (no quick confirm path)
//
// Pure structural assertions — runtime behavior is exercised in the
// existing now/TimelineSection rendering tests.
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

  it('handleQuickConfirm sets undoItem state with the instance name', () => {
    expect(src).toMatch(/setUndoItem\(\{\s*id: instance\.id,\s*name: instance\.itemName\s*\}\)/);
  });

  it('passes onQuickConfirm to <NowTimeline>', () => {
    expect(src).toMatch(/<NowTimeline[\s\S]*?onQuickConfirm=\{handleQuickConfirm\}/);
  });

  it('undoItem state is declared with id + name shape', () => {
    expect(src).toMatch(/useState<\{\s*id:\s*string;\s*name:\s*string\s*\}\s*\|\s*null>\(null\)/);
  });

  it('renders the undo toast at the bottom of the screen when undoItem is set', () => {
    expect(src).toMatch(/\{undoItem && \(\s*<View style=\{styles\.undoToast\}>/);
    expect(src).toMatch(/\{undoItem\.name\} confirmed/);
  });

  it('undo toast button reverts the instance status to pending', () => {
    // Multi-line call shape:
    //   updateDailyInstanceStatus(
    //     DEFAULT_PATIENT_ID, today, item.id, 'pending'
    //   )
    // The closing ')' lives on its own indented line, so allow whitespace
    // between the literal and the close paren.
    expect(src).toMatch(/updateDailyInstanceStatus\([\s\S]*?'pending'\s*\)/);
  });

  it('undo toast styles position above the tab bar', () => {
    const start = src.indexOf('undoToast: {');
    const block = src.slice(start, start + 400);
    expect(block).toMatch(/position:\s*['"]absolute['"]/);
    expect(block).toMatch(/bottom:\s*\d+/);
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
