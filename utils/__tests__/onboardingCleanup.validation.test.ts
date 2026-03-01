// File: utils/__tests__/onboardingCleanup.validation.test.ts
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

describe('Onboarding cleanup validation', () => {
  const screensDir = join(__dirname, '../../app/(onboarding)/screens');
  const files = readdirSync(screensDir).filter(f => f.endsWith('.tsx'));

  const EXPECTED = ['WelcomeScreen.tsx', 'PrivacyDisclaimerScreen.tsx', 'GetStartedScreen.tsx'];
  const REMOVED = [
    'CareCircleScreen.tsx', 'CoffeeMomentScreen.tsx', 'FeaturesScreen.tsx',
    'HowItWorksScreen.tsx', 'OutcomesScreen.tsx', 'PrivacyScreen.tsx',
    'ProblemScreen.tsx', 'ReadyToStartScreen.tsx', 'SolutionScreen.tsx',
  ];

  test('only 3 active onboarding screens remain', () => {
    expect(files.sort()).toEqual(EXPECTED.sort());
  });

  test.each(REMOVED)('%s is deleted', (screen) => {
    expect(files).not.toContain(screen);
  });

  test('onboarding index only references active screens', () => {
    const idx = readFileSync(
      join(__dirname, '../../app/(onboarding)/index.tsx'), 'utf8');
    EXPECTED.forEach(s => expect(idx).toContain(s.replace('.tsx', '')));
    REMOVED.forEach(s => expect(idx).not.toContain(s.replace('.tsx', '')));
  });
});
