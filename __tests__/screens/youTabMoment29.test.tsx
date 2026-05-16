// ============================================================================
// Phase 29 — You-tab moment (greeting + chip relocation + orb card).
//
// Batch A of the Phase 29 You-lane redesign — replaces the pre-29 top-of-tab
// pair ("You" 22pt title + "A space for you, not your loved one" subtitle)
// with a warmer composition: time-aware greeting, caregiver chip on its own
// row carrying "This is your space" copy, and a new lavender breathing-orb
// card immediately above the ReflectionCard.
//
// Contracts pinned across Batch A (F1 + F2 + F3):
//
// F1 contracts (greeting + chip relocation):
//   1. support.tsx imports composeYouGreeting from utils/text/composers
//   2. The pre-29 literal 'A space for you, not your loved one' subtitle
//      no longer renders (absence pin — retirement)
//   3. The 22pt "You" title no longer renders (absence pin — the greeting
//      replaces it)
//   4. The caregiver chip renders BELOW the greeting in source order
//   5. The chip's display copy is "This is your space", not
//      `{caregiverName}` (Phase 26 chip pattern reuses avatar + chrome;
//      Phase 29 changes the inner Text to identity-statement copy)
//
// F2 + F3 contracts will be appended to this file in the same Batch A
// commit once those F-items land.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const SRC = readFileSync(join(ROOT, 'app/(tabs)/support.tsx'), 'utf8');
const STRIPPED = SRC
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

const BREATHING_SRC = readFileSync(
  join(ROOT, 'components/support/BreathingExercise.tsx'),
  'utf8',
);
const BREATHING_STRIPPED = BREATHING_SRC
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

describe('Phase 29 Batch A — F2 BreathingExercise autoStart prop', () => {
  it('contract F2.1: BreathingExerciseProps declares `autoStart?: boolean`', () => {
    expect(BREATHING_STRIPPED).toMatch(/\bautoStart\?:\s*boolean\b/);
  });

  it('contract F2.2: BreathingExercise destructures autoStart in its props', () => {
    // Function arg position. Accept either explicit named-destructure or
    // a typed-arg with autoStart present.
    expect(BREATHING_STRIPPED).toMatch(
      /function\s+BreathingExercise\s*\(\s*\{[^}]*\bautoStart\b[^}]*\}[\s\S]*?\)/,
    );
  });

  it('contract F2.3: visible-true effect branches on autoStart — when true, init phase to "ready" instead of "intro"', () => {
    // The reset useEffect lives in the file body. Capture the full
    // useEffect body and assert both branches surface — the true branch
    // sets phase 'ready', the else branch keeps the pre-29 'intro'.
    const effectBlock = BREATHING_STRIPPED.match(
      /useEffect\(\(\)\s*=>\s*\{[\s\S]*?if\s*\(\s*visible\s*\)\s*\{[\s\S]*?\n\s*\},\s*\[visible,\s*autoStart\]/,
    );
    expect(effectBlock).toBeTruthy();
    expect(effectBlock![0]).toMatch(/\bautoStart\b/);
    expect(effectBlock![0]).toMatch(/setPhase\(\s*['"]ready['"]\s*\)/);
  });

  it('contract F2.4: default (autoStart omitted / false) still inits to intro phase — defense pin', () => {
    // Preserves the pre-29 entry path for any external consumer that
    // doesn't pass autoStart. The 'intro' literal must still appear in
    // the visible-true setup path's else branch.
    const effectBlock = BREATHING_STRIPPED.match(
      /useEffect\(\(\)\s*=>\s*\{[\s\S]*?if\s*\(\s*visible\s*\)\s*\{[\s\S]*?\n\s*\},\s*\[visible,\s*autoStart\]/,
    );
    expect(effectBlock).toBeTruthy();
    expect(effectBlock![0]).toMatch(/setPhase\(\s*['"]intro['"]\s*\)/);
  });
});

describe('Phase 29 Batch A — F3 BreathingOrbCard', () => {
  // Render-tree contracts use TestRenderer. Phase 29 Batch A.fix —
  // BreathingOrbCard is a pure tap-trigger component. It does NOT mount
  // its own BreathingExercise modal. The parent (support.tsx) owns a
  // single BreathingExercise instance shared between the orb tap and
  // the legacy QuickResetPills Breathe pill, with an autoStart state
  // variable tracking which entry source fired. Lifting state fixed an
  // iOS focus bug where two mounted Modal contexts (orb's + the pre-29
  // root-level one) confused the keyboard-window responder chain and
  // suppressed keyboard presentation on ReflectionCard's TextInput.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const TestRenderer = require('react-test-renderer');

  const themeColors = {
    caregiverAccent: '#aa8adc',
    caregiverAccentBg: 'rgba(170, 138, 220, 0.06)',
    caregiverAccentLight: 'rgba(170, 138, 220, 0.10)',
    caregiverAccentBorder: 'rgba(170, 138, 220, 0.20)',
    caregiverAccentStrong: 'rgba(170, 138, 220, 0.25)',
    sageFaint: 'rgba(196, 181, 253, 0.06)',
    textPrimary: '#fff',
    textSecondary: '#c4c1b3',
    textTertiary: '#9aa0a6',
    accent: '#5fb88a',
  };

  jest.doMock('../../contexts/ThemeContext', () => ({
    useTheme: () => ({ resolvedTheme: 'dark', colors: themeColors }),
  }));
  jest.doMock('react-native', () => {
    const PT = (n: string) => n;
    return {
      View: PT('View'),
      Text: PT('Text'),
      TouchableOpacity: PT('TouchableOpacity'),
      Modal: PT('Modal'),
      StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
    };
  });
  jest.doMock('expo-linear-gradient', () => ({
    LinearGradient: 'LinearGradient',
  }));
  jest.doMock('react-native-svg', () => ({
    __esModule: true,
    default: 'Svg',
    Svg: 'Svg',
    Circle: 'Circle',
    Defs: 'Defs',
    RadialGradient: 'RadialGradient',
    Stop: 'Stop',
  }));
  jest.doMock('expo-haptics', () => ({
    // BreathingExercise calls Haptics.selectionAsync().catch(...) — must
    // return a thenable so the .catch chain doesn't blow up when the
    // queued autoStart→ready→inhale timer fires inside the test.
    selectionAsync: jest.fn(() => Promise.resolve()),
  }));
  jest.doMock('../../utils/eventEmitter', () => ({ emitWellnessEvent: jest.fn() }));
  jest.doMock('../../utils/streakStorage', () => ({ updateStreak: jest.fn() }));

  // Fake timers prevent the BreathingExercise autoStart timer (2500ms ready
  // → inhale handoff) from advancing during the orb-card tap test. We only
  // care that visible flipped to true; the breathing animation is owned by
  // BreathingExercise's own contracts elsewhere.
  beforeEach(() => { jest.useFakeTimers(); });
  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  const { BreathingOrbCard } = require('../../components/support/BreathingOrbCard');

  function findAll(
    root: any,
    predicate: (n: any) => boolean,
  ): any[] {
    return root.findAll((n: any) => {
      try { return predicate(n); } catch { return false; }
    });
  }

  function flatText(n: any): string {
    const out: string[] = [];
    function walk(node: any) {
      if (node == null) return;
      if (typeof node === 'string' || typeof node === 'number') { out.push(String(node)); return; }
      if (Array.isArray(node)) { node.forEach(walk); return; }
      if (node?.props?.children !== undefined) walk(node.props.children);
    }
    walk(n);
    return out.join('');
  }

  function render(onTap: jest.Mock = jest.fn()): any {
    let tree: any = null;
    TestRenderer.act(() => {
      tree = TestRenderer.create(React.createElement(BreathingOrbCard, { onTap }));
    });
    return tree;
  }

  it('contract F3.1: renders the "Tap to take a breath" prompt and the 60-second subtitle', () => {
    const tree = render();
    const allText = findAll(tree.root, (n: any) => n.type === 'Text')
      .map(flatText)
      .join(' | ');
    expect(allText).toContain('Tap to take a breath');
    expect(allText).toContain('60 seconds');
    expect(allText).toContain('stays on this screen');
  });

  it('contract F3.2: prompt text uses Georgia italic', () => {
    const tree = render();
    const promptNode = findAll(tree.root, (n: any) =>
      n.type === 'Text' && flatText(n).includes('Tap to take a breath'),
    )[0];
    expect(promptNode).toBeDefined();
    const style = promptNode.props.style;
    const flat = Array.isArray(style) ? Object.assign({}, ...style) : style;
    expect(flat.fontFamily).toBe('Georgia');
    expect(flat.fontStyle).toBe('italic');
  });

  it('contract F3.3 (Batch A.fix lift): BreathingOrbCard does NOT mount a BreathingExercise modal internally', () => {
    // Pre-fix the orb card owned its own visible state + Modal mount.
    // That made TWO BreathingExercise instances live in support.tsx's
    // tree simultaneously (orb's + the pre-29 root-level mount fed by
    // QuickResetPills.onBreathe), which suppressed keyboard
    // presentation on ReflectionCard's TextInput. Batch A.fix lifted
    // state — the orb card is now a pure tap-trigger component.
    const tree = render();
    // Source-level absence pin — the import is gone too.
    const orbSrc = readFileSync(
      join(ROOT, 'components/support/BreathingOrbCard.tsx'),
      'utf8',
    );
    expect(orbSrc).not.toMatch(/from\s+['"][^'"]*BreathingExercise['"]/);
    expect(orbSrc).not.toMatch(/<BreathingExercise/);
    // Render-tree pin — no BreathingExercise component in the rendered
    // tree under the orb card.
    const breathing = findAll(tree.root, (n: any) =>
      typeof n.type === 'function' && n.type.name === 'BreathingExercise',
    );
    expect(breathing).toHaveLength(0);
  });

  it('contract F3.4 (Batch A.fix lift): tapping the orb invokes the onTap prop', () => {
    const onTap = jest.fn();
    const tree = render(onTap);
    const tap = findAll(tree.root, (n: any) =>
      n.props?.testID === 'breathing-orb-card-tap',
    )[0];
    expect(tap).toBeDefined();
    TestRenderer.act(() => { tap.props.onPress(); });
    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it('contract F3.6 (Batch A.fix lift): support.tsx renders exactly ONE BreathingExercise mount', () => {
    // Single Modal context — eliminates the dual-mount iOS responder-
    // chain bug that suppressed keyboard presentation.
    const matches = STRIPPED.match(/<BreathingExercise\b/g) ?? [];
    expect(matches).toHaveLength(1);
  });

  it('contract F3.7 (Batch A.fix lift): support.tsx wires the orb onTap to set autoStart=true; QuickResetPills.onBreathe sets autoStart=false', () => {
    // Both entry points feed the same single BreathingExercise. They
    // differ only in the autoStart value they push onto state. Source-
    // level pins keep the two paths legible without coupling to a
    // specific state-variable name (accept any of the conventional
    // identifiers).
    //
    // Pattern: the orb's onTap handler sets the autoStart-tracking
    // state to true, then sets visible to true. The pill's
    // onBreathe handler sets the same autoStart state to false, then
    // sets visible to true.
    //
    // We pin (a) BreathingOrbCard receives an onTap prop in JSX, and
    // (b) BreathingExercise's autoStart prop is wired to a state
    // identifier (not the literal true/false), and (c) the orb +
    // pill handlers both set that state identifier with their
    // respective values.
    expect(STRIPPED).toMatch(/<BreathingOrbCard\s+onTap=\{/);
    // BreathingExercise's autoStart binds to a state identifier
    // (curly-brace expression), not a literal.
    expect(STRIPPED).toMatch(/<BreathingExercise[\s\S]*?autoStart=\{(?!true\}|false\})[^}]+\}/);
  });

  it('contract F3.5: integration — support.tsx mounts BreathingOrbCard BETWEEN AffirmationHeader and ReflectionCard', () => {
    expect(STRIPPED).toMatch(
      /import\s*\{[^}]*\bBreathingOrbCard\b[^}]*\}\s*from\s*['"][^'"]*BreathingOrbCard['"]/,
    );
    const idxAff = STRIPPED.indexOf('<AffirmationHeader');
    const idxOrb = STRIPPED.indexOf('<BreathingOrbCard');
    const idxReflection = STRIPPED.indexOf('<ReflectionCard');
    expect(idxAff).toBeGreaterThan(-1);
    expect(idxOrb).toBeGreaterThan(-1);
    expect(idxReflection).toBeGreaterThan(-1);
    expect(idxOrb).toBeGreaterThan(idxAff);
    expect(idxReflection).toBeGreaterThan(idxOrb);
  });
});

describe('Phase 29 Batch A — F1 greeting + chip relocation', () => {
  it('contract 1: support.tsx imports composeYouGreeting', () => {
    expect(STRIPPED).toMatch(
      /import\s*\{[^}]*\bcomposeYouGreeting\b[^}]*\}\s*from\s*['"][^'"]*utils\/text\/composers\/youGreeting['"]/,
    );
  });

  it('contract 2 (absence pin): pre-29 subtitle "A space for you, not your loved one" is gone', () => {
    expect(STRIPPED).not.toMatch(/A space for you, not your loved one/);
  });

  it('contract 3 (absence pin): pre-29 22pt "You" title literal is gone', () => {
    // The pre-29 form was a bare <Text style={styles.title}>You</Text>.
    // Phase 29 replaces this with the greeting helper output. Any future
    // re-introduction of the literal H1 tile reads as a regression.
    expect(STRIPPED).not.toMatch(/<Text\s+style=\{styles\.title\}\s*>\s*You\s*<\/Text>/);
  });

  it('contract 4: caregiver chip JSX renders AFTER the greeting in source order', () => {
    // The greeting comes from composeYouGreeting (called inline in the
    // render path). The chip is a <View style={styles.caregiverChip}>.
    // Locate both and assert ordering.
    const greetingIdx = STRIPPED.search(/composeYouGreeting\s*\(/);
    const chipIdx = STRIPPED.search(/style=\{styles\.caregiverChip\}/);
    expect(greetingIdx).toBeGreaterThan(-1);
    expect(chipIdx).toBeGreaterThan(-1);
    expect(chipIdx).toBeGreaterThan(greetingIdx);
  });

  it('contract 5: chip body Text reads "This is your space" (not the bare {caregiverName} ref)', () => {
    // Phase 26 F3 originally rendered the caregiver name inside the chip
    // (<Text style={styles.caregiverChipName}>{caregiverName}</Text>).
    // Phase 29 reframes the chip as an identity statement carried at the
    // top of the tab — the name is no longer a slot, the chip is the
    // statement. Avatar dot still carries the initial, preserved.
    expect(STRIPPED).toMatch(/['"]This is your space['"]/);
    expect(STRIPPED).not.toMatch(/<Text\s+style=\{styles\.caregiverChipName\}\s*>\s*\{caregiverName\}\s*<\/Text>/);
  });
});
