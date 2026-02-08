// ============================================================================
// CARE SUMMARY BUILDER — TESTS
// Tests for buildTodaySummary with mocked dependencies
// ============================================================================

import { buildTodaySummary, TodaySummary } from '../careSummaryBuilder';
import { getMedications } from '../medicationStorage';
import { getMorningWellness, getEveningWellness } from '../wellnessCheckStorage';
import { getLogEventsByDate } from '../logEvents';
import { getUpcomingAppointments } from '../appointmentStorage';

jest.mock('../medicationStorage');
jest.mock('../wellnessCheckStorage');
jest.mock('../logEvents');
jest.mock('../appointmentStorage');

const mockGetMedications = getMedications as jest.Mock;
const mockGetMorningWellness = getMorningWellness as jest.Mock;
const mockGetEveningWellness = getEveningWellness as jest.Mock;
const mockGetLogEventsByDate = getLogEventsByDate as jest.Mock;
const mockGetUpcomingAppointments = getUpcomingAppointments as jest.Mock;

function setupDefaults() {
  mockGetMedications.mockResolvedValue([]);
  mockGetMorningWellness.mockResolvedValue(null);
  mockGetEveningWellness.mockResolvedValue(null);
  mockGetLogEventsByDate.mockResolvedValue([]);
  mockGetUpcomingAppointments.mockResolvedValue([]);
}

describe('careSummaryBuilder — buildTodaySummary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2025-01-15T10:00:00.000Z'));
    setupDefaults();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ==========================================================================
  // MEDICATION ADHERENCE
  // ==========================================================================

  describe('medsAdherence', () => {
    it('should count taken vs total active medications', async () => {
      mockGetMedications.mockResolvedValue([
        { id: '1', name: 'Aspirin', active: true, taken: true },
        { id: '2', name: 'Lisinopril', active: true, taken: false },
        { id: '3', name: 'Metformin', active: true, taken: true },
        { id: '4', name: 'Warfarin', active: true, taken: false },
        { id: '5', name: 'Vitamin D', active: true, taken: true },
      ]);

      const summary = await buildTodaySummary();
      expect(summary.medsAdherence.taken).toBe(3);
      expect(summary.medsAdherence.total).toBe(5);
    });

    it('should return 0/0 when no active medications', async () => {
      mockGetMedications.mockResolvedValue([]);

      const summary = await buildTodaySummary();
      expect(summary.medsAdherence.taken).toBe(0);
      expect(summary.medsAdherence.total).toBe(0);
    });

    it('should exclude inactive medications', async () => {
      mockGetMedications.mockResolvedValue([
        { id: '1', name: 'Aspirin', active: true, taken: true },
        { id: '2', name: 'OldMed', active: false, taken: false },
      ]);

      const summary = await buildTodaySummary();
      expect(summary.medsAdherence.total).toBe(1);
      expect(summary.medsAdherence.taken).toBe(1);
    });
  });

  // ==========================================================================
  // ORIENTATION / PAIN / ALERTNESS / APPETITE
  // ==========================================================================

  describe('orientation from morning wellness', () => {
    it('should map orientation value to label', async () => {
      mockGetMorningWellness.mockResolvedValue({
        orientation: 'confused-responsive',
      });

      const summary = await buildTodaySummary();
      expect(summary.orientation).toBe('Confused but Responsive');
    });

    it('should return null when no morning wellness', async () => {
      const summary = await buildTodaySummary();
      expect(summary.orientation).toBeNull();
    });
  });

  describe('painLevel from evening wellness', () => {
    it('should map pain value to label', async () => {
      mockGetEveningWellness.mockResolvedValue({
        painLevel: 'severe',
      });

      const summary = await buildTodaySummary();
      expect(summary.painLevel).toBe('Severe');
    });

    it('should return null when no evening wellness', async () => {
      const summary = await buildTodaySummary();
      expect(summary.painLevel).toBeNull();
    });
  });

  describe('alertness from evening wellness', () => {
    it('should map alertness value to label', async () => {
      mockGetEveningWellness.mockResolvedValue({
        alertness: 'drowsy',
      });

      const summary = await buildTodaySummary();
      expect(summary.alertness).toBe('Drowsy');
    });
  });

  describe('appetite from last meal', () => {
    it('should use appetite from the last meal event', async () => {
      mockGetLogEventsByDate.mockResolvedValue([
        { type: 'meal', mealType: 'Breakfast', appetite: 'good' },
        { type: 'meal', mealType: 'Lunch', appetite: 'poor' },
      ]);

      const summary = await buildTodaySummary();
      expect(summary.appetite).toBe('Poor'); // last meal
    });

    it('should return null when no meals logged', async () => {
      const summary = await buildTodaySummary();
      expect(summary.appetite).toBeNull();
    });
  });

  // ==========================================================================
  // NEXT APPOINTMENT
  // ==========================================================================

  describe('nextAppointment', () => {
    it('should include next upcoming appointment', async () => {
      mockGetUpcomingAppointments.mockResolvedValue([
        { provider: 'Dr. Smith', specialty: 'Cardiology', date: '2025-01-20' },
        { provider: 'Dr. Jones', specialty: 'Neurology', date: '2025-02-01' },
      ]);

      const summary = await buildTodaySummary();
      expect(summary.nextAppointment).toEqual({
        provider: 'Dr. Smith',
        specialty: 'Cardiology',
        date: '2025-01-20',
      });
    });

    it('should return null when no upcoming appointments', async () => {
      const summary = await buildTodaySummary();
      expect(summary.nextAppointment).toBeNull();
    });
  });

  // ==========================================================================
  // FLAGGED ITEMS
  // ==========================================================================

  describe('flaggedItems', () => {
    it('should flag unlogged medications', async () => {
      mockGetMedications.mockResolvedValue([
        { id: '1', name: 'Aspirin', active: true, taken: false },
        { id: '2', name: 'Lisinopril', active: true, taken: false },
        { id: '3', name: 'Metformin', active: true, taken: true },
      ]);

      const summary = await buildTodaySummary();
      expect(summary.flaggedItems).toContain('2 meds not logged');
    });

    it('should flag confused/disoriented/unresponsive orientation', async () => {
      mockGetMorningWellness.mockResolvedValue({
        orientation: 'disoriented',
      });

      const summary = await buildTodaySummary();
      expect(summary.flaggedItems).toContain('Disoriented');
    });

    it('should flag severe pain', async () => {
      mockGetEveningWellness.mockResolvedValue({
        painLevel: 'severe',
      });

      const summary = await buildTodaySummary();
      expect(summary.flaggedItems).toContain('Severe pain reported');
    });

    it('should flag poor or refused appetite', async () => {
      mockGetLogEventsByDate.mockResolvedValue([
        { type: 'meal', mealType: 'Lunch', appetite: 'refused' },
      ]);

      const summary = await buildTodaySummary();
      expect(summary.flaggedItems).toContain('Poor appetite');
    });

    it('should flag all issues when all are present', async () => {
      mockGetMedications.mockResolvedValue([
        { id: '1', name: 'Aspirin', active: true, taken: false },
      ]);
      mockGetMorningWellness.mockResolvedValue({
        orientation: 'confused-responsive',
      });
      mockGetEveningWellness.mockResolvedValue({
        painLevel: 'severe',
      });
      mockGetLogEventsByDate.mockResolvedValue([
        { type: 'meal', mealType: 'Lunch', appetite: 'poor' },
      ]);

      const summary = await buildTodaySummary();
      expect(summary.flaggedItems).toHaveLength(4);
      expect(summary.flaggedItems).toContain('1 med not logged');
      expect(summary.flaggedItems).toContain('Confused but Responsive');
      expect(summary.flaggedItems).toContain('Severe pain reported');
      expect(summary.flaggedItems).toContain('Poor appetite');
    });

    it('should have empty flaggedItems when everything is normal', async () => {
      mockGetMedications.mockResolvedValue([
        { id: '1', name: 'Aspirin', active: true, taken: true },
      ]);
      mockGetMorningWellness.mockResolvedValue({
        orientation: 'alert-oriented',
      });
      mockGetEveningWellness.mockResolvedValue({
        painLevel: 'mild',
      });
      mockGetLogEventsByDate.mockResolvedValue([
        { type: 'meal', mealType: 'Lunch', appetite: 'good' },
      ]);

      const summary = await buildTodaySummary();
      expect(summary.flaggedItems).toEqual([]);
    });
  });
});
