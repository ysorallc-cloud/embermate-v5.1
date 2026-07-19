// ============================================================================
// Settings → Profile — Fix C: auto-return after a successful save.
//
// The profile screen (reached from the ProfileNamePrompt nudge) used to leave the
// caregiver stranded after saving — a blocking "Saved" modal, then a manual Back.
// Now a successful save calls navigateBack(). A failed save does NOT navigate and
// surfaces the error.
// ============================================================================

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

const mockNavigateBack = jest.fn();
const mockWritePatientName = jest.fn(async () => {});
const mockSaveCaregiverProfile = jest.fn(async () => {});
const mockGetPatientRegistry = jest.fn(async () => ({
  patients: [{ id: 'p1', name: 'Margaret' }],
  activePatientId: 'p1',
}));
const mockGetCaregiverProfile = jest.fn(async () => null);
const mockAlert = jest.fn();

jest.mock('react-native', () => {
  const React = require('react');
  const PT = (n: string) => ({ children, ...props }: any) => React.createElement(n, props, children);
  return {
    View: PT('View'), Text: PT('Text'), TextInput: PT('TextInput'),
    TouchableOpacity: PT('TouchableOpacity'), ScrollView: PT('ScrollView'),
    KeyboardAvoidingView: PT('KeyboardAvoidingView'),
    Platform: { OS: 'ios' },
    Alert: { alert: (...a: any[]) => (mockAlert as any)(...a) },
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
  };
});
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  return { SafeAreaView: ({ children }: any) => React.createElement('View', null, children) };
});
jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  return { LinearGradient: ({ children }: any) => React.createElement('View', null, children) };
});
jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: new Proxy({}, { get: () => '#000' }) }),
}));
jest.mock('../../components/SubScreenHeader', () => ({ SubScreenHeader: () => null }));
jest.mock('../../storage/patientRegistry', () => ({
  getPatientRegistry: (...a: any[]) => (mockGetPatientRegistry as any)(...a),
}));
jest.mock('../../utils/patientNameWriter', () => ({
  writePatientName: (...a: any[]) => (mockWritePatientName as any)(...a),
}));
jest.mock('../../storage/caregiverProfileRepo', () => ({
  getCaregiverProfile: (...a: any[]) => (mockGetCaregiverProfile as any)(...a),
  saveCaregiverProfile: (...a: any[]) => (mockSaveCaregiverProfile as any)(...a),
}));
jest.mock('../../utils/devLog', () => ({ logError: () => {} }));
jest.mock('../../utils/hapticFeedback', () => ({ hapticSuccess: () => {} }));
jest.mock('../../lib/navigate', () => ({ navigateBack: (...a: any[]) => (mockNavigateBack as any)(...a) }));

import SettingsProfile from '../../app/settings/profile';

function byLabel(root: TestRenderer.ReactTestInstance, label: string) {
  return root.findAll((n: any) => { try { return n.props?.accessibilityLabel === label; } catch { return false; } })[0];
}
async function renderScreen(): Promise<TestRenderer.ReactTestRenderer> {
  let tree!: TestRenderer.ReactTestRenderer;
  await act(async () => { tree = TestRenderer.create(React.createElement(SettingsProfile as any)); });
  await act(async () => {}); // flush the load effect (setLoaded(true))
  return tree;
}

describe('Settings → Profile — Fix C auto-return', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('a successful save navigates back (no manual Back needed)', async () => {
    const tree = await renderScreen();
    const save = byLabel(tree.root, 'Save profile');
    await act(async () => { save.props.onPress(); });
    await act(async () => {});
    expect(mockWritePatientName).toHaveBeenCalled();
    expect(mockNavigateBack).toHaveBeenCalledTimes(1);
  });

  it('a FAILED save does NOT navigate back, and surfaces the error', async () => {
    mockWritePatientName.mockRejectedValueOnce(new Error('boom'));
    const tree = await renderScreen();
    const save = byLabel(tree.root, 'Save profile');
    await act(async () => { save.props.onPress(); });
    await act(async () => {});
    expect(mockNavigateBack).not.toHaveBeenCalled();
    expect(mockAlert).toHaveBeenCalledWith('Error', 'Could not save profile.');
  });
});
