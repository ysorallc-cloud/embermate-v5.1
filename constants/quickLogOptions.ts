// ============================================================================
// QUICK LOG OPTIONS
// Defines core (permanent) and custom (user-addable) quick log types
// ============================================================================

export interface QuickLogOption {
  id: string;
  icon: string;
  label: string;
  description: string;
  screen: string; // Navigation target for logging
  isCore: boolean; // True = cannot be removed
}

// Core options - always visible, cannot be removed
export const CORE_OPTIONS: QuickLogOption[] = [
  {
    id: 'symptom',
    icon: '🩹',
    label: 'Symptom',
    description: 'Pain, nausea, dizziness...',
    screen: '/log-symptom',
    isCore: true,
  },
  {
    id: 'vitals',
    icon: '❤️',
    label: 'Vitals',
    description: 'BP, glucose, weight, O2',
    screen: '/log-vitals',
    isCore: true,
  },
  {
    id: 'note',
    icon: '📝',
    label: 'Note',
    description: 'Observation or reminder',
    screen: '/log-note',
    isCore: true,
  },
];

// Custom options - user can add/remove these
export const CUSTOM_OPTIONS: QuickLogOption[] = [
  {
    id: 'prn',
    icon: '💊',
    label: 'PRN Medication',
    description: 'As-needed meds taken',
    screen: '/log-prn',
    isCore: false,
  },
  {
    id: 'meal',
    icon: '🍽️',
    label: 'Meal',
    description: 'Food and fluid intake',
    screen: '/log-meal',
    isCore: false,
  },
  {
    id: 'sleep',
    icon: '😴',
    label: 'Sleep',
    description: 'Nap or rest period',
    screen: '/log-sleep',
    isCore: false,
  },
  {
    id: 'activity',
    icon: '🚶',
    label: 'Activity',
    description: 'Walking, exercise, PT',
    screen: '/log-activity',
    isCore: false,
  },
  {
    id: 'mood',
    icon: '🧠',
    label: 'Mood/Behavior',
    description: 'Mental state changes',
    screen: '/log-mood',
    isCore: false,
  },
  {
    id: 'hydration',
    icon: '💧',
    label: 'Hydration',
    description: 'Fluid intake tracking',
    screen: '/log-hydration',
    isCore: false,
  },
  {
    id: 'bathroom',
    icon: '🚽',
    label: 'Bathroom',
    description: 'Output tracking',
    screen: '/log-bathroom',
    isCore: false,
  },
];

export const ALL_OPTIONS = [...CORE_OPTIONS, ...CUSTOM_OPTIONS];
