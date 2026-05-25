// ============================================================================
// SubScreenHeader contract — every non-tab screen uses the shared header
// component with 32pt title / 13pt subtitle / 56pt top padding.
// Mirrors the four-tab structure asserted in headerStructureContract.test.ts.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

const headerSrc = read('components/SubScreenHeader.tsx');

function styleBlock(src: string, name: string): string {
  const re = new RegExp(`\\b${name}:\\s*\\{([^}]*)\\}`, 's');
  const m = src.match(re);
  return m ? m[1] : '';
}

function num(block: string, prop: string): number | null {
  const m = block.match(new RegExp(`\\b${prop}:\\s*(-?\\d+(?:\\.\\d+)?)`));
  return m ? Number(m[1]) : null;
}

describe('SubScreenHeader — shape and metrics', () => {
  it('container paddingTop is 56 (matches main-tab contract)', () => {
    const block = styleBlock(headerSrc, 'container');
    expect(num(block, 'paddingTop')).toBe(56);
  });

  it('container paddingBottom is 24', () => {
    const block = styleBlock(headerSrc, 'container');
    expect(num(block, 'paddingBottom')).toBe(24);
  });

  it('title style: fontSize 32, fontWeight 400, serif (Phase 33 F5)', () => {
    // Phase 33 F5 — default variant migrated from sans-serif weight 300
    // to Source Serif 4 weight 400 + letter-spacing −0.8. Q-33.5/Q-33.7
    // lock: informational subscreen labels carry regular-weight serif;
    // italic-serif stays the opt-in variant for witness-voice subscreens.
    const block = styleBlock(headerSrc, 'title');
    expect(num(block, 'fontSize')).toBe(32);
    expect(block).toMatch(/fontWeight:\s*['"]400['"]/);
    expect(block).toMatch(/fontFamily:\s*Fonts\.serif\b/);
    expect(num(block, 'letterSpacing')).toBe(-0.8);
  });

  it('subtitle style: fontSize 13, color textSecondary, lineHeight 20', () => {
    const block = styleBlock(headerSrc, 'subtitle');
    expect(num(block, 'fontSize')).toBe(13);
    expect(num(block, 'lineHeight')).toBe(20);
    expect(block).toMatch(/color:\s*c\.textSecondary|color:\s*colors\.textSecondary/);
  });

  it('subtitle marginTop is 8 (rhythm from title)', () => {
    const block = styleBlock(headerSrc, 'subtitle');
    expect(num(block, 'marginTop')).toBe(8);
  });

  it('exposes title, subtitle, rightAction props (no required emoji)', () => {
    expect(headerSrc).toMatch(/title:\s*string/);
    expect(headerSrc).toMatch(/subtitle\??:\s*string/);
    expect(headerSrc).toMatch(/rightAction\??:\s*React\.ReactNode/);
  });

  it('renders BackButton for navigation', () => {
    expect(headerSrc).toMatch(/BackButton/);
  });
});

describe('SubScreenHeader — Phase 29 Batch C F1 titleVariant prop', () => {
  // Phase 29 Batch C F1 — titleVariant?: 'default' | 'serif' added.
  // Phase 33 F5: both variants now render Source Serif 4. Default is
  // regular weight (informational subscreens); serif variant is italic
  // (witness-voice subscreens like /caregiver-wellness and /resources).
  it('props interface declares titleVariant?: "default" | "serif"', () => {
    expect(headerSrc).toMatch(/titleVariant\?:\s*['"]?default['"]?\s*\|\s*['"]?serif['"]?/);
  });

  it('component destructures titleVariant with "default" fallback', () => {
    expect(headerSrc).toMatch(/titleVariant\s*=\s*['"]default['"]/);
  });

  it('titleSerif style block: Source Serif 4 italic via Fonts.serifItalic, 20pt, weight 400 (Phase 33 F5)', () => {
    // Phase 33 F5 — fontFamily literal 'Georgia' migrated to the
    // Fonts.serifItalic token so the variant picks up Source Serif 4
    // italic from the F3 useFonts loader. Geometry (20pt, weight 400,
    // letter-spacing 0.1, italic style) preserved from Batch C F1.
    const block = styleBlock(headerSrc, 'titleSerif');
    expect(block).not.toBe('');
    expect(block).toMatch(/fontFamily:\s*Fonts\.serifItalic\b/);
    expect(block).toMatch(/fontStyle:\s*['"]italic['"]/);
    expect(num(block, 'fontSize')).toBe(20);
    expect(block).toMatch(/fontWeight:\s*['"]400['"]/);
  });

  it('JSX selects titleSerif vs title based on titleVariant', () => {
    // Conditional pattern: titleVariant === 'serif' ? styles.titleSerif : styles.title
    expect(headerSrc).toMatch(
      /titleVariant\s*===\s*['"]serif['"]\s*\?\s*styles\.titleSerif\s*:\s*styles\.title/,
    );
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Per-screen migration: each target uses <SubScreenHeader> and drops the
// tiny-caps headerLabel banner that was the previous title.
// ────────────────────────────────────────────────────────────────────────────

const targets: Array<{
  rel: string;
  shouldDropCaps: string[];
  title: RegExp;
  subtitle: RegExp;
}> = [
  {
    rel: 'app/care-plan/index.tsx',
    shouldDropCaps: ['CARE PLAN'],
    title: /title=['"]Care Plan['"]/,
    subtitle: /Set up what to track for/,
  },
  // Phase 32A.1 F7 — app/care-plan/meds.tsx retired. The Medications
  // surface moved into the inline MedicationsDrawer on /care-plan
  // home, which has no SubScreenHeader (drawer chrome owns the
  // section anchor). Entry retired from the targets list.
  // Phase 10.2 — wellness migrated to CarePlanConfigScreen primitive
  // and no longer consumes SubScreenHeader. Header / subtitle metrics
  // for the new family are pinned in
  // __tests__/components/care-plan/CarePlanConfigScreen.test.tsx and
  // __tests__/screens/wellnessConfigTightened.test.tsx.
  //
  // Phase 10.3.6 — meals migrated to CarePlanConfigScreen primitive
  // (chrome="gradient"). Migration contract pinned in
  // __tests__/screens/mealsConfigMigrated.test.tsx.
  //
  // Phase 10.3.7 — vitals migrated to CarePlanConfigScreen primitive
  // (chrome="gradient"). Migration contract pinned in
  // __tests__/screens/vitalsConfigMigrated.test.tsx.
  {
    rel: 'app/patient/index.tsx',
    // Old "Patient" hardcoded title is replaced by the resolved patient name.
    shouldDropCaps: [],
    title: /title=\{(?:patientName|displayName|[^}]*activePatient)/,
    subtitle: /medical history and details/,
  },
  {
    rel: 'app/visit-prep.tsx',
    shouldDropCaps: [],
    title: /title=['"]Visit Prep['"]/,
    subtitle: /subtitle=/,
  },
];

describe.each(targets)('Sub-screen header — $rel', ({ rel, shouldDropCaps, title, subtitle }) => {
  const src = read(rel);

  it('imports SubScreenHeader from the shared component', () => {
    expect(src).toMatch(/from\s+['"][^'"]*SubScreenHeader['"]/);
  });

  it('renders <SubScreenHeader>', () => {
    expect(src).toMatch(/<SubScreenHeader\b/);
  });

  it('passes a title matching the spec', () => {
    expect(src).toMatch(title);
  });

  it('passes a subtitle prop', () => {
    expect(src).toMatch(subtitle);
  });

  for (const caps of shouldDropCaps) {
    it(`no longer renders the tiny "${caps}" banner inside a Text element`, () => {
      // The banner appeared inside a <Text> as children. Just searching the
      // file isn't enough (constants files may legitimately use the word) —
      // check specifically for the JSX shape used by the old headers.
      const re = new RegExp(`<Text[^>]*>${caps}</Text>`);
      expect(src).not.toMatch(re);
    });
  }
});
