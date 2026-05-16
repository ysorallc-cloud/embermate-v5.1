// ============================================================================
// composeYouGreeting — Phase 29.
//
// Time-aware greeting line for the You tab. Replaces the pre-29 22pt "You"
// title + "A space for you, not your loved one" subtitle pair with a single
// Georgia italic line that names the caregiver and carries the time-of-day.
//
// Buckets (matching smartDefaultsEngine + the rest of the app's time-of-day
// convention; see also components/journal/JournalEmptyDay.tsx Phase 27.5b F8):
//   • hour <  12      → "Morning, {name}."
//   • 12 ≤ hour < 17  → "Afternoon, {name}."
//   • hour ≥ 17       → "Evening, {name}."
// Empty / missing name falls back to "Hello." — no chip, no "your loved one"
// copy, identity-not-a-slot pattern (matches Phase 26 F3's caregiver chip
// fallback).
// ============================================================================

export interface YouGreetingInput {
  /** Hour of day, 0-23. Caller passes `new Date().getHours()`. */
  hour: number;
  /** Caregiver display name. Empty/whitespace falls back to "Hello." */
  name: string;
}

function timeBucket(hour: number): 'morning' | 'afternoon' | 'evening' {
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

export function composeYouGreeting(input: YouGreetingInput): string {
  const trimmed = input.name.trim();
  if (trimmed.length === 0) return 'Hello.';
  const bucket = timeBucket(input.hour);
  const label = bucket === 'morning' ? 'Morning'
    : bucket === 'afternoon' ? 'Afternoon'
    : 'Evening';
  return `${label}, ${trimmed}.`;
}
