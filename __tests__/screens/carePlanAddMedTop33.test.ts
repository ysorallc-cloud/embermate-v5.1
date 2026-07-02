// ============================================================================
// Jul 2 brief item 3b — "+ Add medication" moved ABOVE the med list.
//
// At the bottom it was hidden below existing entries. Source-pin guard so a
// future edit can't quietly move it back under the list.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const medsDrawer = readFileSync(join(ROOT, 'components/careplan/drawers/MedicationsDrawer.tsx'), 'utf8');

describe('item 3b — "+ Add medication" sits ABOVE the med list', () => {
  it('the add affordance (QuickAddInline / + Add) renders before medications.map', () => {
    // In the populated-state fragment the quick-add block must precede the
    // list map. QuickAddInline appears once (populated branch); medications.map
    // appears once — so index order proves the add-affordance-first layout.
    const addIdx = medsDrawer.indexOf('<QuickAddInline');
    const listIdx = medsDrawer.indexOf('medications.map');
    expect(addIdx).toBeGreaterThan(-1);
    expect(listIdx).toBeGreaterThan(-1);
    expect(addIdx).toBeLessThan(listIdx);
  });
});
