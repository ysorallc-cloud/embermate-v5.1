// ============================================================================
// Phase 5.13.e — first-time welcome card (Now tab).
//
// Renders once after wizard completion (5.13.d sets the flag), then
// auto-dismisses by flipping the flag to 'true' on first render. Mounted
// at the top of Now between NowHeader and the SampleModeBanner.
// ============================================================================

import React from 'react';

const ACCENT = '#5fb88a';
const CAREGIVER = '#aa8adc';
const TEXT_PRIMARY = '#fff';
const TEXT_SECONDARY = '#c4c1b3';
const TEXT_TERTIARY = '#6b7280';

let mockShouldShow = true;
let mockMarkSeen = jest.fn();

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
  navigate: jest.fn(),
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
});

// Phase 5.13.2 — every call now supplies a summary prop. Default to an
// empty config (no template, no meds, no buckets) and override per test.
// Phase 5.13.4 added medsBucketEnabled.
const baseSummary = {
  appliedTemplateName: undefined as string | undefined,
  enabledBucketLabels: [] as string[],
  medicationCount: 0,
  medsBucketEnabled: false,
};

describe('FirstTimeWelcomeCard — visibility', () => {
  it('renders when shouldShow is true', () => {
    const tree = FirstTimeWelcomeCard({ patientName: 'Mom', caregiverName: 'Linda', summary: baseSummary });
    expect(tree).not.toBeNull();
  });

  it('returns null when shouldShow is false', () => {
    mockShouldShow = false;
    const tree = FirstTimeWelcomeCard({ patientName: 'Mom', caregiverName: 'Linda', summary: baseSummary });
    expect(tree).toBeNull();
  });
});

describe('FirstTimeWelcomeCard — content', () => {
  it('greets the caregiver by name when provided', () => {
    const tree = FirstTimeWelcomeCard({ patientName: 'Mom', caregiverName: 'Linda', summary: baseSummary });
    expect(textOf(tree)).toMatch(/Welcome,\s*Linda/);
  });

  it('falls back to a generic "Welcome." when caregiver name is empty', () => {
    const tree = FirstTimeWelcomeCard({ patientName: 'Mom', caregiverName: '', summary: baseSummary });
    const txt = textOf(tree);
    expect(txt).toMatch(/Welcome\./);
    expect(txt).not.toMatch(/Welcome,/);
  });

  it("mentions the patient by name in the body", () => {
    const tree = FirstTimeWelcomeCard({ patientName: 'Mom', caregiverName: 'Linda', summary: baseSummary });
    expect(textOf(tree)).toMatch(/Mom/);
  });

  it('renders the "Add a medication" CTA copy when meds bucket is enabled and no meds yet', () => {
    // Phase 5.13.4 — CTA copy now branches by setup state. Pre-5.13.4 it
    // was always "Add a medication". This case (meds enabled, count 0)
    // is the only path that still routes there; deeper CTA-branching
    // contracts live in firstTimeWelcomeCardCtaBranching.test.tsx.
    const tree = FirstTimeWelcomeCard({
      patientName: 'Mom',
      caregiverName: 'Linda',
      summary: { ...baseSummary, medsBucketEnabled: true },
    });
    expect(textOf(tree)).toMatch(/Add a medication/);
  });
});

describe('FirstTimeWelcomeCard — Phase 5.13.2 summary', () => {
  it('echoes the template name as the first bullet when applied', () => {
    const tree = FirstTimeWelcomeCard({
      patientName: 'Mom',
      caregiverName: 'Amber',
      summary: {
        appliedTemplateName: 'Aging in Place',
        enabledBucketLabels: ['Medications', 'Vitals', 'Meals', 'Wellness'],
        medicationCount: 3,
        medsBucketEnabled: true,
      },
    });
    const txt = textOf(tree);
    expect(txt).toMatch(/Aging in Place template applied/);
    // Template line precedes buckets line.
    expect(txt.indexOf('template applied')).toBeLessThan(txt.indexOf('tracked'));
  });

  it('lists enabled buckets joined as a comma list followed by "tracked"', () => {
    const tree = FirstTimeWelcomeCard({
      patientName: 'Mom',
      caregiverName: 'Amber',
      summary: {
        appliedTemplateName: 'Aging in Place',
        enabledBucketLabels: ['Medications', 'Vitals', 'Meals', 'Wellness'],
        medicationCount: 3,
        medsBucketEnabled: true,
      },
    });
    expect(textOf(tree)).toMatch(/Medications, vitals, meals, wellness tracked/);
  });

  it('includes a medication count line when medicationCount > 0', () => {
    const tree = FirstTimeWelcomeCard({
      patientName: 'Mom',
      caregiverName: 'Amber',
      summary: {
        appliedTemplateName: 'Aging in Place',
        enabledBucketLabels: ['Medications', 'Vitals'],
        medicationCount: 3,
        medsBucketEnabled: true,
      },
    });
    expect(textOf(tree)).toMatch(/3 medications added/);
  });

  it('uses the singular form for medicationCount === 1', () => {
    const tree = FirstTimeWelcomeCard({
      patientName: 'Mom',
      caregiverName: 'Amber',
      summary: {
        appliedTemplateName: 'Aging in Place',
        enabledBucketLabels: ['Medications'],
        medicationCount: 1,
        medsBucketEnabled: true,
      },
    });
    const txt = textOf(tree);
    expect(txt).toMatch(/1 medication added/);
    expect(txt).not.toMatch(/medications added/);
  });

  it('omits the medication count line when medicationCount === 0', () => {
    const tree = FirstTimeWelcomeCard({
      patientName: 'Mom',
      caregiverName: 'Amber',
      summary: {
        appliedTemplateName: 'Aging in Place',
        enabledBucketLabels: ['Medications', 'Vitals'],
        medicationCount: 0,
        medsBucketEnabled: true,
      },
    });
    expect(textOf(tree)).not.toMatch(/medication added/);
  });

  it('omits the template line when appliedTemplateName is undefined ("Start blank" path)', () => {
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
    expect(textOf(tree)).not.toMatch(/template applied/);
  });

  it('renders an action prompt instead of the meds count for the Start blank path', () => {
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
    expect(textOf(tree)).toMatch(/Add medications, vitals readings, and notes from the schedule below/);
  });

  it('opens the body with "<patient>\'s care plan is set:"', () => {
    const tree = FirstTimeWelcomeCard({
      patientName: 'Mom',
      caregiverName: 'Amber',
      summary: baseSummary,
    });
    expect(textOf(tree)).toMatch(/Mom['’]s care plan is set:/);
  });
});

describe('FirstTimeWelcomeCard — interactions', () => {
  it('tapping the primary CTA marks the card as seen', () => {
    const tree = FirstTimeWelcomeCard({ patientName: 'Mom', caregiverName: 'Linda', summary: baseSummary });
    const cta = findAll(tree, (n) => n.props?.testID === 'first-welcome-cta')[0];
    expect(cta).toBeDefined();
    cta.props.onPress();
    expect(mockMarkSeen).toHaveBeenCalledTimes(1);
  });

  it('tapping the dismiss affordance marks the card as seen', () => {
    const tree = FirstTimeWelcomeCard({ patientName: 'Mom', caregiverName: 'Linda', summary: baseSummary });
    const dismiss = findAll(tree, (n) => n.props?.testID === 'first-welcome-dismiss')[0];
    expect(dismiss).toBeDefined();
    dismiss.props.onPress();
    expect(mockMarkSeen).toHaveBeenCalledTimes(1);
  });
});

describe('FirstTimeWelcomeCard — Now mounting', () => {
  const { readFileSync } = require('fs');
  const { join } = require('path');
  const nowSrc = readFileSync(
    join(__dirname, '../..', 'app/(tabs)/now.tsx'),
    'utf8',
  );

  it('Now imports FirstTimeWelcomeCard', () => {
    expect(nowSrc).toMatch(
      /import\s+\{\s*FirstTimeWelcomeCard\s*\}\s+from\s+['"][^'"]+FirstTimeWelcomeCard['"]/,
    );
  });

  it('Now mounts FirstTimeWelcomeCard after NowHeader (F7 zone restructure)', () => {
    // Pre-F7 order: NowHeader → FirstTimeWelcomeCard → SampleModeBanner.
    // F7 reshuffle: the SampleModeBanner whisper line moves directly
    // beneath NowHeader so the sample-mode state reads right after the
    // date row. FirstTimeWelcomeCard now sits AFTER SampleModeBanner;
    // both still null-render in their respective non-applicable states
    // so the visible cadence on first paint is unchanged for users
    // who aren't in sample mode or aren't first-time-launching.
    const header = nowSrc.indexOf('<NowHeader');
    const welcome = nowSrc.indexOf('<FirstTimeWelcomeCard');
    const banner = nowSrc.indexOf('<SampleModeBanner');
    expect(header).toBeGreaterThan(-1);
    expect(banner).toBeGreaterThan(header);
    expect(welcome).toBeGreaterThan(banner);
  });
});
