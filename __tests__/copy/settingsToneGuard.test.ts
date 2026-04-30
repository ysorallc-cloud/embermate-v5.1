// ============================================================================
// Settings tone guard (Phase 12 of v6.7).
//
// The settings surface should sound like a friend, not enterprise software.
// "Configure" / "Manage" / "Options" / "Preferences settings" don't survive
// the 4-category consolidation. Plain language wins: "When you'd like to
// be nudged" beats "Configure notification timing preferences".
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const files = [
  'app/settings/index.tsx',
  'app/settings/reminders/timing.tsx',
  'app/settings/reminders/quiet-hours.tsx',
  'app/settings/reminders/sound.tsx',
];

function stripComments(s: string): string {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !/^\s*\/\//.test(l))
    .join('\n');
}

const sources = files.map((rel) => ({
  rel,
  code: stripComments(readFileSync(join(ROOT, rel), 'utf8')),
}));

const FORBIDDEN = ['Configure', 'Manage', 'Options', 'Preferences settings'];

describe('Settings tone guard — no corporate vocabulary in titles or subtitles', () => {
  for (const word of FORBIDDEN) {
    it(`no rendered string contains "${word}" across the settings surface`, () => {
      for (const { rel, code } of sources) {
        const re = new RegExp(`(['"\`])([^'"\`]*\\b${word}\\b[^'"\`]*)\\1`, 'i');
        const match = code.match(re);
        if (match) {
          throw new Error(
            `Found "${word}" inside a string literal in ${rel}: ${match[0]}\n` +
              `Settings copy should sound like a friend. Plain language: ` +
              `"When", "How", "Choose", "Set", "Pick".`,
          );
        }
        expect(match).toBeNull();
      }
    });
  }

  it('the v6.7 plain-language copy is present', () => {
    const joined = sources.map((s) => s.code).join('\n');
    expect(joined).toContain("When you'd like to be nudged");
    expect(joined).toContain('When EmberMate stays quiet');
    expect(joined).toContain('How reminders feel');
  });
});
