// ============================================================================
// You-tab reflection composition (Phase 8).
// End-to-end contract for the recomposed You tab:
//   • AffirmationHeader renders with the output of getDailyAffirmation()
//   • ReflectionCard, QuickResetPills, wellness link, and Plan ahead all render
//   • No legacy 2×2 grid components (MoodCard / BreathCard / HelplineCard /
//     CommunityCard) survive at the screen level
//   • The standardized 4-tab header structure still applies (22pt title,
//     32pt top padding — see headerStructureContract.test.ts)
// ============================================================================

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const supportSrc = readFileSync(join(ROOT, 'app/(tabs)/support.tsx'), 'utf8');
const headerSrc = readFileSync(
  join(ROOT, 'components/support/AffirmationHeader.tsx'),
  'utf8',
);

describe('You tab — AffirmationHeader is wired to the daily picker', () => {
  const { AFFIRMATIONS } = require('../../utils/affirmations');
  const { getDailyAffirmation } = require('../../utils/dailyAffirmation');

  it('AffirmationHeader is rendered on the screen', () => {
    expect(supportSrc).toMatch(/<AffirmationHeader\b/);
  });

  it('AffirmationHeader sources its line via getDailyAffirmation', () => {
    expect(headerSrc).toMatch(/from\s+['"][^'"]*dailyAffirmation['"]/);
    expect(headerSrc).toMatch(/getDailyAffirmation\(/);
  });

  it("getDailyAffirmation()'s current output is one of AFFIRMATIONS", () => {
    const todayLine = getDailyAffirmation();
    expect(typeof todayLine).toBe('string');
    expect(todayLine.trim().length).toBeGreaterThan(0);
    expect(AFFIRMATIONS).toContain(todayLine);
  });

  it('the picker is stable within a calendar day', () => {
    const morning = new Date();
    morning.setHours(7, 0, 0, 0);
    const evening = new Date(morning);
    evening.setHours(22, 30, 0, 0);
    expect(getDailyAffirmation(morning)).toBe(getDailyAffirmation(evening));
  });
});

describe('You tab — required components all render', () => {
  it('ReflectionCard renders', () => {
    expect(supportSrc).toMatch(/<ReflectionCard\b/);
    // And the file imports it from the right module
    expect(supportSrc).toMatch(/import\s*\{\s*ReflectionCard\s*\}\s*from\s*['"][^'"]*ReflectionCard['"]/);
  });

  it('ActionCardsRow renders with all three handlers wired (Phase 29 Batch B F4 — successor to QuickResetPills)', () => {
    expect(supportSrc).toMatch(/<ActionCardsRow[\s\S]*?onHelpline=\{[\s\S]*?onCommunity=\{[\s\S]*?onWellness=\{/);
  });

  it('Plan ahead — compact ResourcesList renders under the "When you have a moment" header (Phase 29 Batch B F4 reframe)', () => {
    // F4 retired the planAheadCard wrapper — compact ResourcesList
    // chevron rows ARE the chrome. Header still sits above the list.
    expect(supportSrc).toContain('When you have a moment');
    expect(supportSrc).toMatch(/<ResourcesList\s+variant=['"]compact['"]/);
    // Absence pin: planAheadCard wrapper retired.
    expect(supportSrc).not.toMatch(/<View style=\{styles\.planAheadCard\}/);
  });

  it('BreathingExercise modal stays mounted (the orb opens it via the single shared mount)', () => {
    expect(supportSrc).toMatch(/<BreathingExercise/);
  });
});

describe('You tab — old 2×2 grid components are gone at the screen level', () => {
  // The user's named candidates didn't exist as standalone components in
  // this repo; they were inline JSX in the pre-Phase-6 support.tsx. The
  // structural anchors below stand in for "the old grid is gone".
  it('no <MoodCard /> at the screen level', () => {
    expect(supportSrc).not.toMatch(/<MoodCard\b/);
  });

  it('no <BreathCard /> at the screen level', () => {
    expect(supportSrc).not.toMatch(/<BreathCard\b/);
  });

  it('no <HelplineCard /> at the screen level', () => {
    expect(supportSrc).not.toMatch(/<HelplineCard\b/);
  });

  it('no <CommunityCard /> at the screen level', () => {
    expect(supportSrc).not.toMatch(/<CommunityCard\b/);
  });

  it('no inline mood emoji row remains (replaced by ReflectionCard)', () => {
    expect(supportSrc).not.toMatch(/style=\{styles\.emojiRow\}/);
  });

  it('no contactTilesRow / primaryRow scaffolding remains', () => {
    expect(supportSrc).not.toMatch(/style=\{styles\.contactTilesRow\}/);
    expect(supportSrc).not.toMatch(/style=\{styles\.primaryRow\}/);
  });

  it('no <MoodSlider /> remains (orphan removed in Phase 7)', () => {
    expect(supportSrc).not.toMatch(/<MoodSlider\b/);
  });
});

describe('You tab — header structure contract (post-Phase-29 reframe)', () => {
  // Phase 29 F1 retired the pre-29 "You" 22pt H1 + "A space for you, not
  // your loved one" subtitle pair in favor of a time-aware Georgia italic
  // greeting. The structural headerWrap padding contract (paddingTop 32 /
  // paddingBottom 24) stays — that's the four-tab pin from
  // headerStructureContract.test.ts. Title + headerMessage pins flip to
  // absence pins; a parallel greeting pin defends the new typography.
  function styleBlock(name: string): string {
    const re = new RegExp(`\\b${name}:\\s*\\{([^}]*)\\}`, 's');
    const m = supportSrc.match(re);
    return m ? m[1] : '';
  }

  function num(block: string, prop: string): number | null {
    const m = block.match(new RegExp(`\\b${prop}:\\s*(-?\\d+(?:\\.\\d+)?)`));
    return m ? Number(m[1]) : null;
  }

  it('headerWrap paddingTop: 32 (unchanged)', () => {
    expect(num(styleBlock('headerWrap'), 'paddingTop')).toBe(32);
  });

  it('headerWrap paddingBottom: 24 (unchanged)', () => {
    expect(num(styleBlock('headerWrap'), 'paddingBottom')).toBe(24);
  });

  it('absence pin: pre-29 sans-serif title style block retired', () => {
    // Pre-29 the H1 lived in a `title` style block at 22pt/weight 500
    // sans-serif. Phase 29 swapped to a `greeting` block in Georgia
    // italic. The title block is gone; this contract defends against
    // re-introduction.
    expect(styleBlock('title')).toBe('');
  });

  it('absence pin: pre-29 headerMessage subtitle style block retired', () => {
    // The "A space for you, not your loved one." subtitle was held in
    // a `headerMessage` style block. Phase 29 retired the subtitle.
    expect(styleBlock('headerMessage')).toBe('');
  });

  it('greeting style: Source Serif 4 italic at 22pt via Fonts.serifItalic (Phase 29 F1 + Phase 33 F6)', () => {
    // Phase 29 F1 — witness-voice italic greeting replaced pre-29 sans
    // title. Phase 33 F6 — fontFamily 'Georgia' literal migrated to
    // Fonts.serifItalic so the greeting picks up Source Serif 4 italic
    // from the F3 useFonts loader. Italic stays reserved for witness
    // voice per the refined Q-33.5 lock; informational tab labels use
    // regular-weight serif at 32pt instead.
    const block = styleBlock('greeting');
    expect(block).not.toBe('');
    expect(block).toMatch(/fontFamily:\s*Fonts\.serifItalic\b/);
    expect(block).toMatch(/fontStyle:\s*['"]italic['"]/);
    expect(num(block, 'fontSize')).toBe(22);
  });
});

describe('You tab — required-component files still exist on disk', () => {
  // Belt-and-suspenders: if any of the new components got deleted by an
  // overzealous future cleanup, this catches it before the imports break.
  // Phase 29 Batch B F4 — QuickResetPills.tsx retired; ActionCardsRow
  // and BreathingOrbCard added to the dependency list.
  const required = [
    'components/support/AffirmationHeader.tsx',
    'components/support/ReflectionCard.tsx',
    'components/support/ActionCardsRow.tsx',
    'components/support/BreathingExercise.tsx',
    'components/support/BreathingOrbCard.tsx',
    'components/support/ResourcesList.tsx',
  ];
  for (const rel of required) {
    it(`${rel} exists`, () => {
      expect(existsSync(join(ROOT, rel))).toBe(true);
    });
  }
});
