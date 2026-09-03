// ============================================================================
// functionalIssueExtraction — pulls up to 5 functional issues (mood, energy,
// mobility) from the daily reflection store + the live symptom store (via
// the symptomEvents adapter) over the Visit Prep period.
//
// Appetite-half-feature removal — appetiteIssue() and its eventRepo read
// were removed (metadata.appetite was never populated by any writer, so the
// branch always returned null). See project_appetite_dormant_half_feature
// memory. Mobility no longer needs eventRepo either — it reads exclusively
// via the symptomEvents adapter (symptom_reported is never written to
// eventRepo), so the mock below targets that adapter directly instead of
// eventRepo.
// ============================================================================

const mockGetRangeWithMissingDays = jest.fn();
const mockGetSymptomEventsInRange = jest.fn();

jest.mock('../../storage/dailyReflectionRepo', () => ({
  getRangeWithMissingDays: (...args: any[]) => mockGetRangeWithMissingDays(...args),
}));

jest.mock('../../utils/symptomEvents', () => ({
  getSymptomEventsInRange: (...args: any[]) => mockGetSymptomEventsInRange(...args),
}));

jest.mock('../../utils/devLog', () => ({ logError: jest.fn() }));

import { extractFunctionalIssues } from '../../services/functionalIssueExtraction';

const PATIENT = 'mom';

const reflectionPoint = (date: string, mood?: number, energy?: number) => ({
  date,
  reflection: { date, mood, energyLevel: energy } as any,
});

const symptomEvent = (date: string, symptomName: string) => ({
  id: `sym-${date}-${symptomName}`,
  type: 'symptom_reported',
  timestamp: `${date}T10:00:00`,
  patientId: PATIENT,
  metadata: { symptomName },
  source: 'dedicated_screen',
  createdAt: `${date}T10:00:00`,
});

beforeEach(() => {
  mockGetRangeWithMissingDays.mockReset();
  mockGetSymptomEventsInRange.mockReset();
});

describe('extractFunctionalIssues — empty data', () => {
  it('returns an empty list when there is no reflection or symptom data', async () => {
    mockGetRangeWithMissingDays.mockResolvedValue([]);
    mockGetSymptomEventsInRange.mockResolvedValue([]);
    const result = await extractFunctionalIssues(PATIENT, {
      start: '2026-04-01',
      end: '2026-04-14',
    });
    expect(result).toEqual([]);
  });
});

describe('extractFunctionalIssues — mood issue', () => {
  it('flags persistently low mood (avg < 3 across the second half)', async () => {
    mockGetRangeWithMissingDays.mockResolvedValue([
      reflectionPoint('2026-04-01', 4, 4),
      reflectionPoint('2026-04-08', 2, 3),
      reflectionPoint('2026-04-09', 2, 3),
      reflectionPoint('2026-04-10', 1, 2),
    ]);
    mockGetSymptomEventsInRange.mockResolvedValue([]);
    const result = await extractFunctionalIssues(PATIENT, {
      start: '2026-04-01',
      end: '2026-04-14',
    });
    const moodIssue = result.find((i) => i.category === 'mood');
    expect(moodIssue).toBeDefined();
    expect(['concerning', 'urgent']).toContain(moodIssue!.severity);
    expect(moodIssue!.observation.toLowerCase()).toContain('mood');
  });
});

describe('extractFunctionalIssues — energy issue', () => {
  it('flags low energy across the period', async () => {
    mockGetRangeWithMissingDays.mockResolvedValue([
      reflectionPoint('2026-04-01', 3, 1),
      reflectionPoint('2026-04-05', 3, 2),
      reflectionPoint('2026-04-08', 3, 1),
      reflectionPoint('2026-04-10', 3, 2),
    ]);
    mockGetSymptomEventsInRange.mockResolvedValue([]);
    const result = await extractFunctionalIssues(PATIENT, {
      start: '2026-04-01',
      end: '2026-04-14',
    });
    const energyIssue = result.find((i) => i.category === 'energy');
    expect(energyIssue).toBeDefined();
    expect(energyIssue!.observation.toLowerCase()).toContain('energy');
  });
});

describe('extractFunctionalIssues — mobility issue', () => {
  it('flags repeated mobility-related events (falls, transfer issues)', async () => {
    mockGetRangeWithMissingDays.mockResolvedValue([]);
    mockGetSymptomEventsInRange.mockResolvedValue([
      symptomEvent('2026-04-04', 'fall'),
      symptomEvent('2026-04-08', 'fall'),
      symptomEvent('2026-04-12', 'unsteady gait'),
    ]);
    const result = await extractFunctionalIssues(PATIENT, {
      start: '2026-04-01',
      end: '2026-04-14',
    });
    const mobilityIssue = result.find((i) => i.category === 'mobility');
    expect(mobilityIssue).toBeDefined();
    expect(['concerning', 'urgent']).toContain(mobilityIssue!.severity);
  });
});

describe('extractFunctionalIssues — output shape', () => {
  it('returns at most 5 issues', async () => {
    mockGetRangeWithMissingDays.mockResolvedValue([
      reflectionPoint('2026-04-08', 1, 1),
      reflectionPoint('2026-04-09', 1, 1),
      reflectionPoint('2026-04-10', 1, 1),
    ]);
    mockGetSymptomEventsInRange.mockResolvedValue([
      symptomEvent('2026-04-04', 'fall'),
      symptomEvent('2026-04-08', 'fall'),
    ]);
    const result = await extractFunctionalIssues(PATIENT, {
      start: '2026-04-01',
      end: '2026-04-14',
    });
    expect(result.length).toBeLessThanOrEqual(5);
  });

  it('each issue has a category, observation, and severity', async () => {
    mockGetRangeWithMissingDays.mockResolvedValue([
      reflectionPoint('2026-04-08', 2, 2),
      reflectionPoint('2026-04-09', 2, 2),
    ]);
    mockGetSymptomEventsInRange.mockResolvedValue([]);
    const result = await extractFunctionalIssues(PATIENT, {
      start: '2026-04-01',
      end: '2026-04-14',
    });
    for (const issue of result) {
      expect(issue.category).toBeDefined();
      expect(typeof issue.observation).toBe('string');
      expect(['watch', 'concerning', 'urgent']).toContain(issue.severity);
    }
  });
});
