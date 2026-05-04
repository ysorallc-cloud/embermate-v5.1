// ============================================================================
// You-tab reflection composition (Phase 8).
// End-to-end contract for the recomposed You tab:
//   • AffirmationHeader renders with the output of getDailyAffirmation()
//   • ReflectionCard, QuickResetPills, wellness link, and Plan ahead all render
//   • No legacy 2×2 grid components (MoodCard / BreathCard / HelplineCard /
//     CommunityCard) survive at the screen level
//   • The standardized 4-tab header structure still applies (32pt title,
//     56pt top padding, etc. — see headerStructureContract.test.ts)
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

  it('QuickResetPills renders with all three handlers wired', () => {
    expect(supportSrc).toMatch(/<QuickResetPills[\s\S]*?onBreathe=\{[\s\S]*?onHelpline=\{[\s\S]*?onCommunity=\{/);
  });

  it('Compact wellness link renders and routes to /caregiver-wellness', () => {
    expect(supportSrc).toMatch(/style=\{styles\.wellnessLink\}/);
    expect(supportSrc).toMatch(/navigate\(['"]\/caregiver-wellness['"]\)/);
    expect(supportSrc).toContain('YOUR WELLNESS OVER TIME');
  });

  it('Plan ahead section renders ResourcesList', () => {
    expect(supportSrc).toMatch(/<View style=\{styles\.planAheadCard\}/);
    expect(supportSrc).toContain('When things are calm, future you will be glad.');
    expect(supportSrc).toMatch(/<ResourcesList\b/);
  });

  it('BreathingExercise modal stays mounted (the breath pill calls into it)', () => {
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

describe('You tab — header structure contract still applies', () => {
  // Re-asserts the four-tab contract from
  // __tests__/screens/headerStructureContract.test.ts as a regression guard
  // local to the You tab. Title 32pt/300, subtitle 13pt/textSecondary,
  // paddingTop 56, paddingBottom 24.
  function styleBlock(name: string): string {
    const re = new RegExp(`\\b${name}:\\s*\\{([^}]*)\\}`, 's');
    const m = supportSrc.match(re);
    return m ? m[1] : '';
  }

  function num(block: string, prop: string): number | null {
    const m = block.match(new RegExp(`\\b${prop}:\\s*(-?\\d+(?:\\.\\d+)?)`));
    return m ? Number(m[1]) : null;
  }

  it('headerWrap paddingTop: 56', () => {
    expect(num(styleBlock('headerWrap'), 'paddingTop')).toBe(56);
  });

  it('headerWrap paddingBottom: 24', () => {
    expect(num(styleBlock('headerWrap'), 'paddingBottom')).toBe(24);
  });

  it('title: 22pt, fontWeight 500 (Phase 3.6.3 unified H1 sizing)', () => {
    // May 3 compressed all four tab H1s from 32pt/300 to 22pt/500 for
    // visual consistency across tabs and to free vertical space.
    const block = styleBlock('title');
    expect(num(block, 'fontSize')).toBe(22);
    expect(block).toMatch(/fontWeight:\s*['"]500['"]/);
  });

  it('headerMessage: 13pt, color textSecondary, lineHeight 20, marginTop 8', () => {
    const block = styleBlock('headerMessage');
    expect(num(block, 'fontSize')).toBe(13);
    expect(block).toMatch(/color:\s*c\.textSecondary|color:\s*colors\.textSecondary/);
    expect(num(block, 'lineHeight')).toBe(20);
    expect(num(block, 'marginTop')).toBe(8);
  });
});

describe('You tab — required-component files still exist on disk', () => {
  // Belt-and-suspenders: if any of the new components got deleted by an
  // overzealous future cleanup, this catches it before the imports break.
  const required = [
    'components/support/AffirmationHeader.tsx',
    'components/support/ReflectionCard.tsx',
    'components/support/QuickResetPills.tsx',
    'components/support/BreathingExercise.tsx',
    'components/support/ResourcesList.tsx',
  ];
  for (const rel of required) {
    it(`${rel} exists`, () => {
      expect(existsSync(join(ROOT, rel))).toBe(true);
    });
  }
});
