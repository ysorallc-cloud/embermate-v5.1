// File: utils/__tests__/freemiumRebalance.validation.test.ts
describe('Freemium rebalance', () => {
  beforeEach(() => jest.resetModules());

  test('free tier allows pdf_export', () => {
    const { TIER_LIMITS } = require('../../types/subscription');
    expect(TIER_LIMITS.free.pdfExport).toBe(true);
  });

  test('free tier still restricts multi-patient', () => {
    const { TIER_LIMITS } = require('../../types/subscription');
    expect(TIER_LIMITS.free.maxPatients).toBe(1);
  });

  test('free tier still restricts care team', () => {
    const { TIER_LIMITS } = require('../../types/subscription');
    expect(TIER_LIMITS.free.careTeam).toBe(false);
  });

  test('premium has all features', () => {
    const { TIER_LIMITS } = require('../../types/subscription');
    const p = TIER_LIMITS.premium;
    expect(p.pdfExport).toBe(true);
    expect(p.careTeam).toBe(true);
    expect(p.advancedInsights).toBe(true);
  });
});
