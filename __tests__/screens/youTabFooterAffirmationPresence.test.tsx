// ============================================================================
// Phase 7.4 — Footer affirmation strengthening (Option B).
//
// "You're doing something / most people never see." sits at the bottom of
// the You tab as the closing emotional beat. Until Phase 7 it ran at
// 13pt textTertiary — quietly correct but easy to scroll past. Bump to
// 15pt textSecondary with +8pt of vertical breathing room above and below.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const supportSrc = readFileSync(
  join(ROOT, 'app/(tabs)/support.tsx'),
  'utf8',
);

function styleBlock(name: string): string {
  const re = new RegExp(`\\b${name}:\\s*\\{([\\s\\S]*?)\\n\\s{4}\\}`, '');
  const m = supportSrc.match(re);
  return m ? m[1] : '';
}
function num(block: string, prop: string): number | null {
  const m = block.match(new RegExp(`\\b${prop}:\\s*(-?\\d+(?:\\.\\d+)?)`));
  return m ? Number(m[1]) : null;
}

describe('Phase 7.4 — footer affirmation presence', () => {
  it('the closing affirmation copy still renders', () => {
    expect(supportSrc).toMatch(/You're doing something/);
    expect(supportSrc).toMatch(/most people never see/);
  });

  it('footerText fontSize bumps to 15pt', () => {
    const block = styleBlock('footerText');
    expect(num(block, 'fontSize')).toBe(15);
  });

  it('footerText color is textSecondary (lifted from textTertiary)', () => {
    const block = styleBlock('footerText');
    expect(block).toMatch(/color:\s*c\.textSecondary/);
    expect(block).not.toMatch(/color:\s*c\.textTertiary/);
  });

  it('footerText keeps the italic voice', () => {
    const block = styleBlock('footerText');
    expect(block).toMatch(/fontStyle:\s*['"]italic['"]/);
  });

  it('footer paddingTop adds 8pt of breathing room (36 → 44)', () => {
    const block = styleBlock('footer');
    expect(num(block, 'paddingTop')).toBe(44);
  });

  it('footer paddingBottom adds 8pt of breathing room (100 → 108)', () => {
    const block = styleBlock('footer');
    expect(num(block, 'paddingBottom')).toBe(108);
  });
});
