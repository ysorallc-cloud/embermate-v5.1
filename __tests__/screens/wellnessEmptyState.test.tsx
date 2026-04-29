// ============================================================================
// Wellness page — empty-state behaviour for first-time users (Phase 8).
//
// Source-pattern test asserting that when the page detects no lifetime
// check-ins, it renders the welcome opening + "Take a moment →" link and
// hides the timeline / rhythm / nudge cards.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const src = readFileSync(join(ROOT, 'app/caregiver-wellness.tsx'), 'utf8');

describe('Wellness empty state — first-time user branch', () => {
  it('tracks a hasAnyCheckIn flag', () => {
    expect(src).toMatch(/hasAnyCheckIn/);
  });

  it('passes isFirstTimeUser into composeWellnessOpening based on the flag', () => {
    expect(src).toMatch(/isFirstTimeUser:\s*!hasAnyCheckIn/);
  });

  it('renders the "Take a moment →" CTA in the empty branch', () => {
    expect(src).toMatch(/Take a moment\s*→/);
  });

  it('hides the mood timeline + rhythm cards when hasAnyCheckIn is false', () => {
    // Both cards are gated by `hasAnyCheckIn &&` so they never render in
    // the first-time empty branch.
    expect(src).toMatch(/hasAnyCheckIn\s*&&[\s\S]{0,400}?HOW THE WEEK FELT/);
    expect(src).toMatch(/hasAnyCheckIn\s*&&[\s\S]{0,400}?YOUR RHYTHM/);
  });

  it('the welcome line copy lives in composeWellnessOpening (not in the page)', () => {
    // The page should call the composer; the literal welcome string lives
    // in the composer source, not in the page render.
    expect(src).not.toMatch(/Welcome to your wellness space/);
  });
});
