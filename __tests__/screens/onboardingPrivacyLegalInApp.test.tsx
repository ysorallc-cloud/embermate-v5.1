// ============================================================================
// ONBOARDING TERMS/PRIVACY — must open IN-APP and returnable, not eject.
//
// Bug: PrivacyDisclaimerScreen opened the Terms/Privacy links with
// Linking.openURL(...), which ejects the caregiver out of the app into
// Safari mid-onboarding — during a REQUIRED-acceptance step. The links
// resolve (embermate.app/terms + /privacy are live), so the destination is
// fine; the PATTERN is the dead-end: the user leaves the flow and there is
// no in-app "back" to the acceptance checkbox. (Apple taps these during
// review from inside the app.)
//
// Fix: open both as an in-app returnable browser
// (WebBrowser.openBrowserAsync) so the caregiver reads and returns to the
// checkbox without leaving onboarding. The required-accept gate
// ("Please accept the terms to continue.") stays intact.
//
// CONTRACTS (behavior):
//   1. Tapping "terms of use" opens the IN-APP browser at
//      https://embermate.app/terms — and does NOT Linking.openURL (no eject).
//   2. Tapping "privacy policy" opens the in-app browser at
//      https://embermate.app/privacy — and does NOT Linking.openURL.
//   3. Opening the legal view preserves onboarding state: the accept gate
//      still works afterward — Continue while unchecked is blocked and shows
//      the helper; checking then Continue advances (onContinue fires). The
//      screen is never unmounted by viewing the legal pages.
//
// RED against the pre-fix code (Linking.openURL fires, openBrowserAsync
// never does).
// ============================================================================

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#1f201c',
      accent: '#5fb88a',
      textPrimary: '#fff',
      textSecondary: '#c4c1b3',
      textMuted: '#8a8f98',
      textPlaceholder: '#6b7280',
    },
  }),
}));

jest.mock('../../theme/theme-tokens', () => ({
  Colors: {},
  Fonts: { serif: 'SourceSerif4', serifItalic: 'SourceSerif4_Italic' },
  Spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
  BorderRadius: { lg: 14 },
}));

jest.mock('../../constants/onboardingTokens', () => ({
  ONBOARDING_CTA_GRADIENT: ['#ff8c42', '#f59e0b'],
}));

// Onboarding chrome — render as inert passthroughs.
jest.mock('../../app/(onboarding)/components/StaticAuroraBackground', () => ({
  StaticAuroraBackground: () => null,
}));
jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  return { LinearGradient: (props: any) => React.createElement('LinearGradient', props, props.children) };
});
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  return {
    SafeAreaView: (props: any) => React.createElement('SafeAreaView', props, props.children),
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 34, left: 0 }),
  };
});

// The in-app browser under test.
const openBrowserAsync = jest.fn((..._args: any[]) => Promise.resolve({ type: 'dismiss' }));
jest.mock('expo-web-browser', () => ({
  openBrowserAsync: (...args: any[]) => openBrowserAsync(...args),
}));

// react-native primitives + a spied Linking.openURL (must NOT be called).
const openURL = jest.fn((..._args: any[]) => Promise.resolve());
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
    Pressable: make('Pressable'),
    ScrollView: make('ScrollView'),
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
    Linking: { openURL: (...args: any[]) => openURL(...args) },
  };
});

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { PrivacyDisclaimerScreen } from '../../app/(onboarding)/screens/PrivacyDisclaimerScreen';

function renderScreen(overrides: Partial<React.ComponentProps<typeof PrivacyDisclaimerScreen>> = {}) {
  const props = {
    onDisclaimerAccepted: jest.fn(),
    onContinue: jest.fn(),
    ...overrides,
  };
  const utils = render(<PrivacyDisclaimerScreen {...(props as any)} />);
  return { ...utils, props };
}

beforeEach(() => {
  openBrowserAsync.mockClear();
  openURL.mockClear();
});

describe('Onboarding Terms/Privacy — in-app returnable, not an eject', () => {
  it('contract 1: tapping "terms of use" opens the in-app browser at /terms and does NOT eject via Linking', async () => {
    const { getByText } = renderScreen();

    fireEvent.press(getByText('terms of use'));

    await waitFor(() => expect(openBrowserAsync).toHaveBeenCalledTimes(1));
    expect(openBrowserAsync).toHaveBeenCalledWith('https://embermate.app/terms');
    expect(openURL).not.toHaveBeenCalled();
  });

  it('contract 2: tapping "privacy policy" opens the in-app browser at /privacy and does NOT eject via Linking', async () => {
    const { getByText } = renderScreen();

    fireEvent.press(getByText('privacy policy'));

    await waitFor(() => expect(openBrowserAsync).toHaveBeenCalledTimes(1));
    expect(openBrowserAsync).toHaveBeenCalledWith('https://embermate.app/privacy');
    expect(openURL).not.toHaveBeenCalled();
  });

  it('contract 3: viewing the legal pages preserves state — the accept gate stays intact', async () => {
    const { getByText, getByLabelText, queryByText, props } = renderScreen();

    // Open Terms (in-app) — the screen is not unmounted by this.
    fireEvent.press(getByText('terms of use'));
    await waitFor(() => expect(openBrowserAsync).toHaveBeenCalled());

    // Gate still enforced: Continue while unchecked is blocked + helper shows.
    fireEvent.press(getByLabelText('Continue'));
    expect(props.onContinue).not.toHaveBeenCalled();
    expect(getByText('Please accept the terms to continue.')).toBeTruthy();

    // Accept, then Continue advances — state survived the legal view.
    fireEvent.press(getByLabelText('I understand and accept the terms of use'));
    fireEvent.press(getByLabelText('Continue'));
    expect(props.onContinue).toHaveBeenCalledTimes(1);
    expect(queryByText('Please accept the terms to continue.')).toBeNull();
  });
});
