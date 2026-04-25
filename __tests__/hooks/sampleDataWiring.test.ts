/**
 * Verifies that the sample data generator produces a complete patient profile.
 *
 * The sample data was redesigned: 6 medications (realistic elderly patient),
 * 3 days of multi-type vitals, 4 appointments across specialties,
 * and 5 mood logs across 3 days.
 */
import { getSampleMedications, getSampleVitals, getSampleAppointments, getSampleMoodLogs } from '../../utils/sampleDataGenerator';

describe('sampleDataGenerator produces complete patient profile', () => {
  it('should generate 6 medications matching the realistic profile', () => {
    const meds = getSampleMedications();
    expect(meds).toHaveLength(6);

    const names = meds.map(m => m.name);
    expect(names).toContain('Warfarin');
    expect(names).toContain('Aspirin');
    expect(names).toContain('Metformin');
    expect(names).toContain('Lisinopril');
    expect(names).toContain('Gabapentin');
    expect(names).toContain('Lorazepam');

    // Morning meds should be marked taken, evening pending
    const aspirin = meds.find(m => m.name === 'Aspirin')!;
    expect(aspirin.dosage).toBe('81mg');
    expect(aspirin.timeSlot).toBe('morning');
    expect(aspirin.taken).toBe(true);

    const warfarin = meds.find(m => m.name === 'Warfarin')!;
    expect(warfarin.dosage).toBe('5mg');
    expect(warfarin.timeSlot).toBe('evening');
    expect(warfarin.taken).toBe(false);
  });

  it('should generate 3 days of vitals with multiple types per day', () => {
    const vitals = getSampleVitals();
    const systolic = vitals.filter(v => v.type === 'systolic');
    expect(systolic).toHaveLength(3);
    // Each day has 7 vital types
    expect(vitals.length).toBe(21);
  });

  it('should generate 4 appointments across specialties', () => {
    const appts = getSampleAppointments();
    expect(appts).toHaveLength(4);
    expect(appts[0].provider).toBe('Dr. Patel');
    expect(appts[0].specialty).toBe('Cardiology');
    expect(appts[1].provider).toBe('Dr. Kim');
    expect(appts[1].specialty).toBe('Endocrinology');
  });

  it('should generate 5 mood logs across 3 days', () => {
    const moods = getSampleMoodLogs();
    expect(moods).toHaveLength(5);
    // Should include a range of moods
    const moodTypes = moods.map(m => m.mood);
    expect(moodTypes).toContain('tired');
    expect(moodTypes).toContain('anxious');
  });
});
