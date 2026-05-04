// ============================================================================
// Phase 5.8.a — Canonical handoff builder.
//
// Rewrites utils/handoffReportBuilder.ts in place to produce the reference
// output. Six conditional sections (TONE, NOTES TODAY, DONE TODAY, STILL
// TO DO, WORTH KNOWING, COMING UP) gated by data presence; header line
// pins patient name + date + time; footer is fixed.
//
// The builder fetches its own data from the existing repos:
//   • patient name → getPatientRegistry()
//   • tone         → getHandoffTone(date)
//   • notes        → getReflection(date)
//   • events       → getEventsByDate(date, patientId) (value-rich; metadata
//                    carries med name, vitals values, meal quality, etc.)
//   • pending +    → buildTodaySummary() (overdue/flagged/nextAppointment)
//   • flagged +
//   • appointment
//
// Tests below cover both an all-sections-populated reference day and the
// per-section omission contract (empty TONE → no TONE block, etc.).
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
jest.mock('../../storage/eventRepo', () => ({
  getEventsByDate: jest.fn(),
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
const { getEventsByDate } = require('../../storage/eventRepo');
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
  getEventsByDate.mockResolvedValue([
    {
      id: 'e1', patientId: 'p1', type: 'vitals_recorded',
      timestamp: new Date(2026, 4, 3, 9, 14).toISOString(),
      metadata: { systolic: 138, diastolic: 85, heartRate: 72, type: 'bp' },
      createdAt: '',
    },
    {
      id: 'e2', patientId: 'p1', type: 'meal_logged',
      timestamp: new Date(2026, 4, 3, 12, 30).toISOString(),
      metadata: { mealType: 'lunch', quality: 'most' },
      createdAt: '',
    },
    {
      id: 'e3', patientId: 'p1', type: 'medication_taken',
      timestamp: new Date(2026, 4, 3, 19, 45).toISOString(),
      metadata: { medicationName: 'Acetaminophen', dosage: '325mg' },
      createdAt: '',
    },
  ]);
  buildTodaySummary.mockResolvedValue({
    medsAdherence: { taken: 1, total: 2 },
    moodArc: null, orientation: null, painLevel: null, alertness: null,
    appetite: null, bowelMovement: null, bathingStatus: null,
    mobilityStatus: null, vitalsReading: null, mealsStatus: null,
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

describe('Phase 5.8.a — canonical handoff: reference output (all sections populated)', () => {
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

  it('TONE section appears with the user-written one-liner', async () => {
    const out = await build();
    expect(out).toMatch(/\nTONE\nSlow start, calmer evening\n/);
  });

  it('NOTES TODAY section appears with the full reflection text', async () => {
    const out = await build();
    expect(out).toMatch(
      /\nNOTES TODAY\nMom seemed restless after lunch\. Settled with music\.\n/,
    );
  });

  it('DONE TODAY contains time-anchored event lines with values', async () => {
    const out = await build();
    expect(out).toContain('9:14 AM — BP 138/85, HR 72');
    expect(out).toContain('12:30 PM — Lunch, ate most');
    expect(out).toContain('7:45 PM — Acetaminophen 325mg');
    // Section header present.
    expect(out).toMatch(/\nDONE TODAY\n/);
  });

  it('STILL TO DO lists pending items in scheduled order', async () => {
    const out = await build();
    expect(out).toMatch(/\nSTILL TO DO\nAmlodipine 2\.5mg/);
    expect(out).toContain('Dinner');
    expect(out).toContain('Evening wellness check');
  });

  it('WORTH KNOWING renders flagged items as plain sentences', async () => {
    const out = await build();
    expect(out).toMatch(
      /\nWORTH KNOWING\nBP slightly above her usual range — second high reading this week\.\n/,
    );
  });

  it('COMING UP renders the next appointment in plain language', async () => {
    const out = await build();
    expect(out).toMatch(
      /\nCOMING UP\nCardiology with Dr\. Chen — Thu, May 7\n/,
    );
  });

  it('footer line is the canonical privacy line', async () => {
    const out = await build();
    expect(out).toMatch(
      /\nFrom EmberMate · stays on this device unless you share\.\n*$/,
    );
  });

  it('section order matches the reference spec', async () => {
    const out = await build();
    const idxTone = out.indexOf('\nTONE\n');
    const idxNotes = out.indexOf('\nNOTES TODAY\n');
    const idxDone = out.indexOf('\nDONE TODAY\n');
    const idxStill = out.indexOf('\nSTILL TO DO\n');
    const idxWorth = out.indexOf('\nWORTH KNOWING\n');
    const idxComing = out.indexOf('\nCOMING UP\n');
    expect(idxTone).toBeGreaterThan(0);
    expect(idxNotes).toBeGreaterThan(idxTone);
    expect(idxDone).toBeGreaterThan(idxNotes);
    expect(idxStill).toBeGreaterThan(idxDone);
    expect(idxWorth).toBeGreaterThan(idxStill);
    expect(idxComing).toBeGreaterThan(idxWorth);
  });
});

describe('Phase 5.8.a — section gating (omit when data absent)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    richFixture();
  });

  it('empty TONE → no TONE section block', async () => {
    getHandoffTone.mockResolvedValue(null);
    const out = await buildHandoffReport({ now: REFERENCE_DATE });
    expect(out).not.toMatch(/\nTONE\n/);
  });

  it('whitespace-only TONE → still treated as empty', async () => {
    getHandoffTone.mockResolvedValue('   ');
    const out = await buildHandoffReport({ now: REFERENCE_DATE });
    expect(out).not.toMatch(/\nTONE\n/);
  });

  it('empty NOTES → no NOTES TODAY section', async () => {
    getReflection.mockResolvedValue(null);
    const out = await buildHandoffReport({ now: REFERENCE_DATE });
    expect(out).not.toMatch(/\nNOTES TODAY\n/);
  });

  it('no flagged items → no WORTH KNOWING section', async () => {
    buildTodaySummary.mockResolvedValue({
      medsAdherence: { taken: 0, total: 0 },
      moodArc: null, orientation: null, painLevel: null, alertness: null,
      appetite: null, bowelMovement: null, bathingStatus: null,
      mobilityStatus: null, vitalsReading: null, mealsStatus: null,
      overdueItems: [], flaggedItems: [], nextAppointment: null,
    });
    const out = await buildHandoffReport({ now: REFERENCE_DATE });
    expect(out).not.toMatch(/\nWORTH KNOWING\n/);
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

  it('no logged events → DONE TODAY section omitted (not rendered as empty)', async () => {
    getEventsByDate.mockResolvedValue([]);
    const out = await buildHandoffReport({ now: REFERENCE_DATE });
    expect(out).not.toMatch(/\nDONE TODAY\n/);
  });

  it('no pending items → STILL TO DO section omitted', async () => {
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
});

describe('Phase 5.8.a — patient name resolution', () => {
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

describe('Phase 5.8.a — event-line value formatting (Option A: read metadata directly)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    richFixture();
  });

  it('vitals_recorded → "<time> — BP <sys>/<dia>, HR <hr>"', async () => {
    getEventsByDate.mockResolvedValue([
      {
        id: 'e1', patientId: 'p1', type: 'vitals_recorded',
        timestamp: new Date(2026, 4, 3, 9, 14).toISOString(),
        metadata: { systolic: 138, diastolic: 85, heartRate: 72, type: 'bp' },
        createdAt: '',
      },
    ]);
    const out = await buildHandoffReport({ now: REFERENCE_DATE });
    expect(out).toContain('9:14 AM — BP 138/85, HR 72');
  });

  it('medication_taken → "<time> — <medName> <dosage>"', async () => {
    getEventsByDate.mockResolvedValue([
      {
        id: 'e1', patientId: 'p1', type: 'medication_taken',
        timestamp: new Date(2026, 4, 3, 19, 45).toISOString(),
        metadata: { medicationName: 'Acetaminophen', dosage: '325mg' },
        createdAt: '',
      },
    ]);
    const out = await buildHandoffReport({ now: REFERENCE_DATE });
    expect(out).toContain('7:45 PM — Acetaminophen 325mg');
  });

  it('meal_logged → "<time> — <Meal>, ate <quality>"', async () => {
    getEventsByDate.mockResolvedValue([
      {
        id: 'e1', patientId: 'p1', type: 'meal_logged',
        timestamp: new Date(2026, 4, 3, 12, 30).toISOString(),
        metadata: { mealType: 'lunch', quality: 'most' },
        createdAt: '',
      },
    ]);
    const out = await buildHandoffReport({ now: REFERENCE_DATE });
    expect(out).toContain('12:30 PM — Lunch, ate most');
  });

  it('events sort chronologically regardless of repo return order', async () => {
    getEventsByDate.mockResolvedValue([
      {
        id: 'e3', patientId: 'p1', type: 'medication_taken',
        timestamp: new Date(2026, 4, 3, 19, 45).toISOString(),
        metadata: { medicationName: 'Acetaminophen', dosage: '325mg' },
        createdAt: '',
      },
      {
        id: 'e1', patientId: 'p1', type: 'vitals_recorded',
        timestamp: new Date(2026, 4, 3, 9, 14).toISOString(),
        metadata: { systolic: 138, diastolic: 85, heartRate: 72, type: 'bp' },
        createdAt: '',
      },
      {
        id: 'e2', patientId: 'p1', type: 'meal_logged',
        timestamp: new Date(2026, 4, 3, 12, 30).toISOString(),
        metadata: { mealType: 'lunch', quality: 'most' },
        createdAt: '',
      },
    ]);
    const out = await buildHandoffReport({ now: REFERENCE_DATE });
    const idxBp = out.indexOf('9:14 AM');
    const idxLunch = out.indexOf('12:30 PM');
    const idxAceta = out.indexOf('7:45 PM');
    expect(idxBp).toBeGreaterThan(0);
    expect(idxLunch).toBeGreaterThan(idxBp);
    expect(idxAceta).toBeGreaterThan(idxLunch);
  });
});
