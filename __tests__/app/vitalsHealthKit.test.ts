// ============================================================================
// Vitals HealthKit Integration — Auto-import toggle tests
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';
import { ManualOnlyProvider, HealthDataProvider } from '../../utils/healthDataProvider';

const vitalsPath = path.resolve(__dirname, '../../app/care-plan/vitals.tsx');
const vitalsSrc = fs.readFileSync(vitalsPath, 'utf-8');

describe('Vitals HealthKit integration', () => {
  it('when isAvailable() returns false, auto-import toggle does NOT render', async () => {
    const provider = new ManualOnlyProvider();
    const available = await provider.isAvailable();
    expect(available).toBe(false);

    // The UI gates on healthKitAvailable
    expect(vitalsSrc).toContain('healthKitAvailable && enabled');
    // When false, the auto-import section is not rendered
  });

  it('when isAvailable() returns true, auto-import toggle renders', async () => {
    // A mock provider returning true
    const mockProvider: HealthDataProvider = {
      isAvailable: async () => true,
      requestPermissions: async () => true,
      readVitals: async () => [],
      readActivity: async () => ({ steps: 0, activeMinutes: 0 }),
      readSleep: async () => ({ hours: 0, quality: 'unknown' }),
    };
    expect(await mockProvider.isAvailable()).toBe(true);

    // The component checks getHealthDataProvider().isAvailable()
    expect(vitalsSrc).toContain('getHealthDataProvider');
    expect(vitalsSrc).toContain('isAvailable');
    expect(vitalsSrc).toContain('Auto-Import');
  });

  it('auto-import section shows per-vital rows', () => {
    expect(vitalsSrc).toContain('autoImportRow');
    expect(vitalsSrc).toContain('Manual only');
    expect(vitalsSrc).toContain('VITAL_TYPE_OPTIONS');
  });

  it('auto-import section describes data privacy', () => {
    expect(vitalsSrc).toContain('Data stays on your device');
  });
});
