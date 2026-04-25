import { readFileSync } from 'fs';
import { join } from 'path';

const src = readFileSync(
  join(__dirname, '../../app/(tabs)/understand.tsx'),
  'utf8',
);

describe('Insights zero-day empty state teasers', () => {
  // Extract the daysOfData === 0 branch
  const zeroDayStart = src.indexOf('daysOfData === 0');
  const zeroDayEnd = src.indexOf('Data Building Banner', zeroDayStart);
  const zeroDayBlock = src.slice(zeroDayStart, zeroDayEnd);

  it('zero-day branch contains the 7-day teaser', () => {
    expect(zeroDayBlock).toContain('At 7 days: weekly mood and sleep trends');
  });

  it('zero-day branch contains the 14-day teaser', () => {
    expect(zeroDayBlock).toContain('At 14 days: medication adherence patterns and visit prep');
  });
});
