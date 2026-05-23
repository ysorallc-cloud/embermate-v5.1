// ============================================================================
// Care Plan ALWAYS ON pill — Phase 32A reframe (was Phase 2.6.6).
//
// Pre-32A the Care Plan main screen rendered a Core section header with
// an outlined "ALWAYS ON" pill (the alwaysOnBadge / alwaysOnBadgeText
// style block). Phase 2.6.6 pinned the pill's outlined-not-filled
// contrast treatment.
//
// Phase 32A F2 retires the badge entirely. All section eyebrows on Care
// Plan main — including "Always on" — render through the SectionEyebrow
// primitive, which carries brand-canon uppercase + letterSpacing 1.5
// (pinned by SectionEyebrow's own tests). The pill chrome that this
// test used to pin no longer exists.
//
// Reframed as an absence pin: the retired styles do not come back. If
// a future contributor reintroduces an "ALWAYS ON" pill on Care Plan
// main, this test catches it.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');
const src = readFileSync(join(ROOT, 'app/care-plan/index.tsx'), 'utf8');

describe('Phase 32A reframe — Care Plan ALWAYS ON pill retired', () => {
  it('source no longer declares alwaysOnBadge style (retired by F2 SectionEyebrow swap)', () => {
    expect(src).not.toMatch(/\balwaysOnBadge\s*:\s*\{/);
  });

  it('source no longer declares alwaysOnBadgeText style', () => {
    expect(src).not.toMatch(/\balwaysOnBadgeText\s*:\s*\{/);
  });

  it('source no longer renders an "ALWAYS ON" all-caps label in JSX (eyebrow now renders "Always on" via SectionEyebrow)', () => {
    // The pre-32A markup was `<Text ...>ALWAYS ON</Text>`. The new
    // surface is `<SectionEyebrow text="Always on" />` — SectionEyebrow
    // applies uppercase via CSS, so the literal "ALWAYS ON" string is
    // absent from JSX. Keep this absence pin so a future contributor
    // can't reintroduce the old badge with the same copy.
    expect(src).not.toMatch(/>\s*ALWAYS ON\s*</);
  });
});
