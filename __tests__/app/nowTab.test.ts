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
    // The ZONE 4 JSX block should be removed
    expect(nowTabContent).not.toContain('ZONE 4: WHAT\'S HAPPENED');
    expect(nowTabContent).not.toContain('title="What\'s Happened"');
  });

  it('Now tab does NOT render BEFORE BED section', () => {
    // The ZONE 5 JSX block should be removed
    expect(nowTabContent).not.toContain('ZONE 5: BEFORE BED');
    expect(nowTabContent).not.toContain('title="Before Bed"');
  });

  it('HANDOFF PROMPT section still exists', () => {
    expect(nowTabContent).toContain('HANDOFF PROMPT');
    expect(nowTabContent).toContain('HandoffPromptCard');
  });

  it('existing morning/afternoon timeline sections still exist', () => {
    // TimelineSection component should still be rendered
    expect(nowTabContent).toContain('TimelineSection');
    // Progress tiles should still be rendered
    expect(nowTabContent).toContain('ProgressRings');
  });
});
