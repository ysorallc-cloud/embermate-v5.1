// ============================================================================
// LogToast — tenure-driven prompt variations (Prompt 6 Phase 2).
//
// • new        — secondary prompt with examples; Add link primary (mint).
// • experienced — minimal "Anything to note?" prompt; Add link secondary.
// • seasoned   — no prompt by default; Undo only. Add still rendered for
//                anomaly-driven overrides but caller decides whether to show
//                it on routine logs (default omitted at this tier).
// ============================================================================

import React from 'react';

jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return {
    ...actual,
    useMemo: (fn: any) => fn(),
    useEffect: (_fn: any) => {},
    useRef: (initial: any) => ({ current: initial }),
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
      menuSurface: '#1a1f2b',
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

import { LogToast } from '../../components/now/LogToast';

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
  if (typeof children === 'object') {
    let acc = '';
    if (typeof children.type === 'function') {
      try { acc += flattenText(children.type(children.props || {})); } catch (_) { /* swallow */ }
    }
    if (children.props?.children !== undefined) acc += flattenText(children.props.children);
    return acc;
  }
  return '';
}

const baseProps = (overrides: any = {}) => ({
  visible: true,
  message: 'Acetaminophen logged',
  onAdd: jest.fn(),
  onUndo: jest.fn(),
  onDismiss: jest.fn(),
  ...overrides,
});

describe('LogToast — new tenure (default scaffolding)', () => {
  it('shows "Anything to note?" with examples and the Add link', () => {
    const tree = (LogToast as any)(baseProps({ tenure: 'new' }));
    const text = flattenText(tree);
    expect(text.toLowerCase()).toContain('anything to note');
    expect(text.toLowerCase()).toContain('side effect');
    const add = findAll(tree, (n) => n.props?.testID === 'log-toast-add')[0];
    expect(add).toBeDefined();
  });
});

describe('LogToast — experienced tenure (minimal scaffolding)', () => {
  it('shows the short "Anything to note?" prompt without examples', () => {
    const tree = (LogToast as any)(baseProps({ tenure: 'experienced' }));
    const text = flattenText(tree).toLowerCase();
    expect(text).toContain('anything to note');
    expect(text).not.toContain('side effect');
  });

  it('still renders the Add link (secondary styling)', () => {
    const tree = (LogToast as any)(baseProps({ tenure: 'experienced' }));
    const add = findAll(tree, (n) => n.props?.testID === 'log-toast-add')[0];
    expect(add).toBeDefined();
  });
});

describe('LogToast — seasoned tenure (no scaffolding)', () => {
  it('does NOT render the "Anything to note?" prompt', () => {
    const tree = (LogToast as any)(baseProps({ tenure: 'seasoned' }));
    const text = flattenText(tree).toLowerCase();
    expect(text).not.toContain('anything to note');
  });

  it('does NOT render the Add link by default at this tier', () => {
    const tree = (LogToast as any)(baseProps({ tenure: 'seasoned' }));
    const add = findAll(tree, (n) => n.props?.testID === 'log-toast-add')[0];
    expect(add).toBeUndefined();
  });

  it('still renders the Undo affordance', () => {
    const tree = (LogToast as any)(baseProps({ tenure: 'seasoned' }));
    const undo = findAll(tree, (n) => n.props?.testID === 'log-toast-undo')[0];
    expect(undo).toBeDefined();
  });
});

describe('LogToast — anomaly override forces the prompt at any tenure', () => {
  it('seasoned + anomalyPrompt shows the prompt and Add link', () => {
    const tree = (LogToast as any)(baseProps({
      tenure: 'seasoned',
      anomalyPrompt: 'BP was 148 today — higher than her usual 128. Anything happening today?',
    }));
    const text = flattenText(tree).toLowerCase();
    expect(text).toContain('148');
    expect(text).toContain('higher than her usual');
    const add = findAll(tree, (n) => n.props?.testID === 'log-toast-add')[0];
    expect(add).toBeDefined();
  });

  it('experienced + anomalyPrompt replaces the generic "Anything to note?"', () => {
    const tree = (LogToast as any)(baseProps({
      tenure: 'experienced',
      anomalyPrompt: '3 doses missed in a row.',
    }));
    const text = flattenText(tree).toLowerCase();
    expect(text).toContain('3 doses missed in a row');
    expect(text).not.toContain('anything to note');
  });
});

describe('LogToast — tenure prop is optional (back-compat default)', () => {
  it('omitting tenure renders the new-tier scaffolding (safe default)', () => {
    const tree = (LogToast as any)(baseProps());
    const text = flattenText(tree).toLowerCase();
    expect(text).toContain('anything to note');
  });
});
