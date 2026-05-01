// ============================================================================
// Silent vital signs — tone + framing audit.
//
// Locks in the Prompt 3 contract: caregiver-natural questions ("How did Mom
// sleep?"), "silent vital signs" framing in the eyebrow, and zero clinical
// jargon in user-facing copy. Assertions are source-driven — if any of these
// strings drift in a future redesign, the test fails so the team can decide
// whether the framing should evolve or stay anchored.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

const captureSrc = read('components/now/SilentVitalsCapture.tsx');
const screenSrc = read('app/silent-vitals.tsx');

describe('Silent vitals — eyebrow + framing', () => {
  it('eyebrow on the capture card names the framing explicitly', () => {
    expect(captureSrc).toContain('THE SILENT VITAL SIGNS');
  });

  it('serif italic subtitle invokes the clinical-context framing', () => {
    // Caregivers often don't realise sleep / mood / energy are exactly what a
    // clinician would ask about. The subtitle makes that legibility explicit.
    expect(captureSrc).toMatch(/clinicians treat as critical context/i);
  });

  it('screen header uses "Silent vital signs" (sentence case, not all caps)', () => {
    expect(screenSrc).toContain('Silent vital signs');
    expect(screenSrc).not.toContain('SILENT VITAL SIGNS"'); // (note: the eyebrow allcaps lives on the card, not the header)
  });
});

describe('Silent vitals — caregiver-natural question copy', () => {
  it('sleep question uses caregiver framing with patient-name interpolation', () => {
    // Question copy reads "How did <Name> sleep?" — natural caregiver phrasing.
    expect(captureSrc).toMatch(/How did \$\{n\} sleep\?/);
  });

  it('mood question is framed as how the day "felt", not a clinical mood scale', () => {
    expect(captureSrc).toMatch(/How did \$\{n\}'s mood feel today\?/);
  });

  it('energy question matches the conversational shape', () => {
    expect(captureSrc).toMatch(/How was \$\{n\}'s energy\?/);
  });
});

describe('Silent vitals — no clinical jargon in user-facing copy', () => {
  // These terms snuck into the legacy wellness wizard. The reframe drops them.
  const banned = [
    'orientation status',
    'cognitive baseline',
    'patient-reported outcome',
    'CGA',
    'PHQ-9',
    'sleep latency',
    'GCS',
    'subjective mood',
  ];

  for (const term of banned) {
    it(`capture card does not use "${term}"`, () => {
      expect(captureSrc.toLowerCase()).not.toContain(term.toLowerCase());
    });
  }
});

describe('Silent vitals — Save gating + caregiver agency', () => {
  it('reflection input copy invites a single-sentence note (not a journaling prompt)', () => {
    expect(captureSrc).toMatch(/One sentence/);
  });

  it('the Save button label is the plain word "Save" (not "Submit" / "Record")', () => {
    expect(captureSrc).toContain(`'Save'`);
    expect(captureSrc).not.toMatch(/['"`]Submit['"`]/);
    expect(captureSrc).not.toMatch(/['"`]Record['"`]/);
  });
});
