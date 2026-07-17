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

  it('GuidanceTiles renders (wellness content moved up from the retired /caregiver-wellness sub-page)', () => {
    expect(supportSrc).toMatch(/<GuidanceTiles\b/);
    expect(supportSrc).toMatch(/import\s*\{\s*GuidanceTiles\s*\}\s*from\s*['"][^'"]*GuidanceTiles['"]/);
  });

  it('a single Caregiver Action Network resource link renders; the resources page + action cards are retired', () => {
    // You-tab restructure — the "For when you need it" page, the compact
    // ResourcesList, and the Helpline/Community/Wellness action cards were all
    // removed (every deep link was dead). The one honest resource stays.
    expect(supportSrc).toContain('Caregiver Action Network');
    expect(supportSrc).toContain('caregiveraction.org');
    // Absence pins: the removed surfaces do not survive at the screen level.
    expect(supportSrc).not.toMatch(/<ActionCardsRow\b/);
    expect(supportSrc).not.toMatch(/<ResourcesList\b/);
    expect(supportSrc).not.toContain('When you have a moment');
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

  it('headerWrap paddingBottom: 4 (You rebuild — no header divider; warm top flows into the reflect line)', () => {
    expect(num(styleBlock('headerWrap'), 'paddingBottom')).toBe(4);
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

  it('greeting style: Source Serif 4 regular at 26pt (Phase 33b Scope 1 — canonical block, symmetric with Now)', () => {
    // Phase 33b Scope 1 — greeting canonical block per
    // project_brand_alignment_canon.md `.phone-greeting`. Both Now +
    // You tabs render the same canonical greeting (regular serif,
    // 26pt, weight 400, letterSpacing -0.5). F6's italic-serif
    // greeting retired here — italic moved to the separate Subhead
    // component (Phase 33b Scope 1; ships empty/null in v1.0 per
    // Path A).
    const block = styleBlock('greeting');
    expect(block).not.toBe('');
    expect(block).toMatch(/fontFamily:\s*Fonts\.serif\b/);
    expect(num(block, 'fontSize')).toBe(26);
    expect(block).toMatch(/fontWeight:\s*['"]400['"]/);
  });
});

describe('You tab — required-component files still exist on disk', () => {
  // Belt-and-suspenders: if any of the new components got deleted by an
  // overzealous future cleanup, this catches it before the imports break.
  // You-tab restructure — ActionCardsRow + ResourcesList retired; GuidanceTiles
  // moved up from the /caregiver-wellness sub-page into the dependency list.
  const required = [
    'components/support/AffirmationHeader.tsx',
    'components/support/ReflectionCard.tsx',
    'components/support/BreathingExercise.tsx',
    'components/support/BreathingOrbCard.tsx',
    'components/support/MoodStrip.tsx',
    'components/wellness/GuidanceTiles.tsx',
  ];
  for (const rel of required) {
    it(`${rel} exists`, () => {
      expect(existsSync(join(ROOT, rel))).toBe(true);
    });
  }
});
