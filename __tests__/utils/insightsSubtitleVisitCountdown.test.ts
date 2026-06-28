// ============================================================================
// Insights subtitle — visit countdown disambiguation (device-walk fix #1).
//
// The visit-anchored subtitle's "· N days" was `daysUntil` (days until the
// appointment) — a different metric than the Insights range selector's data
// window (7/14/30d). Both rendering as bare "N days" read as a mismatch
// ("· 7 days" vs "14d" selector). Fix: phrase the countdown as "N days away"
// to match the card's "UPCOMING VISIT · 7 days away" and make it unambiguous
// that it's a countdown, not the range. (today stays "today".)
// ============================================================================

import { computeInsightsSubtitle } from '../../utils/insightsSubtitle';

const base = {
  daysOfData: 14,
  patientName: 'Daddy',
};

describe('insights subtitle — visit countdown reads "N days away"', () => {
  it('renders "· 7 days away" for a visit 7 days out (disambiguated from the range)', () => {
    const s = computeInsightsSubtitle({
      ...base,
      upcomingAppointment: { provider: 'Dr. Torres', daysUntil: 7 },
    });
    expect(s).toBe("For Daddy's visit with Dr. Torres · 7 days away");
    // Guard against the bare "· N days" that collided with the range count.
    expect(s).not.toMatch(/· \d+ days$/);
  });

  it('singular: "· 1 day away"', () => {
    const s = computeInsightsSubtitle({
      ...base,
      upcomingAppointment: { provider: 'Dr. Torres', daysUntil: 1 },
    });
    expect(s).toBe("For Daddy's visit with Dr. Torres · 1 day away");
  });

  it('today is unchanged ("· today", not "today away")', () => {
    const s = computeInsightsSubtitle({
      ...base,
      upcomingAppointment: { provider: 'Dr. Torres', daysUntil: 0 },
    });
    expect(s).toBe("For Daddy's visit with Dr. Torres · today");
  });

  it('no-appointment case still falls back to the daysOfData chain (range copy, unaffected)', () => {
    const s = computeInsightsSubtitle({ ...base, upcomingAppointment: null });
    expect(s).toBe('What the last 14 days are showing.');
    expect(s).not.toMatch(/away/);
  });
});
