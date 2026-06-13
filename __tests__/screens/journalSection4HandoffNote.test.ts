// ============================================================================
// FOR THE NEXT CAREGIVER — handoff free-text input, NOT a pending task list.
//
// Device-walk regression: the Section 4 dusty card (the "For the next
// caregiver" handoff surface on today's view) rendered a STILL PENDING
// list of incomplete scheduled items above the notes input. That list
// repurposed the section as a task-tracker; the caregiver expected it
// to be a free-text handoff note ("Anything to pass along?").
//
// The Section is meant to be the caregiver's prose handoff. Scheduled-
// task tracking lives elsewhere (the timeline + Care Plan). This file
// pins the contract so the regression can't slip back in.
//
// CONTRACTS
//   1. Section 4 mounts a JournalNotesCard (the free-text input
//      surface).
//   2. Section 4 does NOT mount TodayStillPending.
//   3. Section 4 does NOT render the literal "STILL PENDING" sub-
//      eyebrow string.
//   4. The TextInput's placeholder is the short F7 handoff copy
//      "Anything to pass along?" — NOT the long pre-F7 prompt
//      ("Anything to pass to the next caregiver, or to flag at the
//      next appointment?").
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const JOURNAL_SRC = readFileSync(join(ROOT, 'app/(tabs)/journal.tsx'), 'utf8');
const NOTES_CARD_SRC = readFileSync(
  join(ROOT, 'components/journal/JournalNotesCard.tsx'),
  'utf8',
);

// Strip comments so historical context lines can't false-positive
// against the absence pins.
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

// Locate the Section 4 dusty-card body — from the section4DustyCard
// style anchor forward 4000 chars (the dusty card is the last block in
// the SOAP IIFE).
function section4Body(): string {
  const stripped = stripComments(JOURNAL_SRC);
  const start = stripped.indexOf('s.section4DustyCard');
  if (start === -1) return '';
  return stripped.slice(start, start + 4000);
}

describe('FOR THE NEXT CAREGIVER renders free-text input, not a pending task list', () => {
  it('contract 1: Section 4 mounts <JournalNotesCard /> (the free-text input surface)', () => {
    const body = section4Body();
    expect(body).toMatch(/<JournalNotesCard\b/);
  });

  it('contract 2: Section 4 does NOT mount <TodayStillPending />', () => {
    const body = section4Body();
    expect(body).not.toMatch(/<TodayStillPending\b/);
  });

  it('contract 3: Section 4 does NOT render the "STILL PENDING" sub-eyebrow', () => {
    const body = section4Body();
    expect(body).not.toMatch(/STILL PENDING/);
  });

  it('contract 4: JournalNotesCard placeholder is the F7 handoff copy "Anything to pass along?"', () => {
    // The bare-mode placeholder (the visible input cue inside the F7
    // dusty card) reads as the F7 handoff prompt. The pre-F7 long
    // prompt is forbidden.
    expect(NOTES_CARD_SRC).toContain('Anything to pass along?');
    expect(NOTES_CARD_SRC).not.toContain(
      'Anything to pass to the next caregiver, or to flag at the next appointment?',
    );
  });
});
