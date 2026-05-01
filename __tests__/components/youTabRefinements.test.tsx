// ============================================================================
// You tab refinements — visual-consistency Phase 5.
//
// Three contracts:
//   1. ReflectionCard sits on youCardSurface (the only surface in the app
//      that uses the warm token), and its Save button is the filled-sage
//      primary (#5fb88a / #0a1510).
//   2. QuickResetPills are equal-flex children (Breathe / Helpline /
//      Community) with category-coloured labels (sage / coral / lavender)
//      and a tertiary subtitle below each ("60 sec" / "24/7" / "Read").
//   3. Plan-ahead is a single grouped card; the eyebrow + italic subtitle
//      live above the card, not inside.
// ============================================================================

import React from 'react';

const themeColors = {
  background: '#141612',
  glass: '#2a2c25',
  glassDim: '#1f2019',
  glassHover: 'rgba(255, 245, 220, 0.06)',
  glassBorder: 'rgba(255, 240, 215, 0.08)',
  hairlineInset: 'rgba(255, 240, 215, 0.06)',
  accent: '#5fb88a',
  caregiverAccent: '#aa8adc',
  warning: '#e5b04a',
  criticalAlert: '#e6776e',
  error: '#e6776e',
  coral: '#e89a7a',
  textPrimary: '#fff',
  textSecondary: '#c4c1b3',
  textTertiary: '#8a8a82',
  textMuted: '#9aa0a6',
  youCardSurface: '#2c2a23',
  youCardBorder: 'rgba(255, 240, 215, 0.10)',
  youAffirmationText: '#d4d1c3',
  youResetPillSurface: '#252420',
  youResetPillBorder: 'rgba(255, 235, 205, 0.10)',
};

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
    useRef: (initial: any) => ({ current: initial }),
  };
});

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({ resolvedTheme: 'dark', colors: themeColors }),
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

jest.mock('../../services/reflectionRepo', () => ({
  saveReflection: jest.fn(),
  getReflection: jest.fn(() => Promise.resolve(null)),
}));

jest.mock('../shared/InlineSaveToast', () => ({
  InlineSaveToast: 'InlineSaveToast',
}), { virtual: true });

import { ReflectionCard } from '../../components/support/ReflectionCard';
import { QuickResetPills } from '../../components/support/QuickResetPills';

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

const styleOf = (node: any) => {
  const styleProp = node.props.style;
  const styles = Array.isArray(styleProp) ? styleProp : [styleProp];
  return Object.assign({}, ...styles.filter(Boolean));
};

describe('ReflectionCard — locked warm capture surface', () => {
  it('card uses youCardSurface (#2c2a23), not glass', () => {
    const tree = (ReflectionCard as any)({});
    // The root is the card itself.
    const root = tree;
    const merged = styleOf(root);
    expect(merged.backgroundColor).toBe('#2c2a23');
    expect(merged.backgroundColor).not.toBe('#2a2c25');
  });

  it('Save button is the filled-sage primary', () => {
    const tree = (ReflectionCard as any)({});
    const save = findAll(tree, (n) =>
      n.type === 'TouchableOpacity' &&
      typeof n.props?.accessibilityLabel === 'string' &&
      /Save/.test(n.props.accessibilityLabel),
    )[0];
    expect(save).toBeDefined();
    const merged = styleOf(save);
    expect(merged.backgroundColor).toBe('#5fb88a');
    // Locked padding: 6pt vertical / 16pt horizontal.
    expect(merged.paddingVertical).toBe(6);
    expect(merged.paddingHorizontal).toBe(16);
  });

  it('Save button text is dark on the filled sage (#0a1510)', () => {
    const tree = (ReflectionCard as any)({});
    const saveText = findAll(tree, (n) =>
      n.type === 'Text' &&
      typeof n.props?.children === 'string' &&
      n.props.children === 'Save',
    )[0];
    expect(saveText).toBeDefined();
    const merged = styleOf(saveText);
    expect(merged.color).toBe('#0a1510');
    expect(merged.fontSize).toBe(11.5);
  });
});

describe('QuickResetPills — equal flex with category colors', () => {
  const baseProps = () => ({
    onBreathe: jest.fn(),
    onHelpline: jest.fn(),
    onCommunity: jest.fn(),
  });

  it('renders 3 pills as equal-flex children of a row container', () => {
    const tree = (QuickResetPills as any)(baseProps());
    const pills = findAll(tree, (n) =>
      n.type === 'TouchableOpacity' &&
      ['Breathe', 'Helpline', 'Community'].includes(n.props?.accessibilityLabel),
    );
    expect(pills.length).toBe(3);
    for (const p of pills) {
      const merged = styleOf(p);
      expect(merged.flex).toBe(1);
    }
  });

  it('Breathe label uses sage (accent)', () => {
    const tree = (QuickResetPills as any)(baseProps());
    const label = findAll(tree, (n) => n.props?.testID === 'quick-reset-label-breathe')[0];
    expect(label).toBeDefined();
    expect(styleOf(label).color).toBe('#5fb88a');
  });

  it('Helpline label uses coral (#e89a7a, NOT criticalAlert #e6776e)', () => {
    const tree = (QuickResetPills as any)(baseProps());
    const label = findAll(tree, (n) => n.props?.testID === 'quick-reset-label-helpline')[0];
    expect(label).toBeDefined();
    expect(styleOf(label).color).toBe('#e89a7a');
  });

  it('Community label uses lavender (caregiverAccent)', () => {
    const tree = (QuickResetPills as any)(baseProps());
    const label = findAll(tree, (n) => n.props?.testID === 'quick-reset-label-community')[0];
    expect(label).toBeDefined();
    expect(styleOf(label).color).toBe('#aa8adc');
  });

  it('each pill has a tertiary subtitle below the label', () => {
    const tree = (QuickResetPills as any)(baseProps());
    const subtitles = findAll(tree, (n) =>
      typeof n.props?.testID === 'string' && /^quick-reset-subtitle-/.test(n.props.testID),
    );
    expect(subtitles.length).toBe(3);
    const labels = subtitles.map((s) => s.props.children);
    expect(labels).toContain('60 sec');
    expect(labels).toContain('24/7');
    expect(labels).toContain('Read');
  });
});

// Plan-ahead: assert at the source level since the support.tsx structure
// is what governs eyebrow placement.
import { readFileSync } from 'fs';
import { join } from 'path';

describe('You tab — Plan-ahead grouped card', () => {
  const supportSrc = readFileSync(
    join(__dirname, '../../app/(tabs)/support.tsx'),
    'utf8',
  );

  it('eyebrow PLAN AHEAD lives above the card, not inside it', () => {
    // Find the planAheadCard JSX block. Capture preceding text — the
    // eyebrow Text should appear BEFORE the planAheadCard View.
    const cardIdx = supportSrc.indexOf('styles.planAheadCard');
    const eyebrowIdx = supportSrc.indexOf("'PLAN AHEAD'");
    expect(eyebrowIdx).toBeGreaterThan(0);
    expect(cardIdx).toBeGreaterThan(0);
    expect(eyebrowIdx).toBeLessThan(cardIdx);
  });

  it('serif italic subtitle lives above the card, not inside it', () => {
    const cardIdx = supportSrc.indexOf('styles.planAheadCard');
    const subtitleIdx = supportSrc.indexOf('When things are calm');
    expect(subtitleIdx).toBeGreaterThan(0);
    expect(subtitleIdx).toBeLessThan(cardIdx);
  });
});
