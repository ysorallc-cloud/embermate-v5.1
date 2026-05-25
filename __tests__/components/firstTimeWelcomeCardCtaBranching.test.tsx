// ============================================================================
// Phase 5.13.4 — first-time welcome card CTA branching.
//
// Pre-fix the CTA hardcoded "Add a medication →" routing to /care-plan/meds.
// Templates that exclude meds (General Wellness, Mental Health Support) or
// users who already added a med landed on a screen that didn't help them
// configure the buckets they actually enabled. Branch by setup state:
//
//   medsBucketEnabled === true  &&  medicationCount === 0
//     → "Add a medication →"  /care-plan/meds  (unchanged for meds-first templates)
//
//   otherwise (meds disabled, OR meds enabled with ≥1 already added)
//     → "Open Care Plan →"    /care-plan
// ============================================================================

import React from 'react';

const ACCENT = '#5fb88a';
const CAREGIVER = '#aa8adc';
const TEXT_PRIMARY = '#fff';
const TEXT_SECONDARY = '#c4c1b3';
const TEXT_TERTIARY = '#6b7280';

let mockShouldShow = true;
let mockMarkSeen = jest.fn();
const mockNavigate = jest.fn();

jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return {
    ...actual,
    useMemo: (fn: any) => fn(),
    useState: (init: any) => [typeof init === 'function' ? init() : init, () => {}],
    useEffect: () => {},
    useCallback: (fn: any) => fn,
  };
});

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      accent: ACCENT,
      caregiverAccent: CAREGIVER,
      caregiverAccentFaint: 'rgba(170, 138, 220, 0.06)',
      caregiverAccentStrong: 'rgba(170, 138, 220, 0.25)',
      textPrimary: TEXT_PRIMARY,
      textSecondary: TEXT_SECONDARY,
      textTertiary: TEXT_TERTIARY,
      glass: '#363830',
      glassBorder: 'rgba(255,255,255,0.06)',
    },
  }),
}));

jest.mock('react-native', () => {
  const PT = (n: string) => n;
  return {
    View: PT('View'),
    Text: PT('Text'),
    TouchableOpacity: PT('TouchableOpacity'),
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
  };
});

jest.mock('../../hooks/useFirstRealMode', () => ({
  useFirstRealMode: () => ({
    shouldShow: mockShouldShow,
    markSeen: mockMarkSeen,
  }),
}));

jest.mock('../../lib/navigate', () => ({
  navigate: (...args: any[]) => mockNavigate(...args),
}));

import { FirstTimeWelcomeCard } from '../../components/now/FirstTimeWelcomeCard';

function flattenChildren(kids: any): any[] {
  if (kids == null) return [];
  if (Array.isArray(kids)) {
    const out: any[] = [];
    for (const k of kids) out.push(...flattenChildren(k));
    return out;
  }
  return [kids];
}
function findAll(node: any, predicate: (n: any) => boolean): any[] {
  if (!node || typeof node !== 'object') return [];
  const out: any[] = [];
  if (predicate(node)) out.push(node);
  for (const k of flattenChildren(node.props?.children)) {
    out.push(...findAll(k, predicate));
  }
  return out;
}
function textOf(node: any): string {
  const out: string[] = [];
  function walk(n: any) {
    if (n == null) return;
    if (typeof n === 'string') { out.push(n); return; }
    if (typeof n === 'number') { out.push(String(n)); return; }
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (n.props?.children !== undefined) walk(n.props.children);
  }
  walk(node);
  return out.join('');
}

beforeEach(() => {
  mockShouldShow = true;
  mockMarkSeen = jest.fn();
  mockNavigate.mockReset();
});

describe('Phase 5.13.4 — FirstTimeWelcomeCard CTA branching', () => {
  it('General Wellness (meds disabled): renders "Open Care Plan →" and routes to /care-plan', () => {
    const tree = FirstTimeWelcomeCard({
      patientName: 'Mom',
      caregiverName: 'Amber',
      summary: {
        appliedTemplateName: 'General Wellness',
        enabledBucketLabels: ['Meals', 'Water', 'Wellness', 'Sleep', 'Activity'],
        medicationCount: 0,
        medsBucketEnabled: false,
      },
    });
    expect(textOf(tree)).toMatch(/Open Care Plan/);
    expect(textOf(tree)).not.toMatch(/Add a medication/);

    const cta = findAll(tree, (n) => n.props?.testID === 'first-welcome-cta')[0];
    expect(cta).toBeDefined();
    cta.props.onPress();
    expect(mockNavigate).toHaveBeenCalledWith('/care-plan');
  });

  it('Aging in Place (meds enabled, 0 medications): renders "Add a medication →" and routes to /medication-form?source=careplan (Phase 32A.1 F7 reframe)', () => {
    // Pre-32A.1 F7: routed to the /care-plan/meds LIST subscreen,
    // where the user would then tap "+ Add medication" — two taps
    // total. F7 retired that subscreen and routes the meds-enabled-
    // zero-meds CTA DIRECTLY to /medication-form?source=careplan per
    // Q-32A.1.4 lock (one tap to add, not two).
    const tree = FirstTimeWelcomeCard({
      patientName: 'Mom',
      caregiverName: 'Amber',
      summary: {
        appliedTemplateName: 'Aging in Place',
        enabledBucketLabels: ['Medications', 'Vitals', 'Meals', 'Wellness'],
        medicationCount: 0,
        medsBucketEnabled: true,
      },
    });
    expect(textOf(tree)).toMatch(/Add a medication/);
    expect(textOf(tree)).not.toMatch(/Open Care Plan/);

    const cta = findAll(tree, (n) => n.props?.testID === 'first-welcome-cta')[0];
    expect(cta).toBeDefined();
    cta.props.onPress();
    expect(mockNavigate).toHaveBeenCalledWith('/medication-form?source=careplan');
  });

  it('Aging in Place (meds enabled, ≥1 medication): renders "Open Care Plan →" and routes to /care-plan', () => {
    const tree = FirstTimeWelcomeCard({
      patientName: 'Mom',
      caregiverName: 'Amber',
      summary: {
        appliedTemplateName: 'Aging in Place',
        enabledBucketLabels: ['Medications', 'Vitals', 'Meals', 'Wellness'],
        medicationCount: 1,
        medsBucketEnabled: true,
      },
    });
    expect(textOf(tree)).toMatch(/Open Care Plan/);
    expect(textOf(tree)).not.toMatch(/Add a medication/);

    const cta = findAll(tree, (n) => n.props?.testID === 'first-welcome-cta')[0];
    cta.props.onPress();
    expect(mockNavigate).toHaveBeenCalledWith('/care-plan');
  });

  it('Start blank (no template, meds disabled): renders "Open Care Plan →"', () => {
    const tree = FirstTimeWelcomeCard({
      patientName: 'Mom',
      caregiverName: 'Amber',
      summary: {
        appliedTemplateName: undefined,
        enabledBucketLabels: ['Medications', 'Vitals'],
        medicationCount: 0,
        medsBucketEnabled: false,
      },
    });
    expect(textOf(tree)).toMatch(/Open Care Plan/);
    expect(textOf(tree)).not.toMatch(/Add a medication/);

    const cta = findAll(tree, (n) => n.props?.testID === 'first-welcome-cta')[0];
    cta.props.onPress();
    expect(mockNavigate).toHaveBeenCalledWith('/care-plan');
  });
});
