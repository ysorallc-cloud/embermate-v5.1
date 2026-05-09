// ============================================================================
// Silent vitals — tone + framing audit (Phase 9.4 update).
//
// Pre-9.4 the screen branded itself as "Silent vital signs" with an
// all-caps eyebrow and wordy patient-named questions ("How did Mom
// sleep?"). The Phase 9.4 migration aligned the surface with the
// LogScreen pattern set by 9.2 / 9.3:
//   • Title is "Wellness check" — matches existing useWellnessSettings
//     and Care Plan config language.
//   • Single-word labels (Sleep / Mood / Energy) replace the wordy
//     prose; the disclaimer above carries the framing context.
//   • The all-caps eyebrow is gone (LogScreen primitive owns the
//     header rhythm).
//
// This file pins the new copy contract. The clinical-jargon banlist
// below is unchanged — those forbidden terms still apply.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

const captureSrc = read('components/logging/SilentVitalsCapture.tsx');
const screenSrc = read('app/silent-vitals.tsx');

describe('Wellness check — Phase 9.4 framing', () => {
  it('screen title is "Wellness check" (matches Care Plan config language)', () => {
    expect(screenSrc).toMatch(/title=['"`]Wellness check['"`]/);
  });

  it('capture component renders single-word labels Sleep / Mood / Energy', () => {
    expect(captureSrc).toMatch(/label:\s*['"`]Sleep['"`]/);
    expect(captureSrc).toMatch(/label:\s*['"`]Mood['"`]/);
    expect(captureSrc).toMatch(/label:\s*['"`]Energy['"`]/);
  });

  it('capture component drops the legacy all-caps "THE SILENT VITAL SIGNS" eyebrow', () => {
    expect(captureSrc).not.toContain('THE SILENT VITAL SIGNS');
  });

  it('no patient-name echo in the question copy', () => {
    // Pre-9.4: "How did ${n} sleep?" / "How did ${n}'s mood feel today?".
    // Post-9.4: single-word labels carry the question, no name interpolation.
    expect(captureSrc).not.toMatch(/How did \$\{[^}]+\} sleep/);
    expect(captureSrc).not.toMatch(/How was \$\{[^}]+\}'s/);
  });

  it('anchor labels Rough / Good frame the slider extremes', () => {
    expect(captureSrc).toMatch(/['"`]Rough['"`]/);
    expect(captureSrc).toMatch(/['"`]Good['"`]/);
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

describe('Wellness check — Save gating + caregiver agency', () => {
  it('reflection placeholder invites a brief note ("anything to remember?")', () => {
    // Phase 9.4 simplified the placeholder — was "One sentence — anything
    // you'd want to remember tomorrow?"; now just "anything to remember?"
    // matching the spec's italic-serif copy.
    expect(captureSrc).toMatch(/anything to remember/i);
  });

  it('save action is owned by the LogScreen primitive — capture component has no inline Save', () => {
    // Inline Save / Submit / Record buttons would compete with the
    // LogScreen primary CTA. None of those words should appear as
    // testID values or button labels inside the capture component.
    expect(captureSrc).not.toMatch(/testID=['"`]silent-vitals-save['"`]/);
    expect(captureSrc).not.toMatch(/['"`]Submit['"`]/);
    expect(captureSrc).not.toMatch(/['"`]Record['"`]/);
  });

  it('screen-level Save CTA reads "Save check-in" (set on LogScreen primaryAction)', () => {
    expect(screenSrc).toMatch(/Save check-in/);
    expect(screenSrc).not.toMatch(/['"`]Submit['"`]/);
    expect(screenSrc).not.toMatch(/['"`]Record['"`]/);
  });
});
