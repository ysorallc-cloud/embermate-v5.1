// ============================================================================
// HEALTH DATA PROVIDER — Abstract interface for health data sources
// Allows future HealthKit integration on iOS while keeping Android functional
// ============================================================================

// ============================================================================
// TYPES
// ============================================================================

export interface VitalReading {
  type: string;           // 'blood_pressure', 'heart_rate', 'weight', etc.
  value: number;
  unit: string;
  timestamp: string;      // ISO 8601
  source: string;         // 'healthkit', 'manual', etc.
  metadata?: Record<string, unknown>;
}

export interface ActivityData {
  steps: number;
  activeMinutes: number;
  caloriesBurned?: number;
  distance?: number;
}

export interface SleepData {
  hours: number;
  quality: string;        // 'unknown', 'poor', 'fair', 'good', 'excellent'
  bedtime?: string;       // ISO 8601
  wakeTime?: string;      // ISO 8601
}

// ============================================================================
// INTERFACE
// ============================================================================

export interface HealthDataProvider {
  isAvailable(): Promise<boolean>;
  requestPermissions(types: string[]): Promise<boolean>;
  readVitals(type: string, startDate: string, endDate: string): Promise<VitalReading[]>;
  readActivity(startDate: string, endDate: string): Promise<ActivityData>;
  readSleep(startDate: string, endDate: string): Promise<SleepData>;
}

// ============================================================================
// MANUAL-ONLY PROVIDER — Default for Android and non-HealthKit environments
// ============================================================================

export class ManualOnlyProvider implements HealthDataProvider {
  async isAvailable(): Promise<boolean> {
    return false;
  }

  async requestPermissions(_types: string[]): Promise<boolean> {
    return false;
  }

  async readVitals(_type: string, _startDate: string, _endDate: string): Promise<VitalReading[]> {
    return [];
  }

  async readActivity(_startDate: string, _endDate: string): Promise<ActivityData> {
    return { steps: 0, activeMinutes: 0 };
  }

  async readSleep(_startDate: string, _endDate: string): Promise<SleepData> {
    return { hours: 0, quality: 'unknown' };
  }
}

// ============================================================================
// SINGLETON — Use this throughout the app
// ============================================================================

let _provider: HealthDataProvider = new ManualOnlyProvider();

export function getHealthDataProvider(): HealthDataProvider {
  return _provider;
}

export function setHealthDataProvider(provider: HealthDataProvider): void {
  _provider = provider;
}
