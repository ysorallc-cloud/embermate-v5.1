// ============================================================================
// scheduleStatus — period-level status with caregiver-warm copy.
// Locks the exact label strings in snapshots so any regression to harsher
// vocabulary (e.g. "missed", "overdue") fails this suite.
// ============================================================================

import { getPeriodStatus, type ScheduleEvent } from '../../utils/scheduleStatus';

const at = (h: number, m = 0) => {
  const d = new Date('2026-04-29T00:00:00');
  d.setHours(h, m, 0, 0);
  return d;
};

const evt = (
  hour: number,
  status: ScheduleEvent['status'] = 'pending',
): ScheduleEvent => ({
  scheduledTime: at(hour, 0).toISOString(),
  status,
});

describe('getPeriodStatus — past-complete', () => {
  it('all completed → kind="past-complete", label="complete"', () => {
    const events = [evt(7, 'completed'), evt(9, 'completed')];
    const result = getPeriodStatus('morning', events, at(13, 0));
    expect(result.kind).toBe('past-complete');
    expect(result.label).toBe('complete');
    if (result.kind === 'past-complete') {
      expect(result.loggedCount).toBe(2);
    }
  });

  it('completed + skipped together count as past-complete', () => {
    const events = [evt(7, 'completed'), evt(9, 'skipped')];
    const result = getPeriodStatus('morning', events, at(13, 0));
    expect(result.kind).toBe('past-complete');
    expect(result.label).toBe('complete');
  });
});

describe('getPeriodStatus — past-incomplete', () => {
  it('past period with one not logged → kind="past-incomplete"', () => {
    const events = [evt(7, 'completed'), evt(9, 'pending'), evt(11, 'pending')];
    const result = getPeriodStatus('morning', events, at(13, 0));
    expect(result.kind).toBe('past-incomplete');
    expect(result.label).toBe('2 not logged');
    if (result.kind === 'past-incomplete') {
      expect(result.loggedCount).toBe(1);
      expect(result.notLoggedCount).toBe(2);
    }
  });

  it('singular pluralization', () => {
    const events = [evt(7, 'completed'), evt(9, 'pending')];
    const result = getPeriodStatus('morning', events, at(13, 0));
    expect(result.label).toBe('1 not logged');
  });

  it('a pending status that already missed its time still counts as not-logged', () => {
    const events = [evt(7, 'missed'), evt(9, 'pending')];
    const result = getPeriodStatus('morning', events, at(13, 0));
    expect(result.kind).toBe('past-incomplete');
    expect(result.label).toBe('2 not logged');
  });
});

describe('getPeriodStatus — current-active', () => {
  it('current period with pending items → "[N] to go"', () => {
    const events = [evt(7, 'completed'), evt(9, 'pending'), evt(11, 'pending')];
    // Now is 9 AM, still in morning period.
    const result = getPeriodStatus('morning', events, at(9, 0));
    expect(result.kind).toBe('current-active');
    expect(result.label).toBe('2 to go');
    if (result.kind === 'current-active') {
      expect(result.toGoCount).toBe(2);
    }
  });

  it('singular pluralization', () => {
    const events = [evt(7, 'completed'), evt(9, 'pending')];
    const result = getPeriodStatus('morning', events, at(9, 0));
    expect(result.label).toBe('1 to go');
  });
});

describe('getPeriodStatus — current-caughtup', () => {
  it('current period with everything completed → "caught up"', () => {
    const events = [evt(7, 'completed'), evt(9, 'completed')];
    const result = getPeriodStatus('morning', events, at(10, 0));
    expect(result.kind).toBe('current-caughtup');
    expect(result.label).toBe('caught up');
  });

  it('current period with empty event list → "caught up"', () => {
    const result = getPeriodStatus('morning', [], at(10, 0));
    expect(result.kind).toBe('current-caughtup');
    expect(result.label).toBe('caught up');
  });
});

describe('getPeriodStatus — future', () => {
  it('future period with scheduled items → "[N] coming up"', () => {
    const events = [evt(13, 'pending'), evt(15, 'pending')];
    // Now is 9 AM; afternoon is in the future.
    const result = getPeriodStatus('afternoon', events, at(9, 0));
    expect(result.kind).toBe('future');
    expect(result.label).toBe('2 coming up');
    if (result.kind === 'future') {
      expect(result.comingUpCount).toBe(2);
    }
  });

  it('singular pluralization', () => {
    const events = [evt(13, 'pending')];
    const result = getPeriodStatus('afternoon', events, at(9, 0));
    expect(result.label).toBe('1 coming up');
  });

  it('zero scheduled items in a future period → "0 coming up"', () => {
    const result = getPeriodStatus('afternoon', [], at(9, 0));
    expect(result.kind).toBe('future');
    expect(result.label).toBe('0 coming up');
  });
});

describe('getPeriodStatus — period boundaries', () => {
  it('11:59 AM still inside the morning period', () => {
    const events = [evt(7, 'completed')];
    const result = getPeriodStatus('morning', events, at(11, 59));
    expect(result.kind).toBe('current-caughtup');
  });

  it('12:00 PM has rolled past morning into afternoon', () => {
    const events = [evt(7, 'completed')];
    const result = getPeriodStatus('morning', events, at(12, 0));
    expect(result.kind).toBe('past-complete');
  });

  it('17:59 PM still inside the afternoon period', () => {
    const events = [evt(15, 'completed')];
    const result = getPeriodStatus('afternoon', events, at(17, 59));
    expect(result.kind).toBe('current-caughtup');
  });

  it('18:00 PM rolls into evening', () => {
    const events = [evt(15, 'completed')];
    const result = getPeriodStatus('afternoon', events, at(18, 0));
    expect(result.kind).toBe('past-complete');
  });

  it('22:00 evening still ends gracefully (current-caughtup at the boundary)', () => {
    const events = [evt(20, 'completed')];
    const result = getPeriodStatus('evening', events, at(21, 59));
    expect(result.kind).toBe('current-caughtup');
  });
});

describe('label snapshots — lock the exact copy', () => {
  it.each([
    ['past-complete', () => getPeriodStatus('morning', [evt(7, 'completed')], at(13, 0))],
    ['past-incomplete', () => getPeriodStatus('morning', [evt(7, 'pending'), evt(9, 'pending')], at(13, 0))],
    ['current-active', () => getPeriodStatus('morning', [evt(7, 'pending'), evt(9, 'pending')], at(9, 0))],
    ['current-caughtup', () => getPeriodStatus('morning', [evt(7, 'completed')], at(10, 0))],
    ['future', () => getPeriodStatus('afternoon', [evt(15, 'pending')], at(9, 0))],
  ])('%s label snapshot', (_kind, build) => {
    expect(build().label).toMatchSnapshot();
  });
});
