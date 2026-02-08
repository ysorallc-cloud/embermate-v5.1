// ============================================================================
// HANDOFF DATA FLOW — INTEGRATION TESTS
// Sprint 1 data flows through to Sprint 2 handoff card via buildTodaySummary
// Uses real storage functions; mocks only medicationStorage and appointmentStorage
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildTodaySummary } from '../careSummaryBuilder';
import { getMedications } from '../medicationStorage';
import { getUpcomingAppointments } from '../appointmentStorage';
import { saveMorningWellness, saveEveningWellness } from '../wellnessCheckStorage';
import { logMeal } from '../logEvents';
import { MorningWellnessData, EveningWellnessData } from '../../types/timeline';

// Mock only the modules that have complex setup requirements
jest.mock('../medicationStorage');
jest.mock('../appointmentStorage');

const mockGetMedications = getMedications as jest.Mock;
const mockGetUpcomingAppointments = getUpcomingAppointments as jest.Mock;

describe('handoffDataFlow — integration', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.useFakeTimers().setSystemTime(new Date('2025-01-15T14:00:00.000Z'));
    mockGetMedications.mockResolvedValue([]);
    mockGetUpcomingAppointments.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ==========================================================================
  // Full day with concerns
  // ==========================================================================

  it('should aggregate a full day with multiple flags into buildTodaySummary', async () => {
    // Morning wellness: confused orientation
    const morningData: MorningWellnessData = {
      sleepQuality: 2,
      mood: 'difficult',
      energyLevel: 2,
      orientation: 'confused-responsive',
      decisionMaking: 'needs-guidance',
      completedAt: new Date('2025-01-15T08:00:00.000Z'),
    };
    await saveMorningWellness('2025-01-15', morningData);

    // Log a meal with poor appetite
    await logMeal('Lunch', { appetite: 'poor', amountConsumed: 'little' });

    // Evening wellness: severe pain
    const eveningData: EveningWellnessData = {
      mood: 'difficult',
      mealsLogged: true,
      dayRating: 2,
      painLevel: 'severe',
      alertness: 'confused',
      bowelMovement: 'no',
      bathingStatus: 'full-assist',
      mobilityStatus: 'wheelchair',
      completedAt: new Date('2025-01-15T20:00:00.000Z'),
    };
    await saveEveningWellness('2025-01-15', eveningData);

    // 2 of 4 meds taken
    mockGetMedications.mockResolvedValue([
      { id: '1', name: 'Aspirin', active: true, taken: true },
      { id: '2', name: 'Lisinopril', active: true, taken: true },
      { id: '3', name: 'Metformin', active: true, taken: false },
      { id: '4', name: 'Warfarin', active: true, taken: false },
    ]);

    const summary = await buildTodaySummary();

    // Verify all fields populated
    expect(summary.medsAdherence).toEqual({ taken: 2, total: 4 });
    expect(summary.orientation).toBe('Confused but Responsive');
    expect(summary.painLevel).toBe('Severe');
    expect(summary.alertness).toBe('Confused');
    expect(summary.appetite).toBe('Poor');

    // Verify all 4 flags
    expect(summary.flaggedItems).toHaveLength(4);
    expect(summary.flaggedItems).toContain('2 meds not logged');
    expect(summary.flaggedItems).toContain('Confused but Responsive');
    expect(summary.flaggedItems).toContain('Severe pain reported');
    expect(summary.flaggedItems).toContain('Poor appetite');
  });

  // ==========================================================================
  // Clean day — no flags
  // ==========================================================================

  it('should produce empty flaggedItems on a clean day', async () => {
    // All meds taken
    mockGetMedications.mockResolvedValue([
      { id: '1', name: 'Aspirin', active: true, taken: true },
      { id: '2', name: 'Lisinopril', active: true, taken: true },
    ]);

    // Normal morning
    const morningData: MorningWellnessData = {
      sleepQuality: 4,
      mood: 'good',
      energyLevel: 4,
      orientation: 'alert-oriented',
      decisionMaking: 'own-decisions',
      completedAt: new Date('2025-01-15T08:00:00.000Z'),
    };
    await saveMorningWellness('2025-01-15', morningData);

    // Good meal
    await logMeal('Lunch', { appetite: 'good', amountConsumed: 'all' });

    // Normal evening
    const eveningData: EveningWellnessData = {
      mood: 'good',
      mealsLogged: true,
      dayRating: 4,
      painLevel: 'none',
      alertness: 'alert',
      completedAt: new Date('2025-01-15T20:00:00.000Z'),
    };
    await saveEveningWellness('2025-01-15', eveningData);

    const summary = await buildTodaySummary();

    expect(summary.flaggedItems).toEqual([]);
    expect(summary.orientation).toBe('Alert & Oriented');
    expect(summary.painLevel).toBe('None');
    expect(summary.appetite).toBe('Good');
  });

  // ==========================================================================
  // Empty state — no data at all
  // ==========================================================================

  it('should return nulls and empty flags when no data exists', async () => {
    const summary = await buildTodaySummary();

    expect(summary.medsAdherence).toEqual({ taken: 0, total: 0 });
    expect(summary.orientation).toBeNull();
    expect(summary.painLevel).toBeNull();
    expect(summary.alertness).toBeNull();
    expect(summary.appetite).toBeNull();
    expect(summary.nextAppointment).toBeNull();
    expect(summary.flaggedItems).toEqual([]);
  });

  // ==========================================================================
  // Appointment data flows through
  // ==========================================================================

  it('should include next appointment in summary', async () => {
    mockGetUpcomingAppointments.mockResolvedValue([
      { provider: 'Dr. Chen', specialty: 'Cardiology', date: '2025-01-20' },
    ]);

    const summary = await buildTodaySummary();
    expect(summary.nextAppointment).toEqual({
      provider: 'Dr. Chen',
      specialty: 'Cardiology',
      date: '2025-01-20',
    });
  });
});
