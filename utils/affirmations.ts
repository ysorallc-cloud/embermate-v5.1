// ============================================================================
// AFFIRMATIONS — Curated reflection-space copy for the You tab.
//
// Tonal philosophy: caregivers don't want toxic positivity. The library
// skews toward acknowledgment (you are carrying real weight) and permission
// (you don't have to be okay) over cheerleading. Each line is ≤ 80 chars
// so it fits on one line in the reflection card on iPhone SE through
// Pro Max.
//
// Avoid:
//   • Commands ("Take care of yourself!", "Rest!")
//   • "You've got this" / "you got this" / "stay strong" / "chin up"
//   • Medical or curative claims ("you will feel better", "will heal")
//   • Exclamation marks (proxy for cheerleading tone)
// ============================================================================

// ── Acknowledgment ─────────────────────────────────────────────────────────
// The work is real. You're carrying weight that often goes unseen.
const ACKNOWLEDGMENT = [
  "You're carrying a lot. Take a moment for yourself.",
  'Caring for someone is real work. Rest is part of it.',
  'Showing up is enough some days.',
  "You don't have to be perfect to be enough.",
  'Caregiving is invisible work. It still counts.',
  'Some days, just being present is the work.',
  'You notice things others miss. That counts as care.',
  'What you do matters, even when no one says so.',
] as const;

// ── Permission ─────────────────────────────────────────────────────────────
// You're allowed. To be tired. To not have it together. To ask.
const PERMISSION = [
  "It's okay to not be okay today.",
  "You're allowed to feel however you're feeling.",
  "Hard days don't mean you're failing.",
  'You can ask for help.',
  'Setting limits is part of caring well.',
  "Tired isn't failing. It's information.",
  "You don't have to do it all today.",
  "It's okay to step away for a few minutes.",
] as const;

// ── Quiet hope ─────────────────────────────────────────────────────────────
// Forward motion without the bright lights.
const QUIET_HOPE = [
  'Small acts of self-care add up.',
  'Tomorrow is another chance — but right now matters too.',
  'Every day you keep going is a kind of strength.',
  "You're doing more than you realize.",
  "The hard part won't last forever.",
  'Tiny rests count. So does this one.',
  "You've handled hard before.",
  'There is more grace in your day than you can see.',
] as const;

export const AFFIRMATIONS = [
  ...ACKNOWLEDGMENT,
  ...PERMISSION,
  ...QUIET_HOPE,
] as const;

// Note: the daily-rotation picker lives in utils/dailyAffirmation.ts so the
// data and the selection algorithm can evolve independently.
