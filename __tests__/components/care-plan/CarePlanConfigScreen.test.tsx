// ============================================================================
// Phase 10.1 — CarePlanConfigScreen layout primitive contract.
//
// Same shape as LogScreen but with a chrome variant prop. The four
// chrome variants reflect distinct UX signals already established in
// the Care Plan family (per 10.0 audit):
//
//   • gradient        — bucket-config family (flat warm-charcoal page)
//   • aurora-care     — coordination screens (errands, shifts)
//   • aurora-support  — self-care screen
//   • aurora-log      — regimen-management screens (manage)
//
// Stripping the Aurora variants to match the gradient bucket configs
// would erase intentional UX signals; the primitive preserves them
// and lets each consumer declare which one fits.
//
// Pinned contracts:
//
//   1.  Header row contains exactly one back button + title + optional
//       subtitle. Same compact-header rhythm LogScreen established.
//   2.  Subtitle slot omitted when subtitle prop is undefined.
//   3.  Chrome variant 'gradient' (default) renders no AuroraBackground.
//   4.  Each aurora-* variant renders AuroraBackground with the
//       corresponding variant prop.
//   5.  Children render inside a ScrollView body.
//   6.  Back tap fires onBack.
//   7.  No orange-family hex literals in the primitive's source.
//   8.  No patient-name interpolation (the primitive is patient-agnostic).
// ============================================================================

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { readFileSync } from 'fs';
import { join } from 'path';

const themeColors = {
  background: '#1f201c',
  glass: '#363830',
  glassBorder: 'rgba(255, 240, 215, 0.08)',
  glassHover: 'rgba(255, 245, 220, 0.06)',
  accent: '#5fb88a',
  caregiverAccent: '#aa8adc',
  criticalAlert: '#e6776e',
  textPrimary: '#fff',
  textSecondary: '#c4c1b3',
  textTertiary: '#8a8a82',
};

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ resolvedTheme: 'dark', colors: themeColors }),
}));

jest.mock('react-native', () => {
  const PT = (n: string) => n;
  return {
    View: PT('View'),
    Text: PT('Text'),
    TouchableOpacity: PT('TouchableOpacity'),
    Pressable: PT('Pressable'),
    ScrollView: PT('ScrollView'),
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
  };
});

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, style }: any) =>
    require('react').createElement('SafeAreaView', { style }, children),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
  usePathname: () => '/care-plan/x',
}));

jest.mock('../../../lib/navigate', () => ({
  navigateReplace: jest.fn(),
}));

// AuroraBackground is mocked to a plain Type so the chrome assertions
// can read off props.variant without rendering the actual component.
jest.mock('../../../components/aurora/AuroraBackground', () => ({
  AuroraBackground: 'AuroraBackground',
}));

import { CarePlanConfigScreen } from '../../../components/care-plan/CarePlanConfigScreen';

function findAll(
  root: TestRenderer.ReactTestInstance,
  predicate: (n: any) => boolean,
): TestRenderer.ReactTestInstance[] {
  return root.findAll((n: any) => {
    try { return predicate(n); } catch { return false; }
  });
}

function styleOf(node: TestRenderer.ReactTestInstance): Record<string, any> {
  const s = (node.props as any)?.style;
  const arr = Array.isArray(s) ? s : [s];
  return Object.assign({}, ...arr.filter(Boolean));
}

function render(extra: Partial<React.ComponentProps<typeof CarePlanConfigScreen>> = {}) {
  const defaults = {
    title: 'Vitals',
    onBack: jest.fn(),
    children: React.createElement('Text', { testID: 'consumer-content' }, 'consumer content'),
  };
  let root: TestRenderer.ReactTestRenderer | null = null;
  act(() => {
    root = TestRenderer.create(
      React.createElement(CarePlanConfigScreen as any, { ...defaults, ...extra }),
    );
  });
  return root!;
}

// ----------------------------------------------------------------------------
// Header contract
// ----------------------------------------------------------------------------

describe('Phase 10.1 — CarePlanConfigScreen header', () => {
  it('contract 1: renders exactly one back button', () => {
    const tree = render();
    const backs = findAll(
      tree.root,
      (n) => n.props?.testID === 'careplan-config-back',
    );
    expect(backs).toHaveLength(1);
  });

  it('contract 1: renders the title text', () => {
    const tree = render({ title: 'Vitals' });
    const title = findAll(
      tree.root,
      (n) => n.props?.testID === 'careplan-config-title',
    )[0];
    expect(title).toBeDefined();
    expect(title.props.children).toBe('Vitals');
  });

  it('contract 1: renders the subtitle when supplied', () => {
    const tree = render({ subtitle: 'Set up the bucket.' });
    const sub = findAll(
      tree.root,
      (n) => n.props?.testID === 'careplan-config-subtitle',
    )[0];
    expect(sub).toBeDefined();
    expect(sub.props.children).toBe('Set up the bucket.');
  });

  it('contract 2: omits the subtitle slot when subtitle is undefined', () => {
    const tree = render();
    const sub = findAll(
      tree.root,
      (n) => n.props?.testID === 'careplan-config-subtitle',
    );
    expect(sub).toHaveLength(0);
  });

  it('contract 6: back tap fires onBack', () => {
    const onBack = jest.fn();
    const tree = render({ onBack });
    const back = findAll(
      tree.root,
      (n) => n.props?.testID === 'careplan-config-back',
    )[0];
    back.props.onPress();
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

// ----------------------------------------------------------------------------
// Chrome variants
// ----------------------------------------------------------------------------

describe('Phase 10.1 — CarePlanConfigScreen chrome variants', () => {
  it('contract 3: default chrome (gradient) renders no AuroraBackground', () => {
    const tree = render();
    const aurora = findAll(tree.root, (n) => n.type === 'AuroraBackground');
    expect(aurora).toHaveLength(0);
  });

  it('contract 3: chrome="gradient" renders no AuroraBackground', () => {
    const tree = render({ chrome: 'gradient' });
    const aurora = findAll(tree.root, (n) => n.type === 'AuroraBackground');
    expect(aurora).toHaveLength(0);
  });

  it('contract 4: chrome="aurora-care" renders AuroraBackground variant="care"', () => {
    const tree = render({ chrome: 'aurora-care' });
    const aurora = findAll(tree.root, (n) => n.type === 'AuroraBackground')[0];
    expect(aurora).toBeDefined();
    expect(aurora.props.variant).toBe('care');
  });

  it('contract 4: chrome="aurora-support" renders AuroraBackground variant="support"', () => {
    const tree = render({ chrome: 'aurora-support' });
    const aurora = findAll(tree.root, (n) => n.type === 'AuroraBackground')[0];
    expect(aurora).toBeDefined();
    expect(aurora.props.variant).toBe('support');
  });

  it('contract 4: chrome="aurora-log" renders AuroraBackground variant="log"', () => {
    const tree = render({ chrome: 'aurora-log' });
    const aurora = findAll(tree.root, (n) => n.type === 'AuroraBackground')[0];
    expect(aurora).toBeDefined();
    expect(aurora.props.variant).toBe('log');
  });
});

// ----------------------------------------------------------------------------
// Children
// ----------------------------------------------------------------------------

describe('Phase 10.1 — CarePlanConfigScreen children', () => {
  it('contract 5: renders children inside a ScrollView body', () => {
    const tree = render();
    const consumer = findAll(
      tree.root,
      (n) => n.props?.testID === 'consumer-content',
    )[0];
    expect(consumer).toBeDefined();
    // Walk up to find the nearest ScrollView ancestor. The react-test-
    // renderer typings declare `type` as ElementType, but our mocked
    // react-native emits a bare string at runtime — cast at the
    // comparison so tsc sees the overlap.
    let node: TestRenderer.ReactTestInstance | null = consumer;
    let foundScrollView = false;
    while (node) {
      if ((node.type as unknown as string) === 'ScrollView') { foundScrollView = true; break; }
      node = node.parent ?? null;
    }
    expect(foundScrollView).toBe(true);
  });
});

// ----------------------------------------------------------------------------
// Source-level contracts
// ----------------------------------------------------------------------------

describe('Phase 10.1 — CarePlanConfigScreen source-level audits', () => {
  const SRC = readFileSync(
    join(__dirname, '../../..', 'components/care-plan/CarePlanConfigScreen.tsx'),
    'utf8',
  );

  // Strip comments so audits don't false-match on documentation prose.
  const codeOnly = (() => {
    const lines = SRC.split('\n'); let inBlock = false; const out: string[] = [];
    for (const line of lines) {
      let l = line;
      if (inBlock) { const e = l.indexOf('*/'); if (e >= 0) { inBlock = false; l = l.slice(e + 2); } else continue; }
      const bs = l.indexOf('/*');
      if (bs >= 0) { const be = l.indexOf('*/', bs + 2); if (be >= 0) l = l.slice(0, bs) + l.slice(be + 2); else { inBlock = true; l = l.slice(0, bs); } }
      const lc = l.indexOf('//'); if (lc >= 0) l = l.slice(0, lc);
      out.push(l);
    }
    return out.join('\n');
  })();

  it('contract 7: no orange-family hex literals in source', () => {
    expect(codeOnly).not.toMatch(/#FF8C42|#F97316|#EA580C|#FB7185|#FFA500|#FB923C/i);
  });

  it('contract 8: no patient-name interpolation (the primitive is patient-agnostic)', () => {
    // The Care Plan-config family drops decorative AND substantive
    // patient-name interpolation. The primitive itself must not
    // introduce any.
    expect(codeOnly).not.toMatch(/\$\{[a-zA-Z_]*[Pp]atient[A-Za-z]*\}/);
    expect(codeOnly).not.toMatch(/\bpatientName\b/);
    expect(codeOnly).not.toMatch(/\bactivePatient\b/);
    expect(codeOnly).not.toMatch(/\busePatient\b/);
  });

  it('exports the expected typed prop interface', () => {
    expect(SRC).toMatch(/export interface CarePlanConfigScreenProps/);
    expect(SRC).toMatch(/title:\s*string/);
    expect(SRC).toMatch(/subtitle\?:\s*string/);
    expect(SRC).toMatch(/onBack:\s*\(\)\s*=>\s*void/);
    expect(SRC).toMatch(/chrome\?:\s*['"`]?gradient['"`]?\s*\|\s*['"`]?aurora-care['"`]?/);
  });
});
