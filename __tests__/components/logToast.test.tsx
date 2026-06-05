// ============================================================================
// LogToast — 5-second persisting toast with Add + Undo actions.
// Fires after an instant log on the Now timeline.
// ============================================================================

import React from 'react';

jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return {
    ...actual,
    useMemo: (fn: any) => fn(),
    useState: (init: any) => [typeof init === 'function' ? init() : init, () => {}],
    useEffect: () => {},
    useCallback: (fn: any) => fn,
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
      textTertiary: '#6b7280',
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

import { LogToast, TOAST_DURATION_MS } from '../../components/now/LogToast';

function findAll(node: any, predicate: (n: any) => boolean): any[] {
  if (!node || typeof node !== 'object') return [];
  const out: any[] = [];
  if (predicate(node)) out.push(node);
  const kids = node.props?.children;
  const arr = Array.isArray(kids) ? kids : kids != null ? [kids] : [];
  for (const k of arr) out.push(...findAll(k, predicate));
  return out;
}

function flattenText(children: any): string {
  if (children == null) return '';
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(flattenText).join('');
  if (children?.props?.children !== undefined) return flattenText(children.props.children);
  return '';
}

const baseProps = {
  visible: true,
  message: 'Acetaminophen logged',
  onAdd: jest.fn(),
  onUndo: jest.fn(),
  onDismiss: jest.fn(),
};

beforeEach(() => {
  baseProps.onAdd = jest.fn();
  baseProps.onUndo = jest.fn();
  baseProps.onDismiss = jest.fn();
});

describe('LogToast — visibility', () => {
  it('renders nothing when not visible', () => {
    expect(LogToast({ ...baseProps, visible: false })).toBeNull();
  });

  it('renders when visible', () => {
    const tree = LogToast(baseProps);
    expect(tree).not.toBeNull();
  });

  it('shows the supplied message', () => {
    const tree = LogToast(baseProps);
    expect(flattenText(tree)).toContain('Acetaminophen logged');
  });
});

describe('LogToast — actions', () => {
  it('Add and Undo buttons are present', () => {
    const tree = LogToast(baseProps);
    const text = flattenText(tree);
    expect(text).toContain('Add');
    expect(text).toContain('Undo');
  });

  it('tapping Add fires onAdd', () => {
    const tree = LogToast(baseProps);
    const button = findAll(tree, (n) =>
      n.type === 'TouchableOpacity' &&
      typeof n.props?.accessibilityLabel === 'string' &&
      /add details/i.test(n.props.accessibilityLabel),
    )[0];
    expect(button).toBeDefined();
    button.props.onPress();
    expect(baseProps.onAdd).toHaveBeenCalledTimes(1);
  });

  it('tapping Undo fires onUndo', () => {
    const tree = LogToast(baseProps);
    const button = findAll(tree, (n) =>
      n.type === 'TouchableOpacity' &&
      typeof n.props?.accessibilityLabel === 'string' &&
      /undo/i.test(n.props.accessibilityLabel),
    )[0];
    button.props.onPress();
    expect(baseProps.onUndo).toHaveBeenCalledTimes(1);
  });
});

describe('LogToast — persistence', () => {
  it('exports a 5-second persistence constant', () => {
    expect(TOAST_DURATION_MS).toBe(5000);
  });
});

describe('LogToast — accessibility', () => {
  it('the toast wrapper has accessibilityLiveRegion="polite"', () => {
    const tree = LogToast(baseProps);
    const wrapper = findAll(tree, (n) => n.props?.accessibilityLiveRegion === 'polite')[0];
    expect(wrapper).toBeDefined();
  });

  it('Add and Undo buttons expose role=button with descriptive labels', () => {
    const tree = LogToast(baseProps);
    const buttons = findAll(tree, (n) => n.type === 'TouchableOpacity');
    for (const b of buttons) {
      expect(b.props.accessibilityRole).toBe('button');
      expect(typeof b.props.accessibilityLabel).toBe('string');
    }
  });
});

// ============================================================================
// Phase 35 Slice 3-D commit 3 — Redo-mode contracts.
//
// The long-press done-row affordance fires an immediate undo + surfaces
// the SAME LogToast component in "Redo mode": message reads "Undid
// {item}", the primary action label flips to "Redo", and the Add link
// is hidden (the row no longer has a fresh log to add details to).
// Q-3D.5 + Q-3D.8 locks: symmetric 5s toast, single component, no
// parallel chrome.
//
// Implementation surfaces a `undoLabel?: string` prop (defaults to
// 'Undo' — preserves existing call sites) and a `hideAdd?: boolean`
// prop (defaults to false — preserves existing tenure-driven Add
// behavior). The `onUndo` callback is the primary action regardless
// of label so the storage call site can be either undoInstanceCompletion
// (Undo mode) or resurrectLogEntry (Redo mode).
// ============================================================================

describe('LogToast — Slice 3-D Redo mode', () => {
  it('undoLabel prop overrides the button text (defaults to "Undo" when unset)', () => {
    // Default — no prop → "Undo".
    const defaultTree = LogToast(baseProps);
    expect(flattenText(defaultTree)).toContain('Undo');

    // Override — undoLabel="Redo" → button renders as "Redo".
    const redoTree = LogToast({ ...baseProps, undoLabel: 'Redo' } as any);
    const redoText = flattenText(redoTree);
    expect(redoText).toContain('Redo');
    expect(redoText).not.toContain('Undo');
  });

  it('hideAdd prop hides the Add button regardless of tenure', () => {
    // Pre-3-D the Add button visibility was tenure-driven (always for
    // 'new', secondary for 'experienced', hidden for 'seasoned'). The
    // Redo mode needs unconditional hide: there's no fresh log to add
    // details to. The new prop wins over tenure.
    const tree = LogToast({ ...baseProps, hideAdd: true } as any);
    const text = flattenText(tree);
    expect(text).not.toContain('Add');
    // The primary action is still rendered.
    expect(text).toContain('Undo');
  });

  it('onUndo still fires when undoLabel is "Redo" (callback is decoupled from button text)', () => {
    // The callback contract is unchanged. The caller passes
    // resurrectLogEntry-wired callback as onUndo; the button label
    // reads "Redo"; the press fires the supplied callback.
    const tree = LogToast({ ...baseProps, undoLabel: 'Redo', hideAdd: true } as any);
    const button = findAll(tree, (n) =>
      n.type === 'TouchableOpacity' &&
      typeof n.props?.accessibilityLabel === 'string' &&
      /redo|undo/i.test(n.props.accessibilityLabel),
    )[0];
    expect(button).toBeDefined();
    button.props.onPress();
    expect(baseProps.onUndo).toHaveBeenCalledTimes(1);
  });

  it('the primary action accessibilityLabel reflects the visible label (Redo vs Undo)', () => {
    // VoiceOver users encounter the button by its accessibilityLabel.
    // The label must agree with the visible text — "Redo this log"
    // when undoLabel="Redo", "Undo this log" otherwise.
    const undoTree = LogToast(baseProps);
    const undoButton = findAll(undoTree, (n) =>
      n.type === 'TouchableOpacity' &&
      typeof n.props?.accessibilityLabel === 'string' &&
      /undo|redo/i.test(n.props.accessibilityLabel),
    )[0];
    expect(undoButton.props.accessibilityLabel).toMatch(/undo/i);

    const redoTree = LogToast({ ...baseProps, undoLabel: 'Redo' } as any);
    const redoButton = findAll(redoTree, (n) =>
      n.type === 'TouchableOpacity' &&
      typeof n.props?.accessibilityLabel === 'string' &&
      /undo|redo/i.test(n.props.accessibilityLabel),
    )[0];
    expect(redoButton.props.accessibilityLabel).toMatch(/redo/i);
  });
});
