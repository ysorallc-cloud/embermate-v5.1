// ============================================================================
// Onboarding copy refresh — v6.7 story-led tone.
// Pins the new copy across Welcome / Meet / Get Started / Privacy. Decoupled
// from layout/structure tests; this file owns the words alone.
// ============================================================================

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const read = (rel: string) =>
  existsSync(join(ROOT, rel)) ? readFileSync(join(ROOT, rel), 'utf8') : '';

describe('Welcome screen — refreshed copy', () => {
  const src = read('app/(onboarding)/screens/WelcomeScreen.tsx');

  it('subtitle reads "A quiet companion to help you keep track…"', () => {
    expect(src).toContain('A quiet companion to help you keep track');
  });

  it('privacy point reads "Stays on your device. No accounts, no cloud."', () => {
    expect(src).toContain('Stays on your device. No accounts, no cloud.');
  });

  it('drops the legacy verbose subtitle', () => {
    expect(src).not.toContain('helps you stay organized so you can focus on what matters');
  });
});

describe('MeetSampleScreen — both narratives present', () => {
  const src = read('app/(onboarding)/screens/MeetSampleScreen.tsx');

  it('caregiver title: "Meet Dad."', () => {
    expect(src).toContain('Meet Dad.');
  });

  it("self title: \"Here's what a week looks like.\"", () => {
    expect(src).toContain("Here's what a week looks like.");
  });
});

describe('GetStartedScreen — refreshed copy', () => {
  const src = read('app/(onboarding)/screens/GetStartedScreen.tsx');

  it('title reads "Your turn."', () => {
    expect(src).toContain('Your turn.');
  });

  it('drops the deprecated bucket-grid heading', () => {
    expect(src).not.toContain('What would you like to track?');
  });

  it('drops the deprecated "Start small" hint', () => {
    expect(src).not.toContain('Start small');
  });
});

describe('PrivacyDisclaimerScreen — softened disclaimer', () => {
  const src = read('app/(onboarding)/screens/PrivacyDisclaimerScreen.tsx');

  it('drops the bold "Not a medical device." opener', () => {
    expect(src).not.toContain('Not a medical device.');
  });

  it('keeps the legal substance about not substituting for a doctor', () => {
    // "...not a substitute for your doctor's advice." per the new copy.
    expect(src).toMatch(/not a substitute for/i);
  });
});
