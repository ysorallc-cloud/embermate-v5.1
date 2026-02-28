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
  careTeam: boolean;
  activityFeed: boolean;
  correlationReports: boolean;
}

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  free: { maxPatients: 1, pdfExport: false, advancedInsights: false, careTeam: false, activityFeed: false, correlationReports: false },
  premium: { maxPatients: 10, pdfExport: true, advancedInsights: true, careTeam: true, activityFeed: true, correlationReports: true },
};

export type GatedFeature = 'multi_patient' | 'pdf_export' | 'advanced_insights' | 'care_team' | 'activity_feed' | 'correlation_reports';

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
