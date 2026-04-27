// ============================================================================
// Patient profile screen — empty state + accessibility cleanup.
// Locks in v6.7 patient screen polish: "Not set" sentinel instead of em-dash,
// neutral allergy empty state, scroll padding so Edit Medical History clears
// the home indicator on every iPhone size.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const src = readFileSync(join(ROOT, 'app/patient/index.tsx'), 'utf8');

function styleBlock(name: string): string {
  const re = new RegExp(`\\b${name}:\\s*\\{([^}]*)\\}`, 's');
  const m = src.match(re);
  return m ? m[1] : '';
}

function num(block: string, prop: string): number | null {
  const m = block.match(new RegExp(`\\b${prop}:\\s*(-?\\d+(?:\\.\\d+)?)`));
  return m ? Number(m[1]) : null;
}

describe('Patient profile — title + avatar (already migrated, regression guard)', () => {
  it('title resolves from PatientContext (no hardcoded "Patient")', () => {
    expect(src).toMatch(/title=\{(?:displayName|patientName)/);
    expect(src).not.toMatch(/title=['"]Patient['"]/);
  });

  it('right-action avatar uses an initial-letter chip (no silhouette emoji)', () => {
    expect(src).not.toMatch(/\\u\{1F464\}|\\uD83D\\uDC64/);
    expect(src).toMatch(/avatarChip/);
  });
});

describe('Patient profile — empty field rows show "Not set", not em-dash', () => {
  it('does not fall back to em-dash for unset basic-info fields', () => {
    // Walk the basic-info Text fallbacks. None of them should default to '—'.
    const basicInfoBlock = src.match(/sectionLabel}>BASIC INFORMATION[\s\S]+?\/View>\s*<\/View>\s*<\/View>/);
    expect(basicInfoBlock).toBeTruthy();
    expect(basicInfoBlock![0]).not.toMatch(/\|\|\s*['"]\\u2014['"]/);
    expect(basicInfoBlock![0]).not.toMatch(/\|\|\s*['"]—['"]/);
  });

  it('uses "Not set" sentinel for unset values', () => {
    expect(src).toContain("Not set");
  });

  it('"Not set" is styled with textTertiary (low-contrast, but still readable)', () => {
    // The fallback should render with a muted color so the placeholder reads
    // as absence-of-data, not as the value itself.
    expect(src).toMatch(/Not set[\s\S]{0,400}?(textTertiary|infoValueEmpty)|infoValueEmpty[\s\S]{0,400}?textTertiary/);
  });
});

describe('Patient profile — allergies empty state has neutral border', () => {
  it('allergyCard red styling is gated on info.allergies.length > 0', () => {
    // The red bg/border should only apply when there are recorded allergies.
    // The line that applies styles.allergyCard must reference the length
    // check on the same expression, e.g.
    //   style={[styles.infoCard, info.allergies.length > 0 && styles.allergyCard]}
    const allergyCardUsage = src.match(/[^\n]*styles\.allergyCard[^\n]*/);
    expect(allergyCardUsage).toBeTruthy();
    expect(allergyCardUsage![0]).toMatch(/info\.allergies\.length\s*>\s*0|info\.allergies\.length\s*!==?\s*0/);
  });
});

describe('Patient profile — bottom padding clears home indicator', () => {
  it('ScrollView has contentContainerStyle paddingBottom >= 40', () => {
    // The Edit Medical History button sits near the end of the scroll. Without
    // explicit contentContainerStyle padding, KeyboardAvoidingView and the
    // home-indicator inset can clip it on iPhone SE / Pro Max.
    const sv = src.match(/<ScrollView\b[\s\S]*?>/);
    expect(sv).toBeTruthy();
    // Either via a contentContainerStyle prop on ScrollView or via a
    // dedicated contentContainer style block referenced from the prop.
    const hasInlinePadding = /contentContainerStyle=\{\{[^}]*paddingBottom:\s*([4-9]\d|\d{3,})/.test(sv![0]);
    const hasStylePadding = /contentContainerStyle=\{styles\.[A-Za-z]+\}/.test(sv![0])
      && (() => {
        const styleNameMatch = sv![0].match(/contentContainerStyle=\{styles\.([A-Za-z]+)\}/);
        if (!styleNameMatch) return false;
        const block = styleBlock(styleNameMatch[1]);
        const pb = num(block, 'paddingBottom');
        return pb !== null && pb >= 40;
      })();
    expect(hasInlinePadding || hasStylePadding).toBe(true);
  });
});
