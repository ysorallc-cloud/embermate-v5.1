// ============================================================================
// REFLECTION PROMPTS — 30 daily prompts cycling monthly
// Warm, personal, non-clinical, never guilt-inducing
// ============================================================================

const PROMPTS: string[] = [
  "What's one thing you did today that made a difference?",
  "How are you feeling right now — not as a caregiver, but as a person?",
  "Was there a moment today that surprised you?",
  "What would you tell a friend who had a day like yours?",
  "What's something small that brought you comfort today?",
  "If you could let go of one thing from today, what would it be?",
  "What's something you're looking forward to, even if it's small?",
  "Did anything make you smile today?",
  "What's one thing you wish people understood about your day?",
  "How did you take care of yourself today, even a little?",
  "What felt heavy today? You don't have to carry it all.",
  "Is there something you need but haven't asked for?",
  "What's one thing that went better than expected?",
  "If today had a title, what would it be?",
  "What would make tomorrow a little easier?",
  "Who made you feel seen today?",
  "What's a small win you can give yourself credit for?",
  "What does rest look like for you right now?",
  "Is there something you want to remember about today?",
  "What's one boundary you held or wish you'd held?",
  "How would you describe your energy level in one word?",
  "What's one kind thing you can say to yourself tonight?",
  "Did you eat something you enjoyed today?",
  "What's something you're proud of, even if no one noticed?",
  "If you could pause one moment from today and stay there, which would it be?",
  "What do you need more of this week?",
  "What's one thing you did today just because it needed doing?",
  "How did today compare to what you expected?",
  "What's a feeling you had today that you want to name?",
  "What would you like tomorrow's version of you to know?",
];

/**
 * Returns the daily prompt for a given date.
 * Cycles through 30 prompts based on day-of-month.
 */
export function getDailyPrompt(date: string): string {
  const day = parseInt(date.split('-')[2], 10);
  const index = ((day - 1) % PROMPTS.length + PROMPTS.length) % PROMPTS.length;
  return PROMPTS[index];
}

/**
 * Returns all prompts (for testing/preview).
 */
export function getAllPrompts(): string[] {
  return [...PROMPTS];
}
