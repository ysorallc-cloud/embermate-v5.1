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

describe('You tab — resource copy stays non-instructional', () => {
  // The "Plan ahead" / resources page was retired in the You-tab restructure.
  // The single Caregiver Action Network row that replaced it must still avoid
  // instructional voice.
  it('does NOT contain instructional copy ("these help you", "use this to")', () => {
    expect(supportSrc).not.toMatch(/these help you/i);
    expect(supportSrc).not.toMatch(/use this to/i);
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
