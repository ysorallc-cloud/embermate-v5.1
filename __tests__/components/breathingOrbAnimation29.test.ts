// ============================================================================
// Phase 29 Batch A.2 F5 — breathing-orb animation contracts.
//
// Pins the breath-synced scale animation (F3) and the Reduce Motion
// guard (F4) at the source level. Behavioral verification of the
// animation in flow was done at the simulator gates (F3: orb pulses with
// inhale/hold/exhale across 4 cycles, no drift; F4: Reduce Motion ON
// suppresses scale, countdown + phase labels carry pacing). These
// contracts defend the contract shape against future refactors — any
// change that breaks the inhale/exhale target values, the easing curve,
// the dep array, or the reduceMotion early-return fails here.
//
// Test approach: source-grep on the stripped (comments removed) source
// files. The behavioral path is hard to exercise in jest without driving
// the phase machine through fake timers, and the source-level pins
// capture the contract intent more directly than a brittle timer-based
// behavioral test would. Same approach used by youTabMoment29.test.tsx
// for the F3.8 alpha-progression and F2/F3 absence pins.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');

function readStripped(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const BREATHING_SRC = readStripped('components/support/BreathingExercise.tsx');
const HOOK_SRC = readStripped('hooks/useReduceMotion.ts');

describe('Phase 29 Batch A.2 F3 — breath-synced orb scale animation', () => {
  it('contract F3.1: coreScale initialized via useSharedValue(1.0)', () => {
    expect(BREATHING_SRC).toMatch(/coreScale\s*=\s*useSharedValue\(\s*1(\.0)?\s*\)/);
  });

  it('contract F3.2: animation useEffect dep array is [phase, reduceMotion]', () => {
    // The dep array carries BOTH phase (drives the cycle) AND reduceMotion
    // (lets a mid-flow toggle of the system preference re-fire the effect
    // and reset the scale). Omitting reduceMotion would mean the
    // preference toggle is ignored until the next natural phase transition.
    expect(BREATHING_SRC).toMatch(/\}\s*,\s*\[\s*phase\s*,\s*reduceMotion\s*\]\s*\)/);
  });

  it('contract F3.3: inhale phase fires withTiming with target 1.3', () => {
    const inhaleBranch = BREATHING_SRC.match(
      /phase\s*===\s*['"]inhale['"][\s\S]{0,300}?withTiming\s*\(\s*1\.3/,
    );
    expect(inhaleBranch).toBeTruthy();
  });

  it('contract F3.4: exhale phase fires withTiming with target 1.0', () => {
    const exhaleBranch = BREATHING_SRC.match(
      /phase\s*===\s*['"]exhale['"][\s\S]{0,300}?withTiming\s*\(\s*1(\.0)?[\s,]/,
    );
    expect(exhaleBranch).toBeTruthy();
  });

  it('contract F3.5: hold phase does NOT call withTiming (SharedValue persists)', () => {
    // Q3 / Q1 from the A.2 spec: rings stay static, only the core
    // animates, and during hold the core's value persists at whatever
    // the prior phase left it (1.3 after inhale; 1.0 before next cycle).
    // Any future "phase === 'hold'" branch that calls withTiming would
    // either drift the scale mid-hold or fight the prior animation —
    // both fail this contract.
    const holdBranch = BREATHING_SRC.match(
      /phase\s*===\s*['"]hold['"][\s\S]{0,300}?withTiming\s*\(/,
    );
    expect(holdBranch).toBeNull();
  });

  it('contract F3.6: intro / ready / complete phases reset coreScale to 1.0 (synchronous, no withTiming)', () => {
    // The compound branch handles all three static phases. Synchronous
    // assignment cancels any in-flight withTiming — important for
    // handleEnd, which sets phase to 'intro' to stop a mid-cycle
    // exercise. If this branch ever switches to withTiming, the End
    // tap would leave a residual animation running on the UI thread.
    expect(BREATHING_SRC).toMatch(
      /phase\s*===\s*['"]intro['"]\s*\|\|\s*phase\s*===\s*['"]ready['"]\s*\|\|\s*phase\s*===\s*['"]complete['"][\s\S]{0,200}coreScale\.value\s*=\s*1(\.0)?\s*;/,
    );
  });

  it('contract F3.7: easing is Easing.inOut(Easing.sin) for both inhale + exhale (no linear)', () => {
    // The body's breath isn't linear — it accelerates mid-inhale and
    // decelerates at the peak. easeInOutSine approximates that curve;
    // linear would feel mechanical. Both phases must use the same
    // curve so the cycle reads symmetric.
    const easingRefs = BREATHING_SRC.match(/Easing\.inOut\s*\(\s*Easing\.sin\s*\)/g) ?? [];
    expect(easingRefs.length).toBeGreaterThanOrEqual(2);
    // Defense: no linear easing in the breath path.
    const linearRefs = BREATHING_SRC.match(/Easing\.linear/g) ?? [];
    expect(linearRefs).toHaveLength(0);
  });

  it('contract F3.8: animation duration is PHASE_DURATION_MS (no chaining, no accumulation)', () => {
    // Each phase entry re-issues a fresh withTiming from the current
    // scale value with a 4-second duration. The animation completes
    // when the setTimeout-driven phase transition fires. Coupling the
    // duration to PHASE_DURATION_MS keeps the two clocks aligned — if
    // PHASE_DURATION_MS changes, the animation duration changes with it.
    const durationRefs = BREATHING_SRC.match(/duration:\s*PHASE_DURATION_MS/g) ?? [];
    expect(durationRefs.length).toBeGreaterThanOrEqual(2);
  });
});

describe('Phase 29 Batch A.2 F4 — Reduce Motion guard', () => {
  it('contract F4.1: BreathingExercise imports useReduceMotion from hooks/useReduceMotion', () => {
    expect(BREATHING_SRC).toMatch(
      /import\s*\{\s*useReduceMotion\s*\}\s*from\s*['"][^'"]*hooks\/useReduceMotion['"]/,
    );
  });

  it('contract F4.2: BreathingExercise calls useReduceMotion() and binds to a `reduceMotion` identifier', () => {
    expect(BREATHING_SRC).toMatch(/const\s+reduceMotion\s*=\s*useReduceMotion\s*\(\s*\)/);
  });

  it('contract F4.3: animation effect short-circuits with early return when reduceMotion is true', () => {
    // Top-of-effect guard: if reduceMotion, force scale to 1.0 and bail
    // BEFORE any withTiming call. A user with the preference enabled
    // sees no animation; countdown + phase labels carry pacing.
    expect(BREATHING_SRC).toMatch(
      /if\s*\(\s*reduceMotion\s*\)\s*\{[\s\S]{0,100}?coreScale\.value\s*=\s*1(\.0)?[\s\S]{0,80}?return\s*;?/,
    );
  });
});

describe('Phase 29 Batch A.2 F4 — useReduceMotion hook', () => {
  it('contract hook.1: reads AccessibilityInfo.isReduceMotionEnabled on mount', () => {
    expect(HOOK_SRC).toMatch(/AccessibilityInfo\.isReduceMotionEnabled\s*\(\s*\)/);
  });

  it('contract hook.2: subscribes to reduceMotionChanged for live updates', () => {
    // Live subscription so a mid-flow toggle of the iOS preference is
    // honored on the next phase transition, not just at next mount.
    expect(HOOK_SRC).toMatch(
      /AccessibilityInfo\.addEventListener\s*\(\s*['"]reduceMotionChanged['"]/,
    );
  });

  it('contract hook.3: cleans up the subscription on unmount', () => {
    // The hook stores the subscription handle and calls .remove() in
    // the effect's cleanup function. The actual call uses optional
    // chaining (`sub?.remove?.()`) to handle platforms where the
    // subscription shape differs — the regex accepts both `.remove()`
    // and `.remove?.()`.
    expect(HOOK_SRC).toMatch(/\.remove(?:\?\.)?\s*\(\s*\)/);
  });

  it('contract hook.4: returns the state-managed reduceMotion boolean', () => {
    // The hook's useState holds the reduceMotion boolean; the return
    // value reflects the current state and re-renders consumers when
    // the preference changes.
    expect(HOOK_SRC).toMatch(/useState\s*<?\s*(boolean)?\s*>?\s*\(\s*false\s*\)/);
    expect(HOOK_SRC).toMatch(/return\s+reduceMotion\s*;?/);
  });
});
