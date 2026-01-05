// ============================================================================
// SAMPLE DATA SEEDING
// Seeds demo data for first-time users (P1.2)
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageKeys } from './storageKeys';
import { Medication } from './medicationStorage';
import { Appointment } from './appointmentStorage';

/**
 * Check if sample data has been seeded
 */
export async function isSampleDataSeeded(): Promise<boolean> {
  try {
    const seeded = await AsyncStorage.getItem(StorageKeys.DEMO_DATA_SEEDED);
    return seeded === 'true';
  } catch {
    return false;
  }
}

/**
 * Seed sample data for first-time users
 */
export async function seedSampleData(): Promise<void> {
  // Check if user explicitly declined sample data
  const userDeclined = await AsyncStorage.getItem('@embermate_user_declined_sample_data');
  if (userDeclined === 'true') {
    console.log('⏭️  User declined sample data, skipping seed');
    return;
  }

  const now = new Date();
  const nowISO = now.toISOString();
  
  // Sample medications
  const sampleMedications: Medication[] = [
    {
      id: 'sample_1',
      name: 'Metformin',
      dosage: '500mg',
      time: '08:00',
      timeSlot: 'morning',
      taken: false,
      notes: 'With breakfast',
      active: true,
      createdAt: nowISO,
      pillsRemaining: 60,
      daysSupply: 30,
    },
    {
      id: 'sample_2',
      name: 'Lisinopril',
      dosage: '10mg',
      time: '08:00',
      timeSlot: 'morning',
      taken: false,
      notes: 'Blood pressure',
      active: true,
      createdAt: nowISO,
      pillsRemaining: 90,
      daysSupply: 90,
    },
    {
      id: 'sample_3',
      name: 'Aspirin',
      dosage: '81mg',
      time: '18:00',
      timeSlot: 'evening',
      taken: false,
      notes: 'With dinner',
      active: true,
      createdAt: nowISO,
      pillsRemaining: 5,
      daysSupply: 5, // Low supply to show refill warning
    },
  ];
  
  // Sample appointment (3 days from now)
  const appointmentDate = new Date(now);
  appointmentDate.setDate(now.getDate() + 3);
  
  const sampleAppointments: Appointment[] = [
    {
      id: 'sample_appt_1',
      provider: 'Dr. Chen',
      specialty: 'Cardiology',
      date: appointmentDate.toISOString(),
      time: '14:00',
      location: 'Valley Medical Center',
      notes: 'Follow-up for blood pressure management',
      hasBrief: true,
      completed: false,
      cancelled: false,
      createdAt: nowISO,
    },
  ];
  
  try {
    // Save sample data
    await AsyncStorage.setItem(StorageKeys.MEDICATIONS, JSON.stringify(sampleMedications));
    await AsyncStorage.setItem(StorageKeys.APPOINTMENTS, JSON.stringify(sampleAppointments));
    await AsyncStorage.setItem(StorageKeys.PATIENT_NAME, 'Mom');
    await AsyncStorage.setItem(StorageKeys.DEMO_DATA_SEEDED, 'true');
    
    console.log('✓ Sample data seeded successfully');
  } catch (error) {
    console.error('Error seeding sample data:', error);
    throw error;
  }
}

/**
 * Clear all sample/demo data (Settings action)
 */
export async function clearDemoData(): Promise<void> {
  try {
    await AsyncStorage.removeItem(StorageKeys.MEDICATIONS);
    await AsyncStorage.removeItem(StorageKeys.APPOINTMENTS);
    await AsyncStorage.removeItem(StorageKeys.MEDICATION_LOGS);
    await AsyncStorage.removeItem(StorageKeys.DEMO_DATA_SEEDED);
    await AsyncStorage.removeItem(StorageKeys.ONBOARDING_COMPLETE);
    await AsyncStorage.removeItem(StorageKeys.COFFEE_LAST_USED);
    await AsyncStorage.removeItem(StorageKeys.LAST_RESET_DATE);
    await AsyncStorage.removeItem('@embermate_user_declined_sample_data');
    
    console.log('✓ Demo data cleared');
  } catch (error) {
    console.error('Error clearing demo data:', error);
    throw error;
  }
}

/**
 * Check if onboarding is complete
 */
export async function isOnboardingComplete(): Promise<boolean> {
  try {
    const complete = await AsyncStorage.getItem(StorageKeys.ONBOARDING_COMPLETE);
    return complete === 'true';
  } catch {
    return false;
  }
}

/**
 * Mark onboarding as complete
 */
export async function completeOnboarding(): Promise<void> {
  try {
    await AsyncStorage.setItem(StorageKeys.ONBOARDING_COMPLETE, 'true');
  } catch (error) {
    console.error('Error completing onboarding:', error);
    throw error;
  }
}
