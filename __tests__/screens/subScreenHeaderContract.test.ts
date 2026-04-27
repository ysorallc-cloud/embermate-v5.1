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
  {
    rel: 'app/care-plan/vitals.tsx',
    shouldDropCaps: ['VITALS'],
    title: /title=['"]Vitals['"]/,
    subtitle: /subtitle=/,
  },
  {
    rel: 'app/care-plan/wellness.tsx',
    shouldDropCaps: ['WELLNESS'],
    title: /title=['"]Wellness Checks['"]/,
    subtitle: /subtitle=/,
  },
  {
    rel: 'app/care-plan/meals.tsx',
    shouldDropCaps: ['MEALS'],
    title: /title=['"]Meals['"]/,
    subtitle: /subtitle=/,
  },
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
