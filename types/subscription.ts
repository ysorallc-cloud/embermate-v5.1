// ============================================================================
// SUBSCRIPTION TYPES
// Freemium monetization data structures
// ============================================================================

export type SubscriptionTier = 'free' | 'premium';

export interface SubscriptionState {
  tier: SubscriptionTier;
  activatedAt: string | null;
  expiresAt: string | null;
  source: 'none' | 'app_store' | 'google_play' | 'promo_code';
  version: number;
}

export interface TierLimits {
  maxPatients: number;
  pdfExport: boolean;
  advancedInsights: boolean;
}

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  free: { maxPatients: 1, pdfExport: false, advancedInsights: true },
  premium: { maxPatients: 10, pdfExport: true, advancedInsights: true },
};

export type GatedFeature = 'multi_patient' | 'pdf_export' | 'advanced_insights';

export interface FeatureGateResult {
  allowed: boolean;
  reason?: string;
  currentTier: SubscriptionTier;
  requiredTier?: SubscriptionTier;
}

export const DEFAULT_SUBSCRIPTION_STATE: SubscriptionState = {
  tier: 'free',
  activatedAt: null,
  expiresAt: null,
  source: 'none',
  version: 1,
};
