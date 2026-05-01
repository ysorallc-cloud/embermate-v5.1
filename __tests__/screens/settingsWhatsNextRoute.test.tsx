// ============================================================================
// Settings → What's next — v7 preview surface (Prompt 7 Phase 4).
// Verifies header, opening line, and four feature cards (verbatim copy).
// ============================================================================

import React from 'react';

jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return { ...actual, useMemo: (fn: any) => fn() };
});

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#141612',
      glass: '#2a2c25',
      glassBorder: 'rgba(255,255,255,0.07)',
      glassHover: 'rgba(255,255,255,0.04)',
      accent: '#5fb88a',
      caregiverAccent: '#aa8adc',
      caregiverAccentBg: 'rgba(170, 138, 220, 0.06)',
      warning: '#e5b04a',
      textPrimary: '#fff',
      textSecondary: '#9aa0a6',
      textTertiary: '#6b7280',
      youAffirmationText: '#d4d1c3',
    },
  }),
}));

jest.mock('react-native', () => {
  const PT = (n: string) => n;
  return {
    View: PT('View'),
    Text: PT('Text'),
    TouchableOpacity: PT('TouchableOpacity'),
    ScrollView: PT('ScrollView'),
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
  };
});

jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));

jest.mock('../../components/SubScreenHeader', () => ({
  SubScreenHeader: 'SubScreenHeader',
}));

import WhatsNextScreen from '../../app/settings/whats-next';

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

describe("Settings → What's next — header", () => {
  it('renders SubScreenHeader with title "What\'s next" and the dev-features subtitle', () => {
    const tree = (WhatsNextScreen as any)();
    const header = findAll(tree, (n) => n.type === 'SubScreenHeader')[0];
    expect(header).toBeDefined();
    expect(header.props.title).toBe("What's next");
    expect(header.props.subtitle).toBe('Features in development.');
  });

  it('renders the opening line about staged caregiver-led building', () => {
    const tree = (WhatsNextScreen as any)();
    expect(flattenText(tree)).toContain("We're building this with caregivers, in stages.");
  });
});

describe("Settings → What's next — four feature cards (verbatim copy)", () => {
  it('card 1: Clinical insights engine — Coming this year', () => {
    const tree = (WhatsNextScreen as any)();
    const text = flattenText(tree);
    expect(text).toContain('Clinical insights engine');
    expect(text).toContain('Coming this year');
    expect(text).toContain('Auto-generated correlations a clinician would notice');
    expect(text).toContain('built with input from real nurses');
  });

  it('card 2: Calendar & appointments — Coming this year', () => {
    const tree = (WhatsNextScreen as any)();
    const text = flattenText(tree);
    expect(text).toContain('Calendar & appointments');
    expect(text).toContain('Track upcoming visits');
    expect(text).toContain('anchor visit prep to specific appointments');
  });

  it('card 3: Care Circle — Later this year', () => {
    const tree = (WhatsNextScreen as any)();
    const text = flattenText(tree);
    expect(text).toContain('Care Circle');
    expect(text).toContain('Later this year');
    expect(text).toContain('Share tracking with siblings');
    expect(text).toContain('on-device sync');
  });

  it('card 4: Multi-patient & AI assistant — Premium · later', () => {
    const tree = (WhatsNextScreen as any)();
    const text = flattenText(tree);
    expect(text).toContain('Multi-patient');
    expect(text).toContain('AI assistant');
    expect(text).toContain('Premium · later');
    expect(text).toContain('Track care for multiple loved ones');
  });
});

describe("Settings → What's next — framing rules", () => {
  it('does NOT use "coming soon!"', () => {
    const tree = (WhatsNextScreen as any)();
    expect(flattenText(tree).toLowerCase()).not.toContain('coming soon!');
  });

  it('does NOT mention version numbers or quarters', () => {
    const tree = (WhatsNextScreen as any)();
    const text = flattenText(tree).toLowerCase();
    expect(text).not.toMatch(/\bv7\b|version 7|7\.0|q1|q2|q3|q4/);
  });

  it('does NOT use AI-jargon ("AI-powered", "machine learning", "intelligent")', () => {
    const tree = (WhatsNextScreen as any)();
    const text = flattenText(tree).toLowerCase();
    expect(text).not.toContain('ai-powered');
    expect(text).not.toContain('machine learning');
    expect(text).not.toMatch(/\bintelligent\b/);
  });

  it('does NOT solicit signups ("Get notified", "Sign up for updates")', () => {
    const tree = (WhatsNextScreen as any)();
    const text = flattenText(tree).toLowerCase();
    expect(text).not.toContain('get notified');
    expect(text).not.toContain('sign up for updates');
  });
});
