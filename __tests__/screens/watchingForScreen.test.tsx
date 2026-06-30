// ============================================================================
// onboarding-personalize Q2 — WatchingForScreen multi-select → careAreas.
// ============================================================================

jest.mock('react-native', () => {
  const React = require('react');
  const make = (name: string) =>
    React.forwardRef((props: any, ref: any) =>
      React.createElement(name, { ...props, ref }, props.children),
    );
  return {
    View: make('View'),
    Text: make('Text'),
    Pressable: make('Pressable'),
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
  };
});

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  return { SafeAreaView: ({ children }: any) => React.createElement('SafeAreaView', null, children) };
});
jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  return { LinearGradient: ({ children }: any) => React.createElement('LinearGradient', null, children) };
});
jest.mock('../../app/(onboarding)/components/StaticAuroraBackground', () => ({
  StaticAuroraBackground: () => null,
}));
jest.mock('../../constants/onboardingTokens', () => ({
  ONBOARDING_CTA_GRADIENT: ['#000', '#111'],
}));
jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: new Proxy({}, { get: () => '#000' }) }),
}));
jest.mock('../../theme/theme-tokens', () => ({
  Colors: new Proxy({}, { get: () => '#000' }),
  Fonts: { serif: 'S', serifItalic: 'SI' },
  Spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { WatchingForScreen } from '../../app/(onboarding)/screens/WatchingForScreen';

// OPTIONS order: [medications, vitals, meals, wellness, hydration]

describe('WatchingForScreen — Q2 multi-select', () => {
  it('contract 1 (MAPS SELECTIONS): selecting Blood pressure & vitals + Medications → careAreas ["vitals","medications"] order-independent', () => {
    const onContinue = jest.fn();
    const { getByTestId } = render(<WatchingForScreen onContinue={onContinue} onSkip={jest.fn()} />);
    fireEvent.press(getByTestId('watching-option-0')); // medications
    fireEvent.press(getByTestId('watching-option-1')); // vitals
    fireEvent.press(getByTestId('watching-continue'));
    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(onContinue.mock.calls[0][0].sort()).toEqual(['medications', 'vitals']);
  });

  it('contract 2 (TOGGLE OFF): re-tapping a selection removes it', () => {
    const onContinue = jest.fn();
    const { getByTestId } = render(<WatchingForScreen onContinue={onContinue} onSkip={jest.fn()} />);
    fireEvent.press(getByTestId('watching-option-2')); // meals on
    fireEvent.press(getByTestId('watching-option-2')); // meals off
    fireEvent.press(getByTestId('watching-continue'));
    expect(onContinue.mock.calls[0][0]).toEqual([]);
  });

  it('contract 3 (HYDRATION OPTION): the 5th option maps to hydration', () => {
    const onContinue = jest.fn();
    const { getByTestId } = render(<WatchingForScreen onContinue={onContinue} onSkip={jest.fn()} />);
    fireEvent.press(getByTestId('watching-option-4')); // hydration
    fireEvent.press(getByTestId('watching-continue'));
    expect(onContinue.mock.calls[0][0]).toEqual(['hydration']);
  });

  it('contract 4 (SKIP): the skip control fires onSkip and not onContinue', () => {
    const onContinue = jest.fn();
    const onSkip = jest.fn();
    const { getByTestId } = render(<WatchingForScreen onContinue={onContinue} onSkip={onSkip} />);
    fireEvent.press(getByTestId('watching-skip'));
    expect(onSkip).toHaveBeenCalledTimes(1);
    expect(onContinue).not.toHaveBeenCalled();
  });
});
