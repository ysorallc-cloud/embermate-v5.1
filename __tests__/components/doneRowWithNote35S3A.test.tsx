// ============================================================================
// Phase 35 Slice 3-A — DoneRowWithNote (Now tab done-row "View note"
// affordance) BEHAVIOR pin.
//
// Surface: a wrapper component that lives inside TimelineSection's
// completed/skipped row rendering. When the row has an associated
// LogEntry with notes?.trim().length > 0, the wrapper makes the WHOLE
// ROW tappable, renders a chevron next to the row's existing chrome
// as the visual cue (Q-3A.6 lock — option 2: whole row tappable,
// chevron visible ONLY when notes exist; rows without notes
// unchanged). Tap expands the note inline below the row (Q-3A.8 lock
// — no modal, no scroll motion; same calm/predictable principle that
// drove the Bug B inline-input fix).
//
// CONTRACTS (behavior, not source):
//   1. NO NOTE → PASSTHROUGH — children render unwrapped; no chevron;
//      no tap target; no inline expansion area.
//   2. UNDEFINED / EMPTY / WHITESPACE NOTE → PASSTHROUGH — same as
//      contract 1. The filter predicate matches the integration
//      round-trip's filter (notes?.trim().length > 0).
//   3. NOTE PRESENT → CHEVRON VISIBLE — chevron rendered; row is
//      a tap target; inline expansion area is INITIALLY HIDDEN
//      (user must opt in to view).
//   4. TAP REVEALS NOTE INLINE — tapping the row mounts the expanded
//      note text below the existing row chrome.
//   5. TAP AGAIN COLLAPSES — tapping the expanded row hides the
//      inline note (toggle semantics).
//   6. TRIM ON DISPLAY — when notes have surrounding whitespace,
//      the expanded display shows the trimmed version (matches the
//      filter predicate's notion of "what counts as a note").
//
// Integration round-trip for the write→read pipeline this surface
// reads from is pinned separately in
// __tests__/integration/logEntryNotesRoundTrip35S3A.test.ts.
// ============================================================================

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      accent: '#5fb88a',
      textPrimary: '#f4ddb8',
      textSecondary: '#c4c1b3',
      textTertiary: '#9e9885',
      textMuted: '#6b7280',
      glass: '#363830',
      glassBorder: 'rgba(255,255,255,0.06)',
    },
  }),
}));

jest.mock('../../theme/theme-tokens', () => ({
  Spacing: { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
  Sizing: { cardRadius: 14, cardInternalPadding: 12 },
  Fonts: { serif: 'SourceSerif4_400Regular' },
}));

jest.mock('react-native', () => {
  const React = require('react');
  const make = (name: string) =>
    React.forwardRef((props: any, ref: any) =>
      React.createElement(name, { ...props, ref }, props.children),
    );
  return {
    View: make('View'),
    Text: make('Text'),
    TouchableOpacity: make('TouchableOpacity'),
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
    Platform: { OS: 'ios', select: (o: any) => o.ios || o.default },
  };
});

import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { DoneRowWithNote } from '../../components/now/DoneRowWithNote';

const RowChildren = () => <Text testID="row-content">Atenolol 50mg ✓</Text>;

describe('Phase 35 Slice 3-A — DoneRowWithNote behavior pin', () => {
  it('contract 1 (NO NOTE → PASSTHROUGH): when note is undefined, children render as-is with no chevron and no tap target', () => {
    const { queryByTestId, getByTestId } = render(
      <DoneRowWithNote note={undefined}>
        <RowChildren />
      </DoneRowWithNote>,
    );
    expect(getByTestId('row-content')).toBeTruthy();
    expect(queryByTestId('done-row-note-chevron')).toBeNull();
    expect(queryByTestId('done-row-note-touchable')).toBeNull();
    expect(queryByTestId('done-row-note-expanded')).toBeNull();
  });

  it('contract 2 (UNDEFINED / EMPTY / WHITESPACE NOTE → PASSTHROUGH): empty string and whitespace-only treated as no note', () => {
    // Three sub-cases — empty string, spaces, mixed whitespace —
    // all must collapse to passthrough. The predicate matches the
    // integration round-trip's filter (notes?.trim().length > 0).
    const cases = ['', '   ', '\n\t  '];
    for (const note of cases) {
      const { queryByTestId, getByTestId, unmount } = render(
        <DoneRowWithNote note={note}>
          <RowChildren />
        </DoneRowWithNote>,
      );
      expect(getByTestId('row-content')).toBeTruthy();
      expect(queryByTestId('done-row-note-chevron')).toBeNull();
      expect(queryByTestId('done-row-note-touchable')).toBeNull();
      unmount();
    }
  });

  it('contract 3 (NOTE PRESENT → CHEVRON VISIBLE, EXPANSION HIDDEN): a non-empty note renders the chevron and a tap target; expanded note is NOT shown until user taps', () => {
    const { getByTestId, queryByTestId } = render(
      <DoneRowWithNote note={'Patient was sleepy after dose.'}>
        <RowChildren />
      </DoneRowWithNote>,
    );
    expect(getByTestId('row-content')).toBeTruthy();
    expect(getByTestId('done-row-note-chevron')).toBeTruthy();
    expect(getByTestId('done-row-note-touchable')).toBeTruthy();
    // Initial state is collapsed — no expanded note until tap.
    expect(queryByTestId('done-row-note-expanded')).toBeNull();
  });

  it('contract 4 (TAP REVEALS NOTE INLINE): tapping the row mounts the expanded note text below the row chrome', () => {
    const NOTE = 'Patient was sleepy after dose.';
    const { getByTestId, queryByTestId } = render(
      <DoneRowWithNote note={NOTE}>
        <RowChildren />
      </DoneRowWithNote>,
    );
    expect(queryByTestId('done-row-note-expanded')).toBeNull();

    fireEvent.press(getByTestId('done-row-note-touchable'));

    const expanded = getByTestId('done-row-note-expanded');
    expect(expanded).toBeTruthy();
    expect(JSON.stringify(expanded.props.children)).toContain(NOTE);
  });

  it('contract 5 (TAP AGAIN COLLAPSES): second tap on the row hides the inline note (toggle semantics)', () => {
    const { getByTestId, queryByTestId } = render(
      <DoneRowWithNote note={'Took with breakfast.'}>
        <RowChildren />
      </DoneRowWithNote>,
    );
    fireEvent.press(getByTestId('done-row-note-touchable'));
    expect(getByTestId('done-row-note-expanded')).toBeTruthy();

    fireEvent.press(getByTestId('done-row-note-touchable'));
    expect(queryByTestId('done-row-note-expanded')).toBeNull();
  });

  it('contract 6 (TRIM ON DISPLAY): notes with surrounding whitespace render trimmed in the expanded panel', () => {
    // The filter predicate trims for inclusion; the display does
    // too. A note saved as "  Took with food  " surfaces as
    // "Took with food" — no leading/trailing whitespace bleed.
    const { getByTestId } = render(
      <DoneRowWithNote note={'   Took with food   '}>
        <RowChildren />
      </DoneRowWithNote>,
    );
    fireEvent.press(getByTestId('done-row-note-touchable'));
    const expanded = getByTestId('done-row-note-expanded');
    const text = JSON.stringify(expanded.props.children);
    expect(text).toContain('Took with food');
    expect(text).not.toContain('   Took with food   ');
  });

  // ============================================================================
  // Phase 35 Slice 3-D commit 3/3 — long-press undo affordance contracts.
  //
  // Q-3D.4 lock: whole row tappable (existing short-tap = view note),
  // long-press = undo. Symmetric with the pending-row long-press skip
  // gesture (SkipReasonSheet). Short = inspect, long = act. The Q-3D.6
  // unification routes the long-press through the canonical
  // undoInstanceCompletion via a parent-supplied onUndo callback. The
  // wrapper is purely presentational; the caller (TimelineSection)
  // owns the storage call + the Redo toast wiring.
  //
  // The long-press affordance is INDEPENDENT of the note affordance —
  // a done row with no note still long-presses for undo. The
  // passthrough contract (contracts 1 + 2) needs amendment: passthrough
  // only when BOTH affordances are absent (no note AND no onUndo).
  // ============================================================================

  it('contract 7 (LONG-PRESS WITHOUT NOTE): when onUndo is provided but no note, the row wraps in a touchable AND long-press invokes onUndo (no chevron, no expansion)', () => {
    // A done row with no caregiver note still needs an undo path.
    // The chevron cue is still absent (no note to view) but the
    // touchable wrapper IS present so long-press fires.
    const onUndo = jest.fn();
    const { getByTestId, queryByTestId } = render(
      <DoneRowWithNote note={undefined} onUndo={onUndo}>
        <RowChildren />
      </DoneRowWithNote>,
    );
    // Touchable present (for long-press)
    expect(getByTestId('done-row-note-touchable')).toBeTruthy();
    // Chevron absent (no note)
    expect(queryByTestId('done-row-note-chevron')).toBeNull();
    // No expansion path (no note)
    expect(queryByTestId('done-row-note-expanded')).toBeNull();

    fireEvent(getByTestId('done-row-note-touchable'), 'longPress');
    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it('contract 8 (LONG-PRESS WITH NOTE): when both note + onUndo present, chevron renders AND long-press fires onUndo AND short-tap toggles expansion (independent affordances)', () => {
    const onUndo = jest.fn();
    const { getByTestId, queryByTestId } = render(
      <DoneRowWithNote note={'Note attached.'} onUndo={onUndo}>
        <RowChildren />
      </DoneRowWithNote>,
    );
    expect(getByTestId('done-row-note-chevron')).toBeTruthy();
    expect(queryByTestId('done-row-note-expanded')).toBeNull();

    // Short-tap toggles expansion (Slice 3-A contract).
    fireEvent.press(getByTestId('done-row-note-touchable'));
    expect(getByTestId('done-row-note-expanded')).toBeTruthy();
    expect(onUndo).not.toHaveBeenCalled();

    // Long-press fires onUndo independently of expansion state.
    fireEvent(getByTestId('done-row-note-touchable'), 'longPress');
    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it('contract 9 (PASSTHROUGH REFINED): row is passthrough only when BOTH note and onUndo are absent', () => {
    // Refines contracts 1 + 2 — pre-3-D passthrough was triggered
    // by absent note alone. 3-D adds the onUndo affordance, which
    // also triggers a wrap (contract 7 above). True passthrough
    // requires both absent.
    const { queryByTestId } = render(
      <DoneRowWithNote note={undefined} onUndo={undefined}>
        <RowChildren />
      </DoneRowWithNote>,
    );
    expect(queryByTestId('done-row-note-touchable')).toBeNull();
    expect(queryByTestId('done-row-note-chevron')).toBeNull();
    expect(queryByTestId('done-row-note-expanded')).toBeNull();
  });
});
