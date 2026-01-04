// ============================================================================
// STORAGE KEYS
// Centralized AsyncStorage key definitions
// ============================================================================

/**
 * All AsyncStorage keys used in EmberMate
 * Prefix: @embermate_
 */
export const StorageKeys = {
  // Patient
  PATIENT_NAME: '@embermate_patient_name',
  
  // Medications
  MEDICATIONS: '@embermate_medications',
  MEDICATION_LOGS: '@embermate_medication_logs',
  
  // Appointments
  APPOINTMENTS: '@embermate_appointments',
  
  // Care Team
  CARE_TEAM: '@embermate_care_team',
  
  // Daily Reset
  LAST_RESET_DATE: '@embermate_last_reset_date',
  
  // Onboarding
  ONBOARDING_COMPLETE: '@embermate_onboarding_complete',
  DEMO_DATA_SEEDED: '@embermate_demo_data_seeded',
  
  // Insights
  INSIGHTS_CACHE: '@embermate_insights_cache',
} as const;

export type StorageKey = typeof StorageKeys[keyof typeof StorageKeys];
