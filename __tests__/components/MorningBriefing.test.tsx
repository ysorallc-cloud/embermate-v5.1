// ============================================================================
// MorningBriefing Component Tests
// ============================================================================

// Mock react-native minimally (node env, no JSDOM)
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  Pressable: 'Pressable',
  StyleSheet: { create: (styles: any) => styles },
  Platform: { OS: 'ios', select: (obj: any) => obj.ios || obj.default },
}));

// Mock React's hooks for node env (no renderer)
jest.mock('react', () => {
  const actualReact = jest.requireActual('react');
  return {
    ...actualReact,
    useState: (initial: any) => [typeof initial === 'function' ? initial() : initial, jest.fn()],
    useMemo: (fn: () => any) => fn(),
    useEffect: () => {},
    useCallback: (fn: any) => fn,
  };
});

// Mock baselineStorage
jest.mock('../../utils/baselineStorage', () => ({
  getBaselineLanguage: jest.fn((confidence: string) => ({
    adverb: confidence === 'confident' ? 'typically' : 'usually',
    verb: 'seems',
  })),
}));

// Mock ThemeContext (MorningBriefing calls useTheme())
jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#000',
      textPrimary: '#fff',
      textSecondary: '#aaa',
      textMuted: '#666',
      textTertiary: '#444',
      accent: '#14b8a6',
      glassFaint: 'rgba(255,255,255,0.05)',
      glassHover: 'rgba(255,255,255,0.1)',
      glassActive: 'rgba(255,255,255,0.15)',
      green: '#10b981',
      amber: '#f59e0b',
      amberBright: '#e5b04a',
      red: '#ef4444',
      redBright: '#e6776e',
      textBright: '#e2e8f0',
    },
    isDark: true,
  }),
}));

// Mock caregiverWellnessStorage (used by MorningBriefing for caregiver self-check)
jest.mock('../../utils/caregiverWellnessStorage', () => ({
  getTodayCheck: jest.fn().mockResolvedValue(null),
  saveDailyCheck: jest.fn().mockResolvedValue(undefined),
}));

import { MorningBriefing, MorningBriefingProps } from '../../components/prompts/MorningBriefing';

describe('MorningBriefing', () => {
  it('exports MorningBriefing component', () => {
    expect(MorningBriefing).toBeDefined();
    expect(typeof MorningBriefing).toBe('function');
  });

  it('does not render when isFirstUse is true (onboarding takes over)', () => {
    const props: MorningBriefingProps = {
      patientName: 'Mom',
      itemCount: 3,
      lastVisitHours: 14,
      orientationMessage: '3 items pending',
      closureMessage: null,
      regulationMessage: null,
      baselineToConfirm: null,
      isFirstUse: true,
      onDismiss: jest.fn(),
      onBaselineConfirm: jest.fn(),
    };

    const result = MorningBriefing(props);
    expect(result).toBeNull();
  });

  it('renders single card (non-null) for returning user', () => {
    const props: MorningBriefingProps = {
      patientName: 'Mom',
      itemCount: 3,
      lastVisitHours: 14,
      orientationMessage: '3 items pending',
      closureMessage: null,
      regulationMessage: null,
      baselineToConfirm: null,
      isFirstUse: false,
      onDismiss: jest.fn(),
      onBaselineConfirm: jest.fn(),
    };

    const result = MorningBriefing(props);
    expect(result).not.toBeNull();
    expect(result).toBeTruthy();
  });

  it('renders when isFirstUse defaults to false', () => {
    const props: MorningBriefingProps = {
      patientName: 'Dad',
      itemCount: 0,
      lastVisitHours: null,
      orientationMessage: null,
      closureMessage: null,
      regulationMessage: null,
      baselineToConfirm: null,
      onDismiss: jest.fn(),
      onBaselineConfirm: jest.fn(),
    };

    const result = MorningBriefing(props);
    expect(result).not.toBeNull();
  });

  it('accepts all props including baseline confirm without error', () => {
    const props: MorningBriefingProps = {
      patientName: 'Mom',
      itemCount: 5,
      lastVisitHours: 2,
      orientationMessage: 'You have 5 items pending today.',
      closureMessage: null,
      regulationMessage: 'Take a moment to breathe.',
      baselineToConfirm: {
        category: 'meals',
        baseline: {
          category: 'meals',
          dailyCount: 3,
          daysOfData: 7,
          confidence: 'tentative',
          confirmed: false,
          dismissed: false,
        },
      },
      onDismiss: jest.fn(),
      onBaselineConfirm: jest.fn(),
      onBaselineDismiss: jest.fn(),
    };

    expect(() => MorningBriefing(props)).not.toThrow();
  });

  it('accepts closure message prop', () => {
    const props: MorningBriefingProps = {
      patientName: 'Mom',
      itemCount: 8,
      lastVisitHours: 1,
      orientationMessage: null,
      closureMessage: 'All done for today! Great work.',
      regulationMessage: null,
      baselineToConfirm: null,
      onDismiss: jest.fn(),
      onBaselineConfirm: jest.fn(),
    };

    const result = MorningBriefing(props);
    expect(result).not.toBeNull();
  });

  it('renders the testID morning-briefing', () => {
    const props: MorningBriefingProps = {
      patientName: 'Mom',
      itemCount: 3,
      lastVisitHours: 14,
      orientationMessage: null,
      closureMessage: null,
      regulationMessage: null,
      baselineToConfirm: null,
      onDismiss: jest.fn(),
      onBaselineConfirm: jest.fn(),
    };

    const result = MorningBriefing(props) as any;
    // The root element should have testID="morning-briefing"
    expect(result).not.toBeNull();
    expect(result?.props?.testID).toBe('morning-briefing');
  });
});
