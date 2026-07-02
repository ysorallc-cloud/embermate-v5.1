// ============================================================================
// Jul 2 brief item 3a — Care Plan toggles resized to the app control scale.
//
// Source-pin guards (same style as carePlanMutedToggles33F3) so a future edit
// can't silently revert the resize.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const themedSwitch = readFileSync(join(ROOT, 'components/common/ThemedSwitch.tsx'), 'utf8');
const medsDrawer = readFileSync(join(ROOT, 'components/careplan/drawers/MedicationsDrawer.tsx'), 'utf8');

describe('item 3a — Care Plan toggles resized to the control scale', () => {
  it('ThemedSwitch applies a downscale transform (< 1) to the native Switch', () => {
    expect(themedSwitch).toMatch(/transform:\s*SWITCH_SCALE/);
    expect(themedSwitch).toMatch(/SWITCH_SCALE\s*=\s*\[\s*\{\s*scale:\s*0?\.\d+\s*\}\s*\]/);
    const m = themedSwitch.match(/scale:\s*(0?\.\d+)/);
    expect(m).not.toBeNull();
    expect(Number(m![1])).toBeLessThan(1);
  });

  it('the per-med active Switch in MedicationsDrawer shares the same scale', () => {
    expect(medsDrawer).toMatch(/transform:\s*\[\s*\{\s*scale:\s*0?\.\d+\s*\}\s*\]/);
  });
});
