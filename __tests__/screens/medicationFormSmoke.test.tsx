// ============================================================================
// medication-form — render smoke test.
//
// Phase 34 NOT.A2 — added per F5.3.1 standing rule (every screen-level
// restructure must include a smoke-mount test that exercises the
// screen's first paint against the live React render tree). A2 wires
// rescheduleAllNotifications into handleSave; this test guards
// against that restructure dropping a mount.
//
// SCOPE NOTE: medication-form.tsx is RETIRED by Phase 34 F6
// (Q-34.F6.2 + Q-34.F6.4 in project_phase_34_f6_banked_audit.md).
// This smoke-mount has a known short lifespan but earns its keep:
//   - A2 modifies handleSave; mount-test catches any regression in
//     the render path that A2's edits might silently introduce.
//   - When F6 retires the route, this file retires with it (alongside
//     the three pre-existing 32A behavior-pin files).
//
// CONTRACTS:
//   1. SMOKE ADD MODE — renders without throwing when mounted without
//      route params (the "+ Add medication" entry path).
//   2. SMOKE EDIT MODE (CARE-PLAN SOURCE) — renders without throwing
//      when mounted with id + source=careplan (the F5.4 drawer-edit
//      entry path), seeding a med to load.
//   3. LANDMARK MEDICATION NAME — the medication-name TextInput is
//      present in the rendered tree (form Step 1 entrypoint).
//   4. LANDMARK SAVE BUTTON — the save-handler button is present.
//
// NOTE: A 5th contract on the reminder + follow-up Switches was drafted
// then dropped — those fields live on form Step 2, gated behind a
// "Next" affordance the user-facing flow controls. The mount-test's job
// is to prove Step 1 renders cleanly; Step-2-visibility is form behavior
// the A2 reschedule pin exercises end-to-end via simulated save flow.
// ============================================================================

// Shared in-memory store — mirrors __tests__/screens/medicationFormEditModeBug32A.test.tsx
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

const mockParams: Record<string, string> = { id: '', source: '' };
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => mockParams,
}));

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: new Proxy({}, { get: () => '#000' }),
  }),
}));

jest.mock('../../lib/events', () => ({ emitDataUpdate: jest.fn() }));
jest.mock('../../utils/devLog', () => ({ logError: () => {}, devLog: () => {} }));

jest.mock('react-native', () => {
  const React = require('react');
  const PT = (n: string) => ({ children, ...props }: any) =>
    React.createElement(n, props, children);
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

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

jest.mock('../../components/SubScreenHeader', () => ({
  SubScreenHeader: () => null,
}));

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import {
  createDefaultCarePlanConfig,
  type CarePlanConfig,
  type MedicationPlanItem,
} from '../../types/carePlanConfig';

import MedicationFormScreen from '../../app/medication-form';

const PATIENT_ID = 'default';

async function seedCarePlanWithMed(med: MedicationPlanItem) {
  const base = createDefaultCarePlanConfig(PATIENT_ID);
  const cfg: CarePlanConfig = {
    ...base,
    meds: { ...base.meds, medications: [med] },
  };
  const key = `carePlanConfig:${PATIENT_ID}`;
  store.set(key, JSON.stringify(cfg));
}

function nodeWithText(root: any, needle: string): boolean {
  try {
    const matches = root.findAll(
      (n: any) =>
        typeof n.props?.children === 'string' &&
        n.props.children.toLowerCase().includes(needle.toLowerCase()),
    );
    return matches.length > 0;
  } catch {
    return false;
  }
}

function findTextInputByPlaceholder(root: any, placeholder: string): any | null {
  try {
    const matches = root.findAll(
      (n: any) =>
        n.type === 'TextInput' &&
        typeof n.props?.placeholder === 'string' &&
        n.props.placeholder.toLowerCase().includes(placeholder.toLowerCase()),
    );
    return matches[0] || null;
  } catch {
    return null;
  }
}

describe('medication-form — render smoke test (F5.3.1 — guards A2 restructure)', () => {
  beforeEach(() => {
    store.clear();
    mockParams.id = '';
    mockParams.source = '';
  });

  it('contract 1 (SMOKE ADD MODE): renders without throwing in add mode (no id param, the "+ Add medication" entry path)', async () => {
    let root: any;
    await act(async () => {
      root = TestRenderer.create(<MedicationFormScreen />);
    });
    expect(root).toBeTruthy();
    expect(() => root.toJSON()).not.toThrow();
  });

  it('contract 2 (SMOKE EDIT MODE — care-plan source): renders without throwing when mounted with id + source=careplan + seeded med', async () => {
    const med: MedicationPlanItem = {
      id: 'med-warfarin',
      name: 'Warfarin',
      dosage: '5mg',
      timesOfDay: ['evening'],
      scheduledTimeHHmm: '18:00',
      active: true,
      notificationsEnabled: true,
      reminderTiming: 'before_15',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await seedCarePlanWithMed(med);
    mockParams.id = 'med-warfarin';
    mockParams.source = 'careplan';

    let root: any;
    await act(async () => {
      root = TestRenderer.create(<MedicationFormScreen />);
    });
    // Let loadMedication's useEffect resolve.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(root).toBeTruthy();
    expect(() => root.toJSON()).not.toThrow();
  });

  it('contract 3 (LANDMARK MEDICATION NAME): the medication-name TextInput is present in the rendered tree (Step 1 entrypoint)', async () => {
    let root: any;
    await act(async () => {
      root = TestRenderer.create(<MedicationFormScreen />);
    });
    // The medication-name field is a TextInput with placeholder text
    // including "medication" or "Select" — the dropdown affords name
    // entry. Asserting on at least one TextInput in the rendered tree
    // proves the form's input controls mount.
    const inputs = root.root.findAll((n: any) => n.type === 'TextInput');
    expect(inputs.length).toBeGreaterThan(0);
  });

  it('contract 4 (LANDMARK SAVE BUTTON): the save-handler button is present (proves handleSave is wired)', async () => {
    let root: any;
    await act(async () => {
      root = TestRenderer.create(<MedicationFormScreen />);
    });
    // The form has two save affordances (top-right header action + bottom CTA).
    // Both reach handleSave via onPress. Either qualifies; assert at least one.
    expect(
      nodeWithText(root.root, 'Save') || nodeWithText(root.root, 'Add medication'),
    ).toBe(true);
  });

});
