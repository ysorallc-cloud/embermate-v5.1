// ============================================================================
// Phase 23.2 F1 — Insights upcoming-visit card routes through the canonical
// appointmentLookahead util.
//
// Pre-23.2 the card defined its own UPCOMING_LOOKAHEAD_DAYS = 7 and a
// duplicate daysUntil() helper (identical math to the canonical
// daysUntilAppointment, just a separate copy). That created an observable
// divergence: an appointment 10 days away renders on Now (14-day window)
// but disappears from Insights (7-day window) — same patient state,
// inconsistent visibility across tabs.
//
// Phase 15.8 already consolidated the Now + Journal surfaces onto
// utils/appointmentLookahead.ts. The Insights card is the last stale fork.
//
// Source-level pin (mirrors the audit's Category 2 finding):
//   1. The card imports UPCOMING_LOOKAHEAD_DAYS from
//      utils/appointmentLookahead, NOT from a local declaration.
//   2. The card imports a days-until helper from utils/appointmentLookahead
//      (the canonical name is daysUntilAppointment).
//   3. The card does NOT define its own UPCOMING_LOOKAHEAD_DAYS constant.
//   4. The card does NOT define its own daysUntil() helper.
//   5. The hardcoded 7-day value (the pre-23.2 bug literal) does not
//      appear in the file — defensive against re-introduction.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const SRC_PATH = join(
  __dirname,
  '../../components/insights/UpcomingVisitInsightsCard.tsx',
);
const SRC = readFileSync(SRC_PATH, 'utf8');

// Strip comments so retirement / migration prose can't false-positive
// against absence pins (e.g. the file header may reference the prior
// 7-day window when explaining the consolidation).
const STRIPPED = SRC
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

describe('Phase 23.2 F1 — Insights card uses canonical appointmentLookahead', () => {
  it('contract 1: imports the canonical days-until helper (daysUntilAppointment)', () => {
    expect(STRIPPED).toMatch(/from\s+['"][^'"]*appointmentLookahead['"]/);
    const importBlock = STRIPPED.match(
      /import\s*\{[^}]*\}\s*from\s*['"][^'"]*appointmentLookahead['"]/,
    );
    expect(importBlock).toBeTruthy();
    // The canonical name is daysUntilAppointment. The local stale-fork
    // name was daysUntil (no suffix) — pinned absent by contract 4.
    expect(importBlock![0]).toMatch(/daysUntilAppointment/);
  });

  it('contract 2: imports either UPCOMING_LOOKAHEAD_DAYS or withinUpcomingWindow (canonical window check)', () => {
    // Two valid shapes for the window check: the bare constant + a
    // local diff helper, OR the canonical predicate withinUpcomingWindow.
    // Either way, the consumer must route the window decision through
    // appointmentLookahead — that's the canonical contract.
    const importBlock = STRIPPED.match(
      /import\s*\{[^}]*\}\s*from\s*['"][^'"]*appointmentLookahead['"]/,
    );
    expect(importBlock).toBeTruthy();
    expect(importBlock![0]).toMatch(/UPCOMING_LOOKAHEAD_DAYS|withinUpcomingWindow/);
  });

  it('contract 3: no local UPCOMING_LOOKAHEAD_DAYS constant declaration remains', () => {
    expect(STRIPPED).not.toMatch(/const\s+UPCOMING_LOOKAHEAD_DAYS\s*=/);
  });

  it('contract 4: no local daysUntil() function declaration remains', () => {
    expect(STRIPPED).not.toMatch(/function\s+daysUntil\s*\(/);
  });

  it('contract 5: the pre-23.2 hardcoded 7-day window literal is gone', () => {
    // The stale fork was `const UPCOMING_LOOKAHEAD_DAYS = 7`. Catch any
    // reintroduction of the literal `= 7` paired with that identifier.
    expect(STRIPPED).not.toMatch(/UPCOMING_LOOKAHEAD_DAYS\s*=\s*7/);
  });
});
