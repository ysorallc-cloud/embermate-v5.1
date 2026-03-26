// ============================================================================
// Insights Reports Section — Structure tests
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';

const insightsPath = path.resolve(__dirname, '../../app/(tabs)/understand.tsx');
const insightsContent = fs.readFileSync(insightsPath, 'utf-8');

describe('Insights reports section', () => {
  it('REPORTS section renders 3 cards', () => {
    expect(insightsContent).toContain('REPORTS');
    expect(insightsContent).toContain('Provider prep');
    expect(insightsContent).toContain('Care report');
    expect(insightsContent).toContain('Medication report');
  });

  it('Share button calls Share.share()', () => {
    expect(insightsContent).toContain('Share.share(');
    // Share is imported from react-native (in the multi-line import block)
    expect(insightsContent).toContain('Share,');
  });

  it('toast appears after successful share', () => {
    expect(insightsContent).toContain('ShareToast');
    expect(insightsContent).toContain('setShareToastVisible(true)');
  });

  it('each card has icon, title, subtitle, and Share button', () => {
    expect(insightsContent).toContain('reportCard');
    expect(insightsContent).toContain('reportIcon');
    expect(insightsContent).toContain('reportTitle');
    expect(insightsContent).toContain('reportSubtitle');
    expect(insightsContent).toContain('reportShareBtn');
  });
});
