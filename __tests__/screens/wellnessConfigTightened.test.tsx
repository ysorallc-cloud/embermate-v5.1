// ============================================================================
// Phase 10.2 — wellness config tightened.
//
// Pre-10.2 the screen used SubScreenHeader + LinearGradient, echoed the
// patient name in 9 places (5 evening + 2 morning field descriptions
// plus a getMorningOptionalFields(patient) and getEveningOptionalFields(patient)
// helper signature), rendered "Core" badges per always-on row, expanded
// the Evening section by default, and carried per-row description prose
// that read like a clinician's chart.
//
// Post-10.2:
//   • Wraps in CarePlanConfigScreen with chrome="gradient".
//   • Zero patient-name interpolation. Both decorative (subtitle) and
//     substantive (field descriptions) name echoes are gone.
//   • Section structure replaces per-row badges. Eyebrows
//     "ALWAYS TRACKED" and "ADD MORE" communicate the lock state.
//   • Evening section collapsed by default. Tapping the header expands
//     the body inline.
//   • Optional rows are label + toggle only. No description prose.
// ============================================================================

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { readFileSync } from 'fs';
import { join } from 'path';

const themeColors = {
  background: '#1f201c',
  glass: '#363830',
  glassFaint: 'rgba(255, 240, 215, 0.03)',
  glassActive: 'rgba(255, 240, 215, 0.04)',
  glassHover: 'rgba(255, 245, 220, 0.06)',
  glassStrong: 'rgba(255, 240, 215, 0.10)',
  glassBorder: 'rgba(255, 240, 215, 0.08)',
  accent: '#5fb88a',
  accentLight: 'rgba(95, 184, 138, 0.15)',
  accentBorder: 'rgba(95, 184, 138, 0.25)',
  caregiverAccent: '#aa8adc',
  caregiverAccentMuted: 'rgba(170, 138, 220, 0.15)',
  caregiverAccentStrong: 'rgba(170, 138, 220, 0.25)',
  caregiverAccentText: '#aa8adc',
  criticalAlert: '#e6776e',
  textPrimary: '#fff',
  textSecondary: '#c4c1b3',
  textTertiary: '#8a8a82',
  textHalf: '#a5a59a',
  textMuted: '#9aa0a6',
  border: 'rgba(255, 240, 215, 0.08)',
  surfaceAlt: '#2a2c25',
  switchThumbOff: '#9aa0a6',
  sageFaint: 'rgba(95, 184, 138, 0.06)',
  backgroundElevated: '#2a2c25',
};

jest.mock('../../contexts/ThemeContext', () => ({
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
    Switch: PT('Switch'),
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
    Platform: { OS: 'ios' },
  };
});

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, style }: any) =>
    require('react').createElement('SafeAreaView', { style }, children),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
  usePathname: () => '/care-plan/wellness',
}));

jest.mock('../../lib/navigate', () => ({
  navigateBack: jest.fn(),
  navigate: jest.fn(),
  navigateReplace: jest.fn(),
}));

jest.mock('../../components/aurora/AuroraBackground', () => ({
  AuroraBackground: 'AuroraBackground',
}));

const mockUpdateSettings = jest.fn(async () => {});
jest.mock('../../hooks/useWellnessSettings', () => ({
  useWellnessSettings: () => ({
    settings: {
      morning: {
        time: '08:00',
        reminderEnabled: false,
        optionalChecks: { orientation: false, decisionMaking: false },
      },
      evening: {
        time: '20:00',
        reminderEnabled: false,
        optionalChecks: {
          painLevel: false,
          alertness: false,
          bowelMovement: false,
          bathingStatus: false,
          mobilityStatus: false,
        },
      },
    },
    updateSettings: mockUpdateSettings,
  }),
}));

jest.mock('../../contexts/PatientContext', () => ({
  usePatient: () => ({ activePatient: { id: 'mom', name: 'Mom' } }),
}));

import WellnessConfigScreen from '../../app/care-plan/wellness';

function findAll(
  root: TestRenderer.ReactTestInstance,
  predicate: (n: TestRenderer.ReactTestInstance) => boolean,
): TestRenderer.ReactTestInstance[] {
  return root.findAll((n: any) => {
    try { return predicate(n); } catch { return false; }
  });
}

function flattenText(n: TestRenderer.ReactTestInstance): string {
  const out: string[] = [];
  function walk(node: any) {
    if (node == null) return;
    if (typeof node === 'string') { out.push(node); return; }
    if (typeof node === 'number') { out.push(String(node)); return; }
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (node.children !== undefined) walk(node.children);
    if (node.props?.children !== undefined) walk(node.props.children);
  }
  walk(n);
  return out.join('');
}

function render(): TestRenderer.ReactTestRenderer {
  let root: TestRenderer.ReactTestRenderer | null = null;
  act(() => {
    root = TestRenderer.create(React.createElement(WellnessConfigScreen as any));
  });
  return root!;
}

beforeEach(() => {
  mockUpdateSettings.mockReset();
});

// ----------------------------------------------------------------------------
// Source-level audits
// ----------------------------------------------------------------------------

describe('Phase 10.2 — wellness source-level', () => {
  const SRC = readFileSync(
    join(__dirname, '../..', 'app/care-plan/wellness.tsx'),
    'utf8',
  );

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

  it('contract 1: imports CarePlanConfigScreen', () => {
    expect(SRC).toMatch(/import\s*\{\s*CarePlanConfigScreen\s*\}\s*from\s*['"][^'"]+\/components\/care-plan\/CarePlanConfigScreen['"]/);
  });

  it('contract 1: uses CarePlanConfigScreen as the wrapper', () => {
    expect(SRC).toMatch(/<CarePlanConfigScreen[\s\S]*?>[\s\S]*?<\/CarePlanConfigScreen>/);
  });

  it('contract 1: chrome="gradient" (the bucket-config family)', () => {
    expect(SRC).toMatch(/chrome=['"`]gradient['"`]/);
  });

  it('drops legacy SubScreenHeader + LinearGradient imports', () => {
    expect(codeOnly).not.toMatch(/SubScreenHeader/);
    expect(codeOnly).not.toMatch(/LinearGradient/);
  });

  it('drops usePatient — the screen no longer needs the patient name', () => {
    expect(codeOnly).not.toMatch(/\busePatient\b/);
  });

  it('contract 2: no patient-name interpolation in source', () => {
    // Strongest regression pin per spec. Both decorative and
    // substantive name echoes are out.
    expect(codeOnly).not.toMatch(/\$\{[a-zA-Z_]*[Pp]atient[A-Za-z]*\}/);
    expect(codeOnly).not.toMatch(/\$\{patient\}/);
    expect(codeOnly).not.toMatch(/\bpatientName\b/);
    expect(codeOnly).not.toMatch(/\bactivePatient\b/);
  });

  it('contract 3: no "Track {name} ..." or "Note {name} ..." patterns', () => {
    expect(codeOnly).not.toMatch(/['"`]Track\s+\$\{/);
    expect(codeOnly).not.toMatch(/['"`]Note\s+\$\{/);
  });

  it('contract 9: no orange-family hex literals', () => {
    expect(codeOnly).not.toMatch(/#FF8C42|#F97316|#EA580C|#FB7185|#FFA500|#FB923C/i);
  });
});

// ----------------------------------------------------------------------------
// Behaviour
// ----------------------------------------------------------------------------

describe('Phase 10.2 — wellness behavior', () => {
  it('contract 4: optional rows render label + switch only — no description prose siblings', () => {
    const tree = render();
    // Each optional row exposes testID="wellness-optional-row-<key>" and
    // contains exactly one Text (the label) plus the Switch toggle.
    const rows = findAll(
      tree.root,
      (n) => typeof n.props?.testID === 'string' && /^wellness-optional-row-/.test(n.props.testID),
    );
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      const texts = findAll(row, (n) => n.type === 'Text');
      const switches = findAll(row, (n) => n.type === 'Switch');
      // Exactly one label Text per row; no description sibling.
      expect(texts.length).toBe(1);
      expect(switches.length).toBe(1);
    }
  });

  it('contract 5: Evening section is collapsed on first mount — no evening field rows visible', () => {
    const tree = render();
    const eveningOptionalRows = findAll(
      tree.root,
      (n) => typeof n.props?.testID === 'string' && /^wellness-optional-row-evening-/.test(n.props.testID),
    );
    expect(eveningOptionalRows).toHaveLength(0);
    // Evening core rows also gated behind the expander.
    const eveningCoreRows = findAll(
      tree.root,
      (n) => typeof n.props?.testID === 'string' && /^wellness-core-row-evening-/.test(n.props.testID),
    );
    expect(eveningCoreRows).toHaveLength(0);
  });

  it('contract 6: tapping the Evening header expands the section', () => {
    const tree = render();
    const eveningHeader = findAll(
      tree.root,
      (n) => n.props?.testID === 'wellness-evening-header',
    )[0];
    expect(eveningHeader).toBeDefined();
    act(() => { eveningHeader.props.onPress(); });
    const eveningOptionalRows = findAll(
      tree.root,
      (n) => typeof n.props?.testID === 'string' && /^wellness-optional-row-evening-/.test(n.props.testID),
    );
    expect(eveningOptionalRows.length).toBeGreaterThan(0);
  });

  it('contract 7: no <Text> renders the literal string "Core" as a badge label', () => {
    const tree = render();
    // Search every Text node for the bare word "Core" used as a badge.
    // Other contexts (e.g., "Core fields appear...") would have been
    // dropped along with the info card; if any survive, this fails.
    const textNodes = findAll(tree.root, (n) => n.type === 'Text');
    for (const t of textNodes) {
      const s = flattenText(t);
      expect(s).not.toBe('Core');
    }
  });

  it('contract 8: section eyebrows render — "ALWAYS TRACKED" and "ADD MORE"', () => {
    const tree = render();
    const eyebrows = findAll(
      tree.root,
      (n) => typeof n.props?.testID === 'string' && /^wellness-(?:morning|evening)-(?:always|add-more)-eyebrow$/.test(n.props.testID),
    );
    // Morning has both eyebrows visible by default.
    const morningAlways = eyebrows.find(
      (n) => n.props?.testID === 'wellness-morning-always-eyebrow',
    );
    const morningAddMore = eyebrows.find(
      (n) => n.props?.testID === 'wellness-morning-add-more-eyebrow',
    );
    expect(morningAlways).toBeDefined();
    expect(morningAddMore).toBeDefined();
    expect(flattenText(morningAlways!)).toMatch(/ALWAYS TRACKED/);
    expect(flattenText(morningAddMore!)).toMatch(/ADD MORE/);
  });
});

describe('Phase 10.2 — wellness patient-name regression pin', () => {
  it('contract 2 (rendered): no <Text> in the rendered tree contains the active patient name', () => {
    const tree = render();
    const PATIENT_NAME = 'Mom';
    const textNodes = findAll(tree.root, (n) => n.type === 'Text');
    for (const t of textNodes) {
      const s = flattenText(t);
      // The patient name must not appear in any rendered Text. The
      // header + Care Plan ownership establishes patient context;
      // per-row name echoes are gone.
      expect(s).not.toContain(PATIENT_NAME);
    }
  });
});
