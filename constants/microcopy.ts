// ============================================================================
// MICROCOPY CONSTANTS
// Consistent copy throughout the app for unified voice and tone
// ============================================================================

export const MICROCOPY = {
  // Page subtitles
  NOW_SUBTITLE: 'What needs attention today',
  RECORD_SUBTITLE: 'What did you come here to log?',
  UNDERSTAND_SUBTITLE: 'What your data suggests',
  SUPPORT_SUBTITLE: "Who's with me, and how do I reach them",

  // Empty states
  NO_MEDICATIONS: 'No medications added yet',
  NO_VITALS: 'No vitals logged yet',
  NO_INSIGHTS: 'No patterns that need attention right now',
  NO_CARE_CIRCLE: 'Nobody in your care circle yet',
  NO_APPOINTMENTS: 'No upcoming appointments',
  NO_NOTES: 'No notes added yet',

  // Encouragement
  GOOD_JOB: 'Looking good!',
  KEEP_IT_UP: 'Keep up the great work',
  WELCOME_BACK: "Welcome back! No need to catch up—let's focus on today.",
  ALL_CAUGHT_UP: 'All caught up for now!',
  ONE_STEP: 'One step at a time',
  YOU_GOT_THIS: "You've got this",

  // Actions
  LOG_NOW: 'Log now',
  VIEW_ALL: 'View all',
  MANAGE: 'Manage',
  ADD: 'Add',
  EDIT: 'Edit',
  DELETE: 'Delete',
  CANCEL: 'Cancel',
  SAVE: 'Save',
  DONE: 'Done',
  CONTINUE: 'Continue',
  SKIP: 'Skip',

  // Time references
  TODAY: 'Today',
  YESTERDAY: 'Yesterday',
  THIS_WEEK: 'This week',
  THIS_MONTH: 'This month',
  JUST_NOW: 'Just now',

  // Care circle
  LOGGED_ON_BEHALF: 'logged on your behalf',
  SENT_UPDATE: 'sent an update',
  ADDED_NOTE: 'added a note',
  SHARED_WITH: 'shared with',

  // Encouragement for gaps
  NO_PRESSURE: 'No pressure to catch up',
  START_FRESH: 'Start fresh from today',
  WHEN_READY: "Log when you're ready",

  // Section headers
  QUICK_CHECKIN: 'QUICK CHECK-IN',
  TODAYS_SCHEDULE: "TODAY'S SCHEDULE",
  YOUR_CARE_CIRCLE: 'YOUR CARE CIRCLE',
  RECENT_COORDINATION: 'RECENT COORDINATION',
  EXPLORE_YOUR_DATA: 'EXPLORE YOUR DATA',
  QUICK_ACTION: 'QUICK ACTION',

  // Privacy
  PRIVACY_PROMISE: 'Nothing is shared without you',
  PRIVACY_CONTROL: 'Each person sees only what you allow. You control all access.',

  // Navigation links
  OPEN_FULL_RECORD: 'Open Full Record',
  MANAGE_TEAM: 'Manage team',
};

// Format relative time in a human-readable way
export function formatTimeAgo(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return MICROCOPY.JUST_NOW;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 172800) return MICROCOPY.YESTERDAY;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  // Format as date for older items
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}
