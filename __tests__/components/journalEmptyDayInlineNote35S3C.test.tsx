// ============================================================================
// Phase 35 Slice 3-C followup (Bug B) — JournalEmptyDay grows an inline
// note input. BEHAVIOR pin.
//
// PRE-FIX BUG (walk-surfaced 2026-06-03): tapping "+ Add a note for this
// day" on the JournalEmptyDay surface set `addNoteMode=true` in the
// parent (app/(tabs)/journal.tsx), which UNMOUNTED the empty-day frame
// and MOUNTED the populated SOAP layout. The note input the caregiver
// expected lived in Section 4 — far below the visible viewport, with
// no autofocus, no scroll-to. User experience: "I tapped a button and
// my input vanished." Same trust class as the silent-failure /
// content-empty PDF bugs earlier in this slice.
//
// USER-LOCKED FIX (option b): inline input WITHIN JournalEmptyDay. The
// affordance promises an input where the caregiver tapped; option b
// honors that literally. Option (a) (scroll-and-focus to Section 4)
// was REJECTED because it introduces the same disorienting motion
// class as the F3.2 scroll jump — the brand is calm/predictable, not
// "now I'm somewhere else."
//
// SINGLE SOURCE OF TRUTH: the inline input writes through the same
// saveConsolidatedNotes → reflectionStorage path JournalNotesCard uses
// in Section 4. The parent passes its handleSaveReflection callback
// as the `onSave` prop. When the caregiver returns to that day later,
// the note shows in JournalNotesCard via getConsolidatedNotes — same
// store, no fork. The integration round-trip is pinned separately at
// __tests__/integration/reflectionRoundTrip35S3C.test.ts (the new
// standing pattern for any "write to storage → read elsewhere" path
// that emerged from this slice's bug class).
//
// CONTRACTS (behavior, not source):
//   1. TAP REVEALS INPUT — tapping "+ Add a note for this day" reveals
//      a TextInput (multiline, autoFocus). The link no longer fires a
//      parent callback that unmounts the whole frame.
//   2. INPUT FEEDS PARENT VIA onSave — typing + tapping the inline
//      Save button invokes the onSave prop with the typed text.
//      onSave is the parent's `handleSaveReflection`, which routes
//      through saveConsolidatedNotes (the single source of truth).
//   3. EMPTY INPUT BLOCKS SAVE — tapping Save with no text (or
//      whitespace-only) does NOT invoke onSave. Prevents accidental
//      empty-note writes.
//   4. SAVE LOCKS DURING WRITE — while onSave is pending, repeated
//      Save taps do NOT fire additional saves. (Slice 3-C earlier
//      taught: any caregiver-initiated trust action gets a visible
//      lock to prevent double-fire.)
// ============================================================================

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      accent: '#5fb88a',
      caregiverAccent: '#aa8adc',
      textPrimary: '#fff',
      textSecondary: '#c4c1b3',
      textTertiary: '#6b7280',
      glass: '#363830',
      glassBorder: 'rgba(255,255,255,0.06)',
    },
  }),
}));

jest.mock('../../theme/theme-tokens', () => ({
  Spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
  Sizing: { cardRadius: 14, cardInternalPadding: 12 },
  Fonts: { serif: 'SourceSerif4_400Regular', serifItalic: 'SourceSerif4_400Regular_Italic' },
}));

jest.mock('../../hooks/useNearbyDaysWithRecords', () => ({
  useNearbyDaysWithRecords: () => [],
}));

// Use the real React Native primitives via @testing-library/react-native's
// transform — the global setup mock is minimal (Platform/Alert/etc only),
// but RNTL ships with its own host-component shim that handles the
// fully-formed render tree. This mirrors the journalShareHeaderActionBehavior
// test's approach (mount the component, simulate fireEvent.press).
jest.mock('react-native', () => {
  const React = require('react');
  const make = (name: string) =>
    React.forwardRef((props: any, ref: any) =>
      React.createElement(name, { ...props, ref }, props.children),
    );
  return {
    View: make('View'),
    Text: make('Text'),
    TextInput: make('TextInput'),
    TouchableOpacity: make('TouchableOpacity'),
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
    Platform: { OS: 'ios', select: (o: any) => o.ios || o.default },
  };
});

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { JournalEmptyDay } from '../../components/journal/JournalEmptyDay';

function renderEmptyDay(overrides: Partial<React.ComponentProps<typeof JournalEmptyDay>> = {}) {
  const props = {
    dateKey: '2026-06-04',
    onSave: jest.fn().mockResolvedValue(undefined),
    onSelectDay: jest.fn(),
    ...overrides,
  };
  const utils = render(<JournalEmptyDay {...(props as any)} />);
  return { ...utils, props };
}

describe('Phase 35 Slice 3-C followup (Bug B) — JournalEmptyDay inline note input', () => {
  it('contract 1 (TAP REVEALS INPUT): tapping "+ Add a note for this day" reveals a TextInput inline, autofocused, multiline', async () => {
    // Pre-fix the tap fired onAddNote which set parent state addNoteMode=true,
    // unmounting the empty-day frame entirely. Post-fix the tap stays
    // INSIDE this component — the link toggles internal inputOpen state
    // and a TextInput renders in its place.
    const { queryByTestId, getByTestId } = renderEmptyDay();
    // Pre-tap: link visible, no inline input yet.
    expect(getByTestId('empty-day-add-note')).toBeTruthy();
    expect(queryByTestId('empty-day-note-input')).toBeNull();

    fireEvent.press(getByTestId('empty-day-add-note'));

    // Post-tap: TextInput rendered with the contract props.
    const input = await waitFor(() => getByTestId('empty-day-note-input'));
    expect(input.props.autoFocus).toBe(true);
    expect(input.props.multiline).toBe(true);
  });

  it('contract 2 (INPUT FEEDS PARENT VIA onSave): typing + tapping Save invokes onSave with the typed text', async () => {
    // The single source of truth — onSave is the parent's
    // handleSaveReflection, which routes through saveConsolidatedNotes.
    // No fork: same store JournalNotesCard writes to.
    const onSave = jest.fn().mockResolvedValue(undefined);
    const { getByTestId } = renderEmptyDay({ onSave });
    fireEvent.press(getByTestId('empty-day-add-note'));
    const input = await waitFor(() => getByTestId('empty-day-note-input'));
    fireEvent.changeText(input, 'Dad seemed off this morning.');
    fireEvent.press(getByTestId('empty-day-note-save'));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1);
    });
    expect(onSave).toHaveBeenCalledWith('Dad seemed off this morning.');
  });

  it('contract 3 (EMPTY INPUT BLOCKS SAVE): tapping Save with empty / whitespace-only text does NOT invoke onSave', async () => {
    // Prevent accidental empty-note writes. The save button can render
    // disabled or simply no-op on whitespace; the assertion is BEHAVIORAL
    // (onSave not called), not visual.
    const onSave = jest.fn().mockResolvedValue(undefined);
    const { getByTestId } = renderEmptyDay({ onSave });
    fireEvent.press(getByTestId('empty-day-add-note'));
    const input = await waitFor(() => getByTestId('empty-day-note-input'));

    // Try saving with empty text.
    fireEvent.press(getByTestId('empty-day-note-save'));
    // Try saving with whitespace-only text.
    fireEvent.changeText(input, '   \n\t   ');
    fireEvent.press(getByTestId('empty-day-note-save'));

    // Give microtasks a chance to flush.
    await new Promise((r) => setTimeout(r, 10));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('contract 4 (SAVE LOCKS DURING WRITE): repeated Save taps while onSave is pending do NOT fire additional saves', async () => {
    // Slice 3-C lesson: any caregiver-initiated trust action gets a
    // visible lock so a double-tap on a slow save doesn't write twice.
    let resolveSave!: () => void;
    const slowSave = jest.fn(() => new Promise<void>((resolve) => { resolveSave = resolve; }));
    const { getByTestId } = renderEmptyDay({ onSave: slowSave });
    fireEvent.press(getByTestId('empty-day-add-note'));
    const input = await waitFor(() => getByTestId('empty-day-note-input'));
    fireEvent.changeText(input, 'A real note.');

    fireEvent.press(getByTestId('empty-day-note-save'));
    fireEvent.press(getByTestId('empty-day-note-save'));
    fireEvent.press(getByTestId('empty-day-note-save'));

    // Still pending: only one fire.
    expect(slowSave).toHaveBeenCalledTimes(1);
    // Release the promise so test cleanup is clean.
    resolveSave();
    await new Promise((r) => setTimeout(r, 10));
  });
});
