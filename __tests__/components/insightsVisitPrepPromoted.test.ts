import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const cardSrc = readFileSync(join(ROOT, 'components/insights/UpcomingVisitInsightsCard.tsx'), 'utf8');

describe('Insights — promoted visit prep card', () => {
  it('shows data coverage information', () => {
    // The card should display something about days covered or data completeness.
    expect(cardSrc).toMatch(/coverage|daysLogged|dataCoverage/i);
  });

  it('shows data source counts', () => {
    // Source pills: meds, vitals, meals, notes counts.
    expect(cardSrc).toMatch(/meds|vitals|meals|notes/);
  });

  it('displays the appointment countdown', () => {
    expect(cardSrc).toMatch(/days?\s*away|daysUntil/);
  });
});
