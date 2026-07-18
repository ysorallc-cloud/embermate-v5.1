// ============================================================================
// Piece 2 (Shape 1) — medication-form logDose GATE.
//
// The medication-confirm custom-add flow routes to /medication-form with
// prefillName/prefillDosage + logDose=1. On save the form must, ONLY when
// logDose is set:
//   • create the scheduled config med (config.meds.medications), AND
//   • record the dose (a MedicationLog entry).
// A normal Care Plan add (no logDose) must create the med with taken:false and
// log NO phantom dose.
//
// Drives a REAL save through the rendered screen against REAL storage (the
// global jest.setup AsyncStorage/SecureStore mocks — NOT overridden here), then
// reads the storage layers the app reads. This pins the gate + wiring that the
// storage-only helper test (medConfirmLogDose) can't see.
// ============================================================================

// Router params — mutated per test before render.
const mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => mockParams,
}));

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      glass: '#363830', glassBorder: 'rgba(255,255,255,0.06)', glassFaint: '#222',
      glassStrong: '#444', glassActive: '#555', glassHover: '#333',
      accent: '#5fb88a', accentMuted: 'rgba(95,184,138,0.5)', accentBorder: 'rgba(95,184,138,0.3)',
      accentDim: 'rgba(95,184,138,0.1)', caregiverAccent: '#aa8adc',
      textPrimary: '#fff', textSecondary: '#9aa0a6', textTertiary: '#6b7280',
      textHalf: '#888', textMuted: '#666',
      background: '#1a1612', backgroundGradientStart: '#1a1612', backgroundGradientEnd: '#1a1612',
      switchThumbOff: '#888', criticalAlert: '#e6776e', hairlineInset: '#444',
      error: '#e6776e', orange: '#e5a86e',
    },
  }),
}));

jest.mock('../../lib/events', () => ({ emitDataUpdate: jest.fn() }));
jest.mock('../../utils/devLog', () => ({ logError: () => {}, devLog: () => {} }));
// Avoid pulling the native notification stack through the reschedule branch.
jest.mock('../../utils/notificationService', () => ({
  rescheduleAllNotifications: jest.fn(async () => {}),
  scheduleCarePlanNotifications: jest.fn(async () => {}),
}));

jest.mock('react-native', () => {
  const React = require('react');
  const PT = (n: string) => ({ children, ...props }: any) =>
    React.createElement(n, props, children);
  const AnimatedValue = function (this: any, v: number) { (this as any).value = v; };
  AnimatedValue.prototype.setValue = function () {};
  const Animated = {
    View: PT('Animated.View'), Text: PT('Animated.Text'), ScrollView: PT('Animated.ScrollView'),
    Value: AnimatedValue,
    timing: () => ({ start: (cb?: any) => cb && cb({ finished: true }) }),
    spring: () => ({ start: (cb?: any) => cb && cb({ finished: true }) }),
    parallel: () => ({ start: (cb?: any) => cb && cb({ finished: true }) }),
    sequence: () => ({ start: (cb?: any) => cb && cb({ finished: true }) }),
  };
  return {
    View: PT('View'), Text: PT('Text'), TextInput: PT('TextInput'),
    TouchableOpacity: PT('TouchableOpacity'), ScrollView: PT('ScrollView'),
    KeyboardAvoidingView: PT('KeyboardAvoidingView'), Switch: PT('Switch'),
    Platform: { OS: 'ios', select: (o: any) => o.ios },
    Alert: { alert: jest.fn() },
    Animated,
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
  };
});
jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  return { LinearGradient: ({ children }: any) => React.createElement('LinearGradient', null, children) };
});
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  return {
    SafeAreaView: ({ children }: any) => React.createElement('View', null, children),
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('../../components/SubScreenHeader', () => ({ SubScreenHeader: () => null }));

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMedicationLogs } from '../../utils/centralStorage';
import { getMedicationsFromPlan } from '../../storage/carePlanConfigRepo';
import { getMedications } from '../../utils/medicationStorage';
import MedicationFormScreen from '../../app/medication-form';

const PATIENT_ID = 'default';

async function clearAll(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  if (keys.length > 0) await AsyncStorage.multiRemove(keys as string[]);
}

async function flush(): Promise<void> {
  for (let i = 0; i < 5; i++) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => { await Promise.resolve(); });
  }
}

function findSaveButton(root: TestRenderer.ReactTestInstance) {
  return root.findAll((n: any) => {
    try { return n.props?.accessibilityLabel === 'Save medication'; } catch { return false; }
  })[0];
}

async function renderAndSave(): Promise<void> {
  let tree!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = TestRenderer.create(React.createElement(MedicationFormScreen));
  });
  await flush();
  const saveBtn = findSaveButton(tree.root);
  if (!saveBtn) throw new Error('Save button not found (required fields may be unfilled)');
  await act(async () => { await saveBtn.props.onPress(); });
  await flush();
}

describe('Piece 2 — medication-form logDose gate', () => {
  beforeEach(async () => {
    await clearAll();
    for (const k of Object.keys(mockParams)) delete mockParams[k];
  });

  it('WITH logDose=1: creates a scheduled config med AND logs the dose', async () => {
    Object.assign(mockParams, {
      source: 'careplan',
      prefillName: 'Ibuprofen',
      prefillDosage: '200mg',
      logDose: '1',
    });

    await renderAndSave();

    const meds = await getMedicationsFromPlan(PATIENT_ID);
    expect(meds.some((m) => m.name === 'Ibuprofen')).toBe(true);

    const logs = await getMedicationLogs(PATIENT_ID);
    expect(logs.length).toBe(1);
  });

  it('WITHOUT logDose: creates the med (taken:false) and logs NO phantom dose', async () => {
    Object.assign(mockParams, {
      source: 'careplan',
      prefillName: 'Aspirin',
      prefillDosage: '81mg',
      // no logDose
    });

    await renderAndSave();

    const meds = await getMedicationsFromPlan(PATIENT_ID);
    expect(meds.some((m) => m.name === 'Aspirin')).toBe(true);

    // The critical guard: no dose was logged.
    const logs = await getMedicationLogs(PATIENT_ID);
    expect(logs.length).toBe(0);

    // Legacy mirror created but not marked taken.
    const legacy = await getMedications(PATIENT_ID);
    expect(legacy.find((m) => m.name === 'Aspirin')?.taken).toBe(false);
  });
});
