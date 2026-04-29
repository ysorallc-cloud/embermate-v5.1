// ============================================================================
// Wellness page tone audit — Phase 7 of the v6.7 wellness reframe.
//
// Source-pattern guard. The page should sound like a thoughtful friend, not
// a fitness app or a clinician's chart. This test fails on coach voice,
// failure voice, or diagnostic voice creeping back in.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const pageSrc = readFileSync(join(ROOT, 'app/caregiver-wellness.tsx'), 'utf8');

function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !/^\s*\/\//.test(l))
    .join('\n');
}
const code = stripComments(pageSrc);

const FORBIDDEN = {
  coach: ['Keep it up', 'Stay strong', 'You can do it', 'Great job'],
  failure: ['Behind', 'Falling short', 'Not enough'],
  diagnostic: ['Avg mood', 'Mood score', 'Wellness score'],
};

describe('Wellness page tone — no coach / failure / diagnostic vocabulary', () => {
  for (const [bucket, words] of Object.entries(FORBIDDEN)) {
    for (const word of words) {
      it(`(${bucket}) does not contain "${word}"`, () => {
        const re = new RegExp(`(['"\`])([^'"\`]*\\b${word}\\b[^'"\`]*)\\1`, 'i');
        const match = code.match(re);
        if (match) {
          throw new Error(
            `Found "${word}" in a string literal: ${match[0]}\n` +
              `The Wellness page is meant to read like a friend, not a coach ` +
              `(${bucket} voice). Soften the copy or remove the literal.`,
          );
        }
        expect(match).toBeNull();
      });
    }
  }
});

describe('Wellness page — uses the new composers (sanity check)', () => {
  it('imports composeWellnessOpening', () => {
    expect(pageSrc).toMatch(/composeWellnessOpening/);
  });
  it('imports composeWeekRecap', () => {
    expect(pageSrc).toMatch(/composeWeekRecap/);
  });
  it('imports composeRhythmObservation', () => {
    expect(pageSrc).toMatch(/composeRhythmObservation/);
  });
});
