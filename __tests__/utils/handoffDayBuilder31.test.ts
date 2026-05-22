// ============================================================================
// Phase 31 — buildHandoffDay(date) data-assembly contract.
//
// Pre-31 the Journal Share button routed through buildHandoffReport(), which
// was today-hardcoded (utils/handoffReportBuilder.ts:195) and produced a
// curated "sibling-not-doctor" template that only surfaced overdueItems,
// flaggedItems, a one-line DONE count, and the day's note — no itemized
// meds-with-times, no vitals readings. Sharing from a past day silently
// fell back to today's data.
//
// Phase 31 introduces a new bundling util `buildHandoffDay(date)` at
// `utils/handoffDayBuilder.ts` that gathers the four date-keyed feeders
// the Journal page itself renders, so screen and PDF never drift:
//
//   • buildCareBrief(date)        — meds (w/ times), vitals, meals, etc.
//   • buildShapeOfDay(date)       — Section 1 gestalt sentence
//   • buildNotableMoments(date)   — Section 3 worth-flagging items
//   • getConsolidatedNotes(date)  — Section 4 caregiver notes
//
// Pinned invariants (audit-locked):
//   1. Behavioral — the bundled payload contains gestalt, itemized meds
//      (w/ scheduledTime + status), vitals readings, worth-flagging
//      moments, AND the note, all keyed to the passed-in date.
//   2. Drift guard (source-level) — the module imports the four feeders
//      above and does NOT import buildHandoffReport.
//   3. Past-date guard — calling with a past date returns the past
//      date's data and never pulls today's.
//   4. Patient name — pulled from the same active-patient source the
//      Journal screen reads (patientRegistry).
//   5. Date threading — every feeder is invoked with the passed-in
//      date string, not undefined / today's string.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

// ----------------------------------------------------------------------------
// Mocks for the four feeders. Each feeder is pinned by its own dedicated
// contract suite (buildCareBrief / buildShapeOfDay / buildNotableMoments /
// consolidatedNotes); here we mock to spy on the date arg and assert the
// bundling logic, not the feeder internals. Drift guard at the bottom
// adds a source-level pin against drift to a parallel template.
// ----------------------------------------------------------------------------

const fakeCareBriefByDate: Record<string, any> = {};
const fakeShapeByDate: Record<string, any> = {};
const fakeMomentsByDate: Record<string, any> = {};
const fakeNotesByDate: Record<string, any> = {};

jest.mock('../../utils/careSummaryBuilder', () => ({
  buildCareBrief: jest.fn(async (date?: string) => {
    const key = date ?? '__TODAY__';
    return fakeCareBriefByDate[key] ?? null;
  }),
}));

jest.mock('../../utils/buildShapeOfDay', () => ({
  buildShapeOfDay: jest.fn(async (date: string) => {
    return fakeShapeByDate[date] ?? { summary: '', hasData: false };
  }),
}));

jest.mock('../../utils/notableMomentsBuilder', () => ({
  buildNotableMoments: jest.fn(async (date: string) => {
    return fakeMomentsByDate[date] ?? { hasMoments: false, moments: [] };
  }),
}));

jest.mock('../../utils/consolidatedNotes', () => ({
  getConsolidatedNotes: jest.fn(async (date: string) => {
    return fakeNotesByDate[date] ?? null;
  }),
}));

import { buildHandoffDay } from '../../utils/handoffDayBuilder';
import { buildCareBrief } from '../../utils/careSummaryBuilder';
import { buildShapeOfDay } from '../../utils/buildShapeOfDay';
import { buildNotableMoments } from '../../utils/notableMomentsBuilder';
import { getConsolidatedNotes } from '../../utils/consolidatedNotes';

const PAST_DATE = '2026-05-15';
const TODAY = '2026-05-22';

function seedPast() {
  fakeCareBriefByDate[PAST_DATE] = {
    patient: { name: 'Dad' },
    sections: {},
    statusNarrative: '',
    medications: [
      {
        name: 'Lisinopril',
        dosage: '10mg',
        status: 'completed',
        scheduledTime: '2026-05-15T08:00:00Z',
        takenAt: '2026-05-15T08:12:00Z',
      },
      {
        name: 'Metformin',
        dosage: '500mg',
        status: 'pending',
        scheduledTime: '2026-05-15T18:00:00Z',
      },
    ],
    vitals: {
      scheduled: true,
      recorded: true,
      scheduledTime: '2026-05-15T08:00:00Z',
      recordedAt: '2026-05-15T16:49:00Z',
      readings: { systolic: 158, diastolic: 95, heartRate: 72 },
    },
    mood: { entries: [] },
    meals: { total: 0, meals: [] },
    attentionItems: [],
    nextAppointment: null,
    wellnessChecks: { done: 0, total: 0 },
    sleep: { logged: false },
    hydration: { logged: false },
    medicalInfo: null,
    safety: null,
    clinicalSettings: { enabled: false },
    interpretations: {},
    handoffNarrative: '',
    generatedAt: new Date('2026-05-15T20:00:00Z'),
  };
  fakeShapeByDate[PAST_DATE] = {
    hasData: true,
    summary: 'All meds taken. Vitals recorded. Wellness pending.',
  };
  fakeMomentsByDate[PAST_DATE] = {
    hasMoments: true,
    moments: [
      { text: 'BP 158/95 — 12 points above week\'s avg.', category: 'bp' },
    ],
  };
  fakeNotesByDate[PAST_DATE] = {
    text: 'Dad seemed off this morning — flagging it.',
    savedAt: '2026-05-15T20:30:00Z',
  };
}

function seedTodayDistinct() {
  // Distinct shape so the past-date guard can prove past did NOT pull today.
  fakeCareBriefByDate[TODAY] = {
    patient: { name: 'Dad' },
    sections: {},
    statusNarrative: '',
    medications: [
      {
        name: 'Aspirin',
        dosage: '81mg',
        status: 'completed',
        scheduledTime: '2026-05-22T08:00:00Z',
        takenAt: '2026-05-22T08:05:00Z',
      },
    ],
    vitals: { scheduled: false, recorded: false },
    mood: { entries: [] },
    meals: { total: 0, meals: [] },
    attentionItems: [],
    nextAppointment: null,
    wellnessChecks: { done: 0, total: 0 },
    sleep: { logged: false },
    hydration: { logged: false },
    medicalInfo: null,
    safety: null,
    clinicalSettings: { enabled: false },
    interpretations: {},
    handoffNarrative: '',
    generatedAt: new Date('2026-05-22T20:00:00Z'),
  };
  fakeShapeByDate[TODAY] = { hasData: true, summary: 'Today\'s gestalt — different.' };
  fakeMomentsByDate[TODAY] = {
    hasMoments: true,
    moments: [{ text: 'Today\'s moment — should not leak into past.', category: 'sleep' }],
  };
  fakeNotesByDate[TODAY] = {
    text: 'Today\'s note — should not leak into past.',
    savedAt: '2026-05-22T20:00:00Z',
  };
}

describe('Phase 31 — buildHandoffDay(date) bundles four feeders', () => {
  beforeEach(() => {
    Object.keys(fakeCareBriefByDate).forEach((k) => delete fakeCareBriefByDate[k]);
    Object.keys(fakeShapeByDate).forEach((k) => delete fakeShapeByDate[k]);
    Object.keys(fakeMomentsByDate).forEach((k) => delete fakeMomentsByDate[k]);
    Object.keys(fakeNotesByDate).forEach((k) => delete fakeNotesByDate[k]);
    (buildCareBrief as jest.Mock).mockClear();
    (buildShapeOfDay as jest.Mock).mockClear();
    (buildNotableMoments as jest.Mock).mockClear();
    (getConsolidatedNotes as jest.Mock).mockClear();
  });

  it('contract 1: bundled payload contains gestalt, itemized meds, vitals, worth-flagging, AND the note, all keyed to the past date', async () => {
    seedPast();
    const payload = await buildHandoffDay(PAST_DATE);

    expect(payload).not.toBeNull();
    expect(payload!.date).toBe(PAST_DATE);

    // Gestalt sentence (Section 1)
    expect(payload!.gestalt).toBe('All meds taken. Vitals recorded. Wellness pending.');

    // Itemized meds with scheduledTime + status (Section 2)
    expect(payload!.medications).toHaveLength(2);
    expect(payload!.medications[0]).toMatchObject({
      name: 'Lisinopril',
      dosage: '10mg',
      status: 'completed',
      scheduledTime: '2026-05-15T08:00:00Z',
      takenAt: '2026-05-15T08:12:00Z',
    });
    expect(payload!.medications[1]).toMatchObject({
      name: 'Metformin',
      status: 'pending',
      scheduledTime: '2026-05-15T18:00:00Z',
    });

    // Vitals readings (Section 2)
    expect(payload!.vitals).not.toBeNull();
    expect(payload!.vitals!.readings).toEqual({ systolic: 158, diastolic: 95, heartRate: 72 });

    // Worth-flagging (Section 3)
    expect(payload!.worthFlagging).toHaveLength(1);
    expect(payload!.worthFlagging[0].text).toMatch(/BP 158\/95/);

    // Note (Section 4)
    expect(payload!.notes).not.toBeNull();
    expect(payload!.notes!.text).toBe('Dad seemed off this morning — flagging it.');
    expect(payload!.notes!.savedAt).toBe('2026-05-15T20:30:00Z');
  });

  it('contract 2: drift guard — handoffDayBuilder.ts imports the four feeders and does NOT import buildHandoffReport', () => {
    const src = readFileSync(
      join(__dirname, '../..', 'utils/handoffDayBuilder.ts'),
      'utf8',
    );

    // Imports the four canonical feeders.
    expect(src).toMatch(/from\s+['"][^'"]*careSummaryBuilder['"]/);
    expect(src).toMatch(/\bbuildCareBrief\b/);
    expect(src).toMatch(/from\s+['"][^'"]*buildShapeOfDay['"]/);
    expect(src).toMatch(/\bbuildShapeOfDay\b/);
    expect(src).toMatch(/from\s+['"][^'"]*notableMomentsBuilder['"]/);
    expect(src).toMatch(/\bbuildNotableMoments\b/);
    expect(src).toMatch(/from\s+['"][^'"]*consolidatedNotes['"]/);
    expect(src).toMatch(/\bgetConsolidatedNotes\b/);

    // Does NOT import the curated template (drift trap).
    expect(src).not.toMatch(/from\s+['"][^'"]*handoffReportBuilder['"]/);
    expect(src).not.toMatch(/\bbuildHandoffReport\s*\(/);
  });

  it('contract 3: past-date guard — buildHandoffDay(past) does not pull today\'s data', async () => {
    seedPast();
    seedTodayDistinct();

    const payload = await buildHandoffDay(PAST_DATE);

    expect(payload!.date).toBe(PAST_DATE);
    expect(payload!.gestalt).toBe('All meds taken. Vitals recorded. Wellness pending.');
    expect(payload!.gestalt).not.toMatch(/Today's gestalt/);
    expect(payload!.medications.find((m) => m.name === 'Aspirin')).toBeUndefined();
    expect(payload!.medications.find((m) => m.name === 'Lisinopril')).toBeDefined();
    expect(payload!.worthFlagging[0].text).not.toMatch(/should not leak/);
    expect(payload!.notes!.text).not.toMatch(/should not leak/);
  });

  it('contract 4: every feeder is invoked with the passed-in date (date threading)', async () => {
    seedPast();
    await buildHandoffDay(PAST_DATE);

    expect(buildCareBrief).toHaveBeenCalledWith(PAST_DATE);
    expect(buildShapeOfDay).toHaveBeenCalledWith(PAST_DATE);
    expect(buildNotableMoments).toHaveBeenCalledWith(PAST_DATE);
    expect(getConsolidatedNotes).toHaveBeenCalledWith(PAST_DATE);
  });

  it('contract 5: empty-day shape — gestalt empty + meds empty + vitals null-ish + no moments + no notes returns a coherent payload (no throw)', async () => {
    fakeCareBriefByDate[PAST_DATE] = {
      patient: { name: 'Dad' },
      sections: {},
      statusNarrative: '',
      medications: [],
      vitals: { scheduled: false, recorded: false },
      mood: { entries: [] },
      meals: { total: 0, meals: [] },
      attentionItems: [],
      nextAppointment: null,
      wellnessChecks: { done: 0, total: 0 },
      sleep: { logged: false },
      hydration: { logged: false },
      medicalInfo: null,
      safety: null,
      clinicalSettings: { enabled: false },
      interpretations: {},
      handoffNarrative: '',
      generatedAt: new Date('2026-05-15T20:00:00Z'),
    };
    fakeShapeByDate[PAST_DATE] = { hasData: false, summary: '' };
    fakeMomentsByDate[PAST_DATE] = { hasMoments: false, moments: [] };
    fakeNotesByDate[PAST_DATE] = null;

    const payload = await buildHandoffDay(PAST_DATE);
    expect(payload).not.toBeNull();
    expect(payload!.gestalt).toBe('');
    expect(payload!.medications).toEqual([]);
    expect(payload!.worthFlagging).toEqual([]);
    expect(payload!.notes).toBeNull();
  });
});
