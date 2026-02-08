// ============================================================================
// WELLNESS SETTINGS TYPES
// Configuration for daily wellness checks
// ============================================================================

export interface WellnessCheckConfig {
  enabled: boolean;             // Morning/evening always true by default
  time: string;                 // "07:00" format
  checks: string[];             // What to log
  reminderEnabled: boolean;     // Push notification
  optionalChecks: Record<string, boolean>; // Toggle-able extra fields
}

export interface VitalsCheckConfig {
  enabled: boolean;             // Optional — user enables
  time: string;
  types: string[];              // ['bp', 'glucose', 'weight']
  reminderEnabled: boolean;
}

export interface WellnessSettings {
  morning: WellnessCheckConfig;
  evening: WellnessCheckConfig;
  vitals: VitalsCheckConfig;
}

// Default settings — morning and evening are ALWAYS enabled
export const DEFAULT_WELLNESS_SETTINGS: WellnessSettings = {
  morning: {
    enabled: true,              // Cannot be disabled — core feature
    time: '07:00',
    checks: ['sleep', 'mood', 'energy'],
    reminderEnabled: true,
    optionalChecks: { orientation: false, decisionMaking: false },
  },
  evening: {
    enabled: true,              // Cannot be disabled — core feature
    time: '20:00',
    checks: ['mood', 'meals', 'dayRating', 'notes'],
    reminderEnabled: true,
    optionalChecks: { painLevel: false, alertness: false, bowelMovement: false, bathingStatus: false, mobilityStatus: false },
  },
  vitals: {
    enabled: false,             // Optional — enable based on conditions
    time: '08:30',
    types: ['bp', 'glucose'],
    reminderEnabled: false,
  },
};
