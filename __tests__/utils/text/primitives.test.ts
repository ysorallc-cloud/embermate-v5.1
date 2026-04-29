// ============================================================================
// utils/text/primitives — every branch of every helper.
// ============================================================================

import {
  naturalList,
  pluralize,
  timeOfDay,
  relativeDay,
  composeSentence,
  formatTime,
} from '../../../utils/text/primitives';

const at = (h: number, m = 0) => {
  const d = new Date('2026-04-29T00:00:00');
  d.setHours(h, m, 0, 0);
  return d;
};

const day = (iso: string) => new Date(`${iso}T12:00:00`);

// ============================================================================
// naturalList
// ============================================================================

describe('naturalList', () => {
  it('empty array → empty string', () => {
    expect(naturalList([])).toBe('');
  });

  it('single item → that item', () => {
    expect(naturalList(['A'])).toBe('A');
  });

  it('two items → "A and B" (no Oxford comma at length 2)', () => {
    expect(naturalList(['A', 'B'])).toBe('A and B');
  });

  it('three items → Oxford comma + "and"', () => {
    expect(naturalList(['A', 'B', 'C'])).toBe('A, B, and C');
  });

  it('four items → Oxford comma + "and"', () => {
    expect(naturalList(['A', 'B', 'C', 'D'])).toBe('A, B, C, and D');
  });

  it('"or" conjunction at length 2', () => {
    expect(naturalList(['A', 'B'], 'or')).toBe('A or B');
  });

  it('"or" conjunction at length 3 keeps Oxford comma', () => {
    expect(naturalList(['A', 'B', 'C'], 'or')).toBe('A, B, or C');
  });

  it('preserves item content (no trimming, no normalization)', () => {
    expect(naturalList(['Mom', 'Dad'])).toBe('Mom and Dad');
  });
});

// ============================================================================
// pluralize
// ============================================================================

describe('pluralize', () => {
  it('1 → singular', () => {
    expect(pluralize(1, 'dose')).toBe('1 dose');
  });

  it('0 → plural form', () => {
    expect(pluralize(0, 'dose')).toBe('0 doses');
  });

  it('2 → plural form', () => {
    expect(pluralize(2, 'dose')).toBe('2 doses');
  });

  it('default plural is singular + "s"', () => {
    expect(pluralize(3, 'meal')).toBe('3 meals');
    expect(pluralize(3, 'event')).toBe('3 events');
  });

  it('caller can pass an irregular plural', () => {
    expect(pluralize(2, 'reading', 'readings')).toBe('2 readings');
    expect(pluralize(2, 'person', 'people')).toBe('2 people');
    expect(pluralize(1, 'person', 'people')).toBe('1 person');
  });

  it('large numbers still pluralize correctly', () => {
    expect(pluralize(100, 'item')).toBe('100 items');
  });
});

// ============================================================================
// timeOfDay
// ============================================================================

describe('timeOfDay', () => {
  it.each([
    [5, 'morning'],
    [6, 'morning'],
    [9, 'morning'],
    [11, 'morning'],
    [12, 'afternoon'],
    [15, 'afternoon'],
    [17, 'afternoon'],
    [18, 'evening'],
    [20, 'evening'],
    [21, 'evening'],
    [22, 'night'],
    [23, 'night'],
    [0, 'night'],
    [3, 'night'],
    [4, 'night'],
  ])('%i:00 → %s', (hour, expected) => {
    expect(timeOfDay(at(hour))).toBe(expected);
  });
});

// ============================================================================
// relativeDay
// ============================================================================

describe('relativeDay', () => {
  const now = day('2026-04-29'); // a Wednesday

  it('same calendar day → "today"', () => {
    expect(relativeDay(day('2026-04-29'), now)).toBe('today');
  });

  it('one day earlier → "yesterday"', () => {
    expect(relativeDay(day('2026-04-28'), now)).toBe('yesterday');
  });

  it('two days earlier → "last <Day>"', () => {
    // 2026-04-27 is Monday
    expect(relativeDay(day('2026-04-27'), now)).toBe('last Monday');
  });

  it('six days earlier → "last <Day>"', () => {
    // 2026-04-23 is Thursday
    expect(relativeDay(day('2026-04-23'), now)).toBe('last Thursday');
  });

  it('seven days earlier → "on <Month> <Day>"', () => {
    expect(relativeDay(day('2026-04-22'), now)).toBe('on April 22');
  });

  it('months earlier → "on <Month> <Day>"', () => {
    expect(relativeDay(day('2026-02-14'), now)).toBe('on February 14');
  });

  it('time-of-day on the input does not matter — calendar day comparison only', () => {
    const earlyToday = new Date('2026-04-29T00:01:00');
    const lateToday = new Date('2026-04-29T23:59:00');
    expect(relativeDay(earlyToday, now)).toBe('today');
    expect(relativeDay(lateToday, now)).toBe('today');
  });
});

// ============================================================================
// composeSentence
// ============================================================================

describe('composeSentence', () => {
  it('drops null and undefined parts', () => {
    expect(composeSentence(['Hello', null, undefined, 'world'])).toBe('Hello world.');
  });

  it('drops empty strings', () => {
    expect(composeSentence(['Hello', '', 'world'])).toBe('Hello world.');
  });

  it('joins with spaces and ends with a period', () => {
    expect(composeSentence(['hello', 'there'])).toBe('Hello there.');
  });

  it('capitalizes the first letter', () => {
    expect(composeSentence(['mom is well'])).toBe('Mom is well.');
  });

  it('preserves an existing terminal period', () => {
    expect(composeSentence(['Already done.'])).toBe('Already done.');
  });

  it('preserves a terminal "?" or "!" instead of forcing a period', () => {
    expect(composeSentence(['Are you ready?'])).toBe('Are you ready?');
    expect(composeSentence(['Watch out!'])).toBe('Watch out!');
  });

  it('returns empty string when all parts drop out', () => {
    expect(composeSentence([null, undefined, ''])).toBe('');
  });

  it('handles parts ending in commas/dashes by joining with a single space', () => {
    expect(composeSentence(['Today was rough —', '2 missed'])).toBe('Today was rough — 2 missed.');
  });
});

// ============================================================================
// formatTime
// ============================================================================

describe('formatTime', () => {
  describe('default 12-hour format', () => {
    it('8 AM with single-digit hour, no leading zero', () => {
      expect(formatTime(at(8, 0))).toBe('8:00 AM');
    });

    it('12 PM (noon) renders as 12:00 PM', () => {
      expect(formatTime(at(12, 0))).toBe('12:00 PM');
    });

    it('12 AM (midnight) renders as 12:00 AM', () => {
      expect(formatTime(at(0, 0))).toBe('12:00 AM');
    });

    it('PM hours subtract 12', () => {
      expect(formatTime(at(15, 30))).toBe('3:30 PM');
      expect(formatTime(at(22, 30))).toBe('10:30 PM');
    });

    it('zero-pads minutes', () => {
      expect(formatTime(at(8, 5))).toBe('8:05 AM');
    });
  });

  describe('explicit 12h opt', () => {
    it('matches default when format: "12h"', () => {
      expect(formatTime(at(15, 30), { format: '12h' })).toBe('3:30 PM');
    });
  });

  describe('24-hour format', () => {
    it('zero-pads hours and minutes', () => {
      expect(formatTime(at(8, 5), { format: '24h' })).toBe('08:05');
    });

    it('renders midnight as "00:00"', () => {
      expect(formatTime(at(0, 0), { format: '24h' })).toBe('00:00');
    });

    it('renders noon as "12:00"', () => {
      expect(formatTime(at(12, 0), { format: '24h' })).toBe('12:00');
    });

    it('renders 23:45 verbatim', () => {
      expect(formatTime(at(23, 45), { format: '24h' })).toBe('23:45');
    });
  });
});
