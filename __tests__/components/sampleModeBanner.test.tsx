// ============================================================================
// SampleModeBanner — slim caregiver-accent pill that opens the manage sheet.
// Behavioural test: verifies render gating, onPress wiring, accessible label.
// ============================================================================

import React from 'react';

jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return {
    ...actual,
    useMemo: (fn: any) => fn(),
  };
});

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      caregiverAccent: '#aa8adc',
      glass: '#363830',
      textPrimary: '#f4ddb8',
      textTertiary: '#8a8a82',
    },
  }),
}));

jest.mock('react-native', () => {
  const PassThrough = (name: string) => name;
  return {
    View: PassThrough('View'),
    Text: PassThrough('Text'),
    TouchableOpacity: PassThrough('TouchableOpacity'),
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
  };
});

import { SampleModeBanner } from '../../components/sample/SampleModeBanner';

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

describe('SampleModeBanner', () => {
  it('renders nothing when isSampleMode is false', () => {
    const tree = SampleModeBanner({ isSampleMode: false, onPress: () => {} });
    expect(tree).toBeNull();
  });

  it('renders a pressable pill labelled "Viewing example data" when active', () => {
    const tree = SampleModeBanner({ isSampleMode: true, onPress: () => {} });

    const labelNode = findAll(tree, (n) => /Viewing example data/i.test(flattenText(n)))[0];
    expect(labelNode).toBeDefined();
  });

  it('exposes a button role with a descriptive accessibility label', () => {
    const tree = SampleModeBanner({ isSampleMode: true, onPress: () => {} });

    const button = findAll(
      tree,
      (n) => n.type === 'TouchableOpacity' && n.props?.accessibilityRole === 'button',
    )[0];
    expect(button).toBeDefined();
    expect(button.props.accessibilityLabel).toMatch(/example data|manage/i);
  });

  it('calls onPress when the pill is tapped', () => {
    const onPress = jest.fn();
    const tree = SampleModeBanner({ isSampleMode: true, onPress });
    const button = findAll(tree, (n) => n.type === 'TouchableOpacity')[0];
    button.props.onPress();
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders a quiet muted line, no pill chrome (UX-2 pre-launch — pill retired)', () => {
    // UX-2 dropped the cream pill in favour of a single inline tappable
    // line. The surface must have NO backgroundColor (no pill bg), NO
    // border, and NO rounded radius. The ✦ glyph stays at caregiverAccent
    // as a tiny wayfinding garnish.
    const tree = SampleModeBanner({ isSampleMode: true, onPress: () => {} });
    const button = findAll(tree, (n) => n.type === 'TouchableOpacity')[0];
    const flatStyle = Object.assign({}, ...(Array.isArray(button.props.style) ? button.props.style : [button.props.style]));
    expect(flatStyle.backgroundColor).toBeUndefined();
    expect(flatStyle.borderWidth).toBeUndefined();
    expect(flatStyle.borderColor).toBeUndefined();
    expect(flatStyle.borderRadius).toBeUndefined();
  });

  it('shows the ✦ glyph and a chevron affordance', () => {
    const tree = SampleModeBanner({ isSampleMode: true, onPress: () => {} });
    const all = flattenText(tree);
    expect(all).toContain('✦');
    expect(all).toMatch(/›|→/);
  });
});
