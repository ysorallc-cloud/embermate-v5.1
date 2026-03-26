import {
  generateCarePlanFromOnboarding,
  getCoreQuickLogFromAnswers,
  OnboardingAnswers,
} from '../../utils/onboardingToPlan';

const baseAnswers: OnboardingAnswers = {
  relationship: 'parent',
  careAreas: [],
  concerns: [],
  cadence: 'morning_evening',
};

describe('onboardingToPlan', () => {
  it('generateCarePlanFromOnboarding() enables wellness and water by default', () => {
    const config = generateCarePlanFromOnboarding(baseAnswers);
    expect(config.wellness.enabled).toBe(true);
    expect(config.water.enabled).toBe(true);
  });

  it("generateCarePlanFromOnboarding() enables meds when careAreas includes 'medications'", () => {
    const config = generateCarePlanFromOnboarding({
      ...baseAnswers,
      careAreas: ['medications'],
    });
    expect(config.meds.enabled).toBe(true);
    expect(config.meds.priority).toBe('required');
  });

  it("generateCarePlanFromOnboarding() sets priority 'required' for concern areas", () => {
    const config = generateCarePlanFromOnboarding({
      ...baseAnswers,
      concerns: ['hydration', 'sleep_patterns'],
    });
    expect(config.water.priority).toBe('required');
    expect(config.sleep.priority).toBe('required');
    expect(config.water.enabled).toBe(true);
    expect(config.sleep.enabled).toBe(true);
  });

  it('getCoreQuickLogFromAnswers() returns exactly 3 items', () => {
    const core = getCoreQuickLogFromAnswers(baseAnswers);
    expect(core).toHaveLength(3);
  });

  it('getCoreQuickLogFromAnswers() always includes wellness', () => {
    const core = getCoreQuickLogFromAnswers(baseAnswers);
    expect(core).toContain('wellness');
  });

  it('getCoreQuickLogFromAnswers() includes care areas', () => {
    const core = getCoreQuickLogFromAnswers({
      ...baseAnswers,
      careAreas: ['medications', 'vitals'],
    });
    expect(core).toContain('wellness');
    expect(core).toContain('meds');
    expect(core).toContain('vitals');
  });
});
