// ============================================================================
// Now Tab — Zone removal verification
// Verifies WHAT'S HAPPENED and BEFORE BED sections are removed
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';

const nowTabPath = path.resolve(__dirname, '../../app/(tabs)/now.tsx');
const nowTabContent = fs.readFileSync(nowTabPath, 'utf-8');

describe('Now tab section removal', () => {
  it('Now tab does NOT render WHAT\'S HAPPENED section', () => {
    expect(nowTabContent).not.toContain('ZONE 4: WHAT\'S HAPPENED');
    expect(nowTabContent).not.toContain('title="What\'s Happened"');
  });

  it('Now tab does NOT render BEFORE BED section', () => {
    expect(nowTabContent).not.toContain('ZONE 5: BEFORE BED');
    expect(nowTabContent).not.toContain('title="Before Bed"');
  });

  it('now.tsx composes via extracted components (Phase 10.3 decomposition)', () => {
    // After decomposition, now.tsx is an orchestrator importing NowHeader,
    // NowTimeline, and NowFooter. MorningMedsBanner + TimelineSection
    // live inside NowTimeline.tsx. ProgressRings was replaced by the
    // inline tile grid in QuickPulseStatus.
    expect(nowTabContent).toContain('<NowHeader');
    expect(nowTabContent).toContain('<NowTimeline');
    expect(nowTabContent).toContain('<NowFooter');
  });
});
