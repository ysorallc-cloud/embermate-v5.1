// ============================================================================
// QUICK LOG OPTIONS
// Defines all quick log types with core (3 always visible) and more options
// ============================================================================

export interface QuickLogOption {
  id: string;
  icon: string;
  label: string;
  description: string;
  screen: string; // Navigation target
  isCore: boolean; // Shows on TODAY screen
  category: 'core' | 'health' | 'daily' | 'care';
}

export const QUICK_LOG_OPTIONS: QuickLogOption[] = [
  // CORE (shown on TODAY screen)
  {
    id: 'meds',
    icon: '💊',
    label: 'Meds',
    description: 'Log medication taken or skipped',
    screen: '/medication-confirm',
    isCore: true,
    category: 'core',
  },
  {
    id: 'wellness',
    icon: '🌅',
    label: 'Wellness',
    description: 'Morning or evening check-in',
    screen: '/log-morning-wellness',
    isCore: true,
    category: 'core',
  },
  {
    id: 'vitals',
    icon: '❤️',
    label: 'Vitals',
    description: 'BP, glucose, weight, O2, temp',
    screen: '/log-vitals',
    isCore: true,
    category: 'core',
  },

  // MORE OPTIONS
  {
    id: 'note',
    icon: '📝',
    label: 'Note',
    description: 'Observation or reminder',
    screen: '/log-note',
    isCore: false,
    category: 'care',
  },
  {
    id: 'meals',
    icon: '🍽️',
    label: 'Meals',
    description: 'Breakfast, lunch, dinner, snacks',
    screen: '/log-meal',
    isCore: false,
    category: 'daily',
  },
  {
    id: 'hydration',
    icon: '💧',
    label: 'Hydration',
    description: 'Water and fluid intake',
    screen: '/log-hydration',
    isCore: false,
    category: 'daily',
  },
  {
    id: 'sleep',
    icon: '💤',
    label: 'Sleep',
    description: 'Hours slept, quality',
    screen: '/log-sleep',
    isCore: false,
    category: 'daily',
  },
  {
    id: 'activity',
    icon: '🚶',
    label: 'Activity',
    description: 'Exercise, steps, movement',
    screen: '/log-activity',
    isCore: false,
    category: 'daily',
  },
  {
    id: 'bathroom',
    icon: '🚽',
    label: 'Bathroom',
    description: 'Bowel movements, urination',
    screen: '/log-bathroom',
    isCore: false,
    category: 'health',
  },
  {
    id: 'symptom',
    icon: '🤒',
    label: 'Symptom',
    description: 'Log a symptom or side effect',
    screen: '/log-symptom',
    isCore: false,
    category: 'health',
  },
  {
    id: 'appointment',
    icon: '📅',
    label: 'Appointment',
    description: 'Schedule or log a visit',
    screen: '/appointments',
    isCore: false,
    category: 'care',
  },
];

// Helper to get core options
export const CORE_OPTIONS = QUICK_LOG_OPTIONS.filter((o) => o.isCore);

// Helper to get more options
export const MORE_OPTIONS = QUICK_LOG_OPTIONS.filter((o) => !o.isCore);
