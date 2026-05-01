// ============================================================================
// patientQuestionsRepo — "Questions for the doctor" CRUD. Caregiver builds
// a list across the period; PDF generation reads it; clearAfterPdf() drops
// the list once shared so the next visit starts fresh.
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () => {
  const store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => Promise.resolve(store[key] ?? null)),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
      return Promise.resolve();
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
      return Promise.resolve();
    }),
    clear: jest.fn(() => {
      for (const k of Object.keys(store)) delete store[k];
      return Promise.resolve();
    }),
  };
});

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../lib/events', () => ({ emitDataUpdate: jest.fn() }));
jest.mock('../../utils/devLog', () => ({ logError: jest.fn() }));

import {
  addQuestion,
  removeQuestion,
  updateQuestion,
  listQuestions,
  clearQuestions,
} from '../../services/patientQuestionsRepo';

const PATIENT = 'mom';

beforeEach(async () => {
  await (AsyncStorage as any).clear();
});

describe('addQuestion', () => {
  it('appends a new question and returns it with an id and createdAt', async () => {
    const q = await addQuestion(PATIENT, 'Is the new dose making her dizzy?');
    expect(q.id).toBeDefined();
    expect(q.text).toBe('Is the new dose making her dizzy?');
    expect(q.createdAt).toBeDefined();
    const all = await listQuestions(PATIENT);
    expect(all.length).toBe(1);
  });

  it('trims whitespace before saving', async () => {
    const q = await addQuestion(PATIENT, '   What about sleep?   ');
    expect(q.text).toBe('What about sleep?');
  });

  it('refuses to add empty / whitespace-only text', async () => {
    await expect(addQuestion(PATIENT, '   ')).rejects.toThrow();
    const all = await listQuestions(PATIENT);
    expect(all.length).toBe(0);
  });
});

describe('listQuestions', () => {
  it('returns an empty list when nothing has been added', async () => {
    const list = await listQuestions(PATIENT);
    expect(list).toEqual([]);
  });

  it('returns questions in insertion order (oldest first)', async () => {
    await addQuestion(PATIENT, 'First');
    await addQuestion(PATIENT, 'Second');
    await addQuestion(PATIENT, 'Third');
    const list = await listQuestions(PATIENT);
    expect(list.map((q) => q.text)).toEqual(['First', 'Second', 'Third']);
  });

  it('keeps lists per-patient isolated', async () => {
    await addQuestion('mom', 'Mom question');
    await addQuestion('dad', 'Dad question');
    const mom = await listQuestions('mom');
    const dad = await listQuestions('dad');
    expect(mom.length).toBe(1);
    expect(dad.length).toBe(1);
    expect(mom[0].text).toBe('Mom question');
    expect(dad[0].text).toBe('Dad question');
  });
});

describe('removeQuestion', () => {
  it('removes the matching question', async () => {
    const a = await addQuestion(PATIENT, 'A');
    await addQuestion(PATIENT, 'B');
    await removeQuestion(PATIENT, a.id);
    const list = await listQuestions(PATIENT);
    expect(list.map((q) => q.text)).toEqual(['B']);
  });

  it('is a no-op when the id does not match', async () => {
    await addQuestion(PATIENT, 'A');
    await removeQuestion(PATIENT, 'nonexistent');
    const list = await listQuestions(PATIENT);
    expect(list.length).toBe(1);
  });
});

describe('updateQuestion', () => {
  it('updates the text and refreshes updatedAt', async () => {
    const q = await addQuestion(PATIENT, 'Old');
    const updated = await updateQuestion(PATIENT, q.id, 'New text');
    expect(updated).not.toBeNull();
    expect(updated!.text).toBe('New text');
    expect(updated!.updatedAt).toBeDefined();
  });

  it('returns null when the id does not match', async () => {
    const result = await updateQuestion(PATIENT, 'missing', 'Anything');
    expect(result).toBeNull();
  });
});

describe('clearQuestions — post-PDF reset', () => {
  it('removes all questions for the patient', async () => {
    await addQuestion(PATIENT, 'A');
    await addQuestion(PATIENT, 'B');
    await clearQuestions(PATIENT);
    const list = await listQuestions(PATIENT);
    expect(list).toEqual([]);
  });

  it('does not affect other patients', async () => {
    await addQuestion('mom', 'Mom q');
    await addQuestion('dad', 'Dad q');
    await clearQuestions('mom');
    const dad = await listQuestions('dad');
    expect(dad.length).toBe(1);
  });
});
