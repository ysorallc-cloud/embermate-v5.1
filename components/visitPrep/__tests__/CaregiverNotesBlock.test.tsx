// ============================================================================
// Phase 16.2 — CaregiverNotesBlock UI contracts.
//
// New caregiver-fillable block on the Visit Prep flow. Four sections:
//   1. "3 symptoms that changed since last visit" — three text fields
//   2. "3 functional issues to mention" (mobility, appetite, mood) —
//      three text fields
//   3. "3 questions or concerns for the provider" — three text fields
//   4. "What kinds of help did you provide this week?" — single
//      multiline text field (3-4 rows), helper text below
//
// UX rules pinned (spec says "must comply, no exceptions"):
//   • Caregiver-driven only — no pre-fill, no suggest, no auto-generate.
//   • Witness-voice labels — observational, never interpretive.
//   • Plain English on #4 — no clinical terms anywhere on the surface.
//   • All fields optional.
//   • Helper text for #4 exactly as specified.
//   • Tied to appointmentId; persists via visitPrepCaregiverNotesRepo.
//   • Editable until visit date passes, then frozen as historical.
// ============================================================================

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

const themeColors = {
  background: '#1f201c',
  glass: '#363830',
  glassBorder: 'rgba(255,240,215,0.08)',
  accent: '#5fb88a',
  textPrimary: '#fff',
  textSecondary: '#c4c1b3',
  textTertiary: '#8a8a82',
  textWarmDim: '#7a7a72',
};

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ resolvedTheme: 'dark', colors: themeColors }),
}));

jest.mock('react-native', () => {
  const PT = (n: string) => n;
  return {
    View: PT('View'),
    Text: PT('Text'),
    TextInput: PT('TextInput'),
    TouchableOpacity: PT('TouchableOpacity'),
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
  };
});

// In-memory mock for the repo so the round-trip is observable here
// without going through AsyncStorage.
const _repoStore: Record<string, any> = {};
jest.mock('../../../storage/visitPrepCaregiverNotesRepo', () => {
  const EMPTY = {
    symptomsChanged: ['', '', ''],
    functionalChanges: ['', '', ''],
    questionsForProvider: ['', '', ''],
    helpProvidedThisWeek: '',
  };
  return {
    EMPTY_CAREGIVER_NOTES: EMPTY,
    getCaregiverNotes: jest.fn(async (id: string) =>
      _repoStore[id] || EMPTY,
    ),
    saveCaregiverNotes: jest.fn(async (id: string, value: any) => {
      _repoStore[id] = value;
    }),
  };
});

// Mock appointmentStorage so the read-only-after-visit-date branch
// can be exercised deterministically.
const _appts: Record<string, { id: string; date: string; provider: string }> = {};
jest.mock('../../../utils/appointmentStorage', () => ({
  getAppointment: jest.fn(async (id: string) => _appts[id] || null),
}));

import { CaregiverNotesBlock } from '../CaregiverNotesBlock';

function findAll(
  root: TestRenderer.ReactTestInstance,
  predicate: (n: TestRenderer.ReactTestInstance) => boolean,
): TestRenderer.ReactTestInstance[] {
  return root.findAll((n: any) => {
    try { return predicate(n); } catch { return false; }
  });
}

function flattenText(node: any): string {
  if (node == null || node === false) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join(' ');
  if (typeof node === 'object') {
    if (node.children) return flattenText(node.children);
    if (node.props?.children !== undefined) return flattenText(node.props.children);
  }
  return '';
}

async function renderBlock(props: { appointmentId: string }): Promise<TestRenderer.ReactTestRenderer> {
  let r: TestRenderer.ReactTestRenderer | null = null;
  await act(async () => {
    r = TestRenderer.create(React.createElement(CaregiverNotesBlock, props));
  });
  return r!;
}

function inputsByCategory(tree: TestRenderer.ReactTestRenderer, category: string): TestRenderer.ReactTestInstance[] {
  return findAll(tree.root, (n: any) =>
    n.type === 'TextInput' &&
    typeof n.props?.testID === 'string' &&
    n.props.testID.startsWith(`caregiver-notes-${category}-`),
  );
}

beforeEach(() => {
  for (const k of Object.keys(_repoStore)) delete _repoStore[k];
  for (const k of Object.keys(_appts)) delete _appts[k];
  jest.clearAllMocks();
  // Default: appointment exists, date is in the future (so block is
  // editable). Individual tests override.
  const future = new Date();
  future.setDate(future.getDate() + 7);
  _appts['appt-default'] = {
    id: 'appt-default',
    date: future.toISOString(),
    provider: 'Dr. Test',
  };
});

describe('Phase 16.2 — CaregiverNotesBlock', () => {
  describe('contract 1: structure', () => {
    it('renders three input fields for the symptoms category', async () => {
      const tree = await renderBlock({ appointmentId: 'appt-default' });
      const inputs = inputsByCategory(tree, 'symptoms');
      expect(inputs.length).toBe(3);
    });

    it('renders three input fields for the functional category', async () => {
      const tree = await renderBlock({ appointmentId: 'appt-default' });
      const inputs = inputsByCategory(tree, 'functional');
      expect(inputs.length).toBe(3);
    });

    it('renders three input fields for the questions category', async () => {
      const tree = await renderBlock({ appointmentId: 'appt-default' });
      const inputs = inputsByCategory(tree, 'questions');
      expect(inputs.length).toBe(3);
    });

    it('renders a single multiline text field for the daily-activities prompt', async () => {
      const tree = await renderBlock({ appointmentId: 'appt-default' });
      const helpInputs = findAll(tree.root, (n: any) =>
        n.type === 'TextInput' && n.props?.testID === 'caregiver-notes-help-provided',
      );
      expect(helpInputs.length).toBe(1);
      const input = helpInputs[0];
      expect(input.props.multiline).toBe(true);
      // 3-4 visible rows per spec.
      expect(input.props.numberOfLines).toBeGreaterThanOrEqual(3);
      expect(input.props.numberOfLines).toBeLessThanOrEqual(4);
    });

    it('renders the helper text below the daily-activities field exactly as specified', async () => {
      const tree = await renderBlock({ appointmentId: 'appt-default' });
      const text = flattenText(tree.toJSON());
      // Spec is exact: "For example: shopping, rides, meals, bills,
      // bathing, dressing, coordinating with others. In your own words."
      expect(text).toContain(
        'For example: shopping, rides, meals, bills, bathing, dressing, coordinating with others. In your own words.',
      );
    });
  });

  describe('contract 2: persistence', () => {
    it('saves caregiver-entered values tied to the appointment ID', async () => {
      const tree = await renderBlock({ appointmentId: 'appt-default' });
      const first = inputsByCategory(tree, 'symptoms')[0];
      await act(async () => {
        first.props.onChangeText('Headache more frequent');
      });
      // Wait a tick for the debounced/imperative save path inside
      // onChangeText to flush. Implementation may save synchronously
      // via the mocked repo.
      const repo = require('../../../storage/visitPrepCaregiverNotesRepo');
      expect(repo.saveCaregiverNotes).toHaveBeenCalled();
      const lastCall = repo.saveCaregiverNotes.mock.calls.slice(-1)[0];
      expect(lastCall[0]).toBe('appt-default');
      expect(lastCall[1].symptomsChanged[0]).toBe('Headache more frequent');
    });

    it('persists values across remounts via the repo (AsyncStorage round-trip surrogate)', async () => {
      // First mount: caregiver types into the help-provided field.
      const t1 = await renderBlock({ appointmentId: 'appt-default' });
      const help1 = findAll(t1.root, (n: any) =>
        n.props?.testID === 'caregiver-notes-help-provided',
      )[0];
      await act(async () => {
        help1.props.onChangeText('Drove to two appointments this week.');
      });
      t1.unmount();

      // Second mount with the same appointmentId: the value loads
      // from the repo and the field shows it.
      const t2 = await renderBlock({ appointmentId: 'appt-default' });
      const help2 = findAll(t2.root, (n: any) =>
        n.props?.testID === 'caregiver-notes-help-provided',
      )[0];
      expect(help2.props.value).toBe('Drove to two appointments this week.');
    });
  });

  describe('contract 3: caregiver-driven only — no auto-population', () => {
    it('never imports or calls log-aggregation utilities (no pre-fill from logs)', () => {
      // Source-level pin: the component must not import from log-
      // aggregation paths. The block is caregiver-driven by design.
      const fs = require('fs');
      const path = require('path');
      const src = fs.readFileSync(
        path.join(__dirname, '../CaregiverNotesBlock.tsx'), 'utf8',
      );
      // Whitelist: imports the repo, the appointment shape, theme,
      // react-native primitives. Blacklist: any log/insight/symptom-
      // detection imports that could seed initial values.
      expect(src).not.toMatch(/from\s+['"][^'"]*symptomChangeDetection/);
      expect(src).not.toMatch(/from\s+['"][^'"]*functionalIssueExtraction/);
      expect(src).not.toMatch(/from\s+['"][^'"]*insightEngine/);
      expect(src).not.toMatch(/from\s+['"][^'"]*understandInsights/);
      expect(src).not.toMatch(/from\s+['"][^'"]*reflectionStorage/);
      expect(src).not.toMatch(/from\s+['"][^'"]*medicationStorage/);
      expect(src).not.toMatch(/listLogsInRange|getReflection\b/);
    });

    it('initial render with no saved data leaves all 10 fields empty', async () => {
      const tree = await renderBlock({ appointmentId: 'appt-default' });
      const all = [
        ...inputsByCategory(tree, 'symptoms'),
        ...inputsByCategory(tree, 'functional'),
        ...inputsByCategory(tree, 'questions'),
        ...findAll(tree.root, (n: any) =>
          n.props?.testID === 'caregiver-notes-help-provided',
        ),
      ];
      expect(all.length).toBe(10);
      for (const input of all) {
        expect(input.props.value).toBe('');
      }
    });
  });

  describe('contract 4: no clinical terminology', () => {
    it('does not contain ADL / IADL / functional status / dependency strings anywhere', () => {
      // Source-level pin: the rendered UI strings (labels + helper +
      // any inline copy) must not include clinical terms. The word
      // "functional" itself is allowed because the section name is
      // "functional issues" per spec — but compound clinical phrases
      // like "functional status" and "functional dependency" must
      // not appear.
      const fs = require('fs');
      const path = require('path');
      const src = fs.readFileSync(
        path.join(__dirname, '../CaregiverNotesBlock.tsx'), 'utf8',
      );
      expect(src).not.toMatch(/\bADL\b/);
      expect(src).not.toMatch(/\bIADL\b/);
      expect(src).not.toMatch(/functional status/i);
      expect(src).not.toMatch(/dependency level/i);
      expect(src).not.toMatch(/activities of daily living/i);
      expect(src).not.toMatch(/instrumental activities/i);
    });
  });

  describe('contract 5: read-only after visit date', () => {
    it('renders inputs as editable when appointment date is in the future', async () => {
      // Default fixture has appt-default 7 days out → editable.
      const tree = await renderBlock({ appointmentId: 'appt-default' });
      const first = inputsByCategory(tree, 'symptoms')[0];
      // editable defaults to true; pin it explicitly.
      expect(first.props.editable).not.toBe(false);
    });

    it('renders inputs as read-only when appointment date has passed', async () => {
      const past = new Date();
      past.setDate(past.getDate() - 1);
      _appts['appt-past'] = {
        id: 'appt-past', date: past.toISOString(), provider: 'Dr. Past',
      };
      const tree = await renderBlock({ appointmentId: 'appt-past' });
      const inputs = [
        ...inputsByCategory(tree, 'symptoms'),
        ...inputsByCategory(tree, 'functional'),
        ...inputsByCategory(tree, 'questions'),
        ...findAll(tree.root, (n: any) =>
          n.props?.testID === 'caregiver-notes-help-provided',
        ),
      ];
      expect(inputs.length).toBe(10);
      for (const input of inputs) {
        expect(input.props.editable).toBe(false);
      }
    });
  });
});
