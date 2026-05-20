// ============================================================================
// Phase 28 Batch B F7 — Insights three-card structure source-level pin.
//
// The Insights tab (`app/(tabs)/understand.tsx`) renders three section
// cards in a fixed order per the Batch B audit lock:
//
//   1. <InsightsReadCard>          — Section 1, THE READ (sage). Subsumes
//                                     the prior Section 1 "This week's pulse"
//                                     and Section 2 "EmberMate noticed"
//                                     PatternStack surfaces.
//   2. <InsightsDataCard>          — Section 2, THE DATA (neutral). Subsumes
//                                     the prior Section 4 Vitals Dashboard
//                                     and Section 5 Medication Adherence
//                                     surfaces, plus the demoted Missing
//                                     Data footer (see Q-B-F8 pin).
//   3. <UpcomingVisitInsightsCard> — Section 3 (caregiver→clinician handoff
//                                     lane). Phase 28 Batch B F5 moved it
//                                     to Section 3 position.
//
// This source-level pin defends against:
//   • A future refactor reordering the cards (breaks the locked layout)
//   • Re-introducing the retired Section 1 PULSE / PatternStack /
//     Vitals / Adherence / Share CTA inline blocks
//   • Dropping a card silently (breaks the locked structure)
//
// Per-card behavior is contracted at the component level
// (insightsReadCard28.test.tsx, insightsDataCard28.test.tsx).
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const understandSrc = readFileSync(join(ROOT, 'app/(tabs)/understand.tsx'), 'utf8');

describe('Phase 28 Batch B — Insights three-card structure', () => {
  it('mounts InsightsReadCard (Section 1 / THE READ)', () => {
    expect(understandSrc).toMatch(/<InsightsReadCard\b/);
  });

  it('mounts InsightsDataCard (Section 2 / THE DATA)', () => {
    expect(understandSrc).toMatch(/<InsightsDataCard\b/);
  });

  it('mounts UpcomingVisitInsightsCard (Section 3 / handoff lane)', () => {
    expect(understandSrc).toMatch(/<UpcomingVisitInsightsCard\b/);
  });

  it('renders the three cards in canonical order: Read → Data → Upcoming', () => {
    const readIdx = understandSrc.indexOf('<InsightsReadCard');
    const dataIdx = understandSrc.indexOf('<InsightsDataCard');
    const upcomingIdx = understandSrc.indexOf('<UpcomingVisitInsightsCard');
    expect(readIdx).toBeGreaterThan(0);
    expect(dataIdx).toBeGreaterThan(readIdx);
    expect(upcomingIdx).toBeGreaterThan(dataIdx);
  });

  it('the retired Section 1 PULSE block is NOT re-introduced', () => {
    expect(understandSrc).not.toContain("SECTION 1: THIS WEEK'S PULSE");
    expect(understandSrc).not.toContain('aiSummarySection');
    expect(understandSrc).not.toMatch(/import\s*\{[^}]*generatePlainLanguageSummary[^}]*\}/);
  });

  it('the retired PatternStack inline mount is NOT re-introduced', () => {
    expect(understandSrc).not.toMatch(/<PatternStack\b/);
    expect(understandSrc).not.toMatch(/import\s*\{[^}]*PatternStack[^}]*\}\s*from/);
  });

  it('the retired inline Vitals Dashboard block is NOT re-introduced', () => {
    expect(understandSrc).not.toContain('SECTION 4: VITALS DASHBOARD');
    expect(understandSrc).not.toContain('vitalsGrid');
    expect(understandSrc).not.toContain('vitalTile:');
  });

  it('the retired inline Medication Adherence block is NOT re-introduced', () => {
    expect(understandSrc).not.toContain('SECTION 5: MEDICATION ADHERENCE');
    expect(understandSrc).not.toContain('adherenceCard:');
    expect(understandSrc).not.toContain('doseGrid:');
  });

  it('the retired standalone Share CTA is NOT re-introduced', () => {
    expect(understandSrc).not.toContain('shareCtaButton:');
    expect(understandSrc).not.toContain('shareCtaButtonText:');
    expect(understandSrc).not.toMatch(/handleShareSelection\s*[=:]/);
  });
});
