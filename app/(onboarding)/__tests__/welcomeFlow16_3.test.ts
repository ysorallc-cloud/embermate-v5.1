// ============================================================================
// Phase 16.3 — Welcome flow Screen 2 ("Who are you caring for?") retired.
//
// Pre-16.3 the welcome flow had 6 screens, with WhoIsThisForScreen at
// index 1 capturing a caregiver-vs-self mode. The audit (see commit
// message) found careMode to be theater:
//   • The stored CARE_MODE key had zero production readers (write-only).
//   • The OnboardingAnswers.relationship value flowed nowhere — the
//     generateCarePlanFromOnboarding mapper ignores it.
//   • The default Patient row is hardcoded relationship='self' in
//     patientRegistry regardless of careMode.
//   • Only observable consequence: copy variations on MeetSampleScreen
//     and GetStartedScreen.
//
// Per spec's stated trade-off ("if the 'myself' path is meaningfully
// different and someone needs it, they can configure in Settings
// later"), the screen is cut for v1.0. Post-cut careMode is hardcoded
// to 'caregiver' (the primary EmberMate use case) in any remaining
// code paths.
//
// File on disk: WhoIsThisForScreen.tsx is left in place as orphan
// source (matches the 15.10 RecentWindowCard / 15.6 buildJournalPreview
// pattern), filed for a separate cleanup scope or v1.1+ re-introduction
// as a Settings-page selector.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

function codeOnly(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const ROOT = join(__dirname, '../../..');
const indexSrc = readFileSync(join(ROOT, 'app/(onboarding)/index.tsx'), 'utf8');
const indexCode = codeOnly(indexSrc);

describe('Phase 16.3 → Onboarding redesign C4 — welcome flow narrowed to 4 screens', () => {
  it('contract 1: ONBOARDING_SCREENS array has exactly 6 entries (enrichment Piece 2 added the Medications med-step)', () => {
    // Pin the array length declaratively — count the screen entries
    // ({ id: '...', title: '...' } shape).
    const entryMatches = indexCode.match(/\{\s*id:\s*['"][^'"]+['"]\s*,\s*title:\s*['"][^'"]+['"]\s*\}/g) || [];
    expect(entryMatches.length).toBe(6);
  });

  it('contract 2: WhoIsThisForScreen is no longer imported or rendered', () => {
    expect(indexCode).not.toMatch(/import\s+\{[^}]*\bWhoIsThisForScreen\b/);
    expect(indexCode).not.toMatch(/<WhoIsThisForScreen\b/);
  });

  it('contract 3: the "Who Is This For" screen title entry is gone from ONBOARDING_SCREENS', () => {
    expect(indexCode).not.toMatch(/title:\s*['"]Who Is This For['"]/);
  });

  it('contract 4: careMode is hardcoded to caregiver (no useState, no onSelectMode handler)', () => {
    // The cut removes the careMode selection flow entirely. The mode
    // is the caregiver default, threaded as a literal where needed.
    expect(indexCode).not.toMatch(/useState[^)]*\bcareMode\b/);
    expect(indexCode).not.toMatch(/setCareMode\b/);
    expect(indexCode).not.toMatch(/handleSelectCareMode\b/);
  });

  it('contract 5: the final 6-screen onboarding flow is Welcome → Privacy → Name → WatchingFor → Medications → Landing (enrichment Piece 2)', () => {
    // Updated for onboarding redesign C4: AsYouUseScreen +
    // GetStartedScreen retired from the main flow alongside
    // MeetSampleScreen (cut in C3). The Landing screen ("Meet
    // {name}.") replaces the wizard handoff; completeOnboarding
    // writes the three required keys + generates the default care
    // plan + lands the user on /(tabs)/now.
    const expectedOrder = ['Welcome', 'Privacy', 'Name', 'WatchingFor', 'Medications', 'Landing'];
    const found: string[] = [];
    const entryRegex = /title:\s*['"]([^'"]+)['"]/g;
    let m: RegExpExecArray | null;
    while ((m = entryRegex.exec(indexCode))) {
      found.push(m[1]);
    }
    expect(found).toEqual(expectedOrder);
  });

  it('contract 6: WhoIsThisForScreen.tsx file is left as orphan source (intentional, per established pattern)', () => {
    const path = join(ROOT, 'app/(onboarding)/screens/WhoIsThisForScreen.tsx');
    // Pin the file still exists so a future "tidy up unused screens"
    // pass routes through a dedicated cleanup scope rather than
    // sweeping it incidentally.
    const exists = (() => {
      try { readFileSync(path, 'utf8'); return true; } catch { return false; }
    })();
    expect(exists).toBe(true);
  });
});
