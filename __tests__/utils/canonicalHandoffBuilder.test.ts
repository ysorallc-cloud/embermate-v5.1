// ============================================================================
// Canonical handoff builder — UX restructure (Commit 3 of UX bundle).
//
// The builder produces a structured caregiver-facing handoff:
//
//   Header line
//   TONE        — bare line, no label, when the user wrote one
//   STILL TO DO — pending items
//   HEADS UP    — flagged items
//   COMING UP   — appointment within 7 days (caregiver lookahead)
//   NOTES       — gated by includeNotes
//   DONE        — one-line count summary
//   Footer
//
// The per-event chronological timeline (DONE TODAY → 8:15 AM — Lisinopril 20mg)
// retired from this builder; that detail belongs in visit prep.
// ============================================================================

import { buildHandoffReport } from '../../utils/handoffReportBuilder';

// ── Storage / data mocks ──────────────────────────────────────────────────
jest.mock('../../storage/handoffToneRepo', () => ({
  getHandoffTone: jest.fn(),
  saveHandoffTone: jest.fn(),
}));
jest.mock('../../storage/reflectionStorage', () => ({
  getReflection: jest.fn(),
  saveReflection: jest.fn(),
}));
jest.mock('../../storage/patientRegistry', () => ({
  getPatientRegistry: jest.fn(),
  getActivePatientId: jest.fn().mockResolvedValue('p1'),
  DEFAULT_PATIENT_ID: 'default',
}));
jest.mock('../../utils/careSummaryBuilder', () => ({
  buildTodaySummary: jest.fn(),
}));
jest.mock('../../services/carePlanGenerator', () => ({
  getTodayDateString: jest.fn(() => '2026-05-03'),
}));

const { getHandoffTone } = require('../../storage/handoffToneRepo');
const { getReflection } = require('../../storage/reflectionStorage');
const { getPatientRegistry } = require('../../storage/patientRegistry');
const { buildTodaySummary } = require('../../utils/careSummaryBuilder');

// ── Fixture: realistic Sunday May 3, 2026 11:52 PM ────────────────────────
const REFERENCE_DATE = new Date(2026, 4, 3, 23, 52); // May = 4 (0-indexed)

function richFixture() {
  getPatientRegistry.mockResolvedValue({
    patients: [
      { id: 'p1', name: 'Mom', relationship: 'parent', isDefault: true,
        createdAt: '', updatedAt: '' },
    ],
    activePatientId: 'p1',
    version: 1,
  });
  getHandoffTone.mockResolvedValue('Slow start, calmer evening');
  getReflection.mockResolvedValue({
    date: '2026-05-03',
    text: 'Mom seemed restless after lunch. Settled with music.',
    prompt: '',
    savedAt: REFERENCE_DATE.toISOString(),
  });
  buildTodaySummary.mockResolvedValue({
    medsAdherence: { taken: 3, total: 5 },
    moodArc: null,
    orientation: 'alert-oriented',
    painLevel: null,
    alertness: null,
    appetite: null,
    bowelMovement: null,
    bathingStatus: null,
    mobilityStatus: null,
    vitalsReading: 'BP 138/85, HR 72',
    mealsStatus: { logged: 2, total: 3, overdueNames: ['Dinner'] },
    overdueItems: [
      'Amlodipine 2.5mg (8:00 PM)',
      'Dinner',
      'Evening wellness check',
    ],
    flaggedItems: ['BP slightly above her usual range — second high reading this week.'],
    nextAppointment: {
      provider: 'Dr. Chen',
      specialty: 'Cardiology',
      date: '2026-05-07',
    },
  });
}

// ──────────────────────────────────────────────────────────────────────────

describe('Structured handoff — reference output (all sections populated)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    richFixture();
  });

  async function build(): Promise<string> {
    return buildHandoffReport({ now: REFERENCE_DATE });
  }

  it('header line: "<patient> · <weekday>, <month> <day> · <h:mm pm>"', async () => {
    const out = await build();
    const firstLine = out.split('\n')[0];
    expect(firstLine).toBe('Mom · Sunday, May 3 · 11:52 PM');
  });

  it('TONE renders as a bare line with no label', async () => {
    const out = await build();
    // The tone text appears below the header without a "TONE" eyebrow.
    expect(out).toContain('Slow start, calmer evening');
    expect(out).not.toMatch(/\nTONE\n/);
  });

  it('STILL TO DO lists pending items in scheduled order', async () => {
    const out = await build();
    expect(out).toMatch(/\nSTILL TO DO\nAmlodipine 2\.5mg/);
    expect(out).toContain('Dinner');
    expect(out).toContain('Evening wellness check');
  });

  it('HEADS UP renders flagged items as plain sentences', async () => {
    const out = await build();
    expect(out).toMatch(
      /\nHEADS UP\nBP slightly above her usual range — second high reading this week\.\n/,
    );
  });

  it('COMING UP renders the next appointment in plain language', async () => {
    const out = await build();
    expect(out).toMatch(
      /\nCOMING UP\nCardiology with Dr\. Chen — Thu, May 7\n/,
    );
  });

  it('NOTES section appears with the full reflection text', async () => {
    const out = await build();
    expect(out).toMatch(
      /\nNOTES\nMom seemed restless after lunch\. Settled with music\.\n/,
    );
  });

  it('DONE renders a one-line count summary, not per-event lines', async () => {
    const out = await build();
    // medsAdherence 3 of 5 + vitals + 2 meals + wellness signal (orientation).
    expect(out).toMatch(/\nDONE\n3 of 5 meds[^\n]*vitals check[^\n]*2 meals/);
    // The DONE section is exactly one body line — no per-event timestamps.
    const doneMatch = out.match(/\nDONE\n([^\n]+)(?:\n([^\n]+))?/);
    expect(doneMatch).toBeTruthy();
    const doneFirstLine = doneMatch![1];
    expect(doneFirstLine).not.toMatch(/\d:\d{2}\s*(AM|PM)/);
    // The line after DONE's content should be blank (footer separator)
    // or the footer itself — never another timeline-style line.
    const doneSecondLine = doneMatch![2] ?? '';
    expect(doneSecondLine).toMatch(/^(From EmberMate|)/);
  });

  it('footer line is the canonical privacy line', async () => {
    const out = await build();
    expect(out).toMatch(
      /\nFrom EmberMate · stays on this device unless you share\.\n*$/,
    );
  });

  it('section order matches the structured spec', async () => {
    const out = await build();
    const idxStill = out.indexOf('\nSTILL TO DO\n');
    const idxHeads = out.indexOf('\nHEADS UP\n');
    const idxComing = out.indexOf('\nCOMING UP\n');
    const idxNotes = out.indexOf('\nNOTES\n');
    const idxDone = out.indexOf('\nDONE\n');
    expect(idxStill).toBeGreaterThan(0);
    expect(idxHeads).toBeGreaterThan(idxStill);
    expect(idxComing).toBeGreaterThan(idxHeads);
    expect(idxNotes).toBeGreaterThan(idxComing);
    expect(idxDone).toBeGreaterThan(idxNotes);
  });
});

describe('Structured handoff — section gating (omit when data absent)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    richFixture();
  });

  it('empty TONE → tone line is absent', async () => {
    getHandoffTone.mockResolvedValue(null);
    const out = await buildHandoffReport({ now: REFERENCE_DATE });
    expect(out).not.toContain('Slow start');
  });

  it('whitespace-only TONE → still treated as empty', async () => {
    getHandoffTone.mockResolvedValue('   ');
    const out = await buildHandoffReport({ now: REFERENCE_DATE });
    expect(out).not.toContain('Slow start');
  });

  it('empty NOTES → no NOTES section', async () => {
    getReflection.mockResolvedValue(null);
    const out = await buildHandoffReport({ now: REFERENCE_DATE });
    expect(out).not.toMatch(/\nNOTES\n/);
  });

  it('no flagged items → no HEADS UP section', async () => {
    buildTodaySummary.mockResolvedValue({
      medsAdherence: { taken: 0, total: 0 },
      moodArc: null, orientation: null, painLevel: null, alertness: null,
      appetite: null, bowelMovement: null, bathingStatus: null,
      mobilityStatus: null, vitalsReading: null, mealsStatus: null,
      overdueItems: [], flaggedItems: [], nextAppointment: null,
    });
    const out = await buildHandoffReport({ now: REFERENCE_DATE });
    expect(out).not.toMatch(/\nHEADS UP\n/);
  });

  it('no upcoming appointment → no COMING UP section', async () => {
    buildTodaySummary.mockResolvedValue({
      medsAdherence: { taken: 0, total: 0 },
      moodArc: null, orientation: null, painLevel: null, alertness: null,
      appetite: null, bowelMovement: null, bathingStatus: null,
      mobilityStatus: null, vitalsReading: null, mealsStatus: null,
      overdueItems: [], flaggedItems: [], nextAppointment: null,
    });
    const out = await buildHandoffReport({ now: REFERENCE_DATE });
    expect(out).not.toMatch(/\nCOMING UP\n/);
  });

  it('appointment >7 days away → no COMING UP (caregiver lookahead is 7)', async () => {
    buildTodaySummary.mockResolvedValue({
      medsAdherence: { taken: 0, total: 0 },
      moodArc: null, orientation: null, painLevel: null, alertness: null,
      appetite: null, bowelMovement: null, bathingStatus: null,
      mobilityStatus: null, vitalsReading: null, mealsStatus: null,
      overdueItems: [], flaggedItems: [],
      nextAppointment: {
        provider: 'Dr. Chen', specialty: 'Cardiology',
        date: '2026-05-13',  // 10 days out
      },
    });
    const out = await buildHandoffReport({ now: REFERENCE_DATE });
    expect(out).not.toMatch(/\nCOMING UP\n/);
  });

  it('no pending items → no STILL TO DO section', async () => {
    buildTodaySummary.mockResolvedValue({
      medsAdherence: { taken: 0, total: 0 },
      moodArc: null, orientation: null, painLevel: null, alertness: null,
      appetite: null, bowelMovement: null, bathingStatus: null,
      mobilityStatus: null, vitalsReading: null, mealsStatus: null,
      overdueItems: [], flaggedItems: [], nextAppointment: null,
    });
    const out = await buildHandoffReport({ now: REFERENCE_DATE });
    expect(out).not.toMatch(/\nSTILL TO DO\n/);
  });

  it('quiet day with no logged items → DONE renders the no-items sentinel', async () => {
    buildTodaySummary.mockResolvedValue({
      medsAdherence: { taken: 0, total: 0 },
      moodArc: null, orientation: null, painLevel: null, alertness: null,
      appetite: null, bowelMovement: null, bathingStatus: null,
      mobilityStatus: null, vitalsReading: null, mealsStatus: null,
      overdueItems: [], flaggedItems: [], nextAppointment: null,
    });
    const out = await buildHandoffReport({ now: REFERENCE_DATE });
    expect(out).toMatch(/\nDONE\nNo items logged today\./);
  });
});

describe('Structured handoff — patient name resolution', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    richFixture();
  });

  it('returns sentinel ProfileMissing when patient name is the default placeholder', async () => {
    getPatientRegistry.mockResolvedValue({
      patients: [
        { id: 'p1', name: 'Patient', relationship: 'self', isDefault: true,
          createdAt: '', updatedAt: '' },
      ],
      activePatientId: 'p1',
      version: 1,
    });
    await expect(buildHandoffReport({ now: REFERENCE_DATE })).rejects.toThrow(
      /profile|patient/i,
    );
  });

  it('returns sentinel ProfileMissing when patient name is empty', async () => {
    getPatientRegistry.mockResolvedValue({
      patients: [
        { id: 'p1', name: '   ', relationship: 'self', isDefault: true,
          createdAt: '', updatedAt: '' },
      ],
      activePatientId: 'p1',
      version: 1,
    });
    await expect(buildHandoffReport({ now: REFERENCE_DATE })).rejects.toThrow(
      /profile|patient/i,
    );
  });
});
