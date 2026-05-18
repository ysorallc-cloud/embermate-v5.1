// ============================================================================
// SectionEyebrow — small uppercase eyebrow label above page sections.
// 8pt textTertiary, letter-spacing 0.5, weight 500, uppercase.
// ============================================================================

import React from 'react';

jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return { ...actual, useMemo: (fn: any) => fn() };
});

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      textTertiary: '#6b7280',
      caregiverAccent: '#aa8adc',
      accent: '#5fb88a',
    },
  }),
}));

jest.mock('react-native', () => {
  const PT = (n: string) => n;
  return {
    View: PT('View'),
    Text: PT('Text'),
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
  };
});

import { SectionEyebrow } from '../../components/SectionEyebrow';

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
  const s = node.props?.style;
  if (!s) return {};
  return Object.assign({}, ...(Array.isArray(s) ? s : [s]));
}

describe('SectionEyebrow', () => {
  it('renders the supplied text uppercased', () => {
    const tree = SectionEyebrow({ text: "Today's outcomes" });
    const text = findAll(tree, (n) => n.type === 'Text')[0];
    expect(text).toBeDefined();
    expect(text.props.children).toBe("TODAY'S OUTCOMES");
  });

  it('uses the brand-aligned spec typography (11pt, weight 600 default, letter-spacing 2)', () => {
    const tree = SectionEyebrow({ text: 'Anything' });
    const text = findAll(tree, (n) => n.type === 'Text')[0];
    const style = flatStyle(text);
    expect(style.fontSize).toBe(11);
    expect(style.fontWeight).toBe('600');
    expect(style.letterSpacing).toBe(2);
  });

  it('variant="hero" renders weight 500 (lighter opt-in for dense eyebrow stacks)', () => {
    const tree = SectionEyebrow({ text: 'Anything', variant: 'hero' });
    const text = findAll(tree, (n) => n.type === 'Text')[0];
    const style = flatStyle(text);
    expect(style.fontWeight).toBe('500');
    // fontSize + letterSpacing stay shared across variants.
    expect(style.fontSize).toBe(11);
    expect(style.letterSpacing).toBe(2);
  });

  it('explicit variant="feature" matches default rendering', () => {
    const treeDefault = SectionEyebrow({ text: 'Anything' });
    const treeFeature = SectionEyebrow({ text: 'Anything', variant: 'feature' });
    const styleDefault = flatStyle(findAll(treeDefault, (n) => n.type === 'Text')[0]);
    const styleFeature = flatStyle(findAll(treeFeature, (n) => n.type === 'Text')[0]);
    expect(styleDefault.fontWeight).toBe('600');
    expect(styleFeature.fontWeight).toBe('600');
  });

  it('defaults to textTertiary colour', () => {
    const tree = SectionEyebrow({ text: 'Anything' });
    const text = findAll(tree, (n) => n.type === 'Text')[0];
    const style = flatStyle(text);
    expect(style.color).toBe('#6b7280');
  });

  it('honours an explicit tint prop', () => {
    const tree = SectionEyebrow({ text: 'Anything', tint: 'caregiverAccent' });
    const text = findAll(tree, (n) => n.type === 'Text')[0];
    const style = flatStyle(text);
    expect(style.color).toBe('#aa8adc');
  });

  it('does NOT change the case of all-caps acronyms inside the source string', () => {
    // The eyebrow always renders uppercase, so this is essentially a smoke
    // check — but it locks the rule that we go through toUpperCase().
    const tree = SectionEyebrow({ text: 'BP & HR' });
    const text = findAll(tree, (n) => n.type === 'Text')[0];
    expect(text.props.children).toBe('BP & HR');
  });

  it('exposes accessibilityRole="header" so VoiceOver announces the eyebrow as a section break', () => {
    const tree = SectionEyebrow({ text: 'Anything' });
    const text = findAll(tree, (n) => n.type === 'Text')[0];
    expect(text.props.accessibilityRole).toBe('header');
  });
});
