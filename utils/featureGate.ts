// ============================================================================
// FEATURE GATE
// Checks whether the current subscription tier allows a feature
// ============================================================================

import { getSubscriptionState } from '../storage/subscriptionRepo';
import { listPatients } from '../storage/patientRegistry';
import { GatedFeature, FeatureGateResult, TIER_LIMITS } from '../types/subscription';

/**
 * Check if a gated feature is accessible under the current subscription.
 */
export async function checkFeatureAccess(feature: GatedFeature): Promise<FeatureGateResult> {
  const state = await getSubscriptionState();
  const limits = TIER_LIMITS[state.tier];

  switch (feature) {
    case 'multi_patient': {
      const patients = await listPatients();
      if (patients.length >= limits.maxPatients) {
        return {
          allowed: false,
          reason: `Free tier supports ${limits.maxPatients} patient. Upgrade to Premium for up to ${TIER_LIMITS.premium.maxPatients}.`,
          currentTier: state.tier,
          requiredTier: 'premium',
        };
      }
      return { allowed: true, currentTier: state.tier };
    }

    case 'pdf_export':
      if (!limits.pdfExport) {
        return {
          allowed: false,
          reason: 'PDF export is a Premium feature. Upgrade to export care summaries as PDF.',
          currentTier: state.tier,
          requiredTier: 'premium',
        };
      }
      return { allowed: true, currentTier: state.tier };

    case 'advanced_insights':
      // Currently free for all tiers
      return { allowed: true, currentTier: state.tier };

    default:
      return { allowed: true, currentTier: state.tier };
  }
}

/**
 * Convenience: returns true/false only
 */
export async function canUseFeature(feature: GatedFeature): Promise<boolean> {
  const result = await checkFeatureAccess(feature);
  return result.allowed;
}
