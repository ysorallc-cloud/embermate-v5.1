// ============================================================================
// RegisterCard — F3 foundation-primitive contract.
//
// Pins the wayfinding contract (Design-Lock §5/§6): the 3px inset left bar
// paints in the card's REGISTER color, resolved through theme tokens. Two
// cards of the same register share a color by design — that is the semantic.
//
// Mounts the component (hooks mocked to run synchronously, RN primitives as
// string elements) and asserts the accent-bar node's backgroundColor matches
// getRegisterColor for each register. Also asserts the bar is the inset 3px
// bar (width 3, left 0) — not the card edge — so a future refactor can't
// silently turn it into a full-height border.
// ============================================================================

import React from 'react';

const CORAL = '#e3a684';
const GOLD = '#d6ab5e';
const SAGE = '#9ccfa6'; // = accent token
const BLUE = '#8fa8c8';
const FAINT = '#5e685f'; // = textTertiary (neutral register)

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
      surface: '#26302a',
      glassBorder: 'rgba(255,255,255,0.06)',
      coral: CORAL,
      gold: GOLD,
      accent: SAGE,
      blue: BLUE,
      textTertiary: FAINT,
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

import { RegisterCard } from '../../components/common/RegisterCard';
import { CardRegister } from '../../theme/registerColors';

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
function styleOf(node: any): Record<string, any> {
  const s = node?.props?.style;
  if (!s) return {};
  if (Array.isArray(s)) return Object.assign({}, ...s.filter(Boolean));
  return s;
}

function renderAccentBar(register: CardRegister) {
  const tree = RegisterCard({
    register,
    testID: 'rc',
    children: React.createElement('Text', null, 'body'),
  } as any) as any;
  const bars = findAll(tree, (n) => n?.props?.testID === 'rc-accent');
  expect(bars).toHaveLength(1);
  return styleOf(bars[0]);
}

describe('RegisterCard — F3 register→bar-color contract', () => {
  const cases: Array<[CardRegister, string]> = [
    ['coral', CORAL],
    ['gold', GOLD],
    ['sage', SAGE],
    ['blue', BLUE],
    ['neutral', FAINT],
  ];

  it.each(cases)('register "%s" paints the bar %s', (register, expected) => {
    expect(renderAccentBar(register).backgroundColor).toBe(expected);
  });

  it('the bar is the inset 3px left bar, not the card edge', () => {
    const s = renderAccentBar('sage');
    expect(s.width).toBe(3);
    expect(s.left).toBe(0);
    // inset vertically so it reads as a bar (clears the rounded corners)
    expect(s.top).toBeGreaterThan(0);
    expect(s.bottom).toBeGreaterThan(0);
  });
});
