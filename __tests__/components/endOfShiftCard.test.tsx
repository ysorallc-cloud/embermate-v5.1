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
  };
});

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      caregiverAccent: '#b794f4',
      caregiverAccentBg: 'rgba(139, 92, 246, 0.06)',
      caregiverAccentBorder: 'rgba(139, 92, 246, 0.25)',
      caregiverAccentText: '#d4baff',
      textWarmSecondary: '#b0b8c0',
      textSecondary: 'rgba(255, 255, 255, 0.72)',
    },
  }),
}));

jest.mock('../../lib/navigate', () => ({ navigate: jest.fn() }));

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

  it('border uses caregiverAccentBorder token', () => {
    expect(src).toMatch(/caregiverAccentBorder/);
  });

  it('text/title uses caregiverAccentText token', () => {
    expect(src).toMatch(/caregiverAccentText/);
  });
});
