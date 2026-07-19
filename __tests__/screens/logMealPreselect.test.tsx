// ============================================================================
// log-meal pre-selection (Bug 1) — a passed mealType pre-selects THAT meal.
//
// Tapping Breakfast used to pre-check Lunch (the screen fell back to a clock-based
// default because the tap passed no mealType). With the tapped meal's mealType now
// routed in, the screen must pre-select exactly that meal — and NOT be overridden
// by the same-day existing-meals load (that override is gated on !params.mealType).
// ============================================================================

import React from 'react';

jest.mock('react-native', () => {
  const R = require('react');
  const make = (name: string) =>
    R.forwardRef((props: any, ref: any) => R.createElement(name, { ...props, ref }, props.children));
  return {
    View: make('View'), Text: make('Text'), ScrollView: make('ScrollView'),
    TouchableOpacity: make('TouchableOpacity'), TextInput: make('TextInput'),
    Pressable: make('Pressable'),
    ActivityIndicator: make('ActivityIndicator'), KeyboardAvoidingView: make('KeyboardAvoidingView'),
    Alert: { alert: jest.fn() },
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
    Platform: { OS: 'ios', select: (o: any) => o.ios || o.default },
  };
});
jest.mock('react-native-safe-area-context', () => {
  const R = require('react');
  return { SafeAreaView: ({ children }: any) => R.createElement('SafeAreaView', null, children) };
});
jest.mock('expo-router', () => ({ useLocalSearchParams: jest.fn() }));
jest.mock('../../lib/navigate', () => ({ navigate: jest.fn(), navigateBack: jest.fn() }));
jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: new Proxy({}, { get: () => '#000' }) }),
}));
jest.mock('../../theme/theme-tokens', () => ({ Colors: new Proxy({}, { get: () => '#000' }) }));
// Existing same-day meals present → proves params.mealType still wins (override gated).
jest.mock('../../utils/dailyTrackingStorage', () => ({
  saveDailyTracking: jest.fn(),
  getDailyTracking: jest.fn(async () => ({ meals: { breakfast: false, lunch: true, dinner: false } })),
}));
jest.mock('../../utils/centralStorage', () => ({ saveMealsLog: jest.fn() }));
jest.mock('../../utils/hapticFeedback', () => ({ hapticSuccess: jest.fn() }));
jest.mock('../../utils/carePlanRouting', () => ({
  parseCarePlanContext: () => null, getCarePlanBannerText: () => '', getPreSelectionHints: () => null,
}));
jest.mock('../../utils/carePlanStorage', () => ({ trackCarePlanProgress: jest.fn() }));
jest.mock('../../storage/carePlanRepo', () => ({
  listDailyInstances: jest.fn(async () => []),
  logInstanceCompletion: jest.fn(),
  DEFAULT_PATIENT_ID: 'default',
}));
jest.mock('../../lib/events', () => ({ emitDataUpdate: jest.fn() }));
jest.mock('../../lib/eventNames', () => ({ EVENT: new Proxy({}, { get: () => 'evt' }) }));
jest.mock('../../utils/devLog', () => ({ logError: jest.fn(), devLog: jest.fn() }));
jest.mock('../../services/carePlanGenerator', () => ({ getTodayDateString: () => '2026-07-19' }));
jest.mock('../../components/logging/LogScreen', () => ({ LogScreen: ({ children }: any) => children }));

import { render, act } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';
import LogMealScreen from '../../app/log-meal';

const setParams = (p: any) => (useLocalSearchParams as jest.Mock).mockReturnValue(p);

function selectedOf(screen: any, id: string): boolean {
  return !!screen.getByTestId(`log-meal-pill-${id}`).props.accessibilityState?.selected;
}

async function renderWith(_params: any) {
  const screen = render(<LogMealScreen />);
  await act(async () => {}); // flush the pre-select + existing-data effects
  return screen;
}

describe('log-meal — mealType pre-selects the tapped meal', () => {
  it('tap Breakfast → Breakfast selected, Lunch NOT (despite an existing logged lunch)', async () => {
    setParams({ instanceId: 'i1', itemName: 'Breakfast', mealType: 'breakfast' });
    const screen = await renderWith({});
    expect(selectedOf(screen, 'breakfast')).toBe(true);
    expect(selectedOf(screen, 'lunch')).toBe(false);
    expect(selectedOf(screen, 'dinner')).toBe(false);
  });

  it('tap Dinner → Dinner selected, others NOT', async () => {
    setParams({ instanceId: 'i3', itemName: 'Dinner', mealType: 'dinner' });
    const screen = await renderWith({});
    expect(selectedOf(screen, 'dinner')).toBe(true);
    expect(selectedOf(screen, 'breakfast')).toBe(false);
    expect(selectedOf(screen, 'lunch')).toBe(false);
  });
});
