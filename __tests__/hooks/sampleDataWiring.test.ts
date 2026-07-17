/**
 * Verifies that the sample data generator produces a complete patient profile.
 *
 * The sample dataset was TRIMMED to the clearest minimal example: 3 medications
 * (Warfarin PM, Lisinopril AM, Gabapentin PM — a morning/evening rhythm), 3 days
 * of Blood pressure + glucose, 4 appointments across specialties, and a single
 * mood check-in for today.
 */
import { getSampleMedications, getSampleVitals, getSampleAppointments, getSampleMoodLogs } from '../../utils/sampleDataGenerator';

describe('sampleDataGenerator produces complete patient profile', () => {
  it('should generate the 3 trimmed medications', () => {
    const meds = getSampleMedications();
    expect(meds).toHaveLength(3);

    const names = meds.map(m => m.name);
    expect(names).toContain('Warfarin');
    expect(names).toContain('Lisinopril');
    expect(names).toContain('Gabapentin');
    // Removed in the trim.
    expect(names).not.toContain('Aspirin');
    expect(names).not.toContain('Metformin');
    expect(names).not.toContain('Lorazepam');

    // Morning/evening rhythm preserved: Lisinopril AM, Warfarin PM.
    const lisinopril = meds.find(m => m.name === 'Lisinopril')!;
    expect(lisinopril.dosage).toBe('20mg');
    expect(lisinopril.timeSlot).toBe('morning');

    const warfarin = meds.find(m => m.name === 'Warfarin')!;
    expect(warfarin.dosage).toBe('5mg');
    expect(warfarin.timeSlot).toBe('evening');
    // INR note kept.
    expect(warfarin.notes).toMatch(/INR/i);
  });

  it('should generate 3 days of vitals — Blood pressure + glucose only', () => {
    const vitals = getSampleVitals();
    const systolic = vitals.filter(v => v.type === 'systolic');
    const diastolic = vitals.filter(v => v.type === 'diastolic');
    const glucose = vitals.filter(v => v.type === 'glucose');
    expect(systolic).toHaveLength(3);
    expect(diastolic).toHaveLength(3);
    expect(glucose).toHaveLength(3);
    // Trimmed types are gone.
    expect(vitals.filter(v => v.type === 'heartRate')).toHaveLength(0);
    expect(vitals.filter(v => v.type === 'weight')).toHaveLength(0);
    expect(vitals.filter(v => v.type === 'temperature')).toHaveLength(0);
    expect(vitals.filter(v => v.type === 'oxygen')).toHaveLength(0);
    // BP + glucose × 3 days = 9 readings.
    expect(vitals.length).toBe(9);
  });

  it('should generate 4 appointments across specialties', () => {
    const appts = getSampleAppointments();
    expect(appts).toHaveLength(4);
    expect(appts[0].provider).toBe('Dr. Patel');
    expect(appts[0].specialty).toBe('Cardiology');
    expect(appts[1].provider).toBe('Dr. Kim');
    expect(appts[1].specialty).toBe('Endocrinology');
  });

  it('should generate a single mood check-in for today', () => {
    const moods = getSampleMoodLogs();
    expect(moods).toHaveLength(1);
    expect(moods[0].mood).toBe('okay');
  });
});
