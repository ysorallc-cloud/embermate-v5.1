// ============================================================================
// You tab refinements — visual-consistency Phase 5.
//
// Three contracts:
//   1. ReflectionCard sits on youCardSurface (the only surface in the app
//      that uses the warm token), and its Save button is the filled-sage
//      primary (#5fb88a / #0a1510).
//   2. QuickResetPills are equal-flex children (Breathe / Helpline /
//      Community) with category-coloured labels (sage / coral / lavender)
//      and a tertiary subtitle below each ("60 sec" / "Mon-Fri 8am-7pm ET" / "Read").
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

describe('ReflectionCard — DE-BOXED (You rebuild S4, full de-purple)', () => {
  it('card has no lavender background (de-boxed to open fabric)', () => {
    // The mockup flattens the check-in; only the SUPPORT tiles keep
    // containers. The prior lavender lane-card bg is gone.
    const tree = (ReflectionCard as any)({});
    const merged = styleOf(tree);
    expect(merged.backgroundColor).toBeUndefined();
  });

  it('card has no left border (open fabric, not a lane-coded card)', () => {
    const tree = (ReflectionCard as any)({});
    const merged = styleOf(tree);
    expect(merged.borderLeftWidth).toBeUndefined();
    expect(merged.borderLeftColor).toBeUndefined();
  });

  it('Save button is filled sage `c.accent` (Phase 33b extension lavender no-fill canon — reframed from Phase 29 Batch B F3 lavender recolor)', () => {
    // Phase 29 Batch B F3 had migrated this pill from sage to lavender
    // as a Tier-1 within-surface coherence move (wrapping card carries
    // lavender lane identity). Phase 33b extension lavender no-fill
    // canon (site #14) reversed that flip — lavender is now restricted
    // to eyebrow-scale text + thin accents, never fills. The Save pill
    // returns to sage; the wrapping card's lavender lane identity now
    // lives in its eyebrow + tint, not in the CTA. Padding (6pt vertical
    // / 16pt horizontal) unchanged from the v6.7 Phase 5 layout.
    const tree = (ReflectionCard as any)({});
    const save = findAll(tree, (n) =>
      n.type === 'TouchableOpacity' &&
      typeof n.props?.accessibilityLabel === 'string' &&
      /Save/.test(n.props.accessibilityLabel),
    )[0];
    expect(save).toBeDefined();
    const merged = styleOf(save);
    expect(merged.backgroundColor).toBe('#5fb88a');
    expect(merged.backgroundColor).not.toBe('#aa8adc');
    // Locked padding: 6pt vertical / 16pt horizontal.
    expect(merged.paddingVertical).toBe(6);
    expect(merged.paddingHorizontal).toBe(16);
  });

  it('Save button text is near-black on the sage fill (Phase 26 F4 / Q-F9.3 sage CTA contrast precedent — unchanged across the lane reframe)', () => {
    // Pre-cleanup the near-black text sat on lavender. After Phase 33b
    // extension lavender no-fill canon flipped the pill back to sage
    // (site #14), the same near-black text reads on sage as it did on
    // lavender per the Phase 26 F4 sage/lavender-CTA contrast precedent.
    // The text color is unchanged; only the wrapping fill flipped.
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

// The "Plan-ahead header + compact ResourcesList" block was retired in the
// You-tab restructure (the resources page + list were deleted). Its source-order
// pin is removed with it; the single Caregiver Action Network row that replaced
// it is contracted in youTabReflection.test.tsx.
