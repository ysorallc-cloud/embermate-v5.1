// ============================================================================
// Phase 23.1 Fix 4 — End-of-Shift body witness-voice pins.
//
// Behavioural assertions over the worst-case input from the simulator
// screenshot: logged=0, missed=11, pending=3. Pre-fix this rendered as
// "0 items logged, 11 not logged, 3 still to do. Review before handing
// off." — leading with a zero, deficit-framed phrase "not logged."
//
// Post-fix: the zero is suppressed (we don't enumerate what didn't
// happen as a leading clause), "not logged" softens to "not yet logged"
// (the day isn't over), and the pending clause adds "this evening"
// context.
// ============================================================================

import { composeEndOfShiftBody } from '../../../../utils/text/composers/endOfShiftBody';
import type { DailyOutcomes, Alert } from '../../../../utils/text/types';

const noAlerts: Alert[] = [];

describe('Phase 23.1 Fix 4 — End-of-shift witness voice', () => {
  it('does not render "items logged, X not logged" stark count phrasing', () => {
    const screenshotCase: DailyOutcomes = {
      logged: { count: 0 },
      missed: { count: 11, names: [] },
      pending: { count: 3, names: ['Evening meds', 'Dinner', 'BP check'] },
    };
    const body = composeEndOfShiftBody(screenshotCase, noAlerts);
    // Never lead with "0 items logged" — Fix 4's primary harsh-framing
    // regression. The clause "items logged" should be absent entirely
    // when logged.count === 0.
    expect(body).not.toMatch(/^0 items logged/);
    expect(body).not.toMatch(/0 items logged/);
  });

  it('reframes "X not logged" → "X not yet logged" (observational, day not yet over)', () => {
    const withMisses: DailyOutcomes = {
      logged: { count: 5 },
      missed: { count: 2, names: [] },
      pending: { count: 0, names: [] },
    };
    const body = composeEndOfShiftBody(withMisses, noAlerts);
    // The exact harsh phrase from the screenshot must not appear: "11
    // not logged" (without "yet") was the judgment-flavoured clause.
    expect(body).toMatch(/not yet logged/);
    expect(body).not.toMatch(/(\d+\s+)?not logged(?!\sye)/);
  });

  it('pending clause carries "this evening" qualifier (handoff context, not final accounting)', () => {
    const withPending: DailyOutcomes = {
      logged: { count: 3 },
      missed: { count: 0, names: [] },
      pending: { count: 4, names: [] },
    };
    const body = composeEndOfShiftBody(withPending, noAlerts);
    expect(body).toMatch(/still to do this evening/);
  });

  it('all-zero day returns a gentle wrap-up, not "0 items logged"', () => {
    const allZero: DailyOutcomes = {
      logged: { count: 0 },
      missed: { count: 0, names: [] },
      pending: { count: 0, names: [] },
    };
    const body = composeEndOfShiftBody(allZero, noAlerts);
    expect(body).not.toMatch(/0 items/);
    expect(body).toMatch(/wrapping up/);
  });

  it('renders End of shift copy aligned with witness voice on the screenshot input', () => {
    // The exact 0/11/3 case from the simulator review. Post-fix the
    // body leads with the actionable pending count and softens the
    // miss-count to "not yet logged."
    const screenshotCase: DailyOutcomes = {
      logged: { count: 0 },
      missed: { count: 11, names: [] },
      pending: { count: 3, names: ['Evening meds', 'Dinner', 'BP check'] },
    };
    expect(composeEndOfShiftBody(screenshotCase, noAlerts)).toBe(
      '3 still to do this evening, 11 not yet logged. Review before handing off.',
    );
  });
});
