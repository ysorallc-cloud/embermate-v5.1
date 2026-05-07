// ============================================================================
// Phase 12 — "Done for today" hides the End of Shift card on Now.
//
// Behavioural test: drive the dayComplete storage helper + EOS card render
// directly. The card listens for `wellness` events emitted by markDayComplete
// and re-checks isDayComplete to hide.
// ============================================================================

const mockGet = jest.fn();
const mockSet = jest.fn();
const mockRemove = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: (k: string) => mockGet(k),
  setItem: (k: string, v: string) => mockSet(k, v),
  removeItem: (k: string) => mockRemove(k),
}));

jest.mock('../../services/carePlanGenerator', () => ({
  getTodayDateString: () => '2026-04-29',
}));

jest.mock('../../utils/devLog', () => ({ logError: jest.fn() }));

const mockEmit = jest.fn();
jest.mock('../../lib/events', () => ({
  emitDataUpdate: (...args: any[]) => mockEmit(...args),
  useDataListener: jest.fn(),
}));

import {
  markDayComplete,
  isDayComplete,
  clearDayComplete,
} from '../../utils/dayComplete';

describe('dayComplete storage', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockSet.mockReset();
    mockRemove.mockReset();
    mockEmit.mockReset();
  });

  it('markDayComplete writes the per-date key and emits the wellness event', async () => {
    mockSet.mockResolvedValue(undefined);
    await markDayComplete();
    expect(mockSet).toHaveBeenCalledWith('dayComplete:2026-04-29', 'true');
    // The End of Shift card listens to a category that markDayComplete emits.
    // Verify the emit happened — exact category name lives in EVENT.WELLNESS.
    expect(mockEmit).toHaveBeenCalledTimes(1);
  });

  it('isDayComplete returns true after the key is set', async () => {
    mockGet.mockResolvedValue('true');
    expect(await isDayComplete()).toBe(true);
  });

  it('isDayComplete returns false when the key is absent (next day rolls over naturally)', async () => {
    mockGet.mockResolvedValue(null);
    expect(await isDayComplete()).toBe(false);
  });

  it('clearDayComplete removes the per-date key', async () => {
    mockRemove.mockResolvedValue(undefined);
    await clearDayComplete('2026-04-29');
    expect(mockRemove).toHaveBeenCalledWith('dayComplete:2026-04-29');
  });

  it('per-date keys mean the next calendar day starts fresh', async () => {
    // Today's key is "true"; tomorrow's key is absent → tomorrow renders fresh.
    mockGet.mockImplementation((k: string) =>
      k === 'dayComplete:2026-04-29' ? Promise.resolve('true') : Promise.resolve(null),
    );
    expect(await isDayComplete('2026-04-29')).toBe(true);
    expect(await isDayComplete('2026-04-30')).toBe(false);
  });
});

describe('EOS card hides when dayComplete is true', () => {
  // The EOS card calls isDayComplete on mount. We stub the helper here and
  // inspect the render output via the same harness used in the EOS unit
  // test (manual function invocation).

  it('a dayComplete=true response causes EndOfShiftCard to render null even in the evening', () => {
    jest.resetModules();

    jest.doMock('react-native', () => ({
      View: 'View',
      Text: 'Text',
      TouchableOpacity: 'TouchableOpacity',
      StyleSheet: { create: (s: any) => s },
    }));
    jest.doMock('react', () => {
      const actual = jest.requireActual('react');
      return {
        ...actual,
        useState: (initial: any) => {
          // Drive the hiddenForDay state to true to simulate the post-mount
          // resolution of isDayComplete().
          if (initial === false) return [true, jest.fn()];
          return [typeof initial === 'function' ? initial() : initial, jest.fn()];
        },
        useMemo: (fn: any) => fn(),
        useEffect: (fn: any) => fn(),
        useCallback: (fn: any) => fn,
        useRef: (v: any) => ({ current: v }),
      };
    });
    jest.doMock('../../contexts/ThemeContext', () => ({
      useTheme: () => ({
        colors: {
          caregiverAccent: '#aa8adc',
          caregiverAccentBg: 'rgba(139, 92, 246, 0.06)',
          caregiverAccentStrong: 'rgba(139, 92, 246, 0.25)',
          caregiverAccentText: '#d4baff',
          textWarmSecondary: '#b0b8c0',
          textSecondary: 'rgba(255,255,255,0.72)',
        },
      }),
    }));
    jest.doMock('../../lib/navigate', () => ({ navigate: jest.fn() }));
    jest.doMock('../../utils/dayComplete', () => ({
      isDayComplete: jest.fn().mockResolvedValue(true),
    }));
    jest.doMock('../../lib/events', () => ({
      useDataListener: jest.fn(),
    }));

    const RealDate = Date;
    class FakeDate extends RealDate { getHours() { return 22; } }
    (global as any).Date = FakeDate as DateConstructor;
    try {
      const { EndOfShiftCard } = require('../../components/now/EndOfShiftCard');
      const tree = EndOfShiftCard({ completedCount: 5 });
      expect(tree).toBeNull();
    } finally {
      (global as any).Date = RealDate;
    }
  });
});
