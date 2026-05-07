// ============================================================================
// GetStartedScreen choice flow — v6.7 two-card layout.
// Locks in: primary card reveals an inline name input on tap; secondary card
// triggers the seed-sample-data path; bucket grid is gone (regression guard).
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const src = readFileSync(
  join(ROOT, 'app/(onboarding)/screens/GetStartedScreen.tsx'),
  'utf8',
);

describe('GetStartedScreen — bucket grid removed (regression guard)', () => {
  it('does not import BucketType / BUCKET_META', () => {
    expect(src).not.toMatch(/import\s+\{[^}]*\bBucketType\b/);
    expect(src).not.toMatch(/import\s+\{[^}]*\bBUCKET_META\b/);
  });

  it('does not declare SELECTABLE_BUCKETS / DEFAULT_SELECTED', () => {
    expect(src).not.toMatch(/SELECTABLE_BUCKETS/);
    expect(src).not.toMatch(/DEFAULT_SELECTED/);
  });

  it('does not define selectedBuckets state or toggleBucket', () => {
    expect(src).not.toMatch(/selectedBuckets/);
    expect(src).not.toMatch(/toggleBucket/);
  });

  it('does not render the bucket grid JSX', () => {
    expect(src).not.toMatch(/style=\{styles\.bucketGrid\}/);
    expect(src).not.toMatch(/style=\{styles\.bucketCard\}/);
  });

  it('does not call getOrCreateCarePlanConfig / saveCarePlanConfig at the screen level', () => {
    // Care-plan config lives at the orchestrator level after the refactor —
    // the screen's only job is the choice (name vs sample data).
    expect(src).not.toMatch(/getOrCreateCarePlanConfig\(/);
    expect(src).not.toMatch(/saveCarePlanConfig\(/);
  });
});

describe('GetStartedScreen — two-card choice layout', () => {
  it('renders a primary "Set up my [loved one|self]" card with the spec subtitle', () => {
    expect(src).toMatch(/Set up my (?:loved one|myself|self)/);
    expect(src).toContain('Just a name. Add meds whenever.');
  });

  it('renders a secondary "Keep exploring" card', () => {
    expect(src).toMatch(/Keep exploring/);
    expect(src).toContain('Try the app populated. Switch to your own anytime in Settings.');
  });

  it('primary card uses mint (accent) background', () => {
    // A primary/expandable card style must pick up the accent token.
    expect(src).toMatch(/(?:primaryCard|setUpCard|primaryChoice)[\s\S]{0,300}?backgroundColor:\s*c\.accent/);
  });

  it('secondary card uses glass surface', () => {
    expect(src).toMatch(/(?:secondaryCard|exploreCard|sampleChoice)[\s\S]{0,300}?backgroundColor:\s*c\.glass\b/);
  });
});

describe('GetStartedScreen — primary card reveals an inline name input on tap', () => {
  it('manages an "expanded" boolean for the primary card', () => {
    expect(src).toMatch(/useState[^)]*\bexpanded\b|setExpanded/);
  });

  it('inline TextInput is rendered conditionally on expanded state', () => {
    // The TextInput must be gated by the expanded flag, not always visible.
    expect(src).toMatch(/expanded\s*&&[\s\S]{0,300}?<TextInput/);
  });

  it('placeholder copy varies by careMode', () => {
    // Caregiver: "e.g. Mom, Dad, Linda"
    // Self:     "Your first name"
    expect(src).toContain('Mom, Dad, Linda');
    expect(src).toContain('Your first name');
  });

  it('inline Done button calls onComplete(false) (the not-seeded path)', () => {
    expect(src).toMatch(/onComplete\(false\)/);
  });
});

describe('GetStartedScreen — secondary card seeds sample data', () => {
  it('tap routes through onComplete(true)', () => {
    expect(src).toMatch(/onComplete\(true\)/);
  });
});

describe('GetStartedScreen — preserves the existing name persistence', () => {
  it('persists the name through writePatientName (registry + mirror + event)', () => {
    // Phase 5.13.1.b — direct AsyncStorage.setItem + updatePatient pair
    // collapsed into a single canonical writer call.
    expect(src).toMatch(/writePatientName\(['"]default['"]\s*,\s*name\s*\)/);
  });

  it('still uses the "your loved one" friendly fallback when name is empty', () => {
    expect(src).toContain("'your loved one'");
  });
});

describe('GetStartedScreen — title + chrome', () => {
  it('title reads "Your turn."', () => {
    expect(src).toContain('Your turn.');
  });

  it('keeps the loading overlay (existing pattern)', () => {
    expect(src).toMatch(/loadingOverlay|setIsLoading/);
  });

  it('keeps the bottom backup tip', () => {
    expect(src).toMatch(/Backup\s*&\s*Restore|backupTip/);
  });
});
