// ============================================================================
// Phase 15.7 — inline upcoming-appointment block retired from now.tsx.
//
// Pre-15.7 now.tsx held a 14-day-window inline render of an
// "Upcoming This Week" card that routed to /provider-prep. This
// duplicated <UpcomingAppointmentCard /> rendered immediately below
// it (which used a 7-day window and routed to /visit-prep).
//
// 15.7 deletes the inline block. The card became the only surface,
// with its lookahead bumped 7 → 14 to preserve the more-inclusive
// window. /visit-prep is canonical (matches insights + appointments).
// /provider-prep retired at this call site — care-report.tsx still
// points there, filed for a separate audit scope.
//
// This file pins the absence at the source level. Source-level
// audits are appropriate here because mounting the full Now screen
// end-to-end pulls a dependency graph too wide to express as a unit
// test, and the retirement is about what is NOT present.
//
// Comments mentioning the retired symbols by name are stripped with
// the codeOnly() helper before regex matching, so prose in the
// retirement comment doesn't false-positive.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

function codeOnly(src: string): string {
  // Strip line comments first, then block comments. Order matters —
  // block-comment open inside a line-commented section is fine, but
  // we don't want // sequences inside /* */ to terminate the block.
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('Phase 15.7 — inline upcoming-appointment block retired', () => {
  const source = readFileSync(
    join(__dirname, '../now.tsx'), 'utf8',
  );
  const code = codeOnly(source);

  it('contract 1: upcomingPrepAppointment state is gone', () => {
    expect(code).not.toMatch(/\bupcomingPrepAppointment\b/);
    expect(code).not.toMatch(/\bsetUpcomingPrepAppointment\b/);
  });

  it('contract 2: /provider-prep route is no longer referenced from now.tsx', () => {
    expect(code).not.toMatch(/provider-prep/);
  });

  it('contract 3: the appointmentPrep* style entries are gone', () => {
    expect(code).not.toMatch(/\bappointmentPrepCard\b/);
    expect(code).not.toMatch(/\bappointmentPrepTitle\b/);
    expect(code).not.toMatch(/\bappointmentPrepSubtitle\b/);
    expect(code).not.toMatch(/\bappointmentPrepIcon\b/);
    expect(code).not.toMatch(/\bappointmentPrepArrow\b/);
  });

  it('contract 4: the "Upcoming This Week" header copy is gone', () => {
    expect(code).not.toMatch(/Upcoming This Week/);
  });

  it('contract 5: <UpcomingAppointmentCard /> is still mounted (the surviving surface)', () => {
    // Sanity guard — if the consolidation also accidentally removes
    // the card itself, the surface vanishes entirely. Pin its
    // continued presence.
    expect(code).toMatch(/<UpcomingAppointmentCard\s*\/>/);
  });
});
