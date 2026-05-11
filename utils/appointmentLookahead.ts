// ============================================================================
// APPOINTMENT LOOKAHEAD — shared constants + helpers
//
// Phase 15.8 — extracted from UpcomingAppointmentCard so the Now
// card and the Insights subtitle (and any future surface) share
// one canonical lookahead window + days-until computation.
//
// Pre-15.8 these lived inside UpcomingAppointmentCard.tsx and were
// implicitly the source of truth. Phase 15.7 already exported
// UPCOMING_LOOKAHEAD_DAYS from the card so tests could pin it;
// 15.8 promotes both pieces to a util so the Insights subtitle
// can read them without cross-importing a component file.
//
// The card re-exports UPCOMING_LOOKAHEAD_DAYS for back-compat with
// the existing 15.7 test contract that imports from the card path.
// ============================================================================

// 14 days. Matches the post-15.7 canonical window after the inline
// "Upcoming This Week" block (14d) and the older card (7d) were
// consolidated onto the more inclusive value.
export const UPCOMING_LOOKAHEAD_DAYS = 14;

// Days-until-appointment, clamped at 0 so a same-day appointment
// reads as "today" rather than a negative or rounded-up oddity.
// Uses Math.ceil so a midnight-ISO date 12h from now still says
// "1 day" rather than "0 days".
export function daysUntilAppointment(isoDate: string): number {
  const apptMs = new Date(isoDate).getTime();
  const nowMs = Date.now();
  return Math.max(0, Math.ceil((apptMs - nowMs) / (1000 * 60 * 60 * 24)));
}

// Predicate: is this appointment within the canonical upcoming
// window? Matches what UpcomingAppointmentCard uses to filter
// getUpcomingAppointments() results.
export function withinUpcomingWindow(isoDate: string): boolean {
  const apptMs = new Date(isoDate).getTime();
  const nowMs = Date.now();
  const diff = (apptMs - nowMs) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= UPCOMING_LOOKAHEAD_DAYS;
}
