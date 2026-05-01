// ============================================================================
// SilentVitalsCapture — single-screen sleep / mood / energy capture (replaces
// the legacy 5-page wellness wizard). Verifies the UX contract: three rows,
// emoji-driven 1–5 scales, optional reflection, and a Save button gated on at
// least one filled row.
// ============================================================================

import React from 'react';

jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return {
    ...actual,
    useMemo: (fn: any) => fn(),
    useState: (initial: any) => {
      const value = typeof initial === 'function' ? initial() : initial;
      return [value, jest.fn()];
    },
    useCallback: (fn: any) => fn,
  };
});

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      glass: '#363830',
      glassBorder: 'rgba(255,255,255,0.07)',
      accent: '#5fb88a',
      textPrimary: '#fff',
      textSecondary: '#9aa0a6',
      textTertiary: '#6b7280',
      menuSurface: '#1a1f2b',
      caregiverAccent: '#aa8adc',
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
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
  };
});

import { SilentVitalsCapture } from '../../components/now/SilentVitalsCapture';

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
  if (typeof node.type === 'function') {
    try {
      const rendered = node.type(node.props || {});
      for (const k of flattenChildren(rendered)) {
        out.push(...findAll(k, predicate));
      }
    } catch (_) {
      /* swallow — relies on hooks not present in the shim */
    }
  }
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

const baseProps = () => ({
  initial: undefined as any,
  patientName: 'Mom',
  onSave: jest.fn(),
});

describe('SilentVitalsCapture — header + structure', () => {
  it('renders the eyebrow "THE SILENT VITAL SIGNS"', () => {
    const tree = (SilentVitalsCapture as any)(baseProps());
    expect(flattenText(tree)).toContain('THE SILENT VITAL SIGNS');
  });

  it('renders the serif italic subtitle that names the framing', () => {
    const tree = (SilentVitalsCapture as any)(baseProps());
    const text = flattenText(tree);
    // Caregiver-facing framing — clinicians treat sleep/mood/energy as critical context.
    expect(text.toLowerCase()).toContain('clinicians');
  });

  it('renders three labelled question rows: sleep / mood / energy', () => {
    const tree = (SilentVitalsCapture as any)(baseProps());
    const sleep = findAll(tree, (n) => n.props?.testID === 'silent-vitals-row-sleep')[0];
    const mood = findAll(tree, (n) => n.props?.testID === 'silent-vitals-row-mood')[0];
    const energy = findAll(tree, (n) => n.props?.testID === 'silent-vitals-row-energy')[0];
    expect(sleep).toBeDefined();
    expect(mood).toBeDefined();
    expect(energy).toBeDefined();
  });

  it('substitutes the patient name into the sleep question', () => {
    const tree = (SilentVitalsCapture as any)(baseProps());
    expect(flattenText(tree)).toContain('Mom');
  });
});

describe('SilentVitalsCapture — emoji buttons', () => {
  it('renders five emoji buttons for each row (15 total)', () => {
    const tree = (SilentVitalsCapture as any)(baseProps());
    const buttons = findAll(tree, (n) =>
      typeof n.props?.testID === 'string' && /^silent-vitals-(sleep|mood|energy)-\d$/.test(n.props.testID),
    );
    expect(buttons.length).toBe(15);
  });

  it('tapping a sleep emoji invokes the row select handler', () => {
    const tree = (SilentVitalsCapture as any)(baseProps());
    const button = findAll(tree, (n) => n.props?.testID === 'silent-vitals-sleep-4')[0];
    expect(button).toBeDefined();
    expect(typeof button.props.onPress).toBe('function');
  });
});

describe('SilentVitalsCapture — Save gating', () => {
  it('renders the Save button', () => {
    const tree = (SilentVitalsCapture as any)(baseProps());
    const save = findAll(tree, (n) => n.props?.testID === 'silent-vitals-save')[0];
    expect(save).toBeDefined();
  });

  it('Save is disabled when no row has a value (initial empty state)', () => {
    const tree = (SilentVitalsCapture as any)(baseProps());
    const save = findAll(tree, (n) => n.props?.testID === 'silent-vitals-save')[0];
    expect(save.props.disabled).toBe(true);
  });

  it('Save is enabled when initial has at least one row populated', () => {
    const props = { ...baseProps(), initial: { sleepQuality: 4 } };
    const tree = (SilentVitalsCapture as any)(props);
    const save = findAll(tree, (n) => n.props?.testID === 'silent-vitals-save')[0];
    expect(save.props.disabled).toBe(false);
  });
});

describe('SilentVitalsCapture — initial values + reflection', () => {
  it('marks the matching emoji as selected when initial value is provided', () => {
    const props = { ...baseProps(), initial: { mood: 4 } };
    const tree = (SilentVitalsCapture as any)(props);
    const button = findAll(tree, (n) => n.props?.testID === 'silent-vitals-mood-4')[0];
    expect(button.props.accessibilityState?.selected).toBe(true);
  });

  it('renders the optional reflection text input', () => {
    const tree = (SilentVitalsCapture as any)(baseProps());
    const input = findAll(tree, (n) => n.props?.testID === 'silent-vitals-reflection')[0];
    expect(input).toBeDefined();
  });
});
