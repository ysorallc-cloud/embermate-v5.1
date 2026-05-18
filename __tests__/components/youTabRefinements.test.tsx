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
  background: '#1f201c',
  glass: '#363830',
  glassDim: '#2a2c25',
  glassHover: 'rgba(255, 245, 220, 0.06)',
  glassBorder: 'rgba(255, 240, 215, 0.08)',
  hairlineInset: 'rgba(255, 240, 215, 0.06)',
  accent: '#5fb88a',
  caregiverAccent: '#aa8adc',
  // Phase 29 Batch B F3 — ReflectionCard chrome migrated to caregiver
  // lane tokens. Mock needs the alpha tiers F3 consumes so render-tree
  // assertions resolve to the same rgba strings the production tokens do.
  caregiverAccentBg: 'rgba(170, 138, 220, 0.06)',
  caregiverAccentWash: 'rgba(170, 138, 220, 0.15)',
  warning: '#e5b04a',
  criticalAlert: '#e6776e',
  error: '#e6776e',
  coral: '#e89a7a',
  textPrimary: '#f4ddb8', // Phase 33 F1a — cream replaced pure white
  textSecondary: '#c4c1b3',
  textTertiary: '#8a8a82',
  textMuted: '#9aa0a6',
  youCardSurface: '#383528',
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
// Phase 29 Batch B F4 — QuickResetPills retired. The "equal flex with
// category colors" describe block below is reframed as an absence pin
// (the file no longer exists in the codebase). ActionCardsRow's
// successor contracts live in actionCardsRow29B.test.tsx (size/icon
// per card + accessibilityHint preservation).

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

describe('ReflectionCard — Phase 29 Batch B F3 lavender lane chrome', () => {
  it('card uses caregiverAccentBg (lavender lane chrome) — youCardSurface retired', () => {
    // Phase 29 Batch B F3 — primary lane-coded card chrome matching the
    // Phase 27/28 JournalSection pattern. The pre-F3 youCardSurface
    // warm-cream bg retired with the broader You-lane lavender
    // migration; ReflectionCard now reads as a peer of Journal SOAP
    // cards across surfaces (Tier 3 of the lane-coherence rule).
    const tree = (ReflectionCard as any)({});
    const root = tree;
    const merged = styleOf(root);
    expect(merged.backgroundColor).toBe('rgba(170, 138, 220, 0.06)');
    expect(merged.backgroundColor).not.toBe('#383528');
  });

  it('card has 3px full-hex caregiverAccent left border (matches JournalSection primary-card chrome)', () => {
    const tree = (ReflectionCard as any)({});
    const merged = styleOf(tree);
    expect(merged.borderLeftWidth).toBe(3);
    expect(merged.borderLeftColor).toBe('#aa8adc');
  });

  it('Save button is filled caregiverAccent (Phase 29 Batch B F3 — lane recolor from sage)', () => {
    const tree = (ReflectionCard as any)({});
    const save = findAll(tree, (n) =>
      n.type === 'TouchableOpacity' &&
      typeof n.props?.accessibilityLabel === 'string' &&
      /Save/.test(n.props.accessibilityLabel),
    )[0];
    expect(save).toBeDefined();
    const merged = styleOf(save);
    expect(merged.backgroundColor).toBe('#aa8adc');
    expect(merged.backgroundColor).not.toBe('#5fb88a');
    // Locked padding: 6pt vertical / 16pt horizontal.
    expect(merged.paddingVertical).toBe(6);
    expect(merged.paddingHorizontal).toBe(16);
  });

  it('Save button text is near-black on the filled lavender (Phase 29 Batch B F3 lane recolor + Phase 33 F9 Phase-26 precedent)', () => {
    // Phase 29 Batch B F3 — Save button bg migrated from sage to lavender.
    // Phase 33 F9 — text color migrated from '#fff' to '#0a0c0a' per the
    // Phase 26 F4 sage/lavender-CTA near-black precedent. AAA contrast
    // against lavender (~9.5:1).
    const tree = (ReflectionCard as any)({});
    const saveText = findAll(tree, (n) =>
      n.type === 'Text' &&
      typeof n.props?.children === 'string' &&
      n.props.children === 'Save',
    )[0];
    expect(saveText).toBeDefined();
    const merged = styleOf(saveText);
    expect(merged.color).toBe('#0a0c0a');
    expect(merged.fontSize).toBe(11.5);
  });
});

describe('QuickResetPills — retired in Phase 29 Batch B F4 (absence pin)', () => {
  // Pre-B QuickResetPills was a 3-pill row (Breathe / Helpline /
  // Community) with per-pill category colors and a Breathe entry into
  // the breathing exercise. Phase 29 Batch A.2 folded Breathe into the
  // orb card; Phase 29 Batch B F4 retired Helpline + Community pills
  // into the new ActionCardsRow (with Wellness as the third card,
  // replacing the also-retired wellnessLink row). QuickResetPills.tsx
  // + its 2 dedicated test files deleted.
  //
  // The original presence contracts (3 equal-flex pills, per-pill
  // colors, subtitle labels) survive on the successor surface — see
  // __tests__/components/actionCardsRow29B.test.tsx contracts 1-7 for
  // the ActionCardsRow pins covering the same intent.
  const { existsSync } = require('fs');
  const { join: pathJoin } = require('path');

  it('absence pin: components/support/QuickResetPills.tsx no longer exists', () => {
    expect(existsSync(pathJoin(__dirname, '../../components/support/QuickResetPills.tsx'))).toBe(false);
  });
});

// Plan-ahead: assert at the source level since the support.tsx structure
// is what governs eyebrow placement.
import { readFileSync } from 'fs';
import { join } from 'path';

describe('You tab — Plan-ahead header (Phase 29 Batch B F4 reframe)', () => {
  const supportSrc = readFileSync(
    join(__dirname, '../../app/(tabs)/support.tsx'),
    'utf8',
  );

  it('"When you have a moment" header lives above the compact ResourcesList', () => {
    // Phase 7.3 collapsed the prior eyebrow + subtitle pair into a single
    // serif-italic header. Phase 29 Batch B F4 retired the planAheadCard
    // wrapper (compact ResourcesList chevron rows ARE the chrome now);
    // the header still sits above the ResourcesList JSX in source order.
    const listIdx = supportSrc.indexOf('<ResourcesList');
    const headerIdx = supportSrc.indexOf('When you have a moment');
    expect(headerIdx).toBeGreaterThan(0);
    expect(listIdx).toBeGreaterThan(0);
    expect(headerIdx).toBeLessThan(listIdx);
  });
});
