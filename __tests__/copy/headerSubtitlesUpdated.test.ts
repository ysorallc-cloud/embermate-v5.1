// ============================================================================
// Header subtitle copy — locks in the v6.7 messaging revisions.
// Asserts removal of the old copy and presence of the replacements across
// Now / Journal / Insights / You.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

const journalSrc    = read('app/(tabs)/journal.tsx');
const understandSrc = read('app/(tabs)/understand.tsx');
const supportSrc    = read('app/(tabs)/support.tsx');
const greetingSrc   = read('utils/contextualGreeting.ts');
// Phase 15.8 — the Insights subtitle copy chain moved from an inline
// IIFE in understand.tsx to utils/insightsSubtitle.ts so the visit-
// anchored variant and the daysOfData fallback chain can be pinned
// with pure-function tests. The copy assertions below now read both
// files so they keep guarding the chain wherever it lives.
const insightsSubtitleSrc = read('utils/insightsSubtitle.ts');
const understandPlusHelper = understandSrc + '\n' + insightsSubtitleSrc;

describe('Header subtitle copy — Journal', () => {
  it('does NOT contain "Share with the next caregiver"', () => {
    expect(journalSrc).not.toContain('Share with the next caregiver');
  });

  it('does NOT contain "bring to a visit"', () => {
    expect(journalSrc).not.toContain('bring to a visit');
  });

  it('uses the journalSubtitle helper to drive the time-aware subtitle', () => {
    // v6.7: the static "[patient]'s day, in your words." literal was
    // replaced with the time-aware helper output. The helper covers
    // morning / afternoon / evening / past-date variants.
    expect(journalSrc).toMatch(/journalSubtitle\(/);
    expect(journalSrc).not.toContain("'s day, in your words.");
  });
});

describe('Header subtitle copy — Insights / Understand', () => {
  it('does NOT contain the redundant "14-day trends for" sub-header line', () => {
    expect(understandSrc).not.toMatch(/14-day trends for|\$\{timeRange\}-day trends/);
  });

  it('exposes a conditional subtitle keyed on days-of-data', () => {
    // The screen should branch on `daysOfData` to produce the four variants:
    //  0 days, 1–6 days, 7–29 days, 30+ days.
    // Phase 15.8 — copy chain moved into utils/insightsSubtitle.ts;
    // assertions now check understand.tsx + the helper together.
    expect(understandPlusHelper).toMatch(/daysOfData/);
    // Empty-state copy
    expect(understandPlusHelper).toMatch(/patterns will start to surface/i);
    // Building copy
    expect(understandPlusHelper).toMatch(/Building [^]+ picture|building [^]+ picture/i);
    // 7+ days copy
    expect(understandPlusHelper).toMatch(/last \d+ days are showing|last \$\{[^}]+\} days are showing/);
  });
});

describe('Header subtitle copy — You / Support', () => {
  it('does NOT contain the "Caregivers who check in on themselves" lecture', () => {
    expect(supportSrc).not.toContain('Caregivers who check in on themselves');
  });

  it('does NOT contain the "provide better care. Take a moment." follow-up', () => {
    expect(supportSrc).not.toContain('Take a moment');
  });

  it('contains the single-line subtitle: "A space for you, not your loved one."', () => {
    expect(supportSrc).toContain('A space for you, not your loved one.');
  });
});

describe('Header subtitle copy — Now / contextual greeting', () => {
  it('morning/afternoon + upcoming time: subtitle reads "Next meds: [time]"', () => {
    expect(greetingSrc).toMatch(/Next meds: \$\{nextScheduledTime\}/);
  });

  it('evening + items left: subtitle reads "Almost done — [N] left tonight"', () => {
    expect(greetingSrc).toMatch(/Almost done [—-] \$\{left\} left tonight/);
  });

  it('evening + all done: subtitle reads "All done. Nice work."', () => {
    expect(greetingSrc).toMatch(/All done\. Nice work\./);
  });

  it('does NOT fall back to "items still on the schedule" when nextScheduledTime is provided', () => {
    // The fallback text may still exist for the no-time path, but the
    // primary morning-with-time branch must not produce it.
    const morningBranch = greetingSrc.match(/if \(hour < 12\)[\s\S]*?\}\s*\n\s*\n/);
    expect(morningBranch).toBeTruthy();
    // Within the morning branch, `nextScheduledTime ?` must short-circuit
    // before the "still on the schedule" string is reached.
    const morningText = morningBranch![0];
    const timeIdx = morningText.indexOf('nextScheduledTime');
    const fallbackIdx = morningText.indexOf("on today's schedule");
    expect(timeIdx).toBeGreaterThan(-1);
    if (fallbackIdx > -1) {
      expect(timeIdx).toBeLessThan(fallbackIdx);
    }
  });
});
