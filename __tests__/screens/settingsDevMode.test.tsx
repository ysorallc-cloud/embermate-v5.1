// ============================================================================
// Settings — Developer section contract.
//
// Long-press on the version line activates dev mode (writes the flag,
// surfaces a toast). Developer category renders only when (a) __DEV__ is
// true and (b) the flag is on. The category exposes:
//   • Tenure override → /dev/tenure-override
//   • Reset developer mode → clears the flag + any tenure override
//
// The category render path must short-circuit on __DEV__ === false even
// when the flag is on (defense in depth — the section never ships).
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const src = readFileSync(join(ROOT, 'app/settings/index.tsx'), 'utf8');

describe('Settings — version line long-press', () => {
  it('the version line is wrapped in a long-press handler with 600ms delay', () => {
    expect(src).toMatch(/delayLongPress=\{600\}/);
  });

  it('the long-press handler writes setDevModeEnabled(true)', () => {
    expect(src).toMatch(/setDevModeEnabled\(true\)/);
  });

  it('the long-press handler shows a confirmation toast/alert', () => {
    // Either a custom toast or an Alert with the activation copy.
    expect(src.toLowerCase()).toContain('developer mode activated');
  });
});

describe('Settings — Developer category render gating', () => {
  it('the Developer section is gated on __DEV__ AND the dev-mode flag', () => {
    // The category itself must reference both gates so production builds
    // (__DEV__ === false) never render it. Local component state name is
    // `devMode`; the storage flag write is `setDevModeEnabled`.
    expect(src).toMatch(/__DEV__\s*&&\s*devMode/);
  });

  it('declares a "Tenure override" row inside the Developer category', () => {
    expect(src.toLowerCase()).toContain("'tenure override'");
  });

  it('declares a "Reset developer mode" row that calls resetDevMode', () => {
    expect(src).toMatch(/Reset developer mode/);
    expect(src).toMatch(/resetDevMode\(/);
  });

  it('Tenure override row navigates to /dev/tenure-override', () => {
    expect(src).toMatch(/['"]\/dev\/tenure-override['"]/);
  });
});
