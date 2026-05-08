// ============================================================================
// Phase 5.13.f — ManageSampleDataSheet routes Set-Up to the wizard.
//
// After setUpLovedOneFromSample resolves, the sheet's handleSetUp must
// route to /care-plan/setup/who with the appropriate `from` entry-source
// token (settings / banner) so the wizard's Cancel can return correctly.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const sheetSrc = readFileSync(
  join(ROOT, 'components/sample/ManageSampleDataSheet.tsx'),
  'utf8',
);

describe('Phase 5.13.f — sheet wizard routing', () => {
  it('imports useRouter from expo-router so it can navigate post-setup', () => {
    expect(sheetSrc).toMatch(/useRouter\b/);
    expect(sheetSrc).toMatch(/from\s+['"]expo-router['"]/);
  });

  it('exposes an entrySource prop on the props interface', () => {
    expect(sheetSrc).toMatch(/entrySource\??:\s*['"]?settings['"]?/);
  });

  it('handleSetUp pushes /care-plan/setup/who after the helper resolves', () => {
    expect(sheetSrc).toMatch(/care-plan\/setup\/who/);
  });

  it('forwards the entrySource as the wizard `from` param', () => {
    // The push call should pass `from: entrySource ?? '<default>'` so the
    // wizard step 1 can route Cancel back correctly.
    expect(sheetSrc).toMatch(/from:\s*entrySource/);
  });
});
