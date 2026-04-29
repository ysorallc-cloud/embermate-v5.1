// ============================================================================
// Tone guard — composer outputs must not slide into chirpy/judgmental copy.
//
// The tone across the app has been carefully built. This guard runs every
// composer over a representative slice of fixtures and fails if any output
// contains a word from the blacklist. If a composer accidentally uses one
// of these words in a non-positive context, refactor the composer rather
// than weaken the test.
// ============================================================================

import { composeOutcomesSummary } from '../../utils/text/composers/outcomesSummary';
import { composeJournalDraft } from '../../utils/text/composers/journalDraft';
import { composeHandoffParagraph } from '../../utils/text/composers/handoffParagraph';
import { composeEndOfShiftBody } from '../../utils/text/composers/endOfShiftBody';
import type { DailyOutcomes, Alert } from '../../utils/text/types';

const BLACKLIST = [
  // Toxic positivity
  'great', 'wonderful', 'amazing', 'awesome', 'fantastic', 'excellent',
  // Judgmental / catastrophizing
  'failed', 'bad day', 'worst', 'terrible',
  // Effort-minimizing
  'just', 'simply',
];

const at = (h: number, m = 0) => {
  const d = new Date('2026-04-29T00:00:00');
  d.setHours(h, m, 0, 0);
  return d;
};

const noAlerts: Alert[] = [];

const fixtures: Array<{ name: string; outcomes: DailyOutcomes; notes?: string | null; time: Date }> = [
  {
    name: 'empty',
    outcomes: { logged: { count: 0 }, missed: { count: 0, names: [] }, pending: { count: 0, names: [] } },
    notes: null,
    time: at(10, 0),
  },
  {
    name: 'clean',
    outcomes: {
      logged: { count: 9, summary: '5 meds, 2 vitals, 2 meals' },
      missed: { count: 0, names: [] },
      pending: { count: 0, names: [] },
    },
    notes: null,
    time: at(20, 0),
  },
  {
    name: 'hard',
    outcomes: {
      logged: { count: 4 },
      missed: { count: 2, names: ['Acetaminophen', 'Amlodipine'] },
      pending: { count: 0, names: [] },
      notable: [
        { type: 'BP', reading: '148/92', time: at(10, 0), severity: 'elevated' },
      ],
    },
    notes: 'Dad seemed sleepy after lunch.',
    time: at(22, 30),
  },
  {
    name: 'pending only',
    outcomes: {
      logged: { count: 3 },
      missed: { count: 0, names: [] },
      pending: { count: 2, names: ['Evening meds', 'BP check'] },
    },
    notes: null,
    time: at(15, 0),
  },
  {
    name: 'mixed',
    outcomes: {
      logged: { count: 5 },
      missed: { count: 1, names: ['Lisinopril'] },
      pending: { count: 1, names: ['Evening meds'] },
    },
    notes: 'Slept poorly last night.',
    time: at(19, 0),
  },
];

function assertClean(label: string, output: string) {
  const lower = ` ${output.toLowerCase()} `;
  for (const word of BLACKLIST) {
    // Word-boundary match so legitimate substrings (e.g. "justice") pass.
    const re = new RegExp(`\\b${word.replace(/[-/\\^$*+?.()|[\\]{}]/g, '\\\\$&')}\\b`, 'i');
    if (re.test(lower)) {
      throw new Error(
        `${label} contains blacklisted word "${word}" in:\n  ${output}`,
      );
    }
  }
}

describe('Composer tone guard — no toxic-positivity / minimizing language', () => {
  describe.each(fixtures)('fixture: $name', ({ outcomes, notes, time }) => {
    it('composeOutcomesSummary stays clean', () => {
      assertClean('outcomesSummary', composeOutcomesSummary(outcomes));
    });

    it('composeJournalDraft stays clean', () => {
      assertClean('journalDraft', composeJournalDraft(outcomes, noAlerts, time));
    });

    it('composeHandoffParagraph stays clean', () => {
      assertClean(
        'handoffParagraph',
        composeHandoffParagraph(outcomes, notes ?? null, 'Mom', time),
      );
    });

    it('composeEndOfShiftBody stays clean', () => {
      assertClean('endOfShiftBody', composeEndOfShiftBody(outcomes, noAlerts));
    });
  });

  it('the blacklist itself contains the documented words (sanity check)', () => {
    expect(BLACKLIST).toContain('great');
    expect(BLACKLIST).toContain('failed');
    expect(BLACKLIST).toContain('just');
    expect(BLACKLIST).toContain('simply');
  });
});
