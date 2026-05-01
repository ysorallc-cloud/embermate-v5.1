// ============================================================================
// "Things to watch for" — tone audit.
//
// Locks in the Prompt 4 framing: thoughtful nurse, never alarmist. No
// "Dangerous / Critical / Emergency" copy in the library or screen. Severity
// taxonomy stays Urgent / Concerning / Watch (Phase 5 contract).
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';
import {
  CONDITION_WATCHLISTS,
  CUSTOM_CONDITION_FALLBACK,
} from '../../data/conditionWatchlists';

const ROOT = join(__dirname, '../..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

const cardSrc = read('components/watchFor/WatchForCard.tsx');
const screenSrc = read('app/(onboarding)/screens/WatchForScreen.tsx');
const settingsSrc = read('app/settings/what-to-watch-for.tsx');

describe('Watch For — no alarmist language in library copy', () => {
  // Per Phase 5: avoid Dangerous, Critical, Emergency. "Severe" is allowed
  // as an adjective for actual symptoms (e.g. "sudden severe headache" in
  // stroke recovery) — that's clinical descriptor, not tone framing.
  const banned = ['dangerous', 'critical', 'emergency', 'fatal'];

  for (const term of banned) {
    it(`whyItMatters lines do not use "${term}"`, () => {
      for (const condition of CONDITION_WATCHLISTS) {
        for (const item of condition.watchFor) {
          expect(item.whyItMatters.toLowerCase()).not.toContain(term);
        }
      }
    });

    it(`symptom lines do not use "${term}"`, () => {
      for (const condition of CONDITION_WATCHLISTS) {
        for (const item of condition.watchFor) {
          expect(item.symptom.toLowerCase()).not.toContain(term);
        }
      }
    });
  }
});

describe('Watch For — severity taxonomy is Urgent / Concerning / Watch', () => {
  it('the card component uses Urgent / Concerning / Watch labels', () => {
    expect(cardSrc).toContain("urgent: 'URGENT'");
    expect(cardSrc).toContain("concerning: 'CONCERNING'");
    expect(cardSrc).toContain("watch: 'WATCH'");
  });

  it('the card component does not introduce "DANGEROUS" / "CRITICAL" / "EMERGENCY" labels', () => {
    expect(cardSrc).not.toMatch(/['"]DANGEROUS['"]/);
    expect(cardSrc).not.toMatch(/['"]CRITICAL['"]/);
    expect(cardSrc).not.toMatch(/['"]EMERGENCY['"]/);
  });
});

describe('Watch For — no clinical jargon in why-it-matters', () => {
  // Caregiver-facing copy should not lean on clinical vocabulary.
  const banned = [
    'cga',
    'phq-9',
    'gcs',
    'lvef',
    'icd-10',
    'pathophysiology',
    'comorbidity',
    'compliance',
    'symptomatic',
    'asymptomatic',
  ];

  for (const term of banned) {
    it(`no library entry uses "${term}"`, () => {
      for (const condition of CONDITION_WATCHLISTS) {
        for (const item of condition.watchFor) {
          const blob = `${item.symptom} ${item.whyItMatters}`.toLowerCase();
          expect(blob).not.toContain(term);
        }
      }
    });
  }
});

describe('Watch For — educational framing (custom-condition fallback)', () => {
  it('fallback copy is educational, not warning-toned', () => {
    const lower = CUSTOM_CONDITION_FALLBACK.toLowerCase();
    expect(lower).toContain('healthcare provider');
    expect(lower).not.toMatch(/danger|emergency|urgent|critical/);
  });
});

describe('Watch For — screen + settings copy', () => {
  it('screen subtitle is plain-language, not warning-toned', () => {
    expect(screenSrc).toContain("For each condition you've added.");
  });

  it('screen footer hint points to Settings (where it is re-accessible)', () => {
    expect(screenSrc.toLowerCase()).toContain('settings → what to watch for');
  });

  it('settings screen surfaces the "Last shown" line', () => {
    expect(settingsSrc).toContain('Last shown');
  });
});
