// ============================================================================
// Now metadata subtitle — shortened so the one-liner fits the metadata row.
// Patient name is already in the pill above; drop it from the subtitle to
// keep the line under truncation length.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';
import { buildGreeting } from '../../utils/contextualGreeting';
import type { TodayStats } from '../../utils/nowHelpers';

const ROOT = join(__dirname, '../..');
const greetingComponentSrc = readFileSync(
  join(ROOT, 'components/now/NowGreeting.tsx'),
  'utf8',
);

const baseStats: TodayStats = {
  meds:   { completed: 0, total: 2 },
  vitals: { completed: 0, total: 1 },
  meals:  { completed: 0, total: 3 },
};
const halfStats: TodayStats = {
  meds:   { completed: 1, total: 2 },
  vitals: { completed: 1, total: 1 },
  meals:  { completed: 1, total: 3 },
};
const doneStats: TodayStats = {
  meds:   { completed: 2, total: 2 },
  vitals: { completed: 1, total: 1 },
  meals:  { completed: 3, total: 3 },
};

describe('buildGreeting — shortened metadata variants', () => {
  it('morning + upcoming time: subtitle is "Next meds: <time>"', () => {
    const g = buildGreeting(8, baseStats, '8:30 AM', 'Mom');
    expect(g.subtitle).toBe('Next meds: 8:30 AM');
  });

  it('midday + morning complete + upcoming time: "Next meds: <time>"', () => {
    const g = buildGreeting(13, doneStats, '2:00 PM', 'Mom');
    expect(g.subtitle).toBe('Next meds: 2:00 PM');
  });

  it('midday + morning incomplete + upcoming time: "Next meds: <time>"', () => {
    const g = buildGreeting(14, halfStats, '3:30 PM', 'Mom');
    expect(g.subtitle).toBe('Next meds: 3:30 PM');
  });

  it('evening + 1 item left: subtitle is "Almost done — 1 left tonight"', () => {
    const stats = { ...doneStats, meals: { completed: 2, total: 3 } };
    const g = buildGreeting(19, stats, null, 'Mom');
    expect(g.subtitle).toBe('Almost done — 1 left tonight');
  });

  it('evening + multiple items left: subtitle is "Almost done — N left tonight"', () => {
    const g = buildGreeting(20, baseStats, null, 'Mom');
    expect(g.subtitle).toBe('Almost done — 6 left tonight');
  });

  it('evening + all done: subtitle is "All done. Nice work."', () => {
    const g = buildGreeting(22, doneStats, null, 'Mom');
    expect(g.subtitle).toBe('All done. Nice work.');
  });

  it('subtitle no longer references the patient name in any standard variant', () => {
    // Patient name is rendered in the header pill, not duplicated in the
    // metadata. Verify across the four contextual hour bands.
    const cases = [
      buildGreeting(8,  baseStats, '8:30 AM',  'Mom'),
      buildGreeting(14, halfStats, '3:30 PM',  'Mom'),
      buildGreeting(20, baseStats, null,       'Mom'),
      buildGreeting(22, doneStats, null,       'Mom'),
    ];
    for (const g of cases) {
      expect(g.subtitle).not.toContain('Mom');
      expect(g.subtitle).not.toMatch(/'s\s/);
    }
  });

  it('every shortened subtitle fits within ~36 characters (single-line target)', () => {
    // The metadata row carries emoji + "5:41 PM" + dot + subtitle. With
    // ~12pt text and the time chip taking ~50pt, the subtitle has roughly
    // 36 monospace-character-equivalents of room before truncation.
    const subjects = [
      buildGreeting(8,  baseStats, '8:30 AM',  'Mom'),
      buildGreeting(13, doneStats, '2:00 PM',  'Mom'),
      buildGreeting(20, baseStats, null,       'Mom'),
      buildGreeting(22, doneStats, null,       'Mom'),
    ];
    for (const g of subjects) {
      expect(g.subtitle.length).toBeLessThanOrEqual(36);
    }
  });
});

describe('NowGreeting subtitle <Text> — single-line safety net', () => {
  // Phase 3.6.2 collapsed the prior metadataRow (emoji + time + dot +
  // subtitle) into a single inline subtitle. The style key renamed from
  // `metadataSubtitle` to `subtitle`; the truncation guards stay intact.
  it('subtitle text declares numberOfLines={1} (truncation guard)', () => {
    expect(greetingComponentSrc).toMatch(/<Text[^>]*style=\{s\.subtitle\}[\s\S]*?numberOfLines=\{1\}/);
  });

  it('subtitle text declares ellipsizeMode="tail"', () => {
    expect(greetingComponentSrc).toMatch(/<Text[^>]*style=\{s\.subtitle\}[\s\S]*?ellipsizeMode=['"]tail['"]/);
  });
});
