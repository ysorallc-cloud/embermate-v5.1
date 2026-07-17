import { getSampleVitals, getSampleMoodLogs } from '../../utils/sampleDataGenerator';

describe('Sample data matches Mom profile spec', () => {
  describe('Vitals ranges', () => {
    const vitals = getSampleVitals();

    it('systolic BP should span elevated→normalizing (132–158)', () => {
      const systolic = vitals.filter(v => v.type === 'systolic');
      expect(systolic.length).toBe(3);
      for (const v of systolic) {
        expect(v.value).toBeGreaterThanOrEqual(130);
        expect(v.value).toBeLessThanOrEqual(160);
      }
    });

    it('diastolic BP should span elevated→normalizing (82–95)', () => {
      const diastolic = vitals.filter(v => v.type === 'diastolic');
      expect(diastolic.length).toBe(3);
      for (const v of diastolic) {
        expect(v.value).toBeGreaterThanOrEqual(80);
        expect(v.value).toBeLessThanOrEqual(98);
      }
    });

    // Heart rate, weight, temperature, oxygen were removed in the sample-data
    // trim (Blood pressure + glucose only).
    it('trimmed vital types (heart rate / weight / temperature / oxygen) are absent', () => {
      expect(vitals.filter(v => v.type === 'heartRate').length).toBe(0);
      expect(vitals.filter(v => v.type === 'weight').length).toBe(0);
      expect(vitals.filter(v => v.type === 'temperature').length).toBe(0);
      expect(vitals.filter(v => v.type === 'oxygen').length).toBe(0);
    });

    it('glucose should span critical→improving (135–260)', () => {
      const glucose = vitals.filter(v => v.type === 'glucose');
      expect(glucose.length).toBe(3);
      for (const v of glucose) {
        expect(v.value).toBeGreaterThanOrEqual(130);
        expect(v.value).toBeLessThanOrEqual(265);
      }
    });
  });

  describe('Mood logs', () => {
    const moods = getSampleMoodLogs();
    // Sample mood logs were redesigned to use qualitative mood strings + notes
    // (more clinically meaningful for caregivers) instead of numeric mood/energy/pain.
    const VALID_MOODS = new Set([
      'tired', 'okay', 'anxious', 'calm', 'happy', 'sad', 'frustrated', 'content', 'low', 'good',
    ]);

    it('should generate sample mood entries', () => {
      expect(moods.length).toBeGreaterThan(0);
    });

    it('every entry has a valid mood string, note, and timestamp', () => {
      for (const m of moods) {
        expect(typeof m.mood).toBe('string');
        expect(m.mood.length).toBeGreaterThan(0);
        expect(typeof m.note).toBe('string');
        expect(new Date(m.timestamp).toString()).not.toBe('Invalid Date');
      }
    });

    it('uses moods from the supported vocabulary', () => {
      for (const m of moods) {
        expect(VALID_MOODS.has(m.mood)).toBe(true);
      }
    });
  });
});
