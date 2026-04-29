// ============================================================================
// Phase 10 — End of Shift card → Journal scroll-to-handoff wiring.
//
// Source-pattern test that the EOS card routes to Journal with
// scrollTo=handoff and that journal.tsx honors the param on mount.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const eosSrc = readFileSync(join(ROOT, 'components/now/EndOfShiftCard.tsx'), 'utf8');
const journalSrc = readFileSync(join(ROOT, 'app/(tabs)/journal.tsx'), 'utf8');

describe('Phase 10 — End of Shift CTA passes scrollTo=handoff', () => {
  it('routes to /(tabs)/journal with scrollTo=handoff', () => {
    expect(eosSrc).toMatch(/navigate\s*\(\s*['"]\/\(tabs\)\/journal\?scrollTo=handoff['"]\s*\)/);
  });
});

describe('Phase 10 — Journal honors scrollTo=handoff on mount', () => {
  it('reads useLocalSearchParams from expo-router', () => {
    expect(journalSrc).toMatch(/useLocalSearchParams\s*[<\(]/);
  });

  it('checks params.scrollTo === "handoff"', () => {
    expect(journalSrc).toMatch(/params\??\.scrollTo\s*!?==?\s*['"]handoff['"]/);
  });

  it('scrolls to the HandoffCard layout y after a 200ms delay', () => {
    expect(journalSrc).toMatch(/setTimeout\([\s\S]{0,400}?scrollTo\(\{[\s\S]{0,80}?y:/);
  });

  it('triggers a one-time pulse animation on the HandoffCard', () => {
    expect(journalSrc).toMatch(/Animated\.sequence\(/);
    expect(journalSrc).toMatch(/handoffPulse/);
  });

  it('passes the pulse Animated.Value to HandoffCard via the pulse prop', () => {
    expect(journalSrc).toMatch(/<HandoffCard[\s\S]{0,400}?pulse=\{handoffPulse\}/);
  });
});
