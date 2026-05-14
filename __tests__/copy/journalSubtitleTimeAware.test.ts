// ============================================================================
// Journal subtitle — time-aware copy variants.
// Phase 1 of the handoff-flow restructure.
// ============================================================================

import { journalSubtitle } from '../../utils/journalSubtitle';

const at = (h: number, m = 0) => {
  const d = new Date('2026-04-29T00:00:00');
  d.setHours(h, m, 0, 0);
  return d;
};

describe('journalSubtitle — time-aware variants', () => {
  describe('before noon — "in progress"', () => {
    it('00:00 returns "...day, in progress."', () => {
      expect(journalSubtitle({ name: 'Mom', now: at(0, 0) }))
        .toBe("Mom's day, in progress.");
    });

    it('11:59 still returns "...day, in progress."', () => {
      expect(journalSubtitle({ name: 'Mom', now: at(11, 59) }))
        .toBe("Mom's day, in progress.");
    });

    it('events logged before noon do not change the copy', () => {
      expect(journalSubtitle({
        name: 'Mom',
        now: at(9, 30),
        lastEventAt: at(9, 0),
      })).toBe("Mom's day, in progress.");
    });
  });

  describe('noon to 6 PM — "so far"', () => {
    it('12:00 returns "...day so far."', () => {
      expect(journalSubtitle({ name: 'Mom', now: at(12, 0) }))
        .toBe("Mom's day so far.");
    });

    it('17:59 still returns "...day so far."', () => {
      expect(journalSubtitle({ name: 'Mom', now: at(17, 59) }))
        .toBe("Mom's day so far.");
    });

    it('events logged in the afternoon do not append a timestamp before 6 PM', () => {
      expect(journalSubtitle({
        name: 'Mom',
        now: at(15, 0),
        lastEventAt: at(14, 30),
      })).toBe("Mom's day so far.");
    });
  });

  describe('6 PM and later — timestamp or wrapping up', () => {
    it('6 PM with a logged event appends the event time in 12-hour format', () => {
      expect(journalSubtitle({
        name: 'Mom',
        now: at(22, 30),
        lastEventAt: at(22, 30),
      })).toBe("Mom's day so far · 10:30 PM");
    });

    it('formats single-digit minutes with leading zero', () => {
      expect(journalSubtitle({
        name: 'Mom',
        now: at(20, 5),
        lastEventAt: at(20, 5),
      })).toBe("Mom's day so far · 8:05 PM");
    });

    it('formats 6:00 PM as "6:00 PM"', () => {
      expect(journalSubtitle({
        name: 'Mom',
        now: at(18, 0),
        lastEventAt: at(18, 0),
      })).toBe("Mom's day so far · 6:00 PM");
    });

    it('6 PM+ with no events falls back to plain "day so far."', () => {
      expect(journalSubtitle({ name: 'Mom', now: at(20, 0) }))
        .toBe("Mom's day so far.");
    });

    it('6 PM+ with dayDone returns "...day · wrapping up"', () => {
      expect(journalSubtitle({
        name: 'Mom',
        now: at(21, 0),
        lastEventAt: at(20, 0),
        dayDone: true,
      })).toBe("Mom's day · wrapping up");
    });

    it('dayDone takes precedence over the timestamp branch', () => {
      // Even with a recent event, marking the day done locks the subtitle
      // into the "wrapping up" copy.
      expect(journalSubtitle({
        name: 'Mom',
        now: at(23, 45),
        lastEventAt: at(23, 30),
        dayDone: true,
      })).toBe("Mom's day · wrapping up");
    });

    it('dayDone before 6 PM does NOT switch to wrapping up (time gate still applies)', () => {
      // The "wrapping up" copy is intentionally an evening-only signal.
      // A morning "done for the day" flag should not prematurely show it.
      expect(journalSubtitle({
        name: 'Mom',
        now: at(14, 0),
        dayDone: true,
      })).toBe("Mom's day so far.");
    });
  });

  // Phase 23.2 F3 — fallback consolidated to the canonical lowercase form
  // (utils/lovedOneFallback). Pre-23.2 these tests asserted the titlecase
  // string; post-23.2 the possessive renders "your loved one's day…" —
  // mid-sentence register matching the lowercase reading elsewhere.
  describe('name fallback — empty string uses the canonical lowercase loved-one', () => {
    it('empty name → "your loved one\'s day, in progress." in the morning', () => {
      expect(journalSubtitle({ name: '', now: at(9, 0) }))
        .toBe("your loved one's day, in progress.");
    });

    it('empty name → "your loved one\'s day · wrapping up" in the evening with dayDone', () => {
      expect(journalSubtitle({ name: '', now: at(20, 0), dayDone: true }))
        .toBe("your loved one's day · wrapping up");
    });

    it('whitespace-only name still falls back to the canonical lowercase loved-one', () => {
      expect(journalSubtitle({ name: '   ', now: at(10, 0) }))
        .toBe("your loved one's day, in progress.");
    });
  });

  describe('past-date recap form', () => {
    it('returns the static recap when a pastDate is supplied', () => {
      // 2026-04-08 is a Wednesday.
      expect(journalSubtitle({
        name: 'Mom',
        pastDate: new Date('2026-04-08T12:00:00'),
      })).toBe("Mom's day · Wednesday, Apr 8");
    });

    it('past-date recap ignores "now" / lastEventAt entirely', () => {
      expect(journalSubtitle({
        name: 'Mom',
        pastDate: new Date('2026-04-08T12:00:00'),
        now: at(8, 0),
        lastEventAt: at(20, 0),
        dayDone: true,
      })).toBe("Mom's day · Wednesday, Apr 8");
    });

    it('falls back to the canonical lowercase loved-one when name is empty in past-date form', () => {
      expect(journalSubtitle({
        name: '',
        pastDate: new Date('2026-04-08T12:00:00'),
      })).toBe("your loved one's day · Wednesday, Apr 8");
    });
  });

  describe('with Jest fake timers — derives "now" from system clock when omitted', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('reads Date.now() when "now" is not passed', () => {
      jest.setSystemTime(new Date('2026-04-29T08:00:00'));
      expect(journalSubtitle({ name: 'Mom' }))
        .toBe("Mom's day, in progress.");
    });

    it('flips to the afternoon variant after the clock advances past noon', () => {
      jest.setSystemTime(new Date('2026-04-29T13:00:00'));
      expect(journalSubtitle({ name: 'Mom' }))
        .toBe("Mom's day so far.");
    });
  });
});
