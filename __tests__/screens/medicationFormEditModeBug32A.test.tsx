// ============================================================================
// 32A-form-fix BUG 1 — reproduction test for tap-existing-med opens BLANK.
//
// Device report (STOP 2 gate): tapping a med from Care Plan main inline list
// (F4) — or from the meds subscreen — routes to
// /medication-form?id=<medId>&source=careplan but the form opens with a
// blank "Select medication..." dropdown instead of pre-filling in edit mode.
//
// Static-audit verdict (pre-fix): F4's URL wiring is correct; the meds
// subscreen uses the IDENTICAL URL pattern and predates 32A by months; the
// form reads `params.id` and runs loadMedication on a useEffect keyed to
// [medId, isCarePlanSource]; getMedicationsFromPlan returns
// config.meds.medications which is where F4 reads from. Static read shows
// wiring is sound.
//
// This test reproduces the runtime path:
//   1. Seed AsyncStorage with a CarePlanConfig containing Metformin id=med-3.
//   2. Mount <MedicationFormScreen /> with mocked router params
//      { id: 'med-3', source: 'careplan' }.
//   3. Let loadMedication's useEffect resolve.
//   4. Assert the rendered tree shows "Metformin" (name pre-filled), NOT the
//      "Select medication..." placeholder (blank state).
//
// If this test goes RED, the device report names a real runtime bug — fix on
// /medication-form. If it goes GREEN, the form actually pre-fills and the
// blank-dropdown reading was a misread (maybe the user tapped Add or the
// pre-fill effect runs after the screenshot moment).
// ============================================================================

// Shared in-memory store (mirrors __tests__/storage/setAppliedTemplateId
// pattern). safeStorage reads/writes JSON.stringify'd values.
const store = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((k: string) =>
      Promise.resolve(store.has(k) ? store.get(k)! : null),
    ),
    setItem: jest.fn((k: string, v: string) => {
      store.set(k, v);
      return Promise.resolve();
    }),
    removeItem: jest.fn((k: string) => {
      store.delete(k);
      return Promise.resolve();
    }),
  },
}));

jest.mock('../../utils/safeStorage', () => ({
  safeGetItem: async <T,>(key: string, fallback: T): Promise<T> => {
    const raw = store.get(key);
    if (raw == null) return fallback;
    try { return JSON.parse(raw) as T; } catch { return fallback; }
  },
  safeSetItem: async (key: string, value: any): Promise<boolean> => {
    store.set(key, JSON.stringify(value));
    return true;
  },
}));

// Router + params from expo-router. The hooks return controllable values
// via these jest.fn references; mutate before each test as needed.
const mockParams = { id: '', source: '' } as Record<string, string>;
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => mockParams,
}));

// Theme + lib + log mocks.
jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      glass: '#363830', glassBorder: 'rgba(255,255,255,0.06)', glassFaint: '#222',
      glassStrong: '#444', glassActive: '#555', glassHover: '#333',
      accent: '#5fb88a', accentMuted: 'rgba(95,184,138,0.5)', accentBorder: 'rgba(95,184,138,0.3)',
      accentDim: 'rgba(95,184,138,0.1)',
      caregiverAccent: '#aa8adc',
      textPrimary: '#fff', textSecondary: '#9aa0a6', textTertiary: '#6b7280',
      textHalf: '#888', textMuted: '#666',
      background: '#1a1612', backgroundGradientStart: '#1a1612', backgroundGradientEnd: '#1a1612',
      switchThumbOff: '#888', criticalAlert: '#e6776e',
      hairlineInset: '#444', error: '#e6776e',
      orange: '#e5a86e',
    },
  }),
}));

jest.mock('../../lib/events', () => ({ emitDataUpdate: jest.fn() }));
jest.mock('../../utils/devLog', () => ({ logError: () => {}, devLog: () => {} }));

// Stub native modules + non-essential UI children so the form mounts cleanly.
jest.mock('react-native', () => {
  const React = require('react');
  const PT = (n: string) => ({ children, ...props }: any) =>
    React.createElement(n, props, children);
  // Animated.View / Animated.Text plus a no-op Value class — the form
  // imports `Animated` for transitions; we don't need the animation engine.
  const AnimatedValue = function (v: number) { (this as any).value = v; };
  AnimatedValue.prototype.setValue = function () {};
  const Animated = {
    View: PT('Animated.View'),
    Text: PT('Animated.Text'),
    ScrollView: PT('Animated.ScrollView'),
    Value: AnimatedValue,
    timing: () => ({ start: (cb?: any) => cb && cb({ finished: true }) }),
    spring: () => ({ start: (cb?: any) => cb && cb({ finished: true }) }),
    parallel: () => ({ start: (cb?: any) => cb && cb({ finished: true }) }),
    sequence: () => ({ start: (cb?: any) => cb && cb({ finished: true }) }),
  };
  return {
    View: PT('View'),
    Text: PT('Text'),
    TextInput: PT('TextInput'),
    TouchableOpacity: PT('TouchableOpacity'),
    ScrollView: PT('ScrollView'),
    KeyboardAvoidingView: PT('KeyboardAvoidingView'),
    Switch: PT('Switch'),
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
jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));
jest.mock('../../components/SubScreenHeader', () => ({
  SubScreenHeader: () => null,
}));

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import {
  saveCarePlanConfig,
} from '../../storage/carePlanConfigRepo';
import {
  createDefaultCarePlanConfig,
  type CarePlanConfig,
  type MedicationPlanItem,
} from '../../types/carePlanConfig';

import MedicationFormScreen from '../../app/medication-form';

// Matches DEFAULT_PATIENT_ID export at types/patient.ts:21. The form calls
// getMedicationsFromPlan(DEFAULT_PATIENT_ID) with this literal, so the
// fixture seed MUST write to the same patientId-scoped storage key.
const PATIENT_ID = 'default';

async function seedCarePlanWithMetformin() {
  const base = createDefaultCarePlanConfig(PATIENT_ID);
  const now = new Date().toISOString();
  const metformin: MedicationPlanItem = {
    id: 'med-3',
    name: 'Metformin',
    dosage: '1000mg',
    instructions: 'Take with food',
    timesOfDay: ['morning'],
    scheduledTimeHHmm: '08:00',
    active: true,
    createdAt: now,
    updatedAt: now,
  };
  const cfg: CarePlanConfig = {
    ...base,
    meds: { ...base.meds, medications: [metformin] },
  };
  await saveCarePlanConfig(cfg);
}

// Walk the rendered tree collecting every Text node's string content.
function collectText(root: TestRenderer.ReactTestInstance): string[] {
  const out: string[] = [];
  function walk(node: any) {
    if (!node) return;
    if (typeof node === 'string' || typeof node === 'number') {
      out.push(String(node));
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (node?.children !== undefined) {
      const kids = Array.isArray(node.children) ? node.children : [node.children];
      kids.forEach(walk);
    }
    if (node?.props?.children !== undefined) {
      const kids = Array.isArray(node.props.children) ? node.props.children : [node.props.children];
      kids.forEach(walk);
    }
  }
  walk(root);
  return out;
}

async function flush() {
  // Two ticks: useEffect → loadMedication awaits getMedicationsFromPlan,
  // then the setName/setDosage etc. trigger a re-render.
  await act(async () => { await Promise.resolve(); });
  await act(async () => { await Promise.resolve(); });
  await act(async () => { await Promise.resolve(); });
}

describe('32A-form-fix BUG 1 — medication-form pre-fills on ?id=<medId>&source=careplan', () => {
  beforeEach(async () => {
    store.clear();
    mockParams.id = '';
    mockParams.source = '';
    await seedCarePlanWithMetformin();
  });

  it('mounting with id=med-3 + source=careplan loads Metformin into the form (edit mode, pre-filled)', async () => {
    mockParams.id = 'med-3';
    mockParams.source = 'careplan';

    let tree!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = TestRenderer.create(React.createElement(MedicationFormScreen));
    });
    await flush();

    const texts = collectText(tree.root).join(' | ');

    // Med name is pre-filled — "Metformin" appears somewhere in the
    // rendered tree (the dropdown trigger shows the selected name).
    expect(texts).toContain('Metformin');

    // The "Select medication..." placeholder is the BLANK-state cue.
    // When the form is in edit mode with pre-filled name, the dropdown
    // trigger shows the name instead of this placeholder. If the user's
    // device report is real, this assertion fires RED.
    expect(texts).not.toContain('Select medication...');
  });
});
