// ============================================================================
// HealthDataProvider — Interface and ManualOnlyProvider tests
// ============================================================================

import {
  ManualOnlyProvider,
  getHealthDataProvider,
  setHealthDataProvider,
  HealthDataProvider,
  VitalReading,
  ActivityData,
  SleepData,
} from '../../utils/healthDataProvider';

describe('HealthDataProvider', () => {
  it('ManualOnlyProvider.isAvailable() returns false', async () => {
    const provider = new ManualOnlyProvider();
    expect(await provider.isAvailable()).toBe(false);
  });

  it('ManualOnlyProvider.requestPermissions() returns false', async () => {
    const provider = new ManualOnlyProvider();
    expect(await provider.requestPermissions(['blood_pressure'])).toBe(false);
  });

  it('ManualOnlyProvider.readVitals() returns empty array', async () => {
    const provider = new ManualOnlyProvider();
    const result = await provider.readVitals('blood_pressure', '2026-03-01', '2026-03-26');
    expect(result).toEqual([]);
  });

  it('ManualOnlyProvider.readActivity() returns zeroed data', async () => {
    const provider = new ManualOnlyProvider();
    const result = await provider.readActivity('2026-03-01', '2026-03-26');
    expect(result).toEqual({ steps: 0, activeMinutes: 0 });
  });

  it('ManualOnlyProvider.readSleep() returns unknown quality', async () => {
    const provider = new ManualOnlyProvider();
    const result = await provider.readSleep('2026-03-01', '2026-03-26');
    expect(result).toEqual({ hours: 0, quality: 'unknown' });
  });

  it('interface compiles correctly (VitalReading, ActivityData, SleepData types)', () => {
    const reading: VitalReading = {
      type: 'blood_pressure',
      value: 120,
      unit: 'mmHg',
      timestamp: '2026-03-26T10:00:00.000Z',
      source: 'manual',
    };
    expect(reading.type).toBe('blood_pressure');

    const activity: ActivityData = { steps: 5000, activeMinutes: 30 };
    expect(activity.steps).toBe(5000);

    const sleep: SleepData = { hours: 7, quality: 'good' };
    expect(sleep.quality).toBe('good');
  });

  it('getHealthDataProvider returns ManualOnlyProvider by default', async () => {
    const provider = getHealthDataProvider();
    expect(await provider.isAvailable()).toBe(false);
  });

  it('setHealthDataProvider swaps the provider', async () => {
    const mockProvider: HealthDataProvider = {
      isAvailable: async () => true,
      requestPermissions: async () => true,
      readVitals: async () => [{ type: 'hr', value: 72, unit: 'bpm', timestamp: '', source: 'healthkit' }],
      readActivity: async () => ({ steps: 8000, activeMinutes: 45 }),
      readSleep: async () => ({ hours: 8, quality: 'excellent' }),
    };

    setHealthDataProvider(mockProvider);
    const provider = getHealthDataProvider();
    expect(await provider.isAvailable()).toBe(true);
    const vitals = await provider.readVitals('hr', '2026-03-01', '2026-03-26');
    expect(vitals).toHaveLength(1);
    expect(vitals[0].value).toBe(72);

    // Reset to default
    setHealthDataProvider(new ManualOnlyProvider());
  });
});
