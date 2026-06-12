// ============================================================================
// Phase 9.3 — log-meal migration to LogScreen.
//
// Pre-9.3 the screen rendered a 2x2 grid of 180pt-tall emoji-first meal
// cards, a mid-screen "She ate" sage CTA, and a bottom orange "Log Meal"
// CTA — two competing primary actions plus a palette violation
// (c.orange = #FB923C). The progress chip read from getTodayProgress'
// meals path which, while units-consistent, sourced from the legacy
// getTodayMealsLog rather than the wizard-driven instance pipeline.
//
// Post-9.3 contracts pinned here:
//
//   1.  Wraps in LogScreen.
//   2.  No orange-family hex literals.
//   3.  Meal type renders as 2-col pill grid, pills < 100pt tall.
//   4.  No emoji-first decoration on meal pills.
//   6.  Multi-select on meal types preserved.
//   7.  Time-taken row, "Just now" pre-selected.
//   8.  Counter math derived from listDailyInstances filtered to
//       itemType === 'nutrition' (regression guard for the legacy
//       getTodayProgress source path).
//   9.  CTA label "Save meal", disabled by default, enables on meal-type
//       selection alone (portion picker dropped per Q2 — see 9.3.0).
//   10. Medical disclaimer renders before the meal selector.
//   12. Single primary CTA (consolidates the legacy mid-screen "She ate"
//       and bottom orange "Log Meal").
//   13. Quick-foods filtered by selected meal type — restyled as compact
//       pills, no emojis, per-meal-type filter preserved.
//
// Contracts 5 (portion) and 11 (use last meal) were dropped after 9.3.0
// scope discussion.
// ============================================================================

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { readFileSync } from 'fs';
import { join } from 'path';

// ----------------------------------------------------------------------------
// Mocks — mirror the log-vitals.test.tsx strategy.
// ----------------------------------------------------------------------------

const themeColors = {
  background: '#1f201c',
  glass: '#363830',
  glassBorder: 'rgba(255, 240, 215, 0.08)',
  glassHover: 'rgba(255, 245, 220, 0.06)',
  accent: '#5fb88a',
  accentLight: 'rgba(95, 184, 138, 0.15)',
  accentBorder: 'rgba(95, 184, 138, 0.25)',
  accentFaint: 'rgba(95, 184, 138, 0.06)',
  accentHint: 'rgba(95, 184, 138, 0.14)',
  caregiverAccent: '#aa8adc',
  caregiverAccentFaint: 'rgba(170, 138, 220, 0.06)',
  criticalAlert: '#e6776e',
  textPrimary: '#fff',
  textSecondary: '#c4c1b3',
  textTertiary: '#8a8a82',
  textMuted: '#9aa0a6',
  surfaceElevated: '#2a2c25',
};

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({ resolvedTheme: 'dark', colors: themeColors }),
}));

jest.mock('react-native', () => {
  const PT = (n: string) => n;
  return {
    View: PT('View'),
    Text: PT('Text'),
    TextInput: PT('TextInput'),
    TouchableOpacity: PT('TouchableOpacity'),
    Pressable: PT('Pressable'),
    ScrollView: PT('ScrollView'),
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
    Alert: { alert: jest.fn() },
    KeyboardAvoidingView: PT('KeyboardAvoidingView'),
    Platform: { OS: 'ios' },
  };
});

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, style }: any) =>
    require('react').createElement('SafeAreaView', { style }, children),
}));

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({}),
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
  usePathname: () => '/log-meal',
}));

jest.mock('../../lib/navigate', () => ({
  navigateBack: jest.fn(),
  navigate: jest.fn(),
  navigateReplace: jest.fn(),
}));

const mockListDailyInstances: jest.Mock = jest.fn(async () => [] as any[]);
jest.mock('../../storage/carePlanRepo', () => ({
  listDailyInstances: (...args: any[]) => (mockListDailyInstances as any).apply(null, args),
  logInstanceCompletion: jest.fn(async () => null),
  DEFAULT_PATIENT_ID: 'default',
}));

jest.mock('../../services/carePlanGenerator', () => ({
  getTodayDateString: () => '2026-05-08',
}));

jest.mock('../../utils/dailyTrackingStorage', () => ({
  saveDailyTracking: jest.fn(async () => {}),
  getDailyTracking: jest.fn(async () => null),
}));

jest.mock('../../utils/centralStorage', () => ({
  saveMealsLog: jest.fn(async () => {}),
  getTodayMealsLog: jest.fn(async () => null),
}));

jest.mock('../../utils/hapticFeedback', () => ({
  hapticSuccess: jest.fn(async () => {}),
}));

jest.mock('../../utils/carePlanRouting', () => ({
  parseCarePlanContext: () => null,
  getCarePlanBannerText: () => '',
  getPreSelectionHints: () => null,
}));

jest.mock('../../utils/carePlanStorage', () => ({
  trackCarePlanProgress: jest.fn(async () => {}),
}));

jest.mock('../../utils/devLog', () => ({ logError: () => {}, devLog: () => {} }));

jest.mock('../../lib/events', () => ({
  emitDataUpdate: jest.fn(),
}));

jest.mock('../../lib/eventNames', () => ({
  EVENT: {
    MEALS: 'meals',
    DAILY_INSTANCES: 'dailyInstances',
  },
}));

// Pin Date so getDefaultMealType() returns a known value for tests.
// 16:00 local → "dinner" branch in getDefaultMealType (>= 14, < 19).
const FROZEN_NOW = new Date('2026-05-08T16:00:00').getTime();
beforeAll(() => {
  jest.useFakeTimers().setSystemTime(new Date(FROZEN_NOW));
});
afterAll(() => {
  jest.useRealTimers();
});

import LogMealScreen from '../../app/log-meal';

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function findAll(
  root: TestRenderer.ReactTestInstance,
  predicate: (n: any) => boolean,
): TestRenderer.ReactTestInstance[] {
  return root.findAll((n: any) => {
    try { return predicate(n); } catch { return false; }
  });
}

function styleOf(node: TestRenderer.ReactTestInstance): Record<string, any> {
  const s = (node.props as any)?.style;
  const arr = Array.isArray(s) ? s : [s];
  return Object.assign({}, ...arr.filter(Boolean));
}

async function renderScreen(): Promise<TestRenderer.ReactTestRenderer> {
  let root: TestRenderer.ReactTestRenderer | null = null;
  await act(async () => {
    root = TestRenderer.create(React.createElement(LogMealScreen as any));
  });
  await act(async () => {});
  return root!;
}

beforeEach(() => {
  mockListDailyInstances.mockReset().mockResolvedValue([]);
});

// ----------------------------------------------------------------------------
// Source-level contracts
// ----------------------------------------------------------------------------

describe('Phase 9.3 — log-meal source-level contracts', () => {
  const SRC = readFileSync(
    join(__dirname, '../../app/log-meal.tsx'),
    'utf8',
  );

  it('contract 1: imports LogScreen', () => {
    expect(SRC).toMatch(
      /import\s*\{\s*LogScreen\s*\}\s*from\s*['"][^'"]+\/components\/logging\/LogScreen['"]/,
    );
  });

  it('contract 1: uses LogScreen as the screen wrapper', () => {
    expect(SRC).toMatch(/<LogScreen[\s\S]*?>[\s\S]*?<\/LogScreen>/);
  });

  // Strip comment lines so historical-context blocks don't trigger
  // false positives on hex literal / token-name regexes.
  const codeOnly = (() => {
    const lines = SRC.split('\n');
    let inBlock = false;
    const out: string[] = [];
    for (const line of lines) {
      let l = line;
      if (inBlock) {
        const end = l.indexOf('*/');
        if (end >= 0) {
          inBlock = false;
          l = l.slice(end + 2);
        } else {
          continue;
        }
      }
      const blockStart = l.indexOf('/*');
      if (blockStart >= 0) {
        const blockEnd = l.indexOf('*/', blockStart + 2);
        if (blockEnd >= 0) {
          l = l.slice(0, blockStart) + l.slice(blockEnd + 2);
        } else {
          inBlock = true;
          l = l.slice(0, blockStart);
        }
      }
      const lineComment = l.indexOf('//');
      if (lineComment >= 0) l = l.slice(0, lineComment);
      out.push(l);
    }
    return out.join('\n');
  })();

  it('contract 2: no orange-family hex literals in code', () => {
    const ORANGE_RE = /#FF8C42|#F97316|#EA580C|#FB7185|#FFA500|#FB923C/i;
    expect(codeOnly).not.toMatch(ORANGE_RE);
  });

  it('contract 2: does not reference the orphaned c.orange token in code', () => {
    expect(codeOnly).not.toMatch(/\bc\.orange\b/);
    expect(codeOnly).not.toMatch(/\bcolors\.orange\b/);
  });

  it('counter source: imports listDailyInstances (canonical wizard pipeline)', () => {
    expect(SRC).toMatch(
      /import\s*\{[^}]*listDailyInstances[^}]*\}\s*from\s*['"][^'"]+\/storage\/carePlanRepo['"]/,
    );
  });

  it('counter source: does NOT import or call getTodayProgress (legacy source path)', () => {
    expect(SRC).not.toMatch(/import\s+\{[^}]*getTodayProgress/);
    expect(SRC).not.toMatch(/getTodayProgress\s*\(/);
  });

  it('contract 9: primary CTA label "Save meal"', () => {
    expect(SRC).toMatch(/Save meal/);
  });

  it('contract 12: no legacy "She ate" CTA copy in code', () => {
    expect(codeOnly).not.toMatch(/['"`]She ate['"`]/);
  });

  it('contract 12: no legacy "Log Meal" CTA copy in code (title kept as Meal)', () => {
    expect(codeOnly).not.toMatch(/['"`]Log Meal['"`]/);
  });

  it('drops the prose helper "Tap to select one or more meals"', () => {
    expect(codeOnly).not.toMatch(/Tap to select one or more meals/);
  });
});

// ----------------------------------------------------------------------------
// Behaviour contracts
// ----------------------------------------------------------------------------

describe('Phase 9.3 — log-meal default render', () => {
  it('contract 10: medical disclaimer renders before the meal selector', async () => {
    const tree = await renderScreen();
    const disclaimer = findAll(
      tree.root,
      (n) => n.props?.testID === 'log-meal-disclaimer',
    )[0];
    expect(disclaimer).toBeDefined();
    const grid = findAll(
      tree.root,
      (n) => n.props?.testID === 'log-meal-grid',
    )[0];
    expect(grid).toBeDefined();
    // Disclaimer source position must precede the grid in the tree by
    // appearing earlier in the depth-first traversal.
    const all = findAll(tree.root, () => true);
    const disclaimerIdx = all.indexOf(disclaimer);
    const gridIdx = all.indexOf(grid);
    expect(disclaimerIdx).toBeLessThan(gridIdx);
  });

  it('contract 3: meal grid is a 2-column layout', async () => {
    const tree = await renderScreen();
    const grid = findAll(
      tree.root,
      (n) => n.props?.testID === 'log-meal-grid',
    )[0];
    expect(grid).toBeDefined();
    const s = styleOf(grid);
    // The 2-column layout is implemented as flexDirection 'row' + flexWrap
    // 'wrap' with each pill taking ~48% width (flex-basis pattern). The
    // pill style controls width; the grid's contract is row + wrap.
    expect(s.flexDirection).toBe('row');
    expect(s.flexWrap).toBe('wrap');
  });

  it('contract 3: meal pills cap their height under 100pt', async () => {
    const tree = await renderScreen();
    const pills = findAll(
      tree.root,
      (n) =>
        typeof n.props?.testID === 'string' &&
        /^log-meal-pill-/.test(n.props.testID),
    );
    expect(pills.length).toBeGreaterThan(0);
    for (const pill of pills) {
      const s = styleOf(pill);
      // Pills cap height via a minHeight or paddingVertical; the contract
      // is "no element style sets height >= 100".
      const pillHeights = [s.height, s.minHeight, s.maxHeight].filter(
        (v) => typeof v === 'number',
      );
      for (const h of pillHeights) {
        expect(h).toBeLessThan(100);
      }
    }
  });

  it('contract 4: meal pills carry no decorative pictographic emoji', async () => {
    const tree = await renderScreen();
    const pills = findAll(
      tree.root,
      (n) =>
        typeof n.props?.testID === 'string' &&
        /^log-meal-pill-/.test(n.props.testID),
    );
    expect(pills.length).toBeGreaterThan(0);
    // Forbid pictographic-emoji ranges (U+1F300–U+1F9FF — the ranges that
    // contained the legacy 🌅 ☀️ 🌙 🍎 icons). The selected-state ✓
    // checkmark (U+2713) is a UI dingbat, not a decorative meal icon —
    // explicitly allowed.
    const PICTOGRAPHIC_RE = /[\u{1F300}-\u{1F9FF}]/u;
    for (const pill of pills) {
      const texts = findAll(pill, (n) => n.type === 'Text');
      for (const t of texts) {
        const child = t.props.children;
        const flat = Array.isArray(child) ? child.join('') : String(child ?? '');
        expect(flat).not.toMatch(PICTOGRAPHIC_RE);
      }
    }
  });
});

describe('Phase 9.3 — log-meal multi-select', () => {
  it('contract 6: tapping two meal pills selects both', async () => {
    const tree = await renderScreen();
    // Time-of-day default selects "dinner" at 16:00 — start by clearing
    // it so the test reads as a clean multi-select interaction.
    const dinner = findAll(
      tree.root,
      (n) => n.props?.testID === 'log-meal-pill-dinner',
    )[0];
    if (dinner.props.accessibilityState?.selected) {
      await act(async () => { dinner.props.onPress(); });
    }

    const breakfast = findAll(
      tree.root,
      (n) => n.props?.testID === 'log-meal-pill-breakfast',
    )[0];
    const lunch = findAll(
      tree.root,
      (n) => n.props?.testID === 'log-meal-pill-lunch',
    )[0];
    await act(async () => { breakfast.props.onPress(); });
    await act(async () => { lunch.props.onPress(); });
    expect(breakfast.props.accessibilityState?.selected).toBe(true);
    expect(lunch.props.accessibilityState?.selected).toBe(true);
  });
});

describe('Phase 9.3 — log-meal time-taken row', () => {
  it('contract 7: 3 pills with "Just now" pre-selected', async () => {
    const tree = await renderScreen();
    const now = findAll(tree.root, (n) => n.props?.testID === 'log-meal-time-now')[0];
    const m15 = findAll(tree.root, (n) => n.props?.testID === 'log-meal-time-15m')[0];
    const earlier = findAll(tree.root, (n) => n.props?.testID === 'log-meal-time-earlier')[0];
    expect(now).toBeDefined();
    expect(m15).toBeDefined();
    expect(earlier).toBeDefined();
    expect(now.props.accessibilityState?.selected).toBe(true);
    expect(m15.props.accessibilityState?.selected).toBe(false);
    expect(earlier.props.accessibilityState?.selected).toBe(false);
  });
});

describe('Phase 9.3 — log-meal counter (canonical instance source)', () => {
  it('contract 8: subtitle reads "1 of 2 today" when 2 nutrition instances exist and 1 is completed', async () => {
    mockListDailyInstances.mockResolvedValue([
      { id: 'n1', itemType: 'nutrition', status: 'completed' },
      { id: 'n2', itemType: 'nutrition', status: 'pending' },
      { id: 'v1', itemType: 'vitals', status: 'completed' }, // unrelated
    ] as any);
    const tree = await renderScreen();
    const subtitle = findAll(
      tree.root,
      (n) => n.props?.testID === 'log-screen-subtitle',
    )[0];
    expect(subtitle).toBeDefined();
    expect(subtitle.props.children).toBe('1 of 2 today');
  });

  it('contract 8: subtitle is omitted when no nutrition instances exist', async () => {
    mockListDailyInstances.mockResolvedValue([]);
    const tree = await renderScreen();
    const subtitle = findAll(
      tree.root,
      (n) => n.props?.testID === 'log-screen-subtitle',
    );
    expect(subtitle).toHaveLength(0);
  });
});

describe('Phase 9.3 — log-meal primary CTA', () => {
  it('contract 9: CTA label resolves to "Save meal"', async () => {
    const tree = await renderScreen();
    const ctaText = findAll(
      tree.root,
      (n) => n.props?.testID === 'log-screen-primary-cta-text',
    )[0];
    expect(ctaText.props.children).toMatch(/Save meal/i);
  });

  it('contract 9: CTA enables when at least one meal type is selected (no portion required)', async () => {
    const tree = await renderScreen();
    const cta = findAll(
      tree.root,
      (n) => n.props?.testID === 'log-screen-primary-cta',
    )[0];
    // Time-of-day default selects "dinner" at 16:00, so CTA should be
    // enabled on first render. Verify by toggling dinner OFF first,
    // then back ON.
    const dinner = findAll(
      tree.root,
      (n) => n.props?.testID === 'log-meal-pill-dinner',
    )[0];
    await act(async () => { dinner.props.onPress(); });   // off
    expect(cta.props.disabled).toBe(true);
    await act(async () => { dinner.props.onPress(); });   // on
    expect(cta.props.disabled).toBe(false);
  });

  it('contract 12: exactly one filled-sage primary CTA renders (no competing "She ate")', async () => {
    const tree = await renderScreen();
    const ctas = findAll(
      tree.root,
      (n) => n.props?.testID === 'log-screen-primary-cta',
    );
    expect(ctas).toHaveLength(1);
  });
});

describe('Phase 9.3 — log-meal quick-foods (Q3)', () => {
  it('contract 13: quick-foods row shows breakfast options when Breakfast is selected', async () => {
    const tree = await renderScreen();
    // Clear the time-of-day default selection (dinner) first.
    const dinner = findAll(tree.root, (n) => n.props?.testID === 'log-meal-pill-dinner')[0];
    if (dinner.props.accessibilityState?.selected) {
      await act(async () => { dinner.props.onPress(); });
    }
    // Select Breakfast.
    const breakfast = findAll(tree.root, (n) => n.props?.testID === 'log-meal-pill-breakfast')[0];
    await act(async () => { breakfast.props.onPress(); });

    const quickFoods = findAll(
      tree.root,
      (n) =>
        typeof n.props?.testID === 'string' &&
        /^log-meal-quick-/.test(n.props.testID),
    );
    expect(quickFoods.length).toBeGreaterThan(0);
    const labels = quickFoods.map((q) =>
      findAll(q, (n) => n.type === 'Text')
        .map((t) => String(t.props.children))
        .join(''),
    );
    // Breakfast quick-foods include "Eggs & Toast" and "Oatmeal" per the
    // existing QUICK_FOODS map.
    expect(labels.some((l) => /Eggs|Oatmeal/.test(l))).toBe(true);
    expect(labels.some((l) => /Sandwich|Salad/.test(l))).toBe(false); // lunch foods absent
  });

  it('contract 13: tapping a quick-food pill toggles its selected state', async () => {
    const tree = await renderScreen();
    // Default dinner selected at 16:00; quick-foods for dinner already render.
    const quickFoods = findAll(
      tree.root,
      (n) =>
        typeof n.props?.testID === 'string' &&
        /^log-meal-quick-/.test(n.props.testID),
    );
    expect(quickFoods.length).toBeGreaterThan(0);
    const first = quickFoods[0];
    expect(first.props.accessibilityState?.selected).toBe(false);
    await act(async () => { first.props.onPress(); });
    expect(first.props.accessibilityState?.selected).toBe(true);
  });

  it('contract 13: switching from Breakfast to Dinner updates the quick-foods filter', async () => {
    const tree = await renderScreen();
    // Clear default, select Breakfast.
    const dinner = findAll(tree.root, (n) => n.props?.testID === 'log-meal-pill-dinner')[0];
    if (dinner.props.accessibilityState?.selected) {
      await act(async () => { dinner.props.onPress(); });
    }
    const breakfast = findAll(tree.root, (n) => n.props?.testID === 'log-meal-pill-breakfast')[0];
    await act(async () => { breakfast.props.onPress(); });

    // Capture breakfast labels.
    const breakfastLabels = findAll(
      tree.root,
      (n) => typeof n.props?.testID === 'string' && /^log-meal-quick-/.test(n.props.testID),
    ).map((q) =>
      findAll(q, (n) => n.type === 'Text')
        .map((t) => String(t.props.children))
        .join(''),
    );

    // Toggle Breakfast off, Dinner on.
    await act(async () => { breakfast.props.onPress(); });
    await act(async () => { dinner.props.onPress(); });

    const dinnerLabels = findAll(
      tree.root,
      (n) => typeof n.props?.testID === 'string' && /^log-meal-quick-/.test(n.props.testID),
    ).map((q) =>
      findAll(q, (n) => n.type === 'Text')
        .map((t) => String(t.props.children))
        .join(''),
    );

    expect(dinnerLabels.some((l) => /Pasta|Chicken|Rice/.test(l))).toBe(true);
    // At least one breakfast-only label should now be absent.
    expect(dinnerLabels).not.toEqual(breakfastLabels);
  });
});
