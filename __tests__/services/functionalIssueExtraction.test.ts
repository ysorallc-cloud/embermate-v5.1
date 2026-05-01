// ============================================================================
// functionalIssueExtraction — pulls 3-5 functional issues (mood, energy,
// appetite, mobility) from the daily reflection store + event log over the
// Visit Prep period.
// ============================================================================

const mockGetRangeWithMissingDays = jest.fn();
const mockGetEventsByDateRange = jest.fn();

jest.mock('../../storage/dailyReflectionRepo', () => ({
  getRangeWithMissingDays: (...args: any[]) => mockGetRangeWithMissingDays(...args),
}));

jest.mock('../../storage/eventRepo', () => ({
  getEventsByDateRange: (...args: any[]) => mockGetEventsByDateRange(...args),
}));

jest.mock('../../utils/devLog', () => ({ logError: jest.fn() }));

import { extractFunctionalIssues } from '../../services/functionalIssueExtraction';

const PATIENT = 'mom';

const reflectionPoint = (date: string, mood?: number, energy?: number) => ({
  date,
  reflection: { date, mood, energyLevel: energy } as any,
});

const event = (date: string, type: string, metadata: any = {}) => ({
  id: `evt-${date}-${type}`,
  type,
  timestamp: `${date}T10:00:00`,
  patientId: PATIENT,
  metadata,
  source: 'quick_log',
  createdAt: `${date}T10:00:00`,
});

beforeEach(() => {
  mockGetRangeWithMissingDays.mockReset();
  mockGetEventsByDateRange.mockReset();
});

describe('extractFunctionalIssues — empty data', () => {
  it('returns an empty list when there is no reflection or event data', async () => {
    mockGetRangeWithMissingDays.mockResolvedValue([]);
    mockGetEventsByDateRange.mockResolvedValue([]);
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
    mockGetEventsByDateRange.mockResolvedValue([]);
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
    mockGetEventsByDateRange.mockResolvedValue([]);
    const result = await extractFunctionalIssues(PATIENT, {
      start: '2026-04-01',
      end: '2026-04-14',
    });
    const energyIssue = result.find((i) => i.category === 'energy');
    expect(energyIssue).toBeDefined();
    expect(energyIssue!.observation.toLowerCase()).toContain('energy');
  });
});

describe('extractFunctionalIssues — appetite issue', () => {
  it('flags poor / refused appetite from meal events', async () => {
    mockGetRangeWithMissingDays.mockResolvedValue([]);
    mockGetEventsByDateRange.mockResolvedValue([
      event('2026-04-08', 'meal_logged', { appetite: 'poor' }),
      event('2026-04-09', 'meal_logged', { appetite: 'refused' }),
      event('2026-04-10', 'meal_logged', { appetite: 'poor' }),
      event('2026-04-11', 'meal_logged', { appetite: 'good' }),
    ]);
    const result = await extractFunctionalIssues(PATIENT, {
      start: '2026-04-01',
      end: '2026-04-14',
    });
    const appetiteIssue = result.find((i) => i.category === 'appetite');
    expect(appetiteIssue).toBeDefined();
    expect(appetiteIssue!.observation.toLowerCase()).toContain('appetite');
  });
});

describe('extractFunctionalIssues — mobility issue', () => {
  it('flags repeated mobility-related events (falls, transfer issues)', async () => {
    mockGetRangeWithMissingDays.mockResolvedValue([]);
    mockGetEventsByDateRange.mockResolvedValue([
      event('2026-04-04', 'symptom_reported', { symptomName: 'fall' }),
      event('2026-04-08', 'symptom_reported', { symptomName: 'fall' }),
      event('2026-04-12', 'symptom_reported', { symptomName: 'unsteady gait' }),
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
    mockGetEventsByDateRange.mockResolvedValue([
      event('2026-04-08', 'meal_logged', { appetite: 'refused' }),
      event('2026-04-09', 'meal_logged', { appetite: 'refused' }),
      event('2026-04-04', 'symptom_reported', { symptomName: 'fall' }),
      event('2026-04-08', 'symptom_reported', { symptomName: 'fall' }),
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
    mockGetEventsByDateRange.mockResolvedValue([]);
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
