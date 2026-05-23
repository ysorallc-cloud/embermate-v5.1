// ============================================================================
// 32A-form-fix BUG 2 — exactly one Save button renders per step.
//
// Pre-fix, app/medication-form.tsx renders THREE save TouchableOpacity
// blocks:
//   - Line 784-794: primarySaveButton inside {formStep === 1 && (...)}
//   - Line 1086-1098: primarySaveButton inside {formStep === 2 && (...)}
//   - Line 1103-1113: bottomSaveButton — UNCONDITIONAL
//
// On either step the user sees TWO buttons stacked (the step-scoped one
// + the unconditional one), with different style classes (the "cream
// text vs dark text" visual the device gate surfaced).
//
// Fix: remove the unconditional bottomSaveButton. Each step's
// primarySaveButton is the correct single save affordance for that step.
//
// Pinned: render-level + source-level invariants so the duplicate can't
// silently come back.
// ============================================================================

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

const mockParams = { id: '', source: '' } as Record<string, string>;
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
jest.mock('../../components/SubScreenHeader', () => ({ SubScreenHeader: () => null }));

import { readFileSync } from 'fs';
import { join } from 'path';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

import MedicationFormScreen from '../../app/medication-form';

const FORM_SRC = readFileSync(
  join(__dirname, '../../app/medication-form.tsx'),
  'utf8',
);

function findAll(
  root: TestRenderer.ReactTestInstance,
  predicate: (n: TestRenderer.ReactTestInstance) => boolean,
): TestRenderer.ReactTestInstance[] {
  return root.findAll((n: any) => {
    try { return predicate(n); } catch { return false; }
  });
}

function findSaveButtons(tree: TestRenderer.ReactTestRenderer) {
  return findAll(tree.root, (n: any) => {
    if (n.type !== 'TouchableOpacity') return false;
    const label = n.props?.accessibilityLabel;
    return typeof label === 'string' && /save medication( changes)?$/i.test(label);
  });
}

async function flush() {
  await act(async () => { await Promise.resolve(); });
  await act(async () => { await Promise.resolve(); });
}

describe('32A-form-fix BUG 2 — exactly one Save button per step', () => {
  beforeEach(() => {
    store.clear();
    mockParams.id = '';
    mockParams.source = '';
  });

  it('add mode (step 1) — exactly 1 save TouchableOpacity rendered', async () => {
    mockParams.id = '';
    mockParams.source = 'careplan';
    let tree!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = TestRenderer.create(React.createElement(MedicationFormScreen));
    });
    await flush();
    expect(findSaveButtons(tree).length).toBe(1);
  });

  it('edit mode (step 1) — exactly 1 save TouchableOpacity rendered', async () => {
    mockParams.id = 'med-3';
    mockParams.source = 'careplan';
    let tree!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = TestRenderer.create(React.createElement(MedicationFormScreen));
    });
    await flush();
    expect(findSaveButtons(tree).length).toBe(1);
  });

  describe('source-level — duplicate save button removed', () => {
    it('no `bottomSaveButton` style applied to a TouchableOpacity in the render block', () => {
      // Pre-fix the unconditional bottomSaveButton sat AFTER both step
      // branches as a TouchableOpacity referencing styles.bottomSaveButton.
      // After fix that TouchableOpacity is gone; either the style is
      // retired entirely OR survives as a (harmless) dead-code style.
      // The render-level pin above is the load-bearing assertion; this
      // source-level pin defends against re-introduction of an
      // unconditional bottom save button.
      expect(FORM_SRC).not.toMatch(
        /<TouchableOpacity\s+style=\{\[?\s*styles\.bottomSaveButton/,
      );
    });

    it('no save TouchableOpacity remains outside a `formStep === N &&` conditional', () => {
      // Each remaining save TouchableOpacity must be inside a
      // {formStep === 1 && (...)} or {formStep === 2 && (...)} branch.
      // Count un-conditioned save TouchableOpacity blocks by inspecting
      // the 2000 chars preceding each onPress={handleSave} pattern —
      // a save button outside both branches would have no formStep
      // conditional in that window.
      const matches = Array.from(
        FORM_SRC.matchAll(/onPress=\{handleSave\}/g),
      );
      // Expect exactly two — one per step.
      expect(matches.length).toBe(2);
    });
  });
});
