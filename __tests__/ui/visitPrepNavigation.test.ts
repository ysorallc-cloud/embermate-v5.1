import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

describe('Visit Prep navigation wiring', () => {
  it('app/visit-prep.tsx exists as a route', () => {
    expect(existsSync(join(ROOT, 'app/visit-prep.tsx'))).toBe(true);
  });

  it('Insights tab has a Visit Prep navigation target', () => {
    // Phase 28 Batch B F6: the inline Share CTA on understand.tsx
    // (which carried `navigate('/visit-prep')`) was retired. Visit
    // Prep is now reachable from Insights via the UpcomingVisit
    // InsightsCard mounted as Section 3. Pin both: the card is
    // mounted in understand.tsx, AND the navigation lives in the
    // card source.
    const understandSrc = read('app/(tabs)/understand.tsx');
    expect(understandSrc).toMatch(/<UpcomingVisitInsightsCard\b/);
    const cardSrc = read('components/insights/UpcomingVisitInsightsCard.tsx');
    expect(cardSrc).toMatch(/visit-prep/);
  });

  it('services/visitPrepPdf.ts exists and exports assembleVisitPrepData', () => {
    const src = read('services/visitPrepPdf.ts');
    expect(src).toContain('export async function assembleVisitPrepData');
    expect(src).toContain('export interface VisitPrepConfig');
    expect(src).toContain('export interface VisitPrepData');
  });
});
