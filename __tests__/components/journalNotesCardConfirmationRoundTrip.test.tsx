// ============================================================================
// JournalNotesCard — DEVICE-FACING CONFIRMATION round-trip.
//
// The existing coverage stops one layer short of where the original
// "no visible confirmation" finding lives:
//   • reflectionRoundTrip35S3C (integration) proves the STORAGE
//     pipeline — save → encrypted-at-rest → reload-intact. GREEN.
//   • journalNotesCardPastDaySaveBehavioral31 drives THROUGH the UI
//     (type → tap Save → real persist) but asserts only the storage
//     write. It never checks what the caregiver SEES after save.
//   • journalNotesCardSaveStates mocks useState/useEffect to no-ops,
//     so it inspects a STATIC tree per prop-set and structurally
//     cannot exercise the type→save→just-saved TRANSITION.
//
// THIS FILE closes the device-facing gap. It mounts JournalNotesCard
// under a parent harness that mirrors journal.tsx's REAL handler
// (handleSaveReflection — saveConsolidatedNotes(date,text) THEN
// setReflection(...) which flows back as the savedText prop), then
// asserts the full caregiver-visible contract:
//
//   (a) type into the "Anything to pass along?" input
//   (b) tap Save → real onSave → real persist (no mock of the path)
//   (c) the savedText prop re-renders the note back INTO the card
//   (d) the post-save confirmation fires:
//         • the Save pill reads "✓ Saved"
//         • the a11y live-region announces "Saved" (and is no longer
//           accessibilityElementsHidden)
//
// HAZARD UNDER TEST (the reason (d) might be RED): the component's
// savedText-sync effect (JournalNotesCard.tsx:94-97) runs
// setJustSaved(false) whenever savedText changes — and the REAL
// parent changes savedText INSIDE onSave (handleSaveReflection:438-440).
// handleSave (JournalNotesCard.tsx:121) runs setJustSaved(true) after
// awaiting onSave. So the confirmation flag is set and cleared in the
// same save flow; whether the caregiver actually sees "✓ Saved"
// depends on which write settles last. This test reports the truth.
//
// Real (jest.setup in-memory) AsyncStorage / secure-store / crypto are
// the ONLY mocks on the persist path — consolidatedNotes,
// reflectionStorage, safeStorage, secureStorage all run for real.
// ============================================================================

import React, { useState, useCallback } from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { JournalNotesCard } from '../../components/journal/JournalNotesCard';
import {
  saveConsolidatedNotes,
  getConsolidatedNotes,
} from '../../utils/consolidatedNotes';

const themeColors = {
  glass: 'rgba(255, 245, 220, 0.04)',
  glassBorder: 'rgba(255, 240, 215, 0.10)',
  glassFaint: 'rgba(255, 245, 220, 0.03)',
  textPrimary: '#fff',
  textSecondary: '#c4c1b3',
  textTertiary: '#9aa0a6',
  caregiverAccent: '#aa8adc',
  accent: '#5fb88a',
};

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({ resolvedTheme: 'dark', colors: themeColors }),
}));

jest.mock('react-native', () => {
  const PT = (n: string) => n;
  return {
    View: PT('View'),
    Text: PT('Text'),
    TextInput: PT('TextInput'),
    TouchableOpacity: PT('TouchableOpacity'),
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
  };
});

jest.mock('../../utils/text/primitives', () => ({
  formatTime: () => '8:00 AM',
}));

function findAll(
  root: TestRenderer.ReactTestInstance,
  predicate: (n: any) => boolean,
): TestRenderer.ReactTestInstance[] {
  return root.findAll((n: any) => {
    try { return predicate(n); } catch { return false; }
  });
}

function findTextInput(tree: TestRenderer.ReactTestRenderer) {
  return findAll(tree.root, (n) => n.type === 'TextInput')[0] ?? null;
}

function findSaveButton(tree: TestRenderer.ReactTestRenderer) {
  return findAll(tree.root, (n: any) =>
    n.type === 'TouchableOpacity' &&
    typeof n.props?.accessibilityLabel === 'string' &&
    /save/i.test(n.props.accessibilityLabel),
  )[0] ?? null;
}

function findLiveRegion(tree: TestRenderer.ReactTestRenderer) {
  return findAll(tree.root, (n: any) =>
    n.type === 'Text' && n.props?.accessibilityLiveRegion === 'polite',
  )[0] ?? null;
}

function flattenText(children: any): string {
  if (children == null) return '';
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(flattenText).join('');
  // Recurse into element nodes (e.g. the pill's inner <Text>).
  if (children?.props?.children !== undefined) return flattenText(children.props.children);
  return '';
}

// Read the SETTLED 'saved' vs the TRANSIENT 'just-saved' state off the pill.
// Both render the label "✓ Saved"; they differ by the filled-mint style
// (just-saved/dirty) vs outlined (settled saved). The transient pulse is the
// active "I just saved" confirmation; the settled state is the resting badge.
function pillIsFilled(saveBtn: any): boolean {
  const styles = saveBtn?.props?.style;
  const flat = Object.assign({}, ...(Array.isArray(styles) ? styles : [styles]).filter(Boolean));
  // saveButtonFilled bumps borderWidth to 1 and border alpha to 0.7.
  return flat.borderWidth === 1;
}

async function flushPromises() {
  // Settle the awaited persist + the resulting setState/effect cascade.
  // Several microtask ticks so the parent savedText update AND the child's
  // savedText-sync effect both flush. Real timers — the 3s justSaved
  // auto-clear timer does NOT fire here, so a cleared confirmation can
  // only come from the sync-effect race, not the timeout.
  for (let i = 0; i < 6; i++) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => { await Promise.resolve(); });
  }
}

// Parent harness mirroring journal.tsx exactly: onSave persists via
// saveConsolidatedNotes THEN lifts the saved value into savedText/savedAt
// (the handleSaveReflection → setReflection wiring at journal.tsx:438-440).
function Harness({ date }: { date: string }) {
  const [savedText, setSavedText] = useState<string | undefined>(undefined);
  const [savedAt, setSavedAt] = useState<string | undefined>(undefined);
  const onSave = useCallback(async (text: string) => {
    const saved = await saveConsolidatedNotes(date, text);
    if (saved) {
      setSavedText(saved.text);
      setSavedAt(saved.savedAt);
    }
  }, [date]);
  return React.createElement(JournalNotesCard as any, {
    bare: true,
    date,
    savedText,
    savedAt,
    onSave,
    caregiverName: 'Amber',
  });
}

describe('JournalNotesCard — device-facing confirmation round-trip', () => {
  const DATE = '2026-06-28';
  const TYPED = 'Mom was anxious before her 4pm dose — flag for the night shift.';

  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  async function typeAndSave() {
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(React.createElement(Harness, { date: DATE }));
    });
    const input = findTextInput(tree);
    expect(input).not.toBeNull();
    act(() => { input!.props.onChangeText(TYPED); });

    const saveBtn = findSaveButton(tree);
    expect(saveBtn).not.toBeNull();
    await act(async () => { await saveBtn!.props.onPress(); });
    await flushPromises();
    return tree;
  }

  it('(a)+(b) typing + tapping Save persists through the REAL path (round-trip in storage)', async () => {
    const tree = await typeAndSave();
    // Real persist — not a mock of the path.
    const consolidated = await getConsolidatedNotes(DATE);
    expect(consolidated).not.toBeNull();
    expect(consolidated!.text).toBe(TYPED);
    tree.unmount();
  });

  it('(c) the savedText prop re-renders the note back INTO the card after save', async () => {
    const tree = await typeAndSave();
    const input = findTextInput(tree);
    // After the parent lifts savedText, the card's sync effect mirrors it
    // into the input value — the caregiver sees their note persist in place.
    expect(input!.props.value).toBe(TYPED);
    tree.unmount();
  });

  it('(d-pill-text) the Save pill shows "✓ Saved" after a successful save', async () => {
    const tree = await typeAndSave();
    const saveBtn = findSaveButton(tree);
    // Settled 'saved' AND transient 'just-saved' both render this label,
    // so the WORD is present either way — the sighted caregiver sees "Saved".
    expect(flattenText(saveBtn!.props.children)).toMatch(/✓\s*Saved/);
    tree.unmount();
  });

  it('(d-pill-pulse) the transient just-saved mint pulse fires (filled pill)', async () => {
    const tree = await typeAndSave();
    const saveBtn = findSaveButton(tree);
    // The active confirmation pulse = filled pill (just-saved state). If the
    // pill is outlined (settled 'saved') the caregiver never saw the
    // "just saved" acknowledgement — the save flips straight to resting.
    expect(pillIsFilled(saveBtn)).toBe(true);
    tree.unmount();
  });

  it('(d-a11y) the live-region PROP is set to "Saved" after a successful save', async () => {
    // SCOPE: this verifies the live-region PROP is populated and exposed —
    // NOT that VoiceOver actually announces. Screen-reader support is OUT
    // OF SCOPE for this version (project_accessibility_scope_decision), so
    // this channel is built-and-dormant: the code is wired and pinned here
    // at the prop level, but iOS speaking it is a DEFERRED on-device
    // VoiceOver walk, gated on accessibility coming into scope. Green here
    // ≠ "iOS announces it." The ACTIVE v1 confirmation is (d-pill-pulse).
    const tree = await typeAndSave();
    const live = findLiveRegion(tree);
    expect(live).not.toBeNull();
    expect(flattenText(live!.props.children)).toBe('Saved');
    // And the node is exposed to assistive tech (not hidden) at announce time.
    expect(live!.props.accessibilityElementsHidden).toBe(false);
    tree.unmount();
  });

  // ── BUG-CLASS GUARD ───────────────────────────────────────────────────
  // The reason Option C was chosen over detect-and-suppress (A/B): ANY
  // savedText lift on the same day must be unable to clear an in-window
  // confirmation, not just the one specific post-save echo. This drives
  // the component directly so a SECOND savedText change (a simulated
  // re-lift / external sync on the same day) can be injected after the
  // save. Option C passes; A/B (which suppress only the first matching
  // echo) would let this second lift clear justSaved and fail here.
  it('(guard) a savedText echo AFTER the save (same day) does NOT clear the confirmation; a day-switch still does', async () => {
    const onSave = jest.fn(async () => {}); // confirmation is action-owned; persist path covered above
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(
        React.createElement(JournalNotesCard as any, {
          bare: true, date: DATE, savedText: '', onSave, caregiverName: 'Amber',
        }),
      );
    });

    // Type + save → justSaved true (pulse + announcement live).
    act(() => { findTextInput(tree)!.props.onChangeText(TYPED); });
    await act(async () => { await findSaveButton(tree)!.props.onPress(); });
    await flushPromises();
    expect(flattenText(findLiveRegion(tree)!.props.children)).toBe('Saved');
    expect(pillIsFilled(findSaveButton(tree))).toBe(true);

    // SECOND savedText lift, SAME day (e.g. an external re-sync echoing the
    // saved value back in). Must NOT clear the in-window confirmation.
    await act(async () => {
      tree.update(
        React.createElement(JournalNotesCard as any, {
          bare: true, date: DATE, savedText: TYPED, onSave, caregiverName: 'Amber',
        }),
      );
    });
    await flushPromises();
    expect(flattenText(findLiveRegion(tree)!.props.children)).toBe('Saved'); // survives the echo
    expect(pillIsFilled(findSaveButton(tree))).toBe(true);

    // Genuine DAY-SWITCH (date prop changes) — the stale badge clears.
    await act(async () => {
      tree.update(
        React.createElement(JournalNotesCard as any, {
          bare: true, date: '2026-06-27', savedText: TYPED, onSave, caregiverName: 'Amber',
        }),
      );
    });
    await flushPromises();
    expect(flattenText(findLiveRegion(tree)!.props.children)).toBe(''); // cleared on day-switch
    expect(pillIsFilled(findSaveButton(tree))).toBe(false);

    tree.unmount();
  });
});
