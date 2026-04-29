// ============================================================================
// Schedule tone regression guard.
//
// Caregiver-facing schedule surfaces (the SchedulePeriodHeader pill on Now
// + the getPeriodStatus helper feeding it) must NOT use the harsher
// vocabulary used in clinical surfaces (Visit Prep PDF). Doctor-facing
// terms like "missed", "overdue", "late" stay out of these caregiver
// surfaces entirely.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

import {
  getPeriodStatus,
  type ScheduleEvent,
} from '../../utils/scheduleStatus';

const ROOT = join(__dirname, '../..');
const headerSrc = readFileSync(
  join(ROOT, 'components/now/SchedulePeriodHeader.tsx'),
  'utf8',
);

// Strip out comment lines and JSDoc blocks so explanatory prose ("red
// implies emergency or failure …") doesn't trip the guard. We only care
// about strings that can render to the user.
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !/^\s*\/\//.test(l))
    .join('\n');
}

const headerCode = stripComments(headerSrc);

const HARSH_WORDS = ['missed', 'failed', 'overdue', 'late'];

describe('SchedulePeriodHeader source — no harsh metadata vocabulary', () => {
  it.each(HARSH_WORDS)('does not contain "%s" in any rendered string', (word) => {
    const re = new RegExp(`(['"\`])([^'"\`]*\\b${word}\\b[^'"\`]*)\\1`, 'i');
    const match = headerCode.match(re);
    if (match) {
      throw new Error(
        `Found harsh word "${word}" in a string literal: ${match[0]}\n` +
          `Caregiver-facing schedule headers should use warm vocabulary ` +
          `("not logged", "to go", "caught up", "coming up"). The clinical ` +
          `vocabulary stays in services/visitPrepPdf.ts.`,
      );
    }
    expect(match).toBeNull();
  });
});

describe('getPeriodStatus — labels never include harsh vocabulary', () => {
  const evt = (h: number, status: ScheduleEvent['status']): ScheduleEvent => ({
    scheduledTime: `2026-04-29T${String(h).padStart(2, '0')}:00:00`,
    status,
  });

  const fixtures: Array<{ name: string; period: any; events: ScheduleEvent[]; now: Date }> = [
    {
      name: 'past-complete',
      period: 'morning',
      events: [evt(7, 'completed'), evt(9, 'completed')],
      now: new Date('2026-04-29T13:00:00'),
    },
    {
      name: 'past-incomplete',
      period: 'morning',
      events: [evt(7, 'pending'), evt(9, 'pending'), evt(11, 'completed')],
      now: new Date('2026-04-29T13:00:00'),
    },
    {
      name: 'current-active',
      period: 'morning',
      events: [evt(7, 'completed'), evt(9, 'pending')],
      now: new Date('2026-04-29T09:30:00'),
    },
    {
      name: 'current-caughtup',
      period: 'morning',
      events: [evt(7, 'completed')],
      now: new Date('2026-04-29T10:00:00'),
    },
    {
      name: 'future',
      period: 'evening',
      events: [evt(20, 'pending')],
      now: new Date('2026-04-29T09:00:00'),
    },
  ];

  it.each(fixtures)('$name label avoids harsh words', ({ period, events, now }) => {
    const status = getPeriodStatus(period, events, now);
    for (const word of HARSH_WORDS) {
      expect(status.label.toLowerCase()).not.toMatch(new RegExp(`\\b${word}\\b`));
    }
  });

  it('the warm vocabulary IS present across the helper output', () => {
    const labels = fixtures.map(({ period, events, now }) =>
      getPeriodStatus(period, events, now).label.toLowerCase(),
    );
    const joined = labels.join(' | ');
    for (const expected of ['caught up', 'coming up', 'to go', 'not logged', 'complete']) {
      expect(joined).toContain(expected);
    }
  });
});
