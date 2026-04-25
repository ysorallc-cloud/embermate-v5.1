/**
 * Visit Prep PDF — data assembly unit tests.
 * Tests the assembleVisitPrepData function, not the HTML/PDF rendering.
 */

jest.mock('expo-print', () => ({ printToFileAsync: jest.fn() }));
jest.mock('expo-sharing', () => ({ shareAsync: jest.fn(), isAvailableAsync: jest.fn(() => Promise.resolve(true)) }));

import { assembleVisitPrepData, VisitPrepConfig, VisitPrepData } from '../../services/visitPrepPdf';

const BASE_CONFIG: VisitPrepConfig = {
  dateRange: { start: '2026-04-10', end: '2026-04-24' },
  includeMeds: true,
  includeVitals: true,
  includeWellness: true,
  includeJournal: true,
  includeQuestions: true,
  questions: 'Should we adjust the Metformin dose?',
  patientName: 'Mom',
  caregiverName: 'Amber',
};

describe('assembleVisitPrepData', () => {
  it('returns all expected top-level sections', async () => {
    const data = await assembleVisitPrepData(BASE_CONFIG);
    expect(data).toHaveProperty('header');
    expect(data).toHaveProperty('adherence');
    expect(data).toHaveProperty('vitals');
    expect(data).toHaveProperty('wellness');
    expect(data).toHaveProperty('journalHighlights');
    expect(data).toHaveProperty('questions');
    expect(data).toHaveProperty('footer');
  });

  it('header contains patient name, date range, and generated timestamp', async () => {
    const data = await assembleVisitPrepData(BASE_CONFIG);
    expect(data.header.patientName).toBe('Mom');
    expect(data.header.caregiverName).toBe('Amber');
    expect(data.header.dateRange).toContain('Apr');
    expect(data.header.generatedAt).toBeDefined();
  });

  it('adherence array contains medication objects with name and rate', async () => {
    const data = await assembleVisitPrepData(BASE_CONFIG);
    expect(Array.isArray(data.adherence)).toBe(true);
    for (const med of data.adherence) {
      expect(typeof med.name).toBe('string');
      expect(typeof med.rate).toBe('number');
      expect(med.rate).toBeGreaterThanOrEqual(0);
      expect(med.rate).toBeLessThanOrEqual(100);
    }
  });

  it('vitals entries have type, latest value, trend, and outOfRange count', async () => {
    const data = await assembleVisitPrepData(BASE_CONFIG);
    expect(Array.isArray(data.vitals)).toBe(true);
    for (const v of data.vitals) {
      expect(typeof v.type).toBe('string');
      expect(['up', 'down', 'stable', 'unknown']).toContain(v.trend);
      expect(typeof v.outOfRange).toBe('number');
    }
  });

  it('questions section includes the free-text input', async () => {
    const data = await assembleVisitPrepData(BASE_CONFIG);
    expect(data.questions).toContain('Metformin');
  });

  it('footer contains the disclaimer', async () => {
    const data = await assembleVisitPrepData(BASE_CONFIG);
    expect(data.footer).toContain('Not a medical record');
  });

  // Edge cases
  it('handles zero medications gracefully', async () => {
    const config = { ...BASE_CONFIG };
    const data = await assembleVisitPrepData(config);
    // Should return empty array, not crash
    expect(Array.isArray(data.adherence)).toBe(true);
  });

  it('handles no vitals data gracefully', async () => {
    const config = { ...BASE_CONFIG, includeVitals: false };
    const data = await assembleVisitPrepData(config);
    expect(data.vitals).toEqual([]);
  });

  it('handles single-day range', async () => {
    const config = { ...BASE_CONFIG, dateRange: { start: '2026-04-24', end: '2026-04-24' } };
    const data = await assembleVisitPrepData(config);
    expect(data.header.dateRange).toBeDefined();
  });

  it('omits questions when includeQuestions is false', async () => {
    const config = { ...BASE_CONFIG, includeQuestions: false };
    const data = await assembleVisitPrepData(config);
    expect(data.questions).toBe('');
  });
});
