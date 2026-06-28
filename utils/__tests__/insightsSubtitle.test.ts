// ============================================================================
// Phase 15.8 — Insights header subtitle anchors visit context.
//
// Pre-15.8 the Insights subtitle was a daysOfData-driven copy chain:
//   • 0 days   → "Log a few days of meds and mood, and patterns will
//                start to surface."
//   • < 7 days → "Building {patientName}'s picture — N day(s) in."
//   • < 30     → "What the last N days are showing."
//   • else     → "What the last 30 days are showing."
//
// 15.8 anchors the subtitle to the upcoming appointment when one
// exists in the 14-day window (the post-15.7 canonical window
// shared with UpcomingAppointmentCard on Now):
//   "For {patientName}'s visit with {provider} · {N} day(s)"
//
// N is days-until-appointment — explicitly NOT the report-lookback
// range. This pin guards against repeating the days-param semantic
// confusion that 15.7 surfaced (where /visit-prep's `days=` query
// param turned out to be the lookback enum, not days-until).
//
// Witness voice: subtitle is observational and factual. "For Dad's
// visit with Dr. Torres · 7 days" — neutral. Not "Get ready for..."
// or "Don't forget..." which would introduce urgency framing the
// witness voice avoids.
//
// Graceful fallback: when patientName is the default "your loved
// one" placeholder OR the appointment's provider is missing/too
// short to be meaningful, the visit-anchored variant is skipped
// and the daysOfData copy chain renders instead. ("For your loved
// one's visit with..." would read awkwardly; the default chain
// already covers the no-anchor case.)
// ============================================================================

import { computeInsightsSubtitle } from '../insightsSubtitle';

describe('Phase 15.8 — computeInsightsSubtitle', () => {
  describe('contract 1: visit-anchored variant when appt exists in window', () => {
    it('produces "For {name}\'s visit with {provider} · {N} days away" copy', () => {
      const out = computeInsightsSubtitle({
        daysOfData: 14,
        patientName: 'Dad',
        upcomingAppointment: {
          provider: 'Dr. Torres',
          daysUntil: 7,
        },
      });
      expect(out).toBe("For Dad's visit with Dr. Torres · 7 days away");
    });

    it('uses singular "1 day away" when daysUntil === 1', () => {
      const out = computeInsightsSubtitle({
        daysOfData: 14,
        patientName: 'Mom',
        upcomingAppointment: { provider: 'Dr. Lin', daysUntil: 1 },
      });
      expect(out).toBe("For Mom's visit with Dr. Lin · 1 day away");
    });

    it('uses "today" when daysUntil === 0', () => {
      const out = computeInsightsSubtitle({
        daysOfData: 14,
        patientName: 'Dad',
        upcomingAppointment: { provider: 'Dr. Patel', daysUntil: 0 },
      });
      expect(out).toBe("For Dad's visit with Dr. Patel · today");
    });

    it('renders the provider string as-is (no credential stripping)', () => {
      // Provider is free-text at the form layer; the app renders it
      // unmodified everywhere else (UpcomingAppointmentCard included).
      // Pinned so a future "shorten this" change has to come with a
      // matching pass on the card.
      const out = computeInsightsSubtitle({
        daysOfData: 14,
        patientName: 'Dad',
        upcomingAppointment: {
          provider: 'Dr. Maria Torres, MD',
          daysUntil: 3,
        },
      });
      expect(out).toBe("For Dad's visit with Dr. Maria Torres, MD · 3 days away");
    });
  });

  describe('contract 2: falls back to default chain when no appt in window', () => {
    it('daysOfData === 0 → onboarding copy', () => {
      const out = computeInsightsSubtitle({
        daysOfData: 0,
        patientName: 'Dad',
        upcomingAppointment: null,
      });
      expect(out).toBe('Log a few days of meds and mood, and patterns will start to surface.');
    });

    it('daysOfData < 7 → building-picture copy with name', () => {
      const out = computeInsightsSubtitle({
        daysOfData: 3,
        patientName: 'Dad',
        upcomingAppointment: null,
      });
      expect(out).toBe("Building Dad's picture — 3 days in.");
    });

    it('daysOfData < 30 → "What the last N days are showing." copy', () => {
      const out = computeInsightsSubtitle({
        daysOfData: 14,
        patientName: 'Dad',
        upcomingAppointment: null,
      });
      expect(out).toBe('What the last 14 days are showing.');
    });

    it('daysOfData >= 30 → "What the last 30 days are showing." copy', () => {
      const out = computeInsightsSubtitle({
        daysOfData: 60,
        patientName: 'Dad',
        upcomingAppointment: null,
      });
      expect(out).toBe('What the last 30 days are showing.');
    });
  });

  describe('contract 3: N is days-until-appointment, not the lookback range', () => {
    // The 15.7 semantic gotcha — /visit-prep's `days=` is the report
    // lookback enum (7/14/30), not days-until. The subtitle must use
    // days-until. Fixed inputs make the distinction inspectable:
    // daysOfData=14 (the report lookback) AND daysUntil=3 (when the
    // appt is). The subtitle must say "3 days", never "14 days".
    it('reads daysUntil from the appointment object, ignoring daysOfData', () => {
      const out = computeInsightsSubtitle({
        daysOfData: 14,                     // the lookback range
        patientName: 'Dad',
        upcomingAppointment: {
          provider: 'Dr. Torres',
          daysUntil: 3,                     // the days-until value
        },
      });
      expect(out).toMatch(/· 3 days away$/);
      expect(out).not.toMatch(/· 14 days/);
    });

    it('survives a daysOfData / daysUntil swap that would have hidden the bug', () => {
      // Inverse fixture: if the function accidentally pulled the
      // lookback through to N, this would say "30 days" instead of
      // "5 days". Pin the orientation explicitly.
      const out = computeInsightsSubtitle({
        daysOfData: 30,
        patientName: 'Mom',
        upcomingAppointment: {
          provider: 'Dr. Chen',
          daysUntil: 5,
        },
      });
      expect(out).toBe("For Mom's visit with Dr. Chen · 5 days away");
    });
  });

  describe('contract 4: witness-voice fallback when name or provider is unusable', () => {
    // "Your loved one" is the literal patientName placeholder
    // understand.tsx emits when activePatient.name is missing or the
    // default "Patient" string (understand.tsx:421-423). Rendering
    // "For your loved one's visit with..." reads awkwardly — the
    // witness voice would rather surface the data-coverage line than
    // an anchor that names a generic placeholder. So we fall through
    // to the default chain in that case.
    it('falls back to default chain when patientName is the "your loved one" placeholder', () => {
      const out = computeInsightsSubtitle({
        daysOfData: 14,
        patientName: 'your loved one',
        upcomingAppointment: {
          provider: 'Dr. Torres',
          daysUntil: 7,
        },
      });
      expect(out).not.toMatch(/For your loved one/);
      expect(out).toBe('What the last 14 days are showing.');
    });

    it('falls back to default chain when provider is empty', () => {
      const out = computeInsightsSubtitle({
        daysOfData: 14,
        patientName: 'Dad',
        upcomingAppointment: {
          provider: '',
          daysUntil: 7,
        },
      });
      expect(out).toBe('What the last 14 days are showing.');
    });

    it('falls back to default chain when provider is whitespace-only', () => {
      const out = computeInsightsSubtitle({
        daysOfData: 14,
        patientName: 'Dad',
        upcomingAppointment: {
          provider: '   ',
          daysUntil: 7,
        },
      });
      expect(out).toBe('What the last 14 days are showing.');
    });

    it('falls back to default chain when both name and provider are unusable', () => {
      const out = computeInsightsSubtitle({
        daysOfData: 14,
        patientName: 'your loved one',
        upcomingAppointment: {
          provider: '',
          daysUntil: 7,
        },
      });
      expect(out).toBe('What the last 14 days are showing.');
    });
  });
});
