// ============================================================================
// You tab tone — Phase 5 of the You-tab content warmth pass.
// Locks the "Plan ahead" reframe (kindness-to-future-self, not admin tasks)
// and asserts the affirmation source stays non-prescriptive.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const supportSrc = readFileSync(join(ROOT, 'app/(tabs)/support.tsx'), 'utf8');
// Strip comment lines + block comments so explanatory prose ("don't use
// 'stay strong'…") doesn't trip the literal-string scanner.
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !/^\s*\/\//.test(l))
    .join('\n');
}
const affirmationsSrc = stripComments(
  readFileSync(join(ROOT, 'utils/affirmations.ts'), 'utf8'),
);

describe('You tab — Plan ahead reframing (Phase 7.3)', () => {
  it('the Plan ahead header uses the caregiver-voice "When you have a moment" copy', () => {
    expect(supportSrc).toContain('When you have a moment');
  });

  it('does NOT contain instructional copy ("these help you", "use this to")', () => {
    expect(supportSrc).not.toMatch(/these help you/i);
    expect(supportSrc).not.toMatch(/use this to/i);
  });

  it('still renders Plan ahead as a contained resources card', () => {
    expect(supportSrc).toContain('planAheadCard');
  });
});

describe('Affirmation source — no prescriptive language', () => {
  // These words push the user instead of accompanying them. Affirmations on
  // the You tab should sound like a friend, not a coach.
  const FORBIDDEN = [
    'You should',
    'You must',
    'Make sure',
    'Remember to',
    'Don’t forget',
    'Always',
    'Never',
    'Try harder',
    'Stay strong',
    'Keep it up',
    'Push through',
  ];

  it.each(FORBIDDEN)('does not contain "%s" anywhere in the affirmation list', (phrase) => {
    expect(affirmationsSrc).not.toMatch(new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\\\$&')}\\b`, 'i'));
  });
});
