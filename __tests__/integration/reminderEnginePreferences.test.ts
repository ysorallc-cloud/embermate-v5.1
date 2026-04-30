// ============================================================================
// Reminder engine adapter — integration test for the v6.7 prefs → engine
// translation. Covers per-category advance, quiet-hours suppression
// (including the midnight wrap), critical bypass, and sound resolution.
// ============================================================================

import {
  type ReminderPreferences,
  DEFAULT_REMINDER_PREFERENCES,
} from '../../services/reminderPreferencesRepo';
import {
  advanceMinutesForCategory,
  computeTriggerTime,
  isInQuietHours,
  resolveSoundName,
} from '../../services/reminderEngineAdapter';

const at = (h: number, m = 0, dow = 3 /* Wednesday */) => {
  // 2026-04-29 is a Wednesday (dow=3). Adjust day to match `dow` param.
  const base = new Date('2026-04-29T00:00:00');
  base.setDate(base.getDate() + (dow - 3));
  base.setHours(h, m, 0, 0);
  return base;
};

const withPrefs = (patch: Partial<ReminderPreferences>): ReminderPreferences => ({
  ...DEFAULT_REMINDER_PREFERENCES,
  ...patch,
  perCategoryAdvance: {
    ...DEFAULT_REMINDER_PREFERENCES.perCategoryAdvance,
    ...(patch.perCategoryAdvance ?? {}),
  },
  quietHours: { ...DEFAULT_REMINDER_PREFERENCES.quietHours, ...(patch.quietHours ?? {}) },
});

describe('Per-category advance lookup', () => {
  it('maps medication itemType → medications advance', () => {
    const prefs = withPrefs({ perCategoryAdvance: { medications: 30 } as any });
    expect(advanceMinutesForCategory(prefs, 'medication')).toBe(30);
  });

  it('maps nutrition / meal itemType → meals advance', () => {
    const prefs = withPrefs({ perCategoryAdvance: { meals: 15 } as any });
    expect(advanceMinutesForCategory(prefs, 'nutrition')).toBe(15);
    expect(advanceMinutesForCategory(prefs, 'meal')).toBe(15);
  });

  it('returns the medications fallback for unknown item types', () => {
    const prefs = withPrefs({ perCategoryAdvance: { medications: 5 } as any });
    expect(advanceMinutesForCategory(prefs, 'unknown-thing')).toBe(5);
  });
});

describe('computeTriggerTime — applies the per-category offset', () => {
  it('5 min before for a medication scheduled at 8:00 AM → 7:55 AM', () => {
    const prefs = withPrefs({ perCategoryAdvance: { medications: 5 } as any });
    const scheduled = at(8, 0);
    const trigger = computeTriggerTime(prefs, scheduled, 'medication');
    expect(trigger).not.toBeNull();
    expect(trigger!.getHours()).toBe(7);
    expect(trigger!.getMinutes()).toBe(55);
  });

  it('15 min before for a vitals reminder at 9:00 AM → 8:45 AM', () => {
    const prefs = withPrefs({ perCategoryAdvance: { vitals: 15 } as any });
    const scheduled = at(9, 0);
    const trigger = computeTriggerTime(prefs, scheduled, 'vitals');
    expect(trigger!.getHours()).toBe(8);
    expect(trigger!.getMinutes()).toBe(45);
  });

  it('"At time" (0) returns the original scheduled time', () => {
    const prefs = withPrefs({ perCategoryAdvance: { wellness: 0 } as any });
    const scheduled = at(7, 30);
    const trigger = computeTriggerTime(prefs, scheduled, 'wellness');
    expect(trigger!.getTime()).toBe(scheduled.getTime());
  });

  it('"Off" (null) returns null — the reminder is suppressed entirely', () => {
    const prefs = withPrefs({ perCategoryAdvance: { meals: null } as any });
    const trigger = computeTriggerTime(prefs, at(12, 0), 'nutrition');
    expect(trigger).toBeNull();
  });

  it('1 hour before is honoured', () => {
    const prefs = withPrefs({ perCategoryAdvance: { medications: 60 } as any });
    const scheduled = at(20, 0);
    const trigger = computeTriggerTime(prefs, scheduled, 'medication');
    expect(trigger!.getHours()).toBe(19);
  });
});

describe('Quiet hours — suppression logic', () => {
  it('returns false when the master toggle is off', () => {
    const prefs = withPrefs({ quietHours: { enabled: false } as any });
    expect(isInQuietHours(prefs, at(2, 0))).toBe(false);
  });

  it('11 PM trigger is inside the default 10 PM → 7 AM window', () => {
    expect(isInQuietHours(DEFAULT_REMINDER_PREFERENCES, at(23, 0))).toBe(true);
  });

  it('2 AM trigger is inside the default wrap-around window', () => {
    expect(isInQuietHours(DEFAULT_REMINDER_PREFERENCES, at(2, 0))).toBe(true);
  });

  it('9 AM trigger is outside the default window', () => {
    expect(isInQuietHours(DEFAULT_REMINDER_PREFERENCES, at(9, 0))).toBe(false);
  });

  it('weekendsOnly: weekday triggers always pass through', () => {
    const prefs = withPrefs({ quietHours: { weekendsOnly: true } as any });
    // Wednesday at 23:00 — should NOT be quiet because weekendsOnly is set.
    expect(isInQuietHours(prefs, at(23, 0, 3))).toBe(false);
  });

  it('weekendsOnly: Sunday at 23:00 IS suppressed', () => {
    const prefs = withPrefs({ quietHours: { weekendsOnly: true } as any });
    expect(isInQuietHours(prefs, at(23, 0, 0))).toBe(true);
  });

  it('critical reminders bypass when allowCritical is on', () => {
    expect(isInQuietHours(DEFAULT_REMINDER_PREFERENCES, at(2, 0), { critical: true })).toBe(false);
  });

  it('critical reminders are still suppressed when allowCritical is off', () => {
    const prefs = withPrefs({ quietHours: { allowCritical: false } as any });
    expect(isInQuietHours(prefs, at(2, 0), { critical: true })).toBe(true);
  });

  it('non-wrapping window (start <= end) is handled', () => {
    const prefs = withPrefs({ quietHours: { startHour: 13, endHour: 16 } as any });
    expect(isInQuietHours(prefs, at(14, 0))).toBe(true);
    expect(isInQuietHours(prefs, at(12, 30))).toBe(false);
    expect(isInQuietHours(prefs, at(16, 30))).toBe(false);
  });
});

describe('Sound resolution', () => {
  it('gentle / standard map to "default" (iOS plays the default sound)', () => {
    expect(resolveSoundName('gentle')).toBe('default');
    expect(resolveSoundName('standard')).toBe('default');
  });

  it('silent returns undefined so the platform falls through to vibration', () => {
    expect(resolveSoundName('silent')).toBeUndefined();
  });
});
