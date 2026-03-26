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

  it('support config uses teal tones', () => {
    // The dark config should contain teal-ish rgba values
    const supportMatch = auroraSrc.match(/support:\s*\{\s*colors:\s*\[\s*'([^']+)'/);
    expect(supportMatch).not.toBeNull();
    expect(supportMatch![1]).toContain('140, 110'); // teal green component
  });
});
