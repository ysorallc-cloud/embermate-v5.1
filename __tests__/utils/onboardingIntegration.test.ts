// ============================================================================
// Onboarding → Care Plan Integration Tests
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';
import {
  generateCarePlanFromOnboarding,
  OnboardingAnswers,
} from '../../utils/onboardingToPlan';

const onboardingPath = path.resolve(__dirname, '../../app/(onboarding)/index.tsx');
const onboardingSrc = fs.readFileSync(onboardingPath, 'utf-8');

describe('Onboarding → Care Plan integration', () => {
  it('onboarding calls generateCarePlanFromOnboarding', () => {
    expect(onboardingSrc).toContain('generateCarePlanFromOnboarding');
    expect(onboardingSrc).toContain('saveCarePlanConfig');
  });

  it('onboarding answers produce a valid CarePlanConfig', () => {
    const answers: OnboardingAnswers = {
      relationship: 'parent',
      careAreas: ['medications', 'meals', 'vitals'],
      concerns: ['hydration', 'sleep_patterns'],
      cadence: 'morning_evening',
    };
    const config = generateCarePlanFromOnboarding(answers);

    expect(config).toBeDefined();
    expect(config.id).toBeDefined();
    expect(config.patientId).toBe('default');
    expect(config.version).toBe(1);
  });

  it('empty careAreas → sane default (meds+vitals+wellness on; water+meals off, nothing force-on)', () => {
    // onboarding-personalize: nothing is force-on. Empty Q2 falls back to
    // DEFAULT_CARE_AREAS = meds + vitals + wellness; water + meals stay off.
    const answers: OnboardingAnswers = {
      relationship: 'parent',
      careAreas: [],
      concerns: [],
      cadence: 'morning_only',
    };
    const config = generateCarePlanFromOnboarding(answers);

    expect(config.meds.enabled).toBe(true);
    expect(config.vitals.enabled).toBe(true);
    expect(config.wellness.enabled).toBe(true);
    expect(config.water.enabled).toBe(false);
    expect(config.meals.enabled).toBe(false);
  });

  it("concern areas elevate priority to 'required'", () => {
    const answers: OnboardingAnswers = {
      relationship: 'parent',
      careAreas: ['medications'],
      concerns: ['hydration', 'sleep_patterns', 'missed_medication'],
      cadence: 'morning_evening',
    };
    const config = generateCarePlanFromOnboarding(answers);

    expect(config.water.priority).toBe('required');
    expect(config.sleep.priority).toBe('required');
    expect(config.meds.priority).toBe('required');
  });

  it('generated config has all required bucket fields', () => {
    const answers: OnboardingAnswers = {
      relationship: 'parent',
      careAreas: ['medications', 'vitals'],
      concerns: [],
      cadence: 'three_times',
    };
    const config = generateCarePlanFromOnboarding(answers);

    // All bucket keys exist
    expect(config.meds).toBeDefined();
    expect(config.vitals).toBeDefined();
    expect(config.meals).toBeDefined();
    expect(config.water).toBeDefined();
    expect(config.sleep).toBeDefined();
    expect(config.activity).toBeDefined();
    expect(config.wellness).toBeDefined();
    expect(config.appointments).toBeDefined();
    expect(config.errands).toBeDefined();
    expect(config.shifts).toBeDefined();
    expect(config.self_care).toBeDefined();
  });
});
