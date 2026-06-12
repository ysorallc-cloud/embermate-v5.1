// ============================================================================
// SilentVitalsCapture — Phase 9.4 restructured contracts.
//
// Pre-9.4 the component was uncontrolled: owned its own state, rendered
// the wordy "How did Mom sleep?" questions inside an outer card, and
// included an inline Cancel/Save footer. Phase 9.4 (Option B from
// 9.4.0) restructured it in place to be controlled (parent owns
// `values` + `onChange`), flattened the layout (no outer card,
// hairline dividers between rows), simplified to single-word labels,
// added anchor labels (Rough / Good), and switched the selection
// signal from background+border to size+opacity+a11y-state.
//
// Component-internal contracts pinned here. Screen-level contracts
// (LogScreen wrap, CTA, counter, instance completion) live in
// __tests__/app/silentVitalsScreen.test.tsx.
// ============================================================================

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

const themeColors = {
  glass: '#363830',
  glassBorder: 'rgba(255,255,255,0.07)',
  accent: '#5fb88a',
  textPrimary: '#fff',
  textSecondary: '#9aa0a6',
  textTertiary: '#6b7280',
  menuSurface: '#1a1f2b',
  caregiverAccent: '#aa8adc',
};

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: themeColors }),
}));

jest.mock('react-native', () => {
  const PT = (n: string) => n;
  return {
    View: PT('View'),
    Text: PT('Text'),
    TextInput: PT('TextInput'),
    Pressable: PT('Pressable'),
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
  };
});

import {
  SilentVitalsCapture,
  type SilentVitalsValues,
} from '../../components/logging/SilentVitalsCapture';

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

interface HarnessProps {
  initial?: SilentVitalsValues;
}

function Harness({ initial }: HarnessProps) {
  const [v, setV] = React.useState<SilentVitalsValues>(initial ?? {});
  return React.createElement(SilentVitalsCapture as any, { values: v, onChange: setV });
}

function render(initial?: SilentVitalsValues): TestRenderer.ReactTestRenderer {
  let root: TestRenderer.ReactTestRenderer | null = null;
  act(() => {
    root = TestRenderer.create(React.createElement(Harness as any, { initial }));
  });
  return root!;
}

describe('Phase 9.4 — SilentVitalsCapture structure (contracts 2–5)', () => {
  it('contract 2: no outer card — root view does not paint a glass background', () => {
    const tree = render();
    const root = findAll(tree.root, (n) => n.props?.testID === 'silent-vitals-capture')[0];
    expect(root).toBeDefined();
    const s = styleOf(root);
    expect(s.backgroundColor).toBeUndefined();
    expect(s.borderColor).toBeUndefined();
    expect(s.borderWidth).toBeFalsy();
  });

  it('contract 3: three single-word labels — Sleep / Mood / Energy', () => {
    const tree = render();
    const sleep = findAll(tree.root, (n) => n.props?.testID === 'silent-vitals-label-sleep')[0];
    const mood = findAll(tree.root, (n) => n.props?.testID === 'silent-vitals-label-mood')[0];
    const energy = findAll(tree.root, (n) => n.props?.testID === 'silent-vitals-label-energy')[0];
    expect(sleep.props.children).toBe('Sleep');
    expect(mood.props.children).toBe('Mood');
    expect(energy.props.children).toBe('Energy');
  });

  it('contract 3: no patient-name echo anywhere in the render', () => {
    const tree = render();
    const allText = findAll(tree.root, (n) => n.type === 'Text');
    for (const t of allText) {
      const child = t.props.children;
      const flat = Array.isArray(child) ? child.join('') : String(child ?? '');
      // The pre-9.4 component echoed the patient name into the question
      // prose ("How did Mom sleep?"). The migration drops the prose
      // entirely; no Text node should contain a patient-name placeholder
      // pattern or the legacy phrasing.
      expect(flat).not.toMatch(/How did|How was/);
    }
  });

  it('contract 4: 5 emoji per row × 3 rows = 15 Pressables', () => {
    const tree = render();
    const buttons = findAll(
      tree.root,
      (n) =>
        typeof n.props?.testID === 'string' &&
        /^silent-vitals-(sleep|mood|energy)-\d$/.test(n.props.testID),
    );
    expect(buttons.length).toBe(15);
  });

  it('contract 5: anchor labels render — Rough left / Good right per row', () => {
    const tree = render();
    for (const key of ['sleep', 'mood', 'energy']) {
      const left = findAll(tree.root, (n) => n.props?.testID === `silent-vitals-anchor-left-${key}`)[0];
      const right = findAll(tree.root, (n) => n.props?.testID === `silent-vitals-anchor-right-${key}`)[0];
      expect(left.props.children).toBe('Rough');
      expect(right.props.children).toBe('Good');
    }
  });
});

describe('Phase 9.4 — SilentVitalsCapture selection signals (contract 6)', () => {
  it('selected emoji has fontSize 28 + opacity 1; peers stay at 24 + 0.4', () => {
    const tree = render({ sleepQuality: 4 });
    const selectedEmoji = findAll(
      tree.root,
      (n) => n.props?.testID === 'silent-vitals-emoji-sleep-4',
    )[0];
    expect(styleOf(selectedEmoji).fontSize).toBe(28);
    expect(styleOf(selectedEmoji).opacity).toBe(1);
    for (const v of [1, 2, 3, 5]) {
      const peer = findAll(
        tree.root,
        (n) => n.props?.testID === `silent-vitals-emoji-sleep-${v}`,
      )[0];
      expect(styleOf(peer).fontSize).toBe(24);
      expect(styleOf(peer).opacity).toBe(0.4);
    }
  });

  it('selected Pressable carries accessibilityState.selected = true', () => {
    const tree = render({ mood: 3 });
    const selected = findAll(tree.root, (n) => n.props?.testID === 'silent-vitals-mood-3')[0];
    expect(selected.props.accessibilityState?.selected).toBe(true);
    const peer = findAll(tree.root, (n) => n.props?.testID === 'silent-vitals-mood-2')[0];
    expect(peer.props.accessibilityState?.selected).toBe(false);
  });
});

describe('Phase 9.4 — SilentVitalsCapture anchor tint (contract 7)', () => {
  it('selecting the leftmost emoji (1) tints the "Rough" anchor sage', () => {
    const tree = render({ energyLevel: 1 });
    const left = findAll(
      tree.root,
      (n) => n.props?.testID === 'silent-vitals-anchor-left-energy',
    )[0];
    const right = findAll(
      tree.root,
      (n) => n.props?.testID === 'silent-vitals-anchor-right-energy',
    )[0];
    expect(styleOf(left).color).toBe(themeColors.accent);
    // Right anchor remains tertiary.
    expect(styleOf(right).color).toBe(themeColors.textTertiary);
  });

  it('selecting the rightmost emoji (5) tints the "Good" anchor sage', () => {
    const tree = render({ energyLevel: 5 });
    const left = findAll(
      tree.root,
      (n) => n.props?.testID === 'silent-vitals-anchor-left-energy',
    )[0];
    const right = findAll(
      tree.root,
      (n) => n.props?.testID === 'silent-vitals-anchor-right-energy',
    )[0];
    expect(styleOf(right).color).toBe(themeColors.accent);
    expect(styleOf(left).color).toBe(themeColors.textTertiary);
  });

  it('selecting a middle emoji leaves both anchors untinted', () => {
    const tree = render({ sleepQuality: 3 });
    const left = findAll(
      tree.root,
      (n) => n.props?.testID === 'silent-vitals-anchor-left-sleep',
    )[0];
    const right = findAll(
      tree.root,
      (n) => n.props?.testID === 'silent-vitals-anchor-right-sleep',
    )[0];
    expect(styleOf(left).color).toBe(themeColors.textTertiary);
    expect(styleOf(right).color).toBe(themeColors.textTertiary);
  });
});

describe('Phase 9.4 — SilentVitalsCapture optional note + interactions', () => {
  it('contract 8: reflection input renders italic with the new placeholder', () => {
    const tree = render();
    const input = findAll(tree.root, (n) => n.props?.testID === 'silent-vitals-reflection')[0];
    expect(input).toBeDefined();
    expect(input.props.placeholder).toMatch(/anything to remember/i);
    expect(styleOf(input).fontStyle).toBe('italic');
  });

  it('controlled tap fires onChange with the picked value (Harness re-renders selected emoji)', () => {
    const tree = render();
    const target = findAll(tree.root, (n) => n.props?.testID === 'silent-vitals-mood-4')[0];
    expect(target.props.accessibilityState?.selected).toBe(false);
    act(() => { target.props.onPress(); });
    const after = findAll(tree.root, (n) => n.props?.testID === 'silent-vitals-mood-4')[0];
    expect(after.props.accessibilityState?.selected).toBe(true);
  });
});

describe('Phase 9.4 — SilentVitalsCapture omissions (contract 9 / inline footer / time-pills)', () => {
  it('does NOT render an inline Save button (LogScreen primary CTA owns this)', () => {
    const tree = render();
    const save = findAll(tree.root, (n) => n.props?.testID === 'silent-vitals-save');
    expect(save).toHaveLength(0);
  });

  it('does NOT render an inline Cancel button (LogScreen ghost cancel owns this)', () => {
    const tree = render();
    const cancel = findAll(tree.root, (n) => n.props?.testID === 'silent-vitals-cancel');
    expect(cancel).toHaveLength(0);
  });

  it('does NOT render any time-pill row (per spec — wellness checks happen in their scheduled window)', () => {
    const tree = render();
    const pills = findAll(
      tree.root,
      (n) => typeof n.props?.testID === 'string' && /^silent-vitals-time-/.test(n.props.testID),
    );
    expect(pills).toHaveLength(0);
  });
});
