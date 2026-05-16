// ============================================================================
// Phase 27.6 F2 — Caregiver-private wellness content MUST NOT appear in the
// handoff report (privacy boundary).
//
// The handoff report (utils/handoffReportBuilder) produces a sibling /
// next-caregiver-facing summary that includes a NOTES section. It reads
// patient-facing notes via storage/reflectionStorage.getReflection
// (handoffReportBuilder.ts:200). It MUST NOT read from
// services/reflectionRepo — caregiver-private mood + text reflections are
// not appropriate to surface to the next shift.
//
// This test plants a distinctive canary in services/reflectionRepo (via
// mock) and verifies buildHandoffReport's output string does NOT contain
// it. If a future refactor wires the caregiver-private repo into the
// handoff pipeline, the canary leaks into the report and this test fails.
//
// Companion F1 / F3 pins cover Visit Prep and the narrative-summary builder.
// ============================================================================

const LEAK_CANARY = 'CAREGIVER_WELLNESS_LEAK_CANARY_27_6';

// Patient-facing notes store — returns null so the report has no NOTES
// section content of its own.
jest.mock('../../storage/reflectionStorage', () => ({
  getReflection: jest.fn().mockResolvedValue(null),
  saveReflection: jest.fn(),
}));

// Caregiver-private repo — planted with the canary. Any code path that
// reads this surfaces the canary into the report string.
jest.mock('../../services/reflectionRepo', () => ({
  getReflection: jest.fn().mockResolvedValue({
    date: '2026-05-03',
    mood: 'rough',
    text: LEAK_CANARY,
    savedAt: '2026-05-03T10:00:00Z',
  }),
  getReflections: jest.fn().mockResolvedValue([]),
  saveReflection: jest.fn(),
}));

// Standard handoff-builder mocks copied from
// __tests__/utils/canonicalHandoffBuilder.test.ts so the builder runs to
// completion with neutral fixtures.
jest.mock('../../storage/handoffToneRepo', () => ({
  getHandoffTone: jest.fn().mockResolvedValue(null),
  saveHandoffTone: jest.fn(),
}));
jest.mock('../../storage/patientRegistry', () => ({
  getPatientRegistry: jest.fn().mockResolvedValue({
    patients: [
      {
        id: 'p1',
        name: 'Mom',
        relationship: 'parent',
        isDefault: true,
        createdAt: '',
        updatedAt: '',
      },
    ],
    activePatientId: 'p1',
    version: 1,
  }),
  getActivePatientId: jest.fn().mockResolvedValue('p1'),
  DEFAULT_PATIENT_ID: 'default',
}));
jest.mock('../../utils/careSummaryBuilder', () => ({
  buildTodaySummary: jest.fn().mockResolvedValue({
    medsAdherence: { taken: 0, total: 0 },
    moodArc: null,
    orientation: null,
    painLevel: null,
    alertness: null,
    appetite: null,
    bowelMovement: null,
    bathingStatus: null,
    mobilityStatus: null,
    vitalsReading: null,
    mealsStatus: { logged: 0, total: 0, overdueNames: [] },
    overdueItems: [],
    flaggedItems: [],
    nextAppointment: null,
  }),
}));
jest.mock('../../services/carePlanGenerator', () => ({
  getTodayDateString: jest.fn(() => '2026-05-03'),
}));

import { readFileSync } from 'fs';
import { join } from 'path';
import { buildHandoffReport } from '../../utils/handoffReportBuilder';

describe('Phase 27.6 F2 — caregiver-private wellness MUST NOT leak into handoff report', () => {
  it('behavioral pin: planted caregiver-private marker does NOT appear in handoff report output', async () => {
    const report = await buildHandoffReport({
      now: new Date(2026, 4, 3, 23, 52),
    });
    expect(report).not.toContain(LEAK_CANARY);
  });

  it('source pin: utils/handoffReportBuilder.ts does NOT import from services/reflectionRepo', () => {
    const src = readFileSync(
      join(__dirname, '../..', 'utils/handoffReportBuilder.ts'),
      'utf8',
    );
    expect(src).not.toMatch(
      /from\s*['"][^'"]*services\/reflectionRepo['"]/,
    );
  });
});
