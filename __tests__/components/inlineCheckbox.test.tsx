// ============================================================================
// InlineCheckbox — trailing-edge log checkbox for Now timeline rows.
// ============================================================================

import React from 'react';

jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return { ...actual, useMemo: (fn: any) => fn() };
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

import { InlineCheckbox } from '../../components/now/InlineCheckbox';

function findAll(node: any, predicate: (n: any) => boolean): any[] {
  if (!node || typeof node !== 'object') return [];
  const out: any[] = [];
  if (predicate(node)) out.push(node);
  const kids = node.props?.children;
  const arr = Array.isArray(kids) ? kids : kids != null ? [kids] : [];
  for (const k of arr) out.push(...findAll(k, predicate));
  return out;
}

function flatStyle(node: any): any {
  if (!node) return {};
  const s = node.props?.style;
  return Object.assign({}, ...(Array.isArray(s) ? s : [s || {}]));
}

describe('InlineCheckbox — visual states', () => {
  it('renders an empty circle when state="pending"', () => {
    const tree = InlineCheckbox({ state: 'pending', label: 'Acetaminophen', onPress: () => {} });
    const button = findAll(tree, (n) => n.type === 'TouchableOpacity')[0];
    expect(button).toBeDefined();
    const style = flatStyle(button);
    expect(style.backgroundColor).not.toBe('#5fb88a');
    expect(style.borderWidth).toBeGreaterThan(0);
  });

  it('renders a filled mint circle with a checkmark when state="logged"', () => {
    const tree = InlineCheckbox({ state: 'logged', label: 'Acetaminophen', onPress: () => {} });
    const button = findAll(tree, (n) => n.type === 'TouchableOpacity')[0];
    expect(flatStyle(button).backgroundColor).toBe('#5fb88a');
    const text = findAll(tree, (n) => n.type === 'Text')[0];
    const flat = (n: any) => (n.props?.children == null ? '' : String(n.props.children));
    expect(flat(text)).toMatch(/✓|✔/);
  });

  it('renders a dashed/skipped indicator when state="skipped"', () => {
    const tree = InlineCheckbox({ state: 'skipped', label: 'Acetaminophen', onPress: () => {} });
    const text = findAll(tree, (n) => n.type === 'Text')[0];
    const flat = (n: any) => (n.props?.children == null ? '' : String(n.props.children));
    expect(flat(text)).toMatch(/—|–|×/);
  });
});

describe('InlineCheckbox — interaction', () => {
  it('tap fires onPress', () => {
    const onPress = jest.fn();
    const tree = InlineCheckbox({ state: 'pending', label: 'X', onPress });
    const button = findAll(tree, (n) => n.type === 'TouchableOpacity')[0];
    button.props.onPress();
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('long-press fires onLongPress when provided', () => {
    const onLongPress = jest.fn();
    const tree = InlineCheckbox({
      state: 'pending',
      label: 'X',
      onPress: () => {},
      onLongPress,
    });
    const button = findAll(tree, (n) => n.type === 'TouchableOpacity')[0];
    button.props.onLongPress();
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });
});

describe('InlineCheckbox — accessibility', () => {
  it('exposes role=checkbox with checked state matching the visual state', () => {
    const pending = InlineCheckbox({ state: 'pending', label: 'X', onPress: () => {} });
    const pendingBtn = findAll(pending, (n) => n.type === 'TouchableOpacity')[0];
    expect(pendingBtn.props.accessibilityRole).toBe('checkbox');
    expect(pendingBtn.props.accessibilityState).toEqual({ checked: false });

    const logged = InlineCheckbox({ state: 'logged', label: 'X', onPress: () => {} });
    const loggedBtn = findAll(logged, (n) => n.type === 'TouchableOpacity')[0];
    expect(loggedBtn.props.accessibilityState).toEqual({ checked: true });
  });

  it('label includes the item name + the current state for VoiceOver', () => {
    const tree = InlineCheckbox({ state: 'pending', label: 'Acetaminophen', onPress: () => {} });
    const btn = findAll(tree, (n) => n.type === 'TouchableOpacity')[0];
    expect(btn.props.accessibilityLabel).toMatch(/Acetaminophen/);
    expect(btn.props.accessibilityLabel).toMatch(/log|pending|not logged/i);
  });

  it('hint mentions long-press → skip menu when an onLongPress is wired', () => {
    const tree = InlineCheckbox({
      state: 'pending',
      label: 'X',
      onPress: () => {},
      onLongPress: () => {},
    });
    const btn = findAll(tree, (n) => n.type === 'TouchableOpacity')[0];
    expect(btn.props.accessibilityHint).toMatch(/long.?press/i);
    expect(btn.props.accessibilityHint).toMatch(/skip/i);
  });
});
