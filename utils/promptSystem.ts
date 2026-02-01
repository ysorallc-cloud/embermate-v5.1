// ============================================================================
// PROMPT SYSTEM
// 4 prompt types: Orientation, Regulation, Nudge, Closure
// Designed to lower anxiety, not raise it
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const LAST_OPEN_KEY = '@embermate_last_app_open';
const PROMPT_DISMISSED_KEY = '@embermate_prompt_dismissed';
const ONBOARDING_COMPLETE_KEY = '@embermate_onboarding_complete';
const NOTIFICATION_PROMPT_DISMISSED_KEY = '@embermate_notification_prompt_dismissed';
const NOTIFICATION_PROMPT_TRIGGERED_KEY = '@embermate_notification_prompt_triggered';

// ============================================================================
// TYPES
// ============================================================================

export type PromptType = 'orientation' | 'regulation' | 'nudge' | 'closure' | null;

export interface OrientationPrompt {
  type: 'orientation';
  message: string;
  pendingCount: number;
}

export interface RegulationPrompt {
  type: 'regulation';
  message: string;
  reason: 'overdue' | 'low_mood' | 'rapid_nav' | 'long_gap';
}

export interface NudgePrompt {
  type: 'nudge';
  message: string;
  category: 'medication' | 'vitals' | 'meals' | 'water' | 'mood' | 'sleep';
  route: string;
}

export interface ClosurePrompt {
  type: 'closure';
  message: string;
}

export type Prompt = OrientationPrompt | RegulationPrompt | NudgePrompt | ClosurePrompt | null;

// ============================================================================
// ORIENTATION PROMPTS
// Answer: "What's going on?"
// Trigger: App open after 12-24 hours, multiple items pending, first open of day
// ============================================================================

const ORIENTATION_MESSAGES = {
  nothing_urgent: [
    "Nothing urgent right now.",
    "All clear for the moment.",
    "No pressing items today.",
  ],
  few_pending: [
    "A few things are pending. You can take them one at a time.",
    "Some items to check when you're ready.",
    "A couple things need attention, no rush.",
  ],
  several_pending: [
    "Here's what still needs attention.",
    "Several items are waiting. Start wherever feels right.",
    "A few things to work through today.",
  ],
  first_open: [
    "Good morning. Here's the day ahead.",
    "Starting fresh today.",
    "New day, new start.",
  ],
};

export function getOrientationPrompt(
  pendingCount: number,
  isFirstOpenOfDay: boolean
): OrientationPrompt | null {
  let message: string;

  if (isFirstOpenOfDay && pendingCount > 0) {
    message = ORIENTATION_MESSAGES.first_open[Math.floor(Math.random() * ORIENTATION_MESSAGES.first_open.length)];
  } else if (pendingCount === 0) {
    message = ORIENTATION_MESSAGES.nothing_urgent[Math.floor(Math.random() * ORIENTATION_MESSAGES.nothing_urgent.length)];
  } else if (pendingCount <= 3) {
    message = ORIENTATION_MESSAGES.few_pending[Math.floor(Math.random() * ORIENTATION_MESSAGES.few_pending.length)];
  } else {
    message = ORIENTATION_MESSAGES.several_pending[Math.floor(Math.random() * ORIENTATION_MESSAGES.several_pending.length)];
  }

  return {
    type: 'orientation',
    message,
    pendingCount,
  };
}

// ============================================================================
// REGULATION PROMPTS
// Answer: "How am I holding up?"
// Trigger: 2+ overdue items, low mood, rapid navigation, long gap since last use
// ============================================================================

const REGULATION_MESSAGES = {
  overdue: [
    "Before continuing, take a moment.",
    "A short pause might help.",
    "You're managing a lot. One breath is enough.",
  ],
  low_mood: [
    "It sounds like a hard day. A pause might help.",
    "Before the next thing, check in with yourself.",
    "One moment for you.",
  ],
  rapid_nav: [
    "Slow is okay.",
    "One thing at a time.",
    "There's no rush here.",
  ],
  long_gap: [
    "Welcome back. Take it easy.",
    "No need to catch up all at once.",
    "Start with just one thing.",
  ],
};

export function getRegulationPrompt(
  overdueCount: number,
  moodLevel: number | null, // 1-5 scale
  isRapidNavigation: boolean,
  hoursSinceLastOpen: number
): RegulationPrompt | null {
  let reason: 'overdue' | 'low_mood' | 'rapid_nav' | 'long_gap';
  let messages: string[];

  // Priority: low mood > overdue > rapid nav > long gap
  if (moodLevel !== null && moodLevel <= 2) {
    reason = 'low_mood';
    messages = REGULATION_MESSAGES.low_mood;
  } else if (overdueCount >= 2) {
    reason = 'overdue';
    messages = REGULATION_MESSAGES.overdue;
  } else if (isRapidNavigation) {
    reason = 'rapid_nav';
    messages = REGULATION_MESSAGES.rapid_nav;
  } else if (hoursSinceLastOpen > 72) {
    reason = 'long_gap';
    messages = REGULATION_MESSAGES.long_gap;
  } else {
    return null;
  }

  return {
    type: 'regulation',
    message: messages[Math.floor(Math.random() * messages.length)],
    reason,
  };
}

// ============================================================================
// NUDGE PROMPTS
// Answer: "What's the smallest useful thing I could do?"
// Trigger: Single overdue task, partially completed check-in, missed but relevant item
// Rules: One suggestion only, no lists, no urgency language
// ============================================================================

const NUDGE_MESSAGES = {
  medication: [
    "One medication remains.",
    "A medication is still pending.",
    "One dose left today.",
  ],
  vitals: [
    "Vitals weren't logged yet.",
    "Vitals are open when ready.",
    "Vitals check available.",
  ],
  meals: [
    "Meals are still open today.",
    "A meal could be logged.",
    "Meal tracking is available.",
  ],
  water: [
    "Water tracking is open.",
    "Hydration could be updated.",
  ],
  mood: [
    "Mood check is available.",
    "Mood hasn't been logged yet.",
  ],
  sleep: [
    "Sleep hasn't been logged.",
    "Sleep tracking is open.",
  ],
};

export function getNudgePrompt(
  category: 'medication' | 'vitals' | 'meals' | 'water' | 'mood' | 'sleep',
  route: string
): NudgePrompt {
  const messages = NUDGE_MESSAGES[category];
  return {
    type: 'nudge',
    message: messages[Math.floor(Math.random() * messages.length)],
    category,
    route,
  };
}

// ============================================================================
// CLOSURE PROMPTS
// Answer: "Am I done?"
// Trigger: All scheduled items completed, end of day, user finishes last task
// This prevents burnout.
// ============================================================================

const CLOSURE_MESSAGES = [
  "Everything for today is complete.",
  "Nothing else needs attention.",
  "You can rest.",
  "All done for now.",
  "Today's tasks are finished.",
  "Well done. That's everything.",
];

export function getClosurePrompt(): ClosurePrompt {
  return {
    type: 'closure',
    message: CLOSURE_MESSAGES[Math.floor(Math.random() * CLOSURE_MESSAGES.length)],
  };
}

// ============================================================================
// TRACKING HELPERS
// ============================================================================

export async function recordAppOpen(): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_OPEN_KEY, new Date().toISOString());
  } catch (error) {
    console.error('Error recording app open:', error);
  }
}

export async function getHoursSinceLastOpen(): Promise<number> {
  try {
    const lastOpen = await AsyncStorage.getItem(LAST_OPEN_KEY);
    if (!lastOpen) return 999; // First time user

    const lastOpenDate = new Date(lastOpen);
    const now = new Date();
    const diffMs = now.getTime() - lastOpenDate.getTime();
    return diffMs / (1000 * 60 * 60);
  } catch (error) {
    console.error('Error getting last open time:', error);
    return 0;
  }
}

export async function isFirstOpenOfDay(): Promise<boolean> {
  try {
    const lastOpen = await AsyncStorage.getItem(LAST_OPEN_KEY);
    if (!lastOpen) return true;

    const lastOpenDate = new Date(lastOpen);
    const today = new Date();

    return lastOpenDate.toDateString() !== today.toDateString();
  } catch (error) {
    console.error('Error checking first open:', error);
    return false;
  }
}

export async function dismissPrompt(promptType: PromptType): Promise<void> {
  try {
    const today = new Date().toDateString();
    const key = `${PROMPT_DISMISSED_KEY}_${promptType}_${today}`;
    await AsyncStorage.setItem(key, 'true');
  } catch (error) {
    console.error('Error dismissing prompt:', error);
  }
}

export async function isPromptDismissed(promptType: PromptType): Promise<boolean> {
  try {
    const today = new Date().toDateString();
    const key = `${PROMPT_DISMISSED_KEY}_${promptType}_${today}`;
    const dismissed = await AsyncStorage.getItem(key);
    return dismissed === 'true';
  } catch (error) {
    console.error('Error checking prompt dismissed:', error);
    return false;
  }
}

// ============================================================================
// ONBOARDING TRACKING
// ============================================================================

export async function isOnboardingComplete(): Promise<boolean> {
  try {
    const complete = await AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY);
    return complete === 'true';
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    return false;
  }
}

export async function completeOnboarding(): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
  } catch (error) {
    console.error('Error completing onboarding:', error);
  }
}

// ============================================================================
// NOTIFICATION PROMPT TRACKING
// Rules: No first launch, trigger once after relevant action, no nagging
// ============================================================================

export async function isNotificationPromptDismissed(): Promise<boolean> {
  try {
    const dismissed = await AsyncStorage.getItem(NOTIFICATION_PROMPT_DISMISSED_KEY);
    return dismissed === 'true';
  } catch (error) {
    console.error('Error checking notification prompt status:', error);
    return false;
  }
}

export async function dismissNotificationPrompt(): Promise<void> {
  try {
    await AsyncStorage.setItem(NOTIFICATION_PROMPT_DISMISSED_KEY, 'true');
  } catch (error) {
    console.error('Error dismissing notification prompt:', error);
  }
}

export async function triggerNotificationPrompt(): Promise<void> {
  try {
    // Only trigger if not already dismissed
    const dismissed = await isNotificationPromptDismissed();
    if (!dismissed) {
      await AsyncStorage.setItem(NOTIFICATION_PROMPT_TRIGGERED_KEY, 'true');
    }
  } catch (error) {
    console.error('Error triggering notification prompt:', error);
  }
}

export async function shouldShowNotificationPrompt(): Promise<boolean> {
  try {
    // Check all conditions:
    // 1. Onboarding must be complete
    const onboardingComplete = await isOnboardingComplete();
    if (!onboardingComplete) return false;

    // 2. Must not be dismissed
    const dismissed = await isNotificationPromptDismissed();
    if (dismissed) return false;

    // 3. Must have been triggered by a relevant action
    const triggered = await AsyncStorage.getItem(NOTIFICATION_PROMPT_TRIGGERED_KEY);
    if (triggered !== 'true') return false;

    return true;
  } catch (error) {
    console.error('Error checking notification prompt:', error);
    return false;
  }
}

// Navigation tracking for rapid navigation detection
let navigationTimestamps: number[] = [];

export function recordNavigation(): void {
  const now = Date.now();
  navigationTimestamps.push(now);
  // Keep only last 10 navigations
  if (navigationTimestamps.length > 10) {
    navigationTimestamps = navigationTimestamps.slice(-10);
  }
}

export function isRapidNavigation(): boolean {
  if (navigationTimestamps.length < 5) return false;

  const recentFive = navigationTimestamps.slice(-5);
  const timeSpan = recentFive[4] - recentFive[0];

  // 5 navigations in less than 10 seconds = rapid
  return timeSpan < 10000;
}
