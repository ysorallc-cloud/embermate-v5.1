// ============================================================================
// Phase 5.13.c — applyCarePlanTemplate util.
//
// Pure config-writing helper extracted from the legacy useCallback in
// app/care-plan/index.tsx. Wizard step 2 and Care Plan home both call
// this so the apply path stays a single source of truth.
//
// Returns a structured result so the caller decides whether to mount the
// medication-seeding modal — UI side effects stay in the components.
// ============================================================================

import {
  applyCarePlanTemplate,
} from '../../utils/applyCarePlanTemplate';
import type { CarePlanTemplate } from '../../constants/carePlanTemplates';

const setBucketEnabled = jest.fn();
const updateBucketConfig = jest.fn();
const getOrCreateCarePlanConfig = jest.fn();
const setAppliedTemplateId = jest.fn();

jest.mock('../../storage/carePlanConfigRepo', () => ({
  setBucketEnabled: (...args: any[]) => setBucketEnabled(...args),
  updateBucketConfig: (...args: any[]) => updateBucketConfig(...args),
  getOrCreateCarePlanConfig: (...args: any[]) => getOrCreateCarePlanConfig(...args),
  setAppliedTemplateId: (...args: any[]) => setAppliedTemplateId(...args),
}));

jest.mock('../../utils/devLog', () => ({ logError: () => {} }));

beforeEach(() => {
  setBucketEnabled.mockReset().mockResolvedValue(undefined);
  updateBucketConfig.mockReset().mockResolvedValue(undefined);
  getOrCreateCarePlanConfig.mockReset().mockResolvedValue({});
  setAppliedTemplateId.mockReset().mockResolvedValue(undefined);
});

const elderlyTemplate: CarePlanTemplate = {
  id: 'elderly',
  name: 'Aging in Place',
  emoji: '🏠',
  description: 'For older adults at home',
  enabledBuckets: ['meds', 'vitals'],
  suggestedSettings: {
    meds: { priority: 'high', timesOfDay: ['morning', 'evening'] },
    vitals: { priority: 'medium', frequency: 'daily', vitalTypes: ['bp', 'hr'] },
  },
  suggestedMedications: [
    { name: 'Lisinopril', dosage: '10mg', frequency: 'daily' },
  ],
} as any;

const blankTemplate: CarePlanTemplate = {
  id: 'general-wellness',
  name: 'General Wellness',
  emoji: '✨',
  description: 'Light tracking',
  enabledBuckets: ['water'],
  suggestedSettings: {},
} as any;

describe('applyCarePlanTemplate — pure config write', () => {
  it('returns configWritten: true for any template', async () => {
    const result = await applyCarePlanTemplate(elderlyTemplate);
    expect(result.configWritten).toBe(true);
  });

  it('enables every bucket listed in template.enabledBuckets', async () => {
    await applyCarePlanTemplate(elderlyTemplate);
    const enabledCalls = setBucketEnabled.mock.calls.filter(
      (c) => c[2] === true,
    );
    const enabledBuckets = enabledCalls.map((c) => c[1]);
    expect(enabledBuckets).toEqual(expect.arrayContaining(['meds', 'vitals']));
  });

  it('disables buckets NOT in template.enabledBuckets', async () => {
    await applyCarePlanTemplate(elderlyTemplate);
    const disableCalls = setBucketEnabled.mock.calls.filter(
      (c) => c[2] === false,
    );
    expect(disableCalls.length).toBeGreaterThan(0);
    // None of the disabled buckets should be in enabledBuckets.
    for (const c of disableCalls) {
      expect(elderlyTemplate.enabledBuckets).not.toContain(c[1]);
    }
  });

  it('writes suggestedSettings (priority + timesOfDay + bucket-specific) per bucket', async () => {
    await applyCarePlanTemplate(elderlyTemplate);
    const updateCalls = updateBucketConfig.mock.calls;
    // At least one updateBucketConfig per bucket with suggestedSettings.
    const buckets = updateCalls.map((c) => c[1]);
    expect(buckets).toEqual(expect.arrayContaining(['meds', 'vitals']));
  });
});

describe('applyCarePlanTemplate — appliedTemplateId persistence (Phase 5.13.2)', () => {
  it('persists template.id via setAppliedTemplateId for the default patient', async () => {
    await applyCarePlanTemplate(elderlyTemplate);
    expect(setAppliedTemplateId).toHaveBeenCalledWith('default', 'elderly');
  });

  it('persists template.id for a non-default patientId', async () => {
    await applyCarePlanTemplate(elderlyTemplate, 'patient-2');
    expect(setAppliedTemplateId).toHaveBeenCalledWith('patient-2', 'elderly');
  });

  it('persists the id even when the template has no suggestedMedications', async () => {
    await applyCarePlanTemplate(blankTemplate);
    expect(setAppliedTemplateId).toHaveBeenCalledWith('default', 'general-wellness');
  });
});

describe('applyCarePlanTemplate — pendingMedSeeding', () => {
  it('returns the template as pendingMedSeeding when suggestedMedications exist', async () => {
    const result = await applyCarePlanTemplate(elderlyTemplate);
    expect(result.pendingMedSeeding).toBeDefined();
    expect(result.pendingMedSeeding?.name).toBe('Aging in Place');
  });

  it('omits pendingMedSeeding when the template has no suggestedMedications', async () => {
    const result = await applyCarePlanTemplate(blankTemplate);
    expect(result.pendingMedSeeding).toBeUndefined();
  });

  it('omits pendingMedSeeding when suggestedMedications is an empty array', async () => {
    const noMeds: CarePlanTemplate = { ...elderlyTemplate, suggestedMedications: [] } as any;
    const result = await applyCarePlanTemplate(noMeds);
    expect(result.pendingMedSeeding).toBeUndefined();
  });
});
