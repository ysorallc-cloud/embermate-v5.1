// ============================================================================
// CATEGORY CONFIG — Single source of truth for item type labels + colors
// Used by BOTH Today's Progress chips AND Timeline type badges.
// ============================================================================

// Labels are concrete nouns a caregiver thinks in, not abstract categories.
export const CATEGORY_CONFIG: Record<string, { label: string; chipLabel: string; color: string }> = {
  medication:  { label: 'CARE',       chipLabel: 'Meds',      color: '#34D399' }, // green (accent)
  vitals:      { label: 'VITALS',    chipLabel: 'Vitals',    color: '#A78BFA' }, // purple
  wellness:    { label: 'WELLNESS',  chipLabel: 'Check-ins', color: '#34D399' }, // green (accent)
  nutrition:   { label: 'MEAL',      chipLabel: 'Meals',     color: '#FBBF24' }, // amber
  hydration:   { label: 'WATER',     chipLabel: 'Water',     color: '#38BDF8' }, // sky
  sleep:       { label: 'SLEEP',     chipLabel: 'Sleep',     color: '#A78BFA' }, // purple
  activity:    { label: 'ACTIVITY',  chipLabel: 'Activity',  color: '#F97316' }, // orange
  errand:      { label: 'ERRAND',    chipLabel: 'Errands',   color: '#FBBF24' }, // amber
  self_care:   { label: 'YOU',       chipLabel: 'Self-care', color: '#F472B6' }, // rose
  shift:       { label: 'HANDOFF',   chipLabel: 'Handoff',   color: '#7DD3FC' }, // sky
  appointment: { label: 'APPT',      chipLabel: 'Appts',     color: '#EF4444' }, // red
  custom:      { label: 'TASK',      chipLabel: 'Tasks',     color: '#A78BFA' }, // purple
};
