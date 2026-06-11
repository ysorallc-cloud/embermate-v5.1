// ============================================================================
// ScheduleCard — row spacing.
//
// UX-2 pre-launch — Start text-link affordance retired (one status per
// row contract). The "Start text-link tap target" describe block in
// this file was dropped at the same time; the test that survives pins
// the new 15pt row paddingVertical established by UX-2.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const src = readFileSync(
  join(__dirname, '../../components/now/ScheduleCard.tsx'),
  'utf8',
);

function styleBlock(name: string): string {
  const re = new RegExp(`\\b${name}:\\s*\\{([^}]*)\\}`, 's');
  const m = src.match(re);
  return m ? m[1] : '';
}

function num(block: string, prop: string): number | null {
  const m = block.match(new RegExp(`\\b${prop}:\\s*(-?\\d+(?:\\.\\d+)?)`));
  return m ? Number(m[1]) : null;
}

describe('ScheduleCard — equal row geometry', () => {
  it('windowRow paddingVertical is 15pt (UX-2 pre-launch period-row pad)', () => {
    // UX-2 pre-launch lifted the row pad 8 → 15. Prior history:
    // Phase 3 set 6 (parity-only), May 2 Phase 4 lifted to 8, UX-2
    // bumped to 15 for the new period-row rhythm + tap-target lift.
    const block = styleBlock('windowRow');
    expect(block).not.toBe('');
    const pv = num(block, 'paddingVertical');
    expect(pv).toBe(15);
  });

  it('row dividers stay 0.5px (lift comes from typography, not heavier lines)', () => {
    const block = styleBlock('windowRowDivider');
    expect(num(block, 'borderTopWidth')).toBe(0.5);
  });
});
