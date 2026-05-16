// ============================================================================
// Phase 27.6 F3 — Caregiver-private wellness content MUST NOT appear in
// the per-day narrative summary (privacy boundary).
//
// utils/narrativeSummaryBuilder.buildDayNarrative produces a prose recap
// for a past day. Its `notes` field is filled from storage/reflectionStorage
// (narrativeSummaryBuilder.ts:178), the patient-facing notes store. It MUST
// NOT read from services/reflectionRepo — caregiver-private mood + text
// reflections are not part of the per-day patient record.
//
// This test plants a distinctive canary in services/reflectionRepo (via
// mock) and verifies buildDayNarrative's output does NOT contain it. If a
// future refactor wires the caregiver-private repo into the narrative
// pipeline, the canary leaks into either the notes field or the prose
// summary and this test fails.
//
// Companion F1 / F2 pins cover Visit Prep and the handoff report.
// ============================================================================

const LEAK_CANARY = 'CAREGIVER_WELLNESS_LEAK_CANARY_27_6';

// Patient-facing notes store — returns null so the narrative has no notes
// content of its own.
jest.mock('../../storage/reflectionStorage', () => ({
  getReflection: jest.fn().mockResolvedValue(null),
  saveReflection: jest.fn(),
}));

// Caregiver-private repo — planted with the canary. Any code path that
// reads this surfaces the canary into the narrative output.
jest.mock('../../services/reflectionRepo', () => ({
  getReflection: jest.fn().mockResolvedValue({
    date: '2026-05-06',
    mood: 'rough',
    text: LEAK_CANARY,
    savedAt: '2026-05-06T10:00:00Z',
  }),
  getReflections: jest.fn().mockResolvedValue([]),
  saveReflection: jest.fn(),
}));

// Standard narrative-builder mocks. Empty event + instance fixtures so the
// builder has nothing to interpret; the only string that could carry the
// canary into the output is the (mocked) caregiver-private repo.
jest.mock('../../storage/eventRepo', () => ({
  getEventsByDateRange: jest.fn().mockResolvedValue([]),
}));
jest.mock('../../storage/patientRegistry', () => ({
  getActivePatientId: jest.fn().mockResolvedValue('p1'),
  DEFAULT_PATIENT_ID: 'default',
}));
jest.mock('../../storage/carePlanRepo', () => ({
  listDailyInstances: jest.fn().mockResolvedValue([]),
  DEFAULT_PATIENT_ID: 'default',
}));

import { readFileSync } from 'fs';
import { join } from 'path';
import { buildDayNarrative } from '../../utils/narrativeSummaryBuilder';

describe('Phase 27.6 F3 — caregiver-private wellness MUST NOT leak into narrative summary', () => {
  it('behavioral pin: planted caregiver-private marker does NOT appear anywhere in DayNarrative output', async () => {
    const narrative = await buildDayNarrative('2026-05-06');
    // Stringify the whole output — summary, summaryPills, notableMoments,
    // notes. Any field carrying the canary fails the test.
    const serialized = JSON.stringify(narrative);
    expect(serialized).not.toContain(LEAK_CANARY);
  });

  it('source pin: utils/narrativeSummaryBuilder.ts does NOT import from services/reflectionRepo', () => {
    const src = readFileSync(
      join(__dirname, '../..', 'utils/narrativeSummaryBuilder.ts'),
      'utf8',
    );
    expect(src).not.toMatch(
      /from\s*['"][^'"]*services\/reflectionRepo['"]/,
    );
  });
});
