// ============================================================================
// Phase 31 F3 follow-up — BEHAVIORAL round-trip for past-day notes save.
//
// Companion to journalNotesCardPastDaySave31.test.tsx (source-level pin).
// That pin asserts the Save TouchableOpacity is in the rendered tree
// but never taps it, so it would still pass if onSave were wired to
// nothing. This test closes the "green test, broken screen" gap by
// driving THROUGH the UI: tap the Save pill, observe the persist
// effect through real (jest-mocked AsyncStorage) reflectionStorage.
//
// The parent's onSave handler is the one in journal.tsx — it routes
// to saveConsolidatedNotes(selectedDate, text). The test simulates
// that exact wiring so a regression in either the pill render or the
// onSave chain surfaces as a missing storage write.
//
// Pinned contracts:
//   1. PAST DATE (bare + readOnly) — typing into the TextInput and
//      tapping the Save pill writes text + savedAt to that date's
//      reflectionStorage key (NOT today's key, NOT any other date).
//   2. PAST DATE — getConsolidatedNotes for the same date reads back
//      exactly the typed text (round-trip integrity).
//   3. PAST DATE — savedAt is a fresh ISO 8601 timestamp after save.
//   4. TODAY regression — the same tap-to-save flow with
//      readOnly={false} also writes to today's key.
// ============================================================================

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { JournalNotesCard } from '../../components/journal/JournalNotesCard';
import {
  getConsolidatedNotes,
  saveConsolidatedNotes,
} from '../../utils/consolidatedNotes';
import { getReflection } from '../../storage/reflectionStorage';

const themeColors = {
  glass: 'rgba(255, 245, 220, 0.04)',
  glassBorder: 'rgba(255, 240, 215, 0.10)',
  glassFaint: 'rgba(255, 245, 220, 0.03)',
  textPrimary: '#fff',
  textSecondary: '#c4c1b3',
  textTertiary: '#9aa0a6',
  caregiverAccent: '#aa8adc',
  accent: '#5fb88a',
  amber: '#e5b04a',
  green: '#5fb88a',
  greenTint: 'rgba(95, 184, 138, 0.10)',
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
  predicate: (n: TestRenderer.ReactTestInstance) => boolean,
): TestRenderer.ReactTestInstance[] {
  return root.findAll((n: any) => {
    try { return predicate(n); } catch { return false; }
  });
}

function findTextInput(tree: TestRenderer.ReactTestRenderer): TestRenderer.ReactTestInstance | null {
  const hits = findAll(tree.root, (n) => n.type === 'TextInput');
  return hits[0] ?? null;
}

function findSaveButton(tree: TestRenderer.ReactTestRenderer): TestRenderer.ReactTestInstance | null {
  const hits = findAll(tree.root, (n: any) =>
    n.type === 'TouchableOpacity' &&
    typeof n.props?.accessibilityLabel === 'string' &&
    /save/i.test(n.props.accessibilityLabel),
  );
  return hits[0] ?? null;
}

async function flushPromises() {
  // Two ticks: handleSave awaits onSave, then setJustSaved + setSaving fire.
  await act(async () => { await Promise.resolve(); });
  await act(async () => { await Promise.resolve(); });
}

describe('Phase 31 F3 follow-up — past-day notes save BEHAVIORAL round-trip', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('contract 1+2+3: PAST DATE — typing + tapping Save writes to the past date\'s reflectionStorage key and round-trips through getConsolidatedNotes', async () => {
    const PAST_DATE = '2026-05-19';
    const TODAY = '2026-05-22';
    const TYPED = 'Dad seemed off this morning — flagging it.';

    // Sanity precondition: no entries for either date.
    expect(await getConsolidatedNotes(PAST_DATE)).toBeNull();
    expect(await getConsolidatedNotes(TODAY)).toBeNull();

    // Parent's onSave handler — exact wiring journal.tsx uses
    // (saveConsolidatedNotes keyed by selectedDate).
    const onSave = jest.fn(async (text: string) => {
      await saveConsolidatedNotes(PAST_DATE, text);
    });

    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(
        React.createElement(JournalNotesCard as any, {
          date: PAST_DATE,
          savedText: '',
          onSave,
          bare: true,
          readOnly: true, // ← past-date simulation
          caregiverName: 'Amber',
        }),
      );
    });

    // Simulate user typing into the TextInput. TestRenderer doesn't
    // synthesize input events, so we call the onChangeText prop
    // directly — this is the same callback the real RN bridge fires
    // on keystroke. The bug class we're guarding against is "pill
    // renders but onSave isn't wired"; calling onChangeText drives
    // the component into its dirty state so the disabled gate clears.
    const input = findTextInput(tree);
    expect(input).not.toBeNull();
    act(() => {
      input!.props.onChangeText(TYPED);
    });

    // Tap the Save pill. With the F3-follow-up fix in place, this
    // button exists on past dates AND its onPress fires handleSave →
    // onSave → saveConsolidatedNotes(PAST_DATE, text).
    const saveBtn = findSaveButton(tree);
    expect(saveBtn).not.toBeNull();
    await act(async () => {
      await saveBtn!.props.onPress();
    });
    await flushPromises();

    // onSave was called once with the typed text.
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith(TYPED);

    // Storage round-trip — past date key holds the typed text.
    const consolidated = await getConsolidatedNotes(PAST_DATE);
    expect(consolidated).not.toBeNull();
    expect(consolidated!.text).toBe(TYPED);

    // savedAt is a fresh ISO timestamp.
    expect(consolidated!.savedAt).toBeTruthy();
    expect(typeof consolidated!.savedAt).toBe('string');
    const t = Date.parse(consolidated!.savedAt as string);
    expect(Number.isFinite(t)).toBe(true);
    // Within the last 60 seconds (test runtime is well under).
    expect(Date.now() - t).toBeLessThan(60_000);

    // The underlying reflectionStorage entry is keyed to PAST_DATE.
    const stored = await getReflection(PAST_DATE);
    expect(stored).not.toBeNull();
    expect(stored!.date).toBe(PAST_DATE);
    expect(stored!.text).toBe(TYPED);

    // Today's key was NOT touched.
    expect(await getReflection(TODAY)).toBeNull();
  });

  it('contract 4: TODAY regression — same tap-to-save flow with readOnly={false} writes to today\'s key', async () => {
    const TODAY = '2026-05-22';
    const TYPED = 'Today went smoothly — meds on time, ate a full lunch.';

    const onSave = jest.fn(async (text: string) => {
      await saveConsolidatedNotes(TODAY, text);
    });

    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(
        React.createElement(JournalNotesCard as any, {
          date: TODAY,
          savedText: '',
          onSave,
          bare: true,
          readOnly: false, // ← today
          caregiverName: 'Amber',
        }),
      );
    });

    const input = findTextInput(tree);
    expect(input).not.toBeNull();
    act(() => {
      input!.props.onChangeText(TYPED);
    });

    const saveBtn = findSaveButton(tree);
    expect(saveBtn).not.toBeNull();
    await act(async () => {
      await saveBtn!.props.onPress();
    });
    await flushPromises();

    expect(onSave).toHaveBeenCalledWith(TYPED);

    const consolidated = await getConsolidatedNotes(TODAY);
    expect(consolidated).not.toBeNull();
    expect(consolidated!.text).toBe(TYPED);
    expect(consolidated!.savedAt).toBeTruthy();
  });
});
