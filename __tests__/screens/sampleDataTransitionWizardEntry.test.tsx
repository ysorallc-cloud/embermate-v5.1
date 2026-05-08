// ============================================================================
// Phase 5.13.f — sample-data-transition routes to the wizard after clear.
//
// handleClear now lands on /care-plan/setup/who?from=transition instead of
// /(tabs)/now. Sample data is already cleared by the time the wizard
// mounts; Cancel from the wizard returns to /(tabs)/now per spec.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const src = readFileSync(
  join(ROOT, 'app/sample-data-transition.tsx'),
  'utf8',
);

describe('Phase 5.13.f — transition routes to wizard', () => {
  it('handleClear navigates to /care-plan/setup/who', () => {
    expect(src).toMatch(/care-plan\/setup\/who/);
  });

  it('uses router.replace (not push) so the user cannot back into transition', () => {
    expect(src).toMatch(/router\.replace[\s\S]{0,200}care-plan\/setup\/who/);
  });

  it('passes from=transition to the wizard', () => {
    expect(src).toMatch(/from:\s*['"]transition['"]/);
  });

  it('no longer routes the post-clear path to /(tabs)/now', () => {
    // The legacy route was `router.replace('/(tabs)/now')`. After 5.13.f,
    // the post-clear branch must NOT call replace('/(tabs)/now').
    expect(src).not.toMatch(/router\.replace\s*\(\s*['"]\/\(tabs\)\/now['"]\s*\)/);
  });
});
