// ============================================================================
// reminderPreferencesRepo — defaults, partial updates, legacy migration.
// ============================================================================

const mockGet = jest.fn();
const mockSet = jest.fn();
const mockRemove = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: (k: string) => mockGet(k),
  setItem: (k: string, v: string) => mockSet(k, v),
  removeItem: (k: string) => mockRemove(k),
}));

jest.mock('../../utils/devLog', () => ({ logError: jest.fn() }));

import {
  DEFAULT_REMINDER_PREFERENCES,
  getReminderPreferences,
  updateReminderPreferences,
  resetReminderPreferences,
  __testing,
} from '../../services/reminderPreferencesRepo';

beforeEach(() => {
  mockGet.mockReset();
  mockSet.mockReset();
  mockRemove.mockReset();
});

describe('reminderPreferencesRepo — defaults', () => {
  it('returns the documented defaults when no stored value exists', async () => {
    mockGet.mockResolvedValue(null);
    const prefs = await getReminderPreferences();
    expect(prefs.smartTiming).toBe(false);
    expect(prefs.perCategoryAdvance.medications).toBe(5);
    expect(prefs.perCategoryAdvance.vitals).toBe(5);
    expect(prefs.perCategoryAdvance.wellness).toBe(0);
    expect(prefs.perCategoryAdvance.meals).toBeNull();
    expect(prefs.perCategoryAdvance.appointments).toBe(60);
    expect(prefs.perCategoryEscalation.medications).toBe(true);
    expect(prefs.perCategoryEscalation.vitals).toBe(false);
    expect(prefs.quietHours).toEqual({
      enabled: true,
      startHour: 22,
      endHour: 7,
      weekendsOnly: false,
      allowCritical: true,
    });
    expect(prefs.sound).toBe('gentle');
    expect(prefs.respectSystemDND).toBe(true);
  });

  it('merges nested patches without losing sibling fields', () => {
    const merged = __testing.mergePreferences(DEFAULT_REMINDER_PREFERENCES, {
      perCategoryAdvance: { medications: 30 } as any,
    });
    expect(merged.perCategoryAdvance.medications).toBe(30);
    expect(merged.perCategoryAdvance.vitals).toBe(5);
    expect(merged.perCategoryAdvance.wellness).toBe(0);
  });
});

describe('reminderPreferencesRepo — updates persist as JSON', () => {
  it('updateReminderPreferences writes the merged result and returns it', async () => {
    mockGet.mockResolvedValue(null);
    mockSet.mockResolvedValue(undefined);
    const result = await updateReminderPreferences({
      perCategoryAdvance: { medications: 15 } as any,
    });
    expect(result.perCategoryAdvance.medications).toBe(15);
    expect(mockSet).toHaveBeenCalledTimes(1);
    const [key, payload] = mockSet.mock.calls[0];
    expect(key).toBe('@embermate_reminder_preferences_v1');
    const parsed = JSON.parse(payload);
    expect(parsed.perCategoryAdvance.medications).toBe(15);
    // Sibling fields preserved.
    expect(parsed.perCategoryAdvance.vitals).toBe(5);
  });

  it('resetReminderPreferences removes the storage key', async () => {
    mockRemove.mockResolvedValue(undefined);
    await resetReminderPreferences();
    expect(mockRemove).toHaveBeenCalledWith('@embermate_reminder_preferences_v1');
  });
});

describe('reminderPreferencesRepo — legacy migration', () => {
  it('folds legacy notification settings into the new shape on first read', async () => {
    mockGet.mockImplementation((key: string) => {
      if (key === '@embermate_reminder_preferences_v1') return Promise.resolve(null);
      if (key === '@embermate_notification_settings') {
        return Promise.resolve(JSON.stringify({
          defaultMinutesBefore: 15,
          quietHoursEnabled: true,
          quietHoursStart: 23,
          quietHoursEnd: 6,
          sound: 'standard',
        }));
      }
      return Promise.resolve(null);
    });
    mockSet.mockResolvedValue(undefined);
    const prefs = await getReminderPreferences();
    expect(prefs.perCategoryAdvance.medications).toBe(15);
    expect(prefs.perCategoryAdvance.vitals).toBe(15);
    expect(prefs.quietHours.startHour).toBe(23);
    expect(prefs.quietHours.endHour).toBe(6);
    expect(prefs.sound).toBe('standard');
    // Migration writes the merged result so the next read is fast.
    expect(mockSet).toHaveBeenCalledTimes(1);
  });

  it('falls back to defaults when no legacy data exists', async () => {
    mockGet.mockResolvedValue(null);
    const prefs = await getReminderPreferences();
    expect(prefs).toEqual(DEFAULT_REMINDER_PREFERENCES);
  });

  it('handles partially-shaped legacy data without crashing', async () => {
    mockGet.mockImplementation((key: string) => {
      if (key === '@embermate_reminder_preferences_v1') return Promise.resolve(null);
      if (key === '@embermate_notification_settings') {
        return Promise.resolve(JSON.stringify({ defaultMinutesBefore: 'not-a-number' }));
      }
      return Promise.resolve(null);
    });
    const prefs = await getReminderPreferences();
    // Junk legacy values fall back to defaults rather than throwing.
    expect(prefs.perCategoryAdvance.medications).toBe(0);
  });
});

describe('reminderPreferencesRepo — error tolerance', () => {
  it('returns defaults when the storage layer throws', async () => {
    mockGet.mockRejectedValue(new Error('boom'));
    const prefs = await getReminderPreferences();
    expect(prefs).toEqual(DEFAULT_REMINDER_PREFERENCES);
  });
});
