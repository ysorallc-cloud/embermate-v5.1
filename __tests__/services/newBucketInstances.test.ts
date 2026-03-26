// ============================================================================
// New Bucket Instance Generation — Verify sync creates CarePlanItems
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';

const genPath = path.resolve(__dirname, '../../services/carePlanGenerator.ts');
const genSrc = fs.readFileSync(genPath, 'utf-8');

describe('New bucket instance generation', () => {
  it('syncOtherBucketsWithConfig handles errands bucket', () => {
    expect(genSrc).toContain('ERRANDS SYNC');
    expect(genSrc).toContain("type: 'errand'");
    expect(genSrc).toContain('@embermate_errands_config');
    expect(genSrc).toContain('sync-errand-');
  });

  it('syncOtherBucketsWithConfig handles shifts bucket', () => {
    expect(genSrc).toContain('SHIFTS SYNC');
    expect(genSrc).toContain("type: 'shift'");
    expect(genSrc).toContain('@embermate_shifts_config');
    expect(genSrc).toContain('sync-shift-');
  });

  it('syncOtherBucketsWithConfig handles self_care bucket', () => {
    expect(genSrc).toContain('SELF-CARE SYNC');
    expect(genSrc).toContain("type: 'self_care'");
    expect(genSrc).toContain('@embermate_self_care_config');
    expect(genSrc).toContain('sync-selfcare-');
  });

  it('generated instances use correct emojis for badge rendering', () => {
    // errands → 📋
    expect(genSrc).toMatch(/type: 'errand'[\s\S]*?emoji: '📋'/);
    // shifts → 🔄
    expect(genSrc).toMatch(/type: 'shift'[\s\S]*?emoji: '🔄'/);
    // self_care → 💛
    expect(genSrc).toMatch(/type: 'self_care'[\s\S]*?emoji: '💛'/);
  });

  it('disabled buckets deactivate existing items', () => {
    // Each sync block has a !enabled → deactivate path
    expect(genSrc).toContain("existingErrandItems");
    expect(genSrc).toContain("existingShiftItems");
    expect(genSrc).toContain("existingSelfCareItems");
    // Each has active: false deactivation
    const deactivateMatches = genSrc.match(/active: false, updatedAt: now/g);
    expect(deactivateMatches).not.toBeNull();
    expect(deactivateMatches!.length).toBeGreaterThanOrEqual(3);
  });
});
