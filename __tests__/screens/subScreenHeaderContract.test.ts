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

  it('title style: fontSize 32, fontWeight 300', () => {
    const block = styleBlock(headerSrc, 'title');
    expect(num(block, 'fontSize')).toBe(32);
    expect(block).toMatch(/fontWeight:\s*['"]300['"]/);
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
  // Default preserves the 32pt sans contract (pinned above). Serif
  // is the witness-voice variant consumed by caregiver-wellness +
  // /resources so their lavender-lane subscreens read in the same
  // Georgia italic register as the You-tab greeting that launches them.
  it('props interface declares titleVariant?: "default" | "serif"', () => {
    expect(headerSrc).toMatch(/titleVariant\?:\s*['"]?default['"]?\s*\|\s*['"]?serif['"]?/);
  });

  it('component destructures titleVariant with "default" fallback', () => {
    expect(headerSrc).toMatch(/titleVariant\s*=\s*['"]default['"]/);
  });

  it('titleSerif style block: Georgia italic, 20pt, weight 400', () => {
    const block = styleBlock(headerSrc, 'titleSerif');
    expect(block).not.toBe('');
    expect(block).toMatch(/fontFamily:\s*['"]Georgia['"]/);
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
  {
    rel: 'app/care-plan/meds.tsx',
    shouldDropCaps: ['MEDICATIONS'],
    title: /title=['"]Medications['"]/,
    subtitle: /Set up [\s\S]+daily meds and reminders/,
  },
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
