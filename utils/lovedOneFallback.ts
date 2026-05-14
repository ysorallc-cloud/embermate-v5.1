// ============================================================================
// LOVED_ONE_FALLBACK — canonical display string for the empty-patient-name
// case.
//
// Phase 23.2 F3 — consolidates a previously-split constant. Pre-23.2 the
// fallback existed in at least five places:
//   • Lowercase: app/(tabs)/now.tsx, app/(tabs)/understand.tsx,
//                app/care-plan/*, app/patient/index.tsx,
//                components/now/NowHeader.tsx, NowGreeting prop default,
//                useActivePatientName.PLACEHOLDER,
//                insightsSubtitle.PLACEHOLDER_PATIENT_NAME (inline literals
//                or local constants).
//   • Titlecase: HandoffSheet (local NAME_FALLBACK = 'Your loved one'),
//                utils/journalSubtitle.ts (NAME_FALLBACK = 'Your loved one'),
//                utils/text/composers/handoffParagraph.ts (NAME_FALLBACK).
//
// The audit confirmed the canonical form is lowercase ("your loved one")
// because the string most often renders mid-sentence (e.g. "Mom's care",
// "your loved one's care"). The three titlecase consumers now route
// through this canonical lowercase constant. Inline lowercase literals
// across screen files are left in place — they're already correct.
// ============================================================================

export const LOVED_ONE_FALLBACK = 'your loved one';
