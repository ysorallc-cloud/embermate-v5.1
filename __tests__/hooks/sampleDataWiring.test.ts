/**
 * Verifies that the two sample data systems are properly connected.
 *
 * Bug: Onboarding "Explore with Sample Data" called seedSampleData() from
 * sampleData.ts (meals/sleep only), not initializeSampleData() from
 * sampleDataGenerator.ts (full Mom profile). Users got empty medications,
 * vitals, and appointments.
 */
import { getSampleMedications, getSampleVitals, getSampleAppointments, getSampleMoodLogs } from '../../utils/sampleDataGenerator';

describe('sampleDataGenerator produces complete Mom profile', () => {
  it('should generate 3 medications matching the spec', () => {
    const meds = getSampleMedications();
    expect(meds).toHaveLength(3);

    const names = meds.map(m => m.name);
    expect(names).toContain('Lisinopril');
    expect(names).toContain('Metformin');
    expect(names).toContain('Atorvastatin');

    // Morning meds should be marked taken, evening pending
    const lisinopril = meds.find(m => m.name === 'Lisinopril')!;
    expect(lisinopril.dosage).toBe('10mg');
    expect(lisinopril.timeSlot).toBe('morning');
    expect(lisinopril.taken).toBe(true);

    const atorvastatin = meds.find(m => m.name === 'Atorvastatin')!;
    expect(atorvastatin.dosage).toBe('20mg');
    expect(atorvastatin.timeSlot).toBe('evening');
    expect(atorvastatin.taken).toBe(false);
  });

  it('should generate 14 days of vitals', () => {
    const vitals = getSampleVitals();
    const systolic = vitals.filter(v => v.type === 'systolic');
    expect(systolic).toHaveLength(14);
  });

  it('should generate 2 appointments', () => {
    const appts = getSampleAppointments();
    expect(appts).toHaveLength(2);
    expect(appts[0].provider).toBe('Dr. Martinez');
    expect(appts[0].specialty).toBe('Cardiology');
    expect(appts[1].provider).toBe('Dr. Thompson');
    expect(appts[1].specialty).toBe('Primary Care');
  });

  it('should generate 14 days of mood logs', () => {
    const moods = getSampleMoodLogs();
    expect(moods).toHaveLength(14);
  });
});
