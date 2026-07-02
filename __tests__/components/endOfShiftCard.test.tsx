// ============================================================================
// EndOfShiftCard — time-aware visibility + caregiver accent identity
// ============================================================================

// React Native primitives are mocked to plain string tags so we can assert
// against the rendered tree without a JSDOM/native renderer.
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  StyleSheet: { create: (styles: any) => styles },
}));

jest.mock('react', () => {
  const actualReact = jest.requireActual('react');
  return {
    ...actualReact,
    useState: (initial: any) => [
      typeof initial === 'function' ? initial() : initial,
      jest.fn(),
    ],
    useMemo: (fn: () => any) => fn(),
    useEffect: () => {},
    useCallback: (fn: any) => fn,
    useRef: (initial: any) => ({ current: initial }),
  };
});

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      caregiverAccent: '#aa8adc',
      caregiverAccentBg: 'rgba(107, 140, 174, 0.08)',
      caregiverAccentStrong: 'rgba(107, 140, 174, 0.30)',
      caregiverAccentText: '#d4baff',
      textWarmSecondary: '#b0b8c0',
      textSecondary: 'rgba(255, 255, 255, 0.72)',
    },
  }),
}));

jest.mock('../../lib/navigate', () => ({ navigate: jest.fn() }));
jest.mock('../../utils/dayComplete', () => ({
  isDayComplete: jest.fn().mockResolvedValue(false),
}));
jest.mock('../../lib/events', () => ({
  useDataListener: jest.fn(),
}));

import React from 'react';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const cardPath = join(__dirname, '../../components/now/EndOfShiftCard.tsx');

describe('EndOfShiftCard component file', () => {
  it('exists at components/now/EndOfShiftCard.tsx', () => {
    expect(existsSync(cardPath)).toBe(true);
  });
});

describe('EndOfShiftCard time-gate behavior', () => {
  // Skip behavioral suite if the file isn't there yet (the existence assertion
  // above will fail first, so this guard only avoids a noisy import error).
  if (!existsSync(cardPath)) return;

  // Lazy-require so the module can read the mocked `Date` per test.
  function loadCard() {
    jest.resetModules();
    return require('../../components/now/EndOfShiftCard').EndOfShiftCard;
  }

  function withHour<T>(hour: number, fn: () => T): T {
    const RealDate = Date;
    class FakeDate extends RealDate {
      getHours() {
        return hour;
      }
    }
    (global as any).Date = FakeDate as DateConstructor;
    try {
      return fn();
    } finally {
      (global as any).Date = RealDate;
    }
  }

  it('returns null at hour=10 (morning, before evening cutoff)', () => {
    const EndOfShiftCard = loadCard();
    const tree = withHour(10, () => EndOfShiftCard({ completedCount: 5 }));
    expect(tree).toBeNull();
  });

  it('returns null at hour=17 (just before evening cutoff)', () => {
    const EndOfShiftCard = loadCard();
    const tree = withHour(17, () => EndOfShiftCard({ completedCount: 5 }));
    expect(tree).toBeNull();
  });

  it('renders at hour=18 (start of evening)', () => {
    const EndOfShiftCard = loadCard();
    const tree = withHour(18, () => EndOfShiftCard({ completedCount: 5 }));
    expect(tree).not.toBeNull();
    expect(tree.type).toBe('View');
  });

  it('renders at hour=23 (late evening)', () => {
    const EndOfShiftCard = loadCard();
    const tree = withHour(23, () => EndOfShiftCard({ completedCount: 5 }));
    expect(tree).not.toBeNull();
    expect(tree.type).toBe('View');
  });
});

describe('EndOfShiftCard caregiver-accent identity', () => {
  if (!existsSync(cardPath)) return;
  const src = readFileSync(cardPath, 'utf8');

  it('background uses caregiverAccentBg token (purple family)', () => {
    expect(src).toMatch(/caregiverAccentBg/);
  });

  it('border uses the B1 handoff register token (end-of-shift = handoff lane)', () => {
    expect(src).toMatch(/borderColor:\s*c\.borderHandoff/);
  });

  it('text/title uses caregiverAccentText token', () => {
    expect(src).toMatch(/caregiverAccentText/);
  });
});

describe('EndOfShiftCard body text — composer wiring (Phase 3c)', () => {
  if (!existsSync(cardPath)) return;
  const src = readFileSync(cardPath, 'utf8');

  it('imports composeEndOfShiftBody from utils/text/composers', () => {
    expect(src).toMatch(/from\s+['"][^'"]+utils\/text\/composers\/endOfShiftBody['"]/);
  });

  it('passes structured outcomes through to the composer', () => {
    expect(src).toMatch(/composeEndOfShiftBody\(outcomes/);
  });

  it('accepts an optional outcomes prop on the component', () => {
    expect(src).toMatch(/outcomes\?:\s*DailyOutcomes/);
  });

  it('falls back to legacy body when outcomes is omitted (back-compat)', () => {
    expect(src).toMatch(/outcomes\s*\?\s*composeEndOfShiftBody/);
    expect(src).toMatch(/wrapping up/);
  });
});

describe('EndOfShiftCard body text — composer output match', () => {
  if (!existsSync(cardPath)) return;

  // Imports are deferred so the React Native mock above takes effect.
  const { composeEndOfShiftBody } = require('../../utils/text/composers/endOfShiftBody');

  function withHourFn<T>(hour: number, fn: () => T): T {
    const RealDate = Date;
    class FakeDate extends RealDate {
      getHours() {
        return hour;
      }
    }
    (global as any).Date = FakeDate as DateConstructor;
    try {
      return fn();
    } finally {
      (global as any).Date = RealDate;
    }
  }

  function findText(node: any): string[] {
    if (!node || typeof node !== 'object') return [];
    const out: string[] = [];
    if (node.type === 'Text') {
      const c = node.props?.children;
      if (typeof c === 'string') out.push(c);
      else if (Array.isArray(c)) out.push(c.filter(x => typeof x === 'string').join(''));
    }
    const kids = node.props?.children;
    const arr = Array.isArray(kids) ? kids : kids != null ? [kids] : [];
    for (const k of arr) out.push(...findText(k));
    return out;
  }

  it('renders the composer output when outcomes are provided', () => {
    jest.resetModules();
    const { EndOfShiftCard } = require('../../components/now/EndOfShiftCard');
    const outcomes = {
      logged: { count: 7 },
      missed: { count: 2, names: ['Acetaminophen', 'Amlodipine'] },
      pending: { count: 0, names: [] },
    };
    const expected = composeEndOfShiftBody(outcomes, []);
    const tree = withHourFn(20, () =>
      EndOfShiftCard({ completedCount: 7, outcomes }),
    );
    const texts = findText(tree);
    expect(texts).toContain(expected);
  });
});
