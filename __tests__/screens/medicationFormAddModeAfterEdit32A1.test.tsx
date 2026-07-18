// ============================================================================
// Phase 32A.1 STOP-C bug — tap "+ Add medication" after viewing an existing
// med opens /medication-form in EDIT mode with the previous med's data.
//
// User report (STOP C walk):
//   "Adding a NEW medication from the drawer opens /medication-form in EDIT
//    mode showing an existing med's data, instead of a blank ADD-mode form.
//    The add path is passing/retaining a med id (or not clearing edit state)
//    when it should open fresh."
//
// Reproduction sequence:
//   1. User taps an existing Metformin row → routes to
//      /medication-form?id=med-3&source=careplan (EDIT mode). Form reads
//      params.id, sets `isEditing=true`, loadMedication() populates state
//      with Metformin's name/dosage/etc.
//   2. User backs out to the drawer.
//   3. User taps "+ Add medication" → opens quick-add panel → taps
//      "Full form →" → navigates to /medication-form?source=careplan (NO id,
//      ADD mode expected).
//   4. expo-router reuses the same Stack.Screen instance for the
//      "medication-form" route, so the component instance persists. New
//      params have no id → `isEditing=false`. But the useEffect at
//      medication-form.tsx:268-272 only calls loadMedication() WHEN
//      isEditing is true — it has no else-branch to reset state. So
//      name/dosage/etc. retain Metformin's data from the previous mount.
//
// Fix surface: the [medId, isCarePlanSource] useEffect must reset state
// to defaults when isEditing transitions to false, so add-mode opens
// blank regardless of prior mount history.
//
// Two contracts here:
//   1. Source pin — the form's add-mode-reset path exists in source.
//   2. Behavioral pin — two-mount sequence: mount edit (Metformin
//      populates), unmount, mount add (no id) → fields blank.
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
  useLocalSearchParams: () => {
    // useLocalSearchParams must return ONLY the keys actually present so
    // `params.id as string | undefined` resolves to undefined in add mode.
    const out: Record<string, string> = {};
    if (mockParams.id) out.id = mockParams.id;
    if (mockParams.source) out.source = mockParams.source;
    return out;
  },
}));

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      glass: '#363830', glassBorder: 'rgba(255,255,255,0.06)', glassFaint: '#222',
      glassStrong: '#444', glassActive: '#555', glassHover: '#333',
      accent: '#5fb88a', accentMuted: 'rgba(95,184,138,0.5)',
      accentBorder: 'rgba(95,184,138,0.3)', accentDim: 'rgba(95,184,138,0.1)',
      caregiverAccent: '#aa8adc',
      textPrimary: '#fff', textSecondary: '#9aa0a6', textTertiary: '#6b7280',
      textHalf: '#888', textMuted: '#666',
      background: '#1a1612', backgroundGradientStart: '#1a1612', backgroundGradientEnd: '#1a1612',
      switchThumbOff: '#888', criticalAlert: '#e6776e',
      hairlineInset: '#444', error: '#e6776e', orange: '#e5a86e',
    },
  }),
}));

jest.mock('../../lib/events', () => ({ emitDataUpdate: jest.fn() }));
jest.mock('../../utils/devLog', () => ({ logError: () => {}, devLog: () => {} }));

jest.mock('react-native', () => {
  const React = require('react');
  const PT = (n: string) => ({ children, ...props }: any) =>
    React.createElement(n, props, children);
  const AnimatedValue = function (this: any, v: number) { (this as any).value = v; };
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
import {
  saveCarePlanConfig,
} from '../../storage/carePlanConfigRepo';
import {
  createDefaultCarePlanConfig,
  type CarePlanConfig,
  type MedicationPlanItem,
} from '../../types/carePlanConfig';

import MedicationFormScreen from '../../app/medication-form';

const PATIENT_ID = 'default';
const ROOT = join(__dirname, '../..');
const FORM_SRC = readFileSync(join(ROOT, 'app/medication-form.tsx'), 'utf8');

async function seedMetformin() {
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

function collectText(root: TestRenderer.ReactTestInstance): string[] {
  const out: string[] = [];
  function walk(node: any) {
    if (!node) return;
    if (typeof node === 'string' || typeof node === 'number') {
      out.push(String(node));
      return;
    }
    if (Array.isArray(node)) { node.forEach(walk); return; }
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
  await act(async () => { await Promise.resolve(); });
  await act(async () => { await Promise.resolve(); });
  await act(async () => { await Promise.resolve(); });
}

describe('Phase 32A.1 STOP-C bug — add-mode opens blank, never inherits prior edit state', () => {
  beforeEach(async () => {
    store.clear();
    mockParams.id = '';
    mockParams.source = '';
    await seedMetformin();
  });

  // --------------------------------------------------------------------------
  // Source-level pin — the add-mode reset path exists.
  // --------------------------------------------------------------------------

  it('contract 1: the [medId, isCarePlanSource] useEffect resets form state when isEditing transitions to false', () => {
    // Pre-fix: the useEffect only fires loadMedication() when isEditing
    // is true — it has no else-branch. After F7 retired the meds.tsx
    // subscreen, the most common user flow (tap existing med → back →
    // tap "+ Add medication") routes the SAME form-screen instance
    // from edit-with-params to add-without-params; state from the
    // previous mount persists.
    //
    // The fix adds an else-branch (or equivalent reset call) that
    // clears name/dosage/etc. when medId becomes undefined. Pin its
    // presence so the regression can't silently come back.
    const stripped = FORM_SRC
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/[^\n]*/g, '');
    // Anchor on the useEffect that watches [medId, isCarePlanSource].
    // Pull a 1000-char window starting at the useEffect declaration —
    // captures both the if-branch (loadMedication) and the new else /
    // reset path the fix adds.
    // The dep array leads with [medId, isCarePlanSource, …]; Piece 2 appended
    // prefillName/prefillDosage so the reset re-seeds from prefill params.
    const idx = stripped.search(/useEffect\(\s*\(\s*\)\s*=>\s*\{[\s\S]*?\}\s*,\s*\[\s*medId\s*,\s*isCarePlanSource\b[^\]]*\]/);
    expect(idx).toBeGreaterThan(-1);
    const window = stripped.slice(idx, idx + 1200);
    // The reset path must blank the visible name field. Piece 2 (Shape 1)
    // reframed the literal setName('') to setName(prefillName ?? '') so the
    // medication-confirm custom-add flow can pre-seed the name — but it still
    // blanks to '' on a normal add (no prefill). Accept both: a setName call
    // whose argument terminates in an empty string literal.
    expect(window).toMatch(/setName\s*\([^)]*['"`]\s*['"`]\s*\)/);
  });

  // --------------------------------------------------------------------------
  // Behavioral pin — two-mount sequence proves the reset works at runtime.
  // --------------------------------------------------------------------------

  it('contract 2: SAME-INSTANCE re-render — edit-mode → add-mode (no id) clears fields back to defaults', async () => {
    // This simulates the bug's actual reproduction path: expo-router
    // reuses the same MedicationFormScreen instance when the user
    // navigates from /medication-form?id=med-3 (edit) back, then to
    // /medication-form?source=careplan (add). useLocalSearchParams
    // returns new params, the useEffect's [medId, isCarePlanSource]
    // deps detect the change and fire — but pre-fix the effect only
    // had an if-branch (loadMedication when isEditing), so the prior
    // state lingered.
    //
    // We force the SAME component instance to re-render with new
    // params by mutating the mock + calling TestRenderer's update().
    // unmount+create would NOT reproduce the bug — that gives a fresh
    // instance with useState defaults; the bug only manifests when
    // the instance is reused.

    // First render — EDIT with Metformin.
    mockParams.id = 'med-3';
    mockParams.source = 'careplan';
    let tree!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = TestRenderer.create(React.createElement(MedicationFormScreen));
    });
    await flush();
    expect(collectText(tree.root).join(' | ')).toContain('Metformin');

    // Mutate params to add-mode (clear id) and re-render the SAME
    // instance via tree.update(). useLocalSearchParams will return
    // the new params on the next render.
    mockParams.id = '';
    mockParams.source = 'careplan';
    await act(async () => {
      tree.update(React.createElement(MedicationFormScreen));
    });
    await flush();

    const text = collectText(tree.root).join(' | ');
    // Add-mode after edit-mode (same instance) must reset to defaults.
    expect(text).not.toContain('Metformin');
    expect(text).toContain('Select medication...');
    // Save button label flips: "Save Medication" (add), not "Save Changes" (edit).
    expect(text).toContain('Save Medication');
    expect(text).not.toContain('Save Changes');
  });

  // --------------------------------------------------------------------------
  // Regression guard — tap-existing-med STILL opens in edit mode pre-filled
  // --------------------------------------------------------------------------

  it('contract 3 (regression): edit-mode mount with id=med-3 still pre-fills Metformin', async () => {
    mockParams.id = 'med-3';
    mockParams.source = 'careplan';
    let tree!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = TestRenderer.create(React.createElement(MedicationFormScreen));
    });
    await flush();

    const text = collectText(tree.root).join(' | ');
    expect(text).toContain('Metformin');
    expect(text).not.toContain('Select medication...');
    expect(text).toContain('Save Changes');
  });
});
