// ============================================================================
// REFLECTION CARD — the You-tab mood check-in must persist to the mood store
// that the rest of the app reads.
//
// Bug (You-tab restructure): ReflectionCard saves to services/reflectionRepo
// (reflection_card_* keys), an isolated silo that NOTHING else reads. The
// MoodStrip on the same tab — and the wellness surfaces — read mood_logged
// EVENTS (getEventsByDateRange). So a caregiver picks a mood and it vanishes
// from every surface that shows mood/check-in data: the dot strip right below
// the card stays empty.
//
// Contract: selecting a mood emits a mood_logged event (emitMoodEvent) with the
// mapped 1–5 score, so it lands in the same encrypted event store the MoodStrip
// reads. (reflectionRepo still holds the free-text + card prefill — unchanged.)
//
// RED before the fix: emitMoodEvent is never called.
// ============================================================================

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      accent: '#5fb88a', textPrimary: '#fff', textSecondary: '#c4c1b3',
      textTertiary: '#6b7280', background: '#1f201c', borderReflect: 'rgba(0,0,0,0.2)',
      borderInset: 'rgba(0,0,0,0.2)',
    },
  }),
}));

jest.mock('../../theme/theme-tokens', () => ({
  Colors: {},
  Sizing: {},
  Spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
}));
jest.mock('../../theme/spacing', () => ({ CARD_PADDING_V: 14 }));

// reflectionRepo stays functional (its own round-trip is fine) — spy to confirm
// it's still called (we keep it for the free text).
const saveReflection = jest.fn(async (...args: any[]) => ({ ...(args[0] ?? {}), savedAt: '2026-07-17T10:00:00.000Z' }));
const getReflection = jest.fn(async (..._args: any[]) => null);
jest.mock('../../services/reflectionRepo', () => ({
  saveReflection: (...a: any[]) => saveReflection(...a),
  getReflection: (...a: any[]) => getReflection(...a),
}));

// The mood/check-in event store the MoodStrip + wellness read.
const emitMoodEvent = jest.fn(async (..._a: any[]) => {});
jest.mock('../../utils/eventEmitter', () => ({
  emitMoodEvent: (...a: any[]) => emitMoodEvent(...a),
}));

jest.mock('../../components/shared/InlineSaveToast', () => ({ InlineSaveToast: () => null }));

jest.mock('react-native', () => {
  const React = require('react');
  const make = (name: string) =>
    React.forwardRef((props: any, ref: any) => React.createElement(name, { ...props, ref }, props.children));
  return {
    View: make('View'), Text: make('Text'), TextInput: make('TextInput'),
    TouchableOpacity: make('TouchableOpacity'),
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
  };
});

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ReflectionCard } from '../../components/support/ReflectionCard';

beforeEach(() => {
  saveReflection.mockClear();
  emitMoodEvent.mockClear();
  getReflection.mockClear();
});

describe('ReflectionCard — mood check-in persists to the mood_logged event store', () => {
  it('emits a mood_logged event (mapped 1–5 score) when a mood is selected', async () => {
    const { getByLabelText } = render(<ReflectionCard />);

    // Tap "Good" (rough=1 … good=5).
    fireEvent.press(getByLabelText(/Good mood/i));

    await waitFor(() => expect(emitMoodEvent).toHaveBeenCalledTimes(1));
    // Score 5 for "good"; the mood label is passed through for the event.
    expect(emitMoodEvent.mock.calls[0][0]).toBe(5);
    // reflectionRepo still receives the entry (free-text home unchanged).
    expect(saveReflection).toHaveBeenCalled();
  });

  it('maps a low mood to its score too', async () => {
    const { getByLabelText } = render(<ReflectionCard />);
    fireEvent.press(getByLabelText(/Rough mood/i));
    await waitFor(() => expect(emitMoodEvent).toHaveBeenCalledTimes(1));
    expect(emitMoodEvent.mock.calls[0][0]).toBe(1);
  });
});
