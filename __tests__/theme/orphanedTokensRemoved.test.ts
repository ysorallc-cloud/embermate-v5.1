// ============================================================================
// Phase 8.6 — Guard: orphaned dark + purple tokens are removed from
// theme-tokens.ts and light-tokens.ts.
//
// After Phases 8.2/8.3/8.5 migrated all consumers, the legacy near-black
// + purple* token families have no in-app references. Removing the
// definitions prevents future code from picking them back up by accident.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const dark = readFileSync(join(ROOT, 'theme/theme-tokens.ts'), 'utf8');
const light = readFileSync(join(ROOT, 'theme/light-tokens.ts'), 'utf8');

const ORPHANS = [
  'backgroundDark',
  'backgroundDeep',
  'cardBackground',
  'inputBackground',
  'purple',
  'purpleFaint',
  'purpleMuted',
  'purpleLight',
  'purpleHint',
  'purpleWash',
  'purpleBorder',
  'purpleStrong',
  'purpleGlow',
  'purpleBright',
];

function declares(src: string, name: string): boolean {
  // Match `name:` at the start of a definition line (allowing leading spaces).
  return new RegExp(`^\\s*${name}\\s*:\\s*`, 'm').test(src);
}

describe('Phase 8.6 — orphaned theme tokens are removed', () => {
  for (const name of ORPHANS) {
    it(`theme-tokens.ts no longer declares ${name}`, () => {
      expect(declares(dark, name)).toBe(false);
    });
    it(`light-tokens.ts no longer declares ${name}`, () => {
      expect(declares(light, name)).toBe(false);
    });
  }
});
