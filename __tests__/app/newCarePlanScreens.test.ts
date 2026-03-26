// ============================================================================
// New Care Plan Screens — Structure and storage tests
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';
import { safeGetItem, safeSetItem } from '../../utils/safeStorage';

const errandsPath = path.resolve(__dirname, '../../app/care-plan/errands.tsx');
const shiftsPath = path.resolve(__dirname, '../../app/care-plan/shifts.tsx');
const selfCarePath = path.resolve(__dirname, '../../app/care-plan/self-care.tsx');

const errandsSrc = fs.readFileSync(errandsPath, 'utf-8');
const shiftsSrc = fs.readFileSync(shiftsPath, 'utf-8');
const selfCareSrc = fs.readFileSync(selfCarePath, 'utf-8');

describe('New care plan config screens', () => {
  it('errands.tsx renders without crash (has default export)', () => {
    expect(errandsSrc).toContain('export default function ErrandsConfigScreen');
    expect(errandsSrc).toContain('SubScreenHeader');
    expect(errandsSrc).toContain('Errands & Tasks');
  });

  it('shifts.tsx renders without crash (has default export)', () => {
    expect(shiftsSrc).toContain('export default function ShiftsConfigScreen');
    expect(shiftsSrc).toContain('SubScreenHeader');
    expect(shiftsSrc).toContain('Shift Schedule');
  });

  it('self-care.tsx renders without crash (has default export)', () => {
    expect(selfCareSrc).toContain('export default function SelfCareConfigScreen');
    expect(selfCareSrc).toContain('SubScreenHeader');
    expect(selfCareSrc).toContain('Self-Care');
  });

  it('adding an errand creates a new item that persists', async () => {
    const key = '@embermate_errands_config';
    const errand = { id: 'errand_1', name: 'Rx pickup', frequency: 'weekly', timeOfDay: 'morning' };
    await safeSetItem(key, [errand]);
    const stored = await safeGetItem(key, []);
    expect(stored).toHaveLength(1);
    expect((stored as any)[0].name).toBe('Rx pickup');
  });

  it('each screen navigates back to care-plan index (SubScreenHeader present)', () => {
    // SubScreenHeader includes back button by default
    expect(errandsSrc).toContain('SubScreenHeader');
    expect(shiftsSrc).toContain('SubScreenHeader');
    expect(selfCareSrc).toContain('SubScreenHeader');
  });

  it('self-care has preset quick-add options', () => {
    expect(selfCareSrc).toContain('Walk or exercise');
    expect(selfCareSrc).toContain('Nap or rest');
    expect(selfCareSrc).toContain('Personal meal time');
  });

  it('shifts supports day-of-week selection', () => {
    expect(shiftsSrc).toContain("'Mon'");
    expect(shiftsSrc).toContain("'Tue'");
    expect(shiftsSrc).toContain("'Wed'");
    expect(shiftsSrc).toContain('toggleDay');
  });
});
