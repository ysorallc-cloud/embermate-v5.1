// ============================================================================
// Phase 5.10.b — Visit Prep contextual entry points
//
// Three entry points, each landing the user 2 hops from contextual surface:
//   1. Appointments screen — "Prepare for this visit →" link per upcoming
//      appointment.
//   2. Now tab — COMING UP block surfacing the next appointment within 7
//      days, with a "Prepare visit prep →" link.
//   3. Insights tab — UPCOMING VISIT card above the data-state-gated
//      Reports section, rendered when next appt is within 7 days.
//
// Source-level contracts only — render tests live alongside this file
// for components that exercise hooks.
// ============================================================================

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');

describe('Phase 5.10.b — Appointments screen entry point', () => {
  const src = readFileSync(join(ROOT, 'app/appointments.tsx'), 'utf8');

  it('renders a "Prepare for this visit" link per upcoming appointment', () => {
    expect(src).toMatch(/Prepare for this visit/);
  });

  it('the link navigates to /visit-prep with appointment context query params', () => {
    expect(src).toMatch(
      /\/visit-prep\?[\s\S]{0,160}context=appointment/,
    );
    expect(src).toMatch(/apptId=/);
  });

  it('the link is a separate TouchableOpacity (not nested inside the row tap)', () => {
    // Required so tapping the link doesn't open the edit form. Pinned via
    // accessibilityLabel for stability.
    expect(src).toMatch(/accessibilityLabel=["']Prepare visit prep for this appointment["']/);
  });
});

describe('Phase 5.10.b — Visit Prep config receives appointment context', () => {
  const src = readFileSync(join(ROOT, 'app/visit-prep.tsx'), 'utf8');

  it('reads context + apptId query params', () => {
    expect(src).toMatch(/useLocalSearchParams[\s\S]{0,200}context|context.*useLocalSearchParams/);
    expect(src).toMatch(/apptId/);
  });

  it('surfaces a contextual line when context === "appointment"', () => {
    // "Preparing for {Provider Name} on {Date}" — copy pinned to keep the
    // affordance recognizable on device.
    expect(src).toMatch(/Preparing for/);
  });
});

describe('Phase 5.10.b — Now tab COMING UP appointment block', () => {
  const componentPath = join(ROOT, 'components/now/UpcomingAppointmentCard.tsx');

  it('UpcomingAppointmentCard component exists', () => {
    expect(existsSync(componentPath)).toBe(true);
  });

  const src = existsSync(componentPath) ? readFileSync(componentPath, 'utf8') : '';

  it('exports a named React component', () => {
    expect(src).toMatch(/export\s+function\s+UpcomingAppointmentCard\b/);
  });

  it('renders only when the appointment is within 7 days', () => {
    expect(src).toMatch(/UPCOMING_LOOKAHEAD_DAYS|withinDays|<=\s*7/);
  });

  it('exposes a "Prepare visit prep" link routing to /visit-prep with apptId', () => {
    expect(src).toMatch(/Prepare visit prep/);
    expect(src).toMatch(/\/visit-prep\?[\s\S]{0,160}context=now/);
  });

  it('Now tab mounts the component', () => {
    const nowSrc = readFileSync(join(ROOT, 'app/(tabs)/now.tsx'), 'utf8');
    expect(nowSrc).toMatch(/<UpcomingAppointmentCard\b/);
    expect(nowSrc).toMatch(/from\s+['"][^'"]+UpcomingAppointmentCard['"]/);
  });
});

describe('Phase 5.10.b — Insights UPCOMING VISIT card', () => {
  const insightsSrc = readFileSync(join(ROOT, 'app/(tabs)/understand.tsx'), 'utf8');
  const cardSrc = readFileSync(
    join(ROOT, 'components/insights/UpcomingVisitInsightsCard.tsx'),
    'utf8',
  );

  it('renders an UPCOMING VISIT eyebrow for next appt within 7 days', () => {
    // Eyebrow lives in the component; insights tab mounts the component.
    expect(cardSrc).toMatch(/UPCOMING VISIT/);
    expect(insightsSrc).toMatch(/<UpcomingVisitInsightsCard\b/);
  });

  it('navigates to /visit-prep with insights context', () => {
    expect(cardSrc).toMatch(/\/visit-prep\?[\s\S]{0,160}context=insights/);
  });

  it('the UPCOMING VISIT card renders OUTSIDE the data-state gating block', () => {
    const src = insightsSrc;
    // Spec: "Card renders in empty, building, AND populated states.
    // Appointment-relevant content shouldn't be gated by data accumulation."
    // Pin: the UPCOMING VISIT block must NOT be wrapped in the gating
    // showReports check that wraps Reports today.
    const upcomingIdx = src.indexOf('UPCOMING VISIT');
    expect(upcomingIdx).toBeGreaterThan(0);
    // Walk back from the upcoming idx and assert no `showReports` /
    // `gating.show` ternary appears between the closest map/render
    // boundary and the eyebrow.
    const window = src.slice(Math.max(0, upcomingIdx - 600), upcomingIdx);
    expect(window).not.toMatch(/gating\.showReports/);
  });
});
