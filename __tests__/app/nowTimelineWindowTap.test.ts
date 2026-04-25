// ============================================================================
// Now tab — collapsed window rows should be tappable to expand the timeline
// Regression: when timelineCollapsed=true, the Now page renders inline
// `windowRow` summaries for Morning/Afternoon/Evening. Pre-fix these were
// plain <View> elements with no onPress, so tapping a window did nothing.
// The only way to expand was tapping the tiny SectionHeaderRow chevron.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const src = readFileSync(
  join(__dirname, '../../app/(tabs)/now.tsx'),
  'utf8',
);
const timelineSrc = readFileSync(
  join(__dirname, '../../components/now/NowTimeline.tsx'),
  'utf8',
);

describe('Now tab — collapsed window row tap-to-expand', () => {
  it('now.tsx uses NowTimeline component for collapsed window handling', () => {
    expect(src).toContain('<NowTimeline');
    expect(src).toContain('timelineCollapsed={timelineCollapsed}');
  });

  it('NowTimeline renders collapsed window summary under timelineCollapsed', () => {
    expect(timelineSrc).toContain('timelineCollapsed ?');
    expect(timelineSrc).toContain('windowSummary.map');
  });

  it('each collapsed window row is wrapped in a TouchableOpacity', () => {
    const branchStart = timelineSrc.indexOf('timelineCollapsed ?');
    expect(branchStart).toBeGreaterThan(-1);
    const expandedStart = timelineSrc.indexOf(') : (', branchStart);
    const collapsedBlock = timelineSrc.slice(branchStart, expandedStart);

    expect(collapsedBlock).toMatch(
      /windowSummary\.map\(\(w[\w\s,]*\)\s*=>\s*\(\s*<TouchableOpacity/,
    );
  });

  it('collapsed window row tap calls onToggleCollapse', () => {
    const branchStart = timelineSrc.indexOf('timelineCollapsed ?');
    const expandedStart = timelineSrc.indexOf(') : (', branchStart);
    const collapsedBlock = timelineSrc.slice(branchStart, expandedStart);

    expect(collapsedBlock).toMatch(/onPress=\{onToggleCollapse\}/);
  });

  it('inner "Start" button still opens the RoutineSheet via onStartRoutine', () => {
    expect(timelineSrc).toMatch(/onStartRoutine\(w\.window\)/);
  });
});
