// ============================================================================
// Aurora Support variant — Verify type and config exist
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';

const auroraPath = path.resolve(__dirname, '../../components/aurora/AuroraBackground.tsx');
const auroraSrc = fs.readFileSync(auroraPath, 'utf-8');

describe('Aurora support variant', () => {
  it("AuroraVariant type includes 'support'", () => {
    expect(auroraSrc).toMatch(/AuroraVariant\s*=.*'support'/);
  });

  it('AURORA_CONFIGS has a support entry', () => {
    expect(auroraSrc).toContain("support: {\n    colors: [");
  });

  it('LIGHT_AURORA_CONFIGS has a support entry', () => {
    expect(auroraSrc).toMatch(/support:\s*\{\s*colors:/);
  });

  it('support config uses warm sage tones (sage-mint per the v6.7 palette)', () => {
    const supportMatch = auroraSrc.match(/support:\s*\{\s*colors:\s*\[\s*'([^']+)'/);
    expect(supportMatch).not.toBeNull();
    // Sage mint = colors.accent = #5fb88a = rgb(95, 184, 138). After the
    // v6.7 propagation fix, the support gradient is anchored on this token
    // rather than the prior cool sage-teal magic number.
    expect(supportMatch![1]).toMatch(/95,\s*184,\s*138/);
  });
});
