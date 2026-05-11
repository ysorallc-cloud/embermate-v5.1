// ============================================================================
// Phase 16.2 — visitPrepCaregiverNotesRepo round-trip contracts.
//
// New appointmentId-keyed repo for the 4 caregiver-fillable Visit
// Prep prompts (3 symptoms / 3 functional / 3 questions / daily
// activities). Routes through safeStorage so the health-sensitive
// key (CLAUDE.md SecureStore policy) is honored.
//
// Storage shape:
//   key   = visit_prep_caregiver_notes_{appointmentId}
//   value = VisitPrepCaregiverNotes JSON object:
//     {
//       symptomsChanged: [string, string, string],
//       functionalChanges: [string, string, string],
//       questionsForProvider: [string, string, string],
//       helpProvidedThisWeek: string,
//     }
//
// Spec rules pinned by these contracts:
//   • Round-trip preserves entry order for the 3-field categories.
//   • Empty strings persist as empty (caregiver may save partial state
//     — empties are only omitted at PDF render time, not at storage).
//   • Two different appointmentIds cannot cross-contaminate.
//   • Get on a never-saved appointmentId returns the empty default
//     (no nulls/undefineds at the boundary; downstream consumers can
//     unconditionally render).
// ============================================================================

// Mock safeStorage so the test runs in-memory without AsyncStorage.
const _store: Record<string, any> = {};
jest.mock('../../utils/safeStorage', () => ({
  safeGetItem: jest.fn(async (key: string, fallback: any) =>
    _store[key] !== undefined ? _store[key] : fallback,
  ),
  safeSetItem: jest.fn(async (key: string, value: any) => {
    _store[key] = value;
  }),
}));

import {
  getCaregiverNotes,
  saveCaregiverNotes,
  EMPTY_CAREGIVER_NOTES,
  type VisitPrepCaregiverNotes,
} from '../visitPrepCaregiverNotesRepo';

beforeEach(() => {
  // Clear in-memory store between tests.
  for (const k of Object.keys(_store)) delete _store[k];
  jest.clearAllMocks();
});

describe('Phase 16.2 — visitPrepCaregiverNotesRepo', () => {
  it('contract 1: get on a never-saved appointmentId returns the empty default', async () => {
    const notes = await getCaregiverNotes('appt-never-saved');
    expect(notes).toEqual(EMPTY_CAREGIVER_NOTES);
    expect(notes.symptomsChanged).toEqual(['', '', '']);
    expect(notes.functionalChanges).toEqual(['', '', '']);
    expect(notes.questionsForProvider).toEqual(['', '', '']);
    expect(notes.helpProvidedThisWeek).toBe('');
  });

  it('contract 2: save + get round-trips all 4 sections in entry order', async () => {
    const input: VisitPrepCaregiverNotes = {
      symptomsChanged: ['Headache more frequent', 'Sleep worse', 'Appetite down'],
      functionalChanges: ['Walking slower', 'Needs help with stairs', ''],
      questionsForProvider: ['Should we adjust BP med?', '', ''],
      helpProvidedThisWeek: 'Drove to two appointments, picked up groceries Tuesday and Friday.',
    };
    await saveCaregiverNotes('appt-42', input);
    const out = await getCaregiverNotes('appt-42');
    expect(out).toEqual(input);
    // Entry order pinned explicitly — index 0 stays index 0.
    expect(out.symptomsChanged[0]).toBe('Headache more frequent');
    expect(out.symptomsChanged[2]).toBe('Appetite down');
    expect(out.functionalChanges[1]).toBe('Needs help with stairs');
  });

  it('contract 3: empty strings persist as empty (partial fills preserved)', async () => {
    // Caregiver fills only the first field then taps away — the
    // empty slots 2/3 must round-trip as empty, not collapse to a
    // shorter array or be dropped.
    const input: VisitPrepCaregiverNotes = {
      symptomsChanged: ['Just one thing', '', ''],
      functionalChanges: ['', '', ''],
      questionsForProvider: ['', '', ''],
      helpProvidedThisWeek: '',
    };
    await saveCaregiverNotes('appt-partial', input);
    const out = await getCaregiverNotes('appt-partial');
    expect(out).toEqual(input);
    expect(out.symptomsChanged.length).toBe(3);
  });

  it('contract 4: two different appointmentIds do not cross-contaminate', async () => {
    await saveCaregiverNotes('appt-A', {
      symptomsChanged: ['A-symptom', '', ''],
      functionalChanges: ['', '', ''],
      questionsForProvider: ['', '', ''],
      helpProvidedThisWeek: 'A-help',
    });
    await saveCaregiverNotes('appt-B', {
      symptomsChanged: ['B-symptom', '', ''],
      functionalChanges: ['', '', ''],
      questionsForProvider: ['', '', ''],
      helpProvidedThisWeek: 'B-help',
    });
    const A = await getCaregiverNotes('appt-A');
    const B = await getCaregiverNotes('appt-B');
    expect(A.symptomsChanged[0]).toBe('A-symptom');
    expect(A.helpProvidedThisWeek).toBe('A-help');
    expect(B.symptomsChanged[0]).toBe('B-symptom');
    expect(B.helpProvidedThisWeek).toBe('B-help');
  });

  it('contract 5: persists via safeStorage (encrypted health-key policy)', async () => {
    // The key prefix `visit_prep_caregiver_notes_` is what safeStorage
    // matches against to route the value to SecureStore on iOS. Pin
    // the prefix shape so a future rename has to come with intent.
    await saveCaregiverNotes('appt-key-test', {
      symptomsChanged: ['x', '', ''],
      functionalChanges: ['', '', ''],
      questionsForProvider: ['', '', ''],
      helpProvidedThisWeek: '',
    });
    const safeStorage = require('../../utils/safeStorage');
    expect(safeStorage.safeSetItem).toHaveBeenCalled();
    const calls = safeStorage.safeSetItem.mock.calls as Array<[string, any]>;
    const keysUsed = calls.map((c) => c[0]);
    expect(keysUsed.some((k) => k === 'visit_prep_caregiver_notes_appt-key-test')).toBe(true);
  });

  it('contract 6: malformed stored data falls back to the empty default (does not throw)', async () => {
    // Defensive boundary: if storage returns a non-conforming shape
    // (e.g. older save written by a future-then-rolled-back version),
    // get returns the empty default rather than throwing.
    _store['visit_prep_caregiver_notes_appt-malformed'] = { not_the_right_shape: true };
    const notes = await getCaregiverNotes('appt-malformed');
    expect(notes).toEqual(EMPTY_CAREGIVER_NOTES);
  });
});
