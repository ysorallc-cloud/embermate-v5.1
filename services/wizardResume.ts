// ============================================================================
// WIZARD RESUME — Phase 5.13.g.
//
// On launch we peek at the saved Care Plan setup wizard progress to decide
// whether to redirect away from the initial route. Step 'who' is intentionally
// not auto-resumed: the user has only entered a patient name at that point,
// and a forced redirect into a name screen on cold start is more disorienting
// than helpful. Steps 'template' and 'confirm' represent meaningful in-flight
// work and resume in place.
//
// Stale (>24h) progress is cleared as a side effect of getWizardProgress()
// per the repo contract; nothing extra needs to happen here.
// ============================================================================

import { getWizardProgress, type WizardStep } from '../storage/wizardProgressRepo';

const RESUMABLE_STEPS: ReadonlySet<WizardStep> = new Set(['template', 'confirm']);

/**
 * Returns the path the app should redirect to on launch, or null if the
 * normal initial route should be used. Safe to call before any UI mounts —
 * this only reads storage and never throws.
 */
export async function getPendingWizardResume(): Promise<string | null> {
  const progress = await getWizardProgress();
  if (!progress) return null;
  if (!RESUMABLE_STEPS.has(progress.step)) return null;
  return `/care-plan/setup/${progress.step}`;
}
