import { possessive } from '../../../utils/text/possessive';

describe('possessive', () => {
  it('name ending in s gets just an apostrophe', () => {
    expect(possessive('James')).toBe("James'");
    expect(possessive('Chris')).toBe("Chris'");
  });

  it('name not ending in s gets \'s', () => {
    expect(possessive('Frank')).toBe("Frank's");
    expect(possessive('Mom')).toBe("Mom's");
  });

  it('single-letter name gets \'s (does not end in s)', () => {
    expect(possessive('F')).toBe("F's");
  });

  it('single-letter name "S" gets just an apostrophe (does end in s)', () => {
    expect(possessive('S')).toBe("S'");
  });

  it('is case-insensitive on the trailing s (all-caps name)', () => {
    expect(possessive('JAMES')).toBe("JAMES'");
  });
});
