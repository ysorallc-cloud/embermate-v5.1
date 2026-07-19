// ============================================================================
// Log Medication (plan item) — side-effect WRITE shape (Bug 3).
//
// Symptoms entered here were saved as LogEntry.data = { sideEffect: "a, b" } — a
// non-canonical field (singular, string, no `type`). careSummaryBuilder reads the
// canonical MedicationLogData shape ({ type:'medication', sideEffects: string[] }),
// so the guard `data.type === 'medication'` failed and the side-effects vanished
// from the Journal/handoff. The writer must produce the canonical shape.
// ============================================================================

import React from 'react';

jest.mock('react-native', () => {
  const R = require('react');
  const make = (name: string) =>
    R.forwardRef((props: any, ref: any) => R.createElement(name, { ...props, ref }, props.children));
  return {
    View: make('View'), Text: make('Text'), ScrollView: make('ScrollView'),
    TouchableOpacity: make('TouchableOpacity'), TextInput: make('TextInput'),
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
jest.mock('../../theme/theme-tokens', () => ({
  Colors: new Proxy({}, { get: () => '#000' }),
  Spacing: new Proxy({}, { get: () => 8 }),
  BorderRadius: new Proxy({}, { get: () => 8 }),
}));
jest.mock('../../hooks/useCarePlanConfig', () => ({ useCarePlanConfig: () => ({ config: null }) }));

const mockCompleteInstance = jest.fn(async () => ({}));
jest.mock('../../hooks/useDailyCareInstances', () => ({
  useDailyCareInstances: () => ({ completeInstance: mockCompleteInstance, skipInstance: jest.fn() }),
}));
jest.mock('../../utils/centralStorage', () => ({ saveMedicationLog: jest.fn() }));
jest.mock('../../utils/hapticFeedback', () => ({ hapticSuccess: jest.fn(), hapticLight: jest.fn() }));
jest.mock('../../types/carePlanConfig', () => ({ formatTimeForDisplay: (t: string) => t }));
jest.mock('../../lib/events', () => ({ emitDataUpdate: jest.fn() }));
jest.mock('../../lib/eventNames', () => ({ EVENT: new Proxy({}, { get: () => 'evt' }) }));
jest.mock('../../utils/devLog', () => ({ logError: jest.fn(), devLog: jest.fn() }));

import { render, fireEvent, act } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';
import LogMedicationPlanItemScreen from '../../app/log-medication-plan-item';

const setParams = (p: any) => (useLocalSearchParams as jest.Mock).mockReturnValue(p);

describe('Log Medication (plan item) — side-effect write shape', () => {
  beforeEach(() => { mockCompleteInstance.mockClear(); });

  it('writes the canonical MedicationLogData shape { type:"medication", sideEffects: string[] }', async () => {
    setParams({ instanceId: 'inst-1', itemName: 'Atorvastatin 10mg', itemDosage: '10mg' });
    const screen = render(<LogMedicationPlanItemScreen />);

    await act(async () => { fireEvent.press(screen.getByLabelText('Nausea side effect')); });
    await act(async () => { fireEvent.press(screen.getByLabelText('Mark as taken')); });

    expect(mockCompleteInstance).toHaveBeenCalledTimes(1);
    const [id, outcome, data] = mockCompleteInstance.mock.calls[0] as any[];
    expect(id).toBe('inst-1');
    expect(outcome).toBe('taken');
    expect(data.type).toBe('medication');            // the discriminant careSummaryBuilder gates on
    expect(data.sideEffects).toEqual(['nausea']);     // plural array (NOT the old { sideEffect: "nausea" })
    expect(data).not.toHaveProperty('sideEffect');    // the malformed field is gone
  });

  it('with no side-effects selected, still tags type:"medication" (sideEffects omitted)', async () => {
    setParams({ instanceId: 'inst-2', itemName: 'Warfarin 5mg', itemDosage: '5mg' });
    const screen = render(<LogMedicationPlanItemScreen />);

    await act(async () => { fireEvent.press(screen.getByLabelText('Mark as taken')); });

    const [, , data] = mockCompleteInstance.mock.calls[0] as any[];
    expect(data.type).toBe('medication');
    expect(data.sideEffects).toBeUndefined();
  });
});
