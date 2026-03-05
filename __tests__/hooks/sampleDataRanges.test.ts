import { getSampleVitals, getSampleMoodLogs } from '../../utils/sampleDataGenerator';

describe('Sample data matches Mom profile spec', () => {
  describe('Vitals ranges', () => {
    const vitals = getSampleVitals();

    it('systolic BP should be in 130–140 range', () => {
      const systolic = vitals.filter(v => v.type === 'systolic');
      expect(systolic.length).toBe(14);
      for (const v of systolic) {
        expect(v.value).toBeGreaterThanOrEqual(128); // allow ±2 rounding
        expect(v.value).toBeLessThanOrEqual(142);
      }
    });

    it('diastolic BP should be in 78–88 range', () => {
      const diastolic = vitals.filter(v => v.type === 'diastolic');
      expect(diastolic.length).toBe(14);
      for (const v of diastolic) {
        expect(v.value).toBeGreaterThanOrEqual(76);
        expect(v.value).toBeLessThanOrEqual(90);
      }
    });

    it('heart rate should be in 66–78 range', () => {
      const hr = vitals.filter(v => v.type === 'heartRate');
      expect(hr.length).toBe(14);
      for (const v of hr) {
        expect(v.value).toBeGreaterThanOrEqual(66);
        expect(v.value).toBeLessThanOrEqual(78);
      }
    });

    it('weight should be in 163–167 range', () => {
      const weight = vitals.filter(v => v.type === 'weight');
      expect(weight.length).toBeGreaterThan(0);
      for (const v of weight) {
        expect(v.value).toBeGreaterThanOrEqual(163);
        expect(v.value).toBeLessThanOrEqual(167);
      }
    });

    it('glucose should be in 100–120 range', () => {
      const glucose = vitals.filter(v => v.type === 'glucose');
      expect(glucose.length).toBeGreaterThan(0);
      for (const v of glucose) {
        expect(v.value).toBeGreaterThanOrEqual(100);
        expect(v.value).toBeLessThanOrEqual(120);
      }
    });
  });

  describe('Mood logs', () => {
    const moods = getSampleMoodLogs();

    it('should generate 14 days of mood data', () => {
      expect(moods.length).toBe(14);
    });

    it('mood should trend upward (recent days higher than older days)', () => {
      const recentAvg = moods.slice(0, 3).reduce((s, m) => s + m.mood, 0) / 3;
      const oldAvg = moods.slice(11, 14).reduce((s, m) => s + m.mood, 0) / 3;
      expect(recentAvg).toBeGreaterThanOrEqual(oldAvg);
    });

    it('energy should be in 3–4 range', () => {
      for (const m of moods) {
        expect(m.energy).toBeGreaterThanOrEqual(3);
        expect(m.energy).toBeLessThanOrEqual(4);
      }
    });

    it('pain should be in 1–3 range (never 0)', () => {
      for (const m of moods) {
        expect(m.pain).toBeGreaterThanOrEqual(1);
        expect(m.pain).toBeLessThanOrEqual(3);
      }
    });
  });
});
