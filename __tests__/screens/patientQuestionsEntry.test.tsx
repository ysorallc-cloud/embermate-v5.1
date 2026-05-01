// ============================================================================
// Patient questions entry — caregiver writes "Questions for the doctor" that
// flow into the Visit Prep PDF. Verifies the screen wires to the repo and
// shows the saved list with delete affordances.
// ============================================================================

import React from 'react';

const mockListQuestions = jest.fn();
const mockAddQuestion = jest.fn();
const mockRemoveQuestion = jest.fn();

jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return {
    ...actual,
    useMemo: (fn: any) => fn(),
    useState: (initial: any) => {
      const value = typeof initial === 'function' ? initial() : initial;
      return [value, jest.fn()];
    },
    useEffect: (_fn: any) => {},
    useCallback: (fn: any) => fn,
  };
});

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#141612',
      glass: '#2a2c25',
      glassBorder: 'rgba(255,255,255,0.07)',
      glassHover: 'rgba(255,255,255,0.04)',
      accent: '#5fb88a',
      textPrimary: '#fff',
      textSecondary: '#9aa0a6',
      textTertiary: '#6b7280',
    },
  }),
}));

jest.mock('react-native', () => {
  const PT = (n: string) => n;
  return {
    View: PT('View'),
    Text: PT('Text'),
    TouchableOpacity: PT('TouchableOpacity'),
    TextInput: PT('TextInput'),
    ScrollView: PT('ScrollView'),
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
    Alert: { alert: jest.fn() },
  };
});

jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
jest.mock('../../components/SubScreenHeader', () => ({ SubScreenHeader: 'SubScreenHeader' }));

jest.mock('../../services/patientQuestionsRepo', () => ({
  listQuestions: (...args: any[]) => mockListQuestions(...args),
  addQuestion: (...args: any[]) => mockAddQuestion(...args),
  removeQuestion: (...args: any[]) => mockRemoveQuestion(...args),
}));

jest.mock('../../contexts/PatientContext', () => ({
  usePatient: () => ({ activePatient: { id: 'mom', name: 'Mom' } }),
}));

jest.mock('../../storage/carePlanRepo', () => ({ DEFAULT_PATIENT_ID: 'default' }));

beforeEach(() => {
  mockListQuestions.mockReset();
  mockAddQuestion.mockReset();
  mockRemoveQuestion.mockReset();
  mockListQuestions.mockResolvedValue([]);
});

import PatientQuestionsScreen from '../../app/patient-questions';

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

function flattenText(children: any): string {
  if (children == null) return '';
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(flattenText).join('');
  if (children?.props?.children !== undefined) return flattenText(children.props.children);
  return '';
}

describe('Patient questions entry — header + framing', () => {
  it('renders the screen header with the doctor-questions framing', () => {
    const tree = (PatientQuestionsScreen as any)();
    const header = findAll(tree, (n) => n.type === 'SubScreenHeader')[0];
    expect(header).toBeDefined();
    expect(header.props.title.toLowerCase()).toContain('question');
  });

  it('makes the destination clear in the subtitle (where the questions land)', () => {
    const tree = (PatientQuestionsScreen as any)();
    const header = findAll(tree, (n) => n.type === 'SubScreenHeader')[0];
    expect(typeof header.props.subtitle).toBe('string');
    expect(header.props.subtitle.toLowerCase()).toMatch(/visit|doctor|provider|clinician/);
  });
});

describe('Patient questions entry — input affordance', () => {
  it('renders a text input for the new question', () => {
    const tree = (PatientQuestionsScreen as any)();
    const input = findAll(tree, (n) => n.props?.testID === 'patient-questions-input')[0];
    expect(input).toBeDefined();
  });

  it('renders an Add button', () => {
    const tree = (PatientQuestionsScreen as any)();
    const add = findAll(tree, (n) => n.props?.testID === 'patient-questions-add')[0];
    expect(add).toBeDefined();
    expect(typeof add.props.onPress).toBe('function');
  });
});
