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

  it('imports QuickResetPills from components/support', () => {
    expect(src).toMatch(/import\s*\{\s*QuickResetPills\s*\}\s*from\s*['"][^'"]*QuickResetPills['"]/);
  });
});

describe('You tab — JSX render order matches Phase 6 spec', () => {
  // Index of each anchor JSX. We assert strictly increasing offsets so the
  // composition lands in the spec'd order.
  const idxAffirmation = src.indexOf('<AffirmationHeader');
  const idxReflection  = src.indexOf('<ReflectionCard');
  const idxPills       = src.indexOf('<QuickResetPills');
  const idxWellness    = src.search(/<TouchableOpacity[^>]*\n[\s\S]{0,200}?style=\{styles\.wellnessLink\}/);
  const idxPlanAhead   = src.indexOf('<View style={styles.planAheadCard}');

  it('renders AffirmationHeader after the header copy', () => {
    expect(idxAffirmation).toBeGreaterThan(-1);
    const headerIdx = src.indexOf('A space for you, not your loved one.');
    expect(headerIdx).toBeGreaterThan(-1);
    expect(idxAffirmation).toBeGreaterThan(headerIdx);
  });

  it('AffirmationHeader → ReflectionCard → QuickResetPills (strict order)', () => {
    expect(idxReflection).toBeGreaterThan(idxAffirmation);
    expect(idxPills).toBeGreaterThan(idxReflection);
  });

  it('QuickResetPills → wellness link → Plan ahead (strict order)', () => {
    expect(idxWellness).toBeGreaterThan(idxPills);
    expect(idxPlanAhead).toBeGreaterThan(idxWellness);
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

  it('does not render the Helpline + Community contact-tile row (replaced by QuickResetPills)', () => {
    expect(src).not.toMatch(/style=\{styles\.contactTilesRow\}/);
  });
});

describe('You tab — QuickResetPills handlers wired', () => {
  it('onBreathe opens the breathing exercise modal', () => {
    expect(src).toMatch(/onBreathe=\{[\s\S]{0,200}?setBreathingVisible\(true\)/);
  });

  it('onHelpline dials the caregiver helpline', () => {
    expect(src).toMatch(/onHelpline=\{[\s\S]{0,200}?Linking\.openURL\(['"]tel:/);
  });

  it('onCommunity routes to a community destination', () => {
    // Either Linking.openURL to a known community URL, or a navigate() to
    // an in-app community surface. Some handler must be present.
    expect(src).toMatch(/onCommunity=\{[\s\S]{0,300}?(Linking\.openURL|navigate\()/);
  });

  it('BreathingExercise modal is still mounted in the tree', () => {
    expect(src).toMatch(/<BreathingExercise/);
  });
});

describe('You tab — page padding + scroll behavior', () => {
  it('scrollContent has paddingHorizontal: 20 and paddingBottom >= 24', () => {
    const block = styleBlock('scrollContent');
    expect(num(block, 'paddingHorizontal')).toBe(20);
    const pb = num(block, 'paddingBottom');
    expect(pb).not.toBeNull();
    expect(pb as number).toBeGreaterThanOrEqual(24);
  });

  it('ScrollView declares keyboardShouldPersistTaps="handled"', () => {
    expect(src).toMatch(/keyboardShouldPersistTaps=['"]handled['"]/);
  });
});
