/**
 * Support tab — render smoke test (template for screen-level coverage).
 *
 * This is the *template* for top-level screen smoke tests. If we like the
 * pattern, replicate to now.tsx, journal.tsx, understand.tsx. Things to know
 * before extending:
 *
 *   - The global jest.setup.js mocks `react-native` minimally; we re-mock it
 *     here with simple host-component forwarders so RTL can actually render.
 *   - Heavy native deps (AuroraBackground, BreathingExercise, etc.) are
 *     stubbed to no-op components — they make their own native calls that
 *     don't matter for verifying the screen renders without throwing.
 *   - Storage/event modules are mocked so we can drive the three test states
 *     (empty / partial / full) declaratively.
 *
 * Stop conditions hit: BreathingExercise + AuroraBackground use animation
 * APIs (Animated, react-native-reanimated) that don't run in jest-node;
 * those components are stubbed and must be verified on-device.
 */

jest.mock('react-native', () => {
  const React = require('react');
  const make = (name: string) =>
    React.forwardRef((props: any, ref: any) =>
      React.createElement(name, { ...props, ref }, props.children),
    );
  return {
    View: make('View'),
    Text: make('Text'),
    ScrollView: make('ScrollView'),
    TouchableOpacity: make('TouchableOpacity'),
    Pressable: make('Pressable'),
    RefreshControl: make('RefreshControl'),
    Linking: { openURL: jest.fn() },
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
    Platform: { OS: 'ios', select: (o: any) => o.ios || o.default },
    Alert: { alert: jest.fn() },
    Dimensions: { get: () => ({ width: 375, height: 812 }) },
  };
});

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  return {
    SafeAreaView: ({ children }: any) =>
      React.createElement('SafeAreaView', null, children),
    useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
    SafeAreaProvider: ({ children }: any) => children,
  };
});

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      accent: '#aa8adc',
      caregiverAccent: '#aa8adc',
      caregiverAccentBg: 'rgba(139, 92, 246, 0.06)',
      caregiverAccentBorder: 'rgba(139, 92, 246, 0.25)',
      caregiverAccentText: '#d4baff',
      background: '#000',
      backgroundSecondary: '#111',
      surface: '#222',
      surfaceElevated: '#222',
      textPrimary: '#fff',
      textSecondary: '#aaa',
      textWarmSecondary: '#b0b8c0',
      textMuted: '#888',
      textOnAccent: '#000',
      border: '#333',
      separator: '#222',
      error: '#ff5555',
      glassWhite: 'rgba(255,255,255,0.05)',
      glassBlack: 'rgba(0,0,0,0.4)',
      shadow: '#000',
    },
  }),
}));

jest.mock('../../theme/theme-tokens', () => ({ Colors: {} as any }));

jest.mock('../../components/aurora/AuroraBackground', () => {
  const React = require('react');
  return {
    AuroraBackground: () => React.createElement('AuroraBackground', null),
  };
});

jest.mock('../../components/support/BreathingExercise', () => {
  const React = require('react');
  return {
    BreathingExercise: ({ visible }: { visible: boolean }) =>
      visible ? React.createElement('BreathingExerciseModal', null) : null,
  };
});

jest.mock('../../components/support/ResourcesList', () => {
  const React = require('react');
  return {
    ResourcesList: () => React.createElement('ResourcesList', null),
  };
});

jest.mock('../../components/support/MoodSlider', () => ({
  MOOD_POSITIONS: [
    { score: 1, label: 'Struggling' },
    { score: 2, label: 'Tired' },
    { score: 3, label: 'OK' },
    { score: 4, label: 'Good' },
    { score: 5, label: 'Great' },
  ],
  AFFIRMATIONS: {
    1: 'Be gentle with yourself.',
    2: 'Rest matters.',
    3: 'Steady is enough.',
    4: 'Nice — keep it going.',
    5: 'Glad to hear it.',
  },
}));

jest.mock('../../lib/navigate', () => ({ navigate: jest.fn() }));

jest.mock('../../utils/eventEmitter', () => ({
  emitMoodEvent: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../utils/caregiverWellnessStorage', () => ({
  saveDailyCheck: jest.fn().mockResolvedValue(undefined),
  getDailyChecks: jest.fn().mockResolvedValue([]),
  getTodayCheck: jest.fn().mockResolvedValue(null),
}));

jest.mock('../../utils/streakStorage', () => ({
  updateStreak: jest.fn().mockResolvedValue(undefined),
}));

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import SupportScreen from '../../app/(tabs)/support';
import { saveDailyCheck } from '../../utils/caregiverWellnessStorage';
import { emitMoodEvent } from '../../utils/eventEmitter';

const mockSave = saveDailyCheck as jest.MockedFunction<typeof saveDailyCheck>;
const mockEmit = emitMoodEvent as jest.MockedFunction<typeof emitMoodEvent>;

beforeEach(() => {
  mockSave.mockClear();
  mockEmit.mockClear();
});

describe('SupportScreen — render smoke test', () => {
  it('renders without throwing in the empty (no data) state', () => {
    expect(() => render(<SupportScreen />)).not.toThrow();
  });

  it('renders the page title and the caregiver-focused message', () => {
    const { getByText } = render(<SupportScreen />);
    expect(getByText('You')).toBeTruthy();
    // Page subtitle reinforces the audience — single-line in v6.7.
    expect(getByText(/A space for you, not your loved one\./)).toBeTruthy();
  });

  it('renders all five mood emoji buttons with proper a11y labels', () => {
    const { getByLabelText } = render(<SupportScreen />);
    for (const label of ['Struggling', 'Tired', 'OK', 'Good', 'Great']) {
      const btn = getByLabelText(label);
      expect(btn).toBeTruthy();
      expect(btn.props.accessibilityRole).toBe('button');
    }
  });

  it('renders the "Take a breath" breathing entry point with a11y description', () => {
    const { getByLabelText } = render(<SupportScreen />);
    const breatheBtn = getByLabelText(/Take a breath/);
    expect(breatheBtn).toBeTruthy();
    expect(breatheBtn.props.accessibilityRole).toBe('button');
  });

  it('renders the "Log this" CTA initially', () => {
    const { getByLabelText } = render(<SupportScreen />);
    const logBtn = getByLabelText('Log this');
    expect(logBtn).toBeTruthy();
  });

  it('selecting a mood and tapping "Log this" calls saveDailyCheck + emitMoodEvent', async () => {
    const { getByLabelText } = render(<SupportScreen />);

    // Pick "Good" (score 4) and log
    fireEvent.press(getByLabelText('Good'));
    await act(async () => {
      fireEvent.press(getByLabelText('Log this'));
    });

    expect(mockEmit).toHaveBeenCalledWith(4, 'Good', expect.objectContaining({ source: 'dedicated_screen' }));
    expect(mockSave).toHaveBeenCalledWith(
      expect.objectContaining({
        sleep: 4,
        stress: 2, // 6 - 4
        meals: 4,
      }),
    );
  });

  it('after logging, displays the affirmation for the selected mood', async () => {
    const { getByLabelText, getByText } = render(<SupportScreen />);

    fireEvent.press(getByLabelText('Great'));
    await act(async () => {
      fireEvent.press(getByLabelText('Log this'));
    });

    expect(getByText('Glad to hear it.')).toBeTruthy();
  });
});
