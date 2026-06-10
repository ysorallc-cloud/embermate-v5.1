// ============================================================================
// WELLNESS SETTINGS TYPES
// Configuration for daily wellness checks
// ============================================================================

import type { TimeWindowLabel } from './carePlan';

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
  afternoon: WellnessCheckConfig;
  evening: WellnessCheckConfig;
  vitals: VitalsCheckConfig;
}

// ============================================================================
// SHARED MAP — wellness window → settings period
//
// Phase 34 NOT.B-prep — moved here from utils/notificationService.ts so
// both the scheduler (B1, utils/notificationService) and the generator
// (B3, services/carePlanGenerator) can import without circular deps.
// Natural home: domain is TimeWindowLabel (types/carePlan), range is
// keyof WellnessSettings (this file).
//
// Q-34.NOT.B.2 lock — only morning/afternoon/evening map. night and
// custom have NO toggle in v1; a windowLabel not in the map resolves to
// undefined and the consumer skips (B1) or falls back to TIME_OF_DAY_DEFAULTS
// for display time (B3). Do NOT add 'night' or 'custom' here without
// adding caregiver-facing toggles in wellnessSettings.
// ============================================================================
export const WINDOW_LABEL_TO_WELLNESS_PERIOD: Partial<
  Record<TimeWindowLabel, keyof WellnessSettings>
> = {
  morning: 'morning',
  afternoon: 'afternoon',
  evening: 'evening',
};

// Default settings — morning, afternoon, and evening are ALWAYS enabled
export const DEFAULT_WELLNESS_SETTINGS: WellnessSettings = {
  morning: {
    enabled: true,              // Cannot be disabled — core feature
    time: '07:00',
    checks: ['sleep', 'mood', 'energy'],
    reminderEnabled: true,
    optionalChecks: { orientation: false, decisionMaking: false },
  },
  afternoon: {
    enabled: true,              // Cannot be disabled — core feature
    time: '13:00',
    checks: ['mood', 'energy'],
    reminderEnabled: true,
    optionalChecks: {},
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
