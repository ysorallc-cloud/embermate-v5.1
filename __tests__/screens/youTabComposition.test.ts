// ============================================================================
// You-tab composition (Phase 6).
// Asserts the final assembly: header → AffirmationHeader → ReflectionCard
// → QuickResetPills → compact wellness link → Plan ahead. Padding contract
// (20pt horizontal / 24pt bottom) and ScrollView keyboard behavior pinned.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const src = readFileSync(join(ROOT, 'app/(tabs)/support.tsx'), 'utf8');

function styleBlock(name: string): string {
  const re = new RegExp(`\\b${name}:\\s*\\{([^}]*)\\}`, 's');
  const m = src.match(re);
  return m ? m[1] : '';
}

function num(block: string, prop: string): number | null {
  const m = block.match(new RegExp(`\\b${prop}:\\s*(-?\\d+(?:\\.\\d+)?)`));
  return m ? Number(m[1]) : null;
}

describe('You tab — imports the three new components', () => {
  it('imports AffirmationHeader from components/support', () => {
    expect(src).toMatch(/import\s*\{\s*AffirmationHeader\s*\}\s*from\s*['"][^'"]*AffirmationHeader['"]/);
  });

  it('imports ReflectionCard from components/support', () => {
    expect(src).toMatch(/import\s*\{\s*ReflectionCard\s*\}\s*from\s*['"][^'"]*ReflectionCard['"]/);
  });

  it('imports ActionCardsRow from components/support (Phase 29 Batch B F4 — QuickResetPills successor)', () => {
    expect(src).toMatch(/import\s*\{\s*ActionCardsRow\s*\}\s*from\s*['"][^'"]*ActionCardsRow['"]/);
  });
});

describe('You tab — JSX render order (post-Phase-29-Batch-B composition)', () => {
  // Phase 29 Batch B F4 — composition reframed:
  //   AffirmationHeader → BreathingOrbCard → ReflectionCard → ActionCardsRow
  //   → planAheadHeader → ResourcesList (compact)
  // QuickResetPills + wellnessLink + planAheadCard all retired in F4.
  const idxAffirmation     = src.indexOf('<AffirmationHeader');
  const idxOrb             = src.indexOf('<BreathingOrbCard');
  const idxReflection      = src.indexOf('<ReflectionCard');
  const idxActionCards     = src.indexOf('<ActionCardsRow');
  const idxPlanAheadHeader = src.indexOf('When you have a moment');
  const idxResources       = src.indexOf('<ResourcesList');

  it('renders AffirmationHeader after the header block', () => {
    expect(idxAffirmation).toBeGreaterThan(-1);
    const headerIdx = src.search(/composeYouGreeting\s*\(/);
    expect(headerIdx).toBeGreaterThan(-1);
    expect(idxAffirmation).toBeGreaterThan(headerIdx);
  });

  it('AffirmationHeader → BreathingOrbCard → ReflectionCard → ActionCardsRow (strict order)', () => {
    expect(idxOrb).toBeGreaterThan(idxAffirmation);
    expect(idxReflection).toBeGreaterThan(idxOrb);
    expect(idxActionCards).toBeGreaterThan(idxReflection);
  });

  it('ActionCardsRow → "When you have a moment" header → ResourcesList (strict order)', () => {
    expect(idxPlanAheadHeader).toBeGreaterThan(idxActionCards);
    expect(idxResources).toBeGreaterThan(idxPlanAheadHeader);
  });

  it('absence pin: QuickResetPills + wellnessLink + planAheadCard retired', () => {
    expect(src).not.toMatch(/<QuickResetPills\b/);
    expect(src).not.toMatch(/style=\{styles\.wellnessLink\}/);
    expect(src).not.toMatch(/style=\{styles\.planAheadCard\}/);
  });
});

describe('You tab — old mood + contact-tile blocks removed', () => {
  it('does not render the inline emoji row (replaced by ReflectionCard mood)', () => {
    expect(src).not.toMatch(/style=\{styles\.emojiRow\}/);
  });

  it('does not render the side-by-side mood + breathe primary cards', () => {
    expect(src).not.toMatch(/style=\{styles\.primaryRow\}/);
    expect(src).not.toMatch(/style=\{\[styles\.primaryCard,\s*styles\.primaryCardLeft\]\}/);
  });

  it('does not render the legacy Helpline + Community contact-tile row', () => {
    expect(src).not.toMatch(/style=\{styles\.contactTilesRow\}/);
  });
});

describe('You tab — ActionCardsRow handlers wired (Phase 29 Batch B F4)', () => {
  it('onHelpline dials the caregiver helpline (tel: link preserved across QuickResetPills retirement)', () => {
    expect(src).toMatch(/onHelpline=\{[\s\S]{0,200}?Linking\.openURL\(['"]tel:/);
  });

  it('onCommunity opens caregiveraction.org (Linking.openURL preserved)', () => {
    expect(src).toMatch(/onCommunity=\{[\s\S]{0,300}?Linking\.openURL/);
  });

  it('onWellness navigates to /caregiver-wellness (folds the retired wellnessLink destination)', () => {
    expect(src).toMatch(/onWellness=\{[\s\S]{0,200}?navigate\(['"]\/caregiver-wellness['"]\)/);
  });

  it('BreathingExercise modal is still mounted in the tree (single mount preserved)', () => {
    expect(src).toMatch(/<BreathingExercise/);
  });
});

describe('You tab — page padding + scroll behavior', () => {
  it('scrollContent has paddingHorizontal: 14 and paddingBottom >= 24', () => {
    // May 1 spacing-rhythm Phase 3 dropped scrollContent.paddingHorizontal
    // from 20 to the canonical 14pt page-edge contract. paddingBottom
    // floor unchanged.
    const block = styleBlock('scrollContent');
    expect(num(block, 'paddingHorizontal')).toBe(14);
    const pb = num(block, 'paddingBottom');
    expect(pb).not.toBeNull();
    expect(pb as number).toBeGreaterThanOrEqual(24);
  });

  it('ScrollView declares keyboardShouldPersistTaps="handled"', () => {
    expect(src).toMatch(/keyboardShouldPersistTaps=['"]handled['"]/);
  });
});
