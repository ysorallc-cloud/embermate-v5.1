// ============================================================================
// Sample data indicator on the Journal page — copy + tap-target contract.
// Phase 6 of the v6.7 Journal tone + behaviour pass.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const journalSrc = readFileSync(join(ROOT, 'app/(tabs)/journal.tsx'), 'utf8');

describe('Sample data indicator — copy reframe', () => {
  it('uses the new "Example data" reframing', () => {
    expect(journalSrc).toContain('Example data — set up your loved one to get started');
  });

  it('does NOT keep the deprecated "Sample data — not real patient information" copy', () => {
    expect(journalSrc).not.toContain('Sample data — not real patient information');
  });
});

describe('Sample data indicator — tap target', () => {
  it('renders the indicator as a TouchableOpacity (the whole row is tappable)', () => {
    expect(journalSrc).toMatch(
      /<TouchableOpacity[\s\S]{0,400}?style=\{s\.sampleIndicator\}/,
    );
  });

  it('tapping opens ManageSampleDataSheet via the manageSampleOpen state', () => {
    expect(journalSrc).toMatch(/setManageSampleOpen\(\s*true\s*\)/);
    expect(journalSrc).toMatch(/import\s+\{\s*ManageSampleDataSheet\s*\}/);
    expect(journalSrc).toMatch(/<ManageSampleDataSheet[\s\S]{0,300}?visible=\{manageSampleOpen\}/);
  });

  it('exposes a clear chevron affordance on the right', () => {
    expect(journalSrc).toContain('sampleIndicatorChevron');
    expect(journalSrc).toMatch(/sampleIndicatorChevron[\s\S]{0,200}?fontSize:\s*16/);
  });

  it('a11y: button role + descriptive label + hint', () => {
    expect(journalSrc).toMatch(/accessibilityRole="button"[\s\S]{0,300}?accessibilityLabel="Example data/);
    expect(journalSrc).toMatch(/accessibilityHint=[^\n]*example data sheet/i);
  });
});
