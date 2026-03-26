import { SAVE_DESTINATIONS } from '../../utils/saveDestinations';

describe('saveDestinations', () => {
  const expectedKeys = ['note', 'vitals', 'meal', 'medication', 'mood', 'sleep', 'pain', 'symptom', 'wellness'];

  it('SAVE_DESTINATIONS has entries for all expected log types', () => {
    for (const key of expectedKeys) {
      expect(SAVE_DESTINATIONS).toHaveProperty(key);
    }
  });

  it('each entry is an array of {icon, text} objects', () => {
    for (const key of expectedKeys) {
      const destinations = (SAVE_DESTINATIONS as any)[key];
      expect(Array.isArray(destinations)).toBe(true);
      expect(destinations.length).toBeGreaterThan(0);

      for (const dest of destinations) {
        expect(dest).toHaveProperty('icon');
        expect(dest).toHaveProperty('text');
        expect(typeof dest.icon).toBe('string');
        expect(typeof dest.text).toBe('string');
      }
    }
  });
});
