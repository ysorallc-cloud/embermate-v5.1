// ============================================================================
// Log Medication (plan item) — dose de-dup (Jul 2 brief item 1).
//
// Same P1 defect class as the fixed Journal/MedsBatchPanel double
// ("Aspirin 81mg 81mg"), at a NEW call site the original fix never covered:
// app/log-medication-plan-item.tsx renders medicationData.name (which has the
// dose baked in, e.g. "Atorvastatin 10mg") AND then medicationData.dosage
// ("10mg") on its own line → the dose shows twice. Fix routes the dosage line
// through the existing utils/medDisplay `dosageNotInName` guard.
//
// Node-env render test (react-native stubbed as host components, per the
// screen-smoke pattern). The Priority-1 load path only needs the itemName /
// itemDosage route params, so config can be null.
// ============================================================================

import React from 'react';

jest.mock('react-native', () => {
  const R = require('react');
  const make = (name: string) =>
    R.forwardRef((props: any, ref: any) => R.createElement(name, { ...props, ref }, props.children));
  return {
    View: make('View'),
    Text: make('Text'),
    ScrollView: make('ScrollView'),
    TouchableOpacity: make('TouchableOpacity'),
    TextInput: make('TextInput'),
    ActivityIndicator: make('ActivityIndicator'),
    KeyboardAvoidingView: make('KeyboardAvoidingView'),
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
jest.mock('../../theme/theme-tokens', () => ({
  Colors: new Proxy({}, { get: () => '#000' }),
  Spacing: new Proxy({}, { get: () => 8 }),
  BorderRadius: new Proxy({}, { get: () => 8 }),
}));
jest.mock('../../hooks/useCarePlanConfig', () => ({ useCarePlanConfig: () => ({ config: null }) }));
jest.mock('../../hooks/useDailyCareInstances', () => ({
  useDailyCareInstances: () => ({ completeInstance: jest.fn(), skipInstance: jest.fn() }),
}));
jest.mock('../../utils/centralStorage', () => ({ saveMedicationLog: jest.fn() }));
jest.mock('../../utils/hapticFeedback', () => ({ hapticSuccess: jest.fn(), hapticLight: jest.fn() }));
jest.mock('../../types/carePlanConfig', () => ({ formatTimeForDisplay: (t: string) => t }));

import { render } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';
import LogMedicationPlanItemScreen from '../../app/log-medication-plan-item';

const setParams = (p: any) => (useLocalSearchParams as jest.Mock).mockReturnValue(p);

describe('Log Medication (plan item) — dose de-dup', () => {
  it('renders the dose ONCE when the name already contains it ("Atorvastatin 10mg" + "10mg")', () => {
    setParams({ instanceId: 'inst-1', itemName: 'Atorvastatin 10mg', itemDosage: '10mg' });
    const screen = render(<LogMedicationPlanItemScreen />);
    // The name is always shown (contains "10mg").
    expect(screen.queryByText('Atorvastatin 10mg')).toBeTruthy();
    // "10mg" must appear in exactly ONE text node (the name). Pre-fix the
    // standalone dosage <Text> adds a second → length 2 (the bug).
    expect(screen.queryAllByText(/10mg/)).toHaveLength(1);
  });

  it('control: a clean name ("Atorvastatin") + dose ("10mg") still shows the dose once', () => {
    setParams({ instanceId: 'inst-2', itemName: 'Atorvastatin', itemDosage: '10mg' });
    const screen = render(<LogMedicationPlanItemScreen />);
    expect(screen.queryByText('Atorvastatin')).toBeTruthy();
    expect(screen.queryAllByText(/10mg/)).toHaveLength(1);
  });
});
