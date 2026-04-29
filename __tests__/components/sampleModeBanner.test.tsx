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
      caregiverAccentBg: 'rgba(139, 92, 246, 0.06)',
      caregiverAccentBorder: 'rgba(139, 92, 246, 0.25)',
      caregiverAccentText: '#d4baff',
      textSecondary: '#9aa0a6',
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

  it('uses caregiverAccent surface tokens, not the legacy purple banner palette', () => {
    const tree = SampleModeBanner({ isSampleMode: true, onPress: () => {} });
    const button = findAll(tree, (n) => n.type === 'TouchableOpacity')[0];
    const flatStyle = Object.assign({}, ...(Array.isArray(button.props.style) ? button.props.style : [button.props.style]));
    expect(flatStyle.backgroundColor).toBe('rgba(139, 92, 246, 0.06)');
    expect(flatStyle.borderColor).toBe('rgba(139, 92, 246, 0.25)');
  });

  it('shows the ✦ glyph and a chevron affordance', () => {
    const tree = SampleModeBanner({ isSampleMode: true, onPress: () => {} });
    const all = flattenText(tree);
    expect(all).toContain('✦');
    expect(all).toMatch(/›|→/);
  });
});
