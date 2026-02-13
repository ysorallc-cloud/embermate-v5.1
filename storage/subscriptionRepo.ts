// ============================================================================
// SUBSCRIPTION REPOSITORY
// Storage layer for subscription/tier state
// ============================================================================

import { safeGetItem, safeSetItem } from '../utils/safeStorage';
import { emitDataUpdate } from '../lib/events';
import { GlobalKeys } from '../utils/storageKeys';
import {
  SubscriptionState,
  SubscriptionTier,
  DEFAULT_SUBSCRIPTION_STATE,
} from '../types/subscription';

// ============================================================================
// PROMO CODES (local validation list)
// ============================================================================

const VALID_PROMO_CODES: Record<string, { tier: SubscriptionTier; durationDays: number }> = {
  EMBER2026: { tier: 'premium', durationDays: 365 },
  CAREGIVER: { tier: 'premium', durationDays: 90 },
  BETAUSER: { tier: 'premium', durationDays: 180 },
};

// ============================================================================
// SUBSCRIPTION OPERATIONS
// ============================================================================

/**
 * Get the current subscription state
 */
export async function getSubscriptionState(): Promise<SubscriptionState> {
  return safeGetItem<SubscriptionState>(GlobalKeys.SUBSCRIPTION_STATE, DEFAULT_SUBSCRIPTION_STATE);
}

/**
 * Set subscription tier with optional source and expiration
 */
export async function setSubscriptionTier(
  tier: SubscriptionTier,
  source?: SubscriptionState['source'],
  expiresAt?: string | null
): Promise<SubscriptionState> {
  const current = await getSubscriptionState();
  const now = new Date().toISOString();

  const updated: SubscriptionState = {
    tier,
    activatedAt: tier === 'premium' ? now : null,
    expiresAt: expiresAt ?? null,
    source: source ?? (tier === 'free' ? 'none' : current.source),
    version: current.version + 1,
  };

  await safeSetItem(GlobalKeys.SUBSCRIPTION_STATE, updated);
  emitDataUpdate('subscription');
  return updated;
}

/**
 * Activate a promo code. Returns true if valid and applied.
 */
export async function activatePromoCode(code: string): Promise<boolean> {
  const normalized = code.trim().toUpperCase();
  const promo = VALID_PROMO_CODES[normalized];
  if (!promo) return false;

  const expiresAt = new Date(
    Date.now() + promo.durationDays * 24 * 60 * 60 * 1000
  ).toISOString();

  await setSubscriptionTier(promo.tier, 'promo_code', expiresAt);
  return true;
}

/**
 * Check if subscription is active (not expired)
 */
export async function isSubscriptionActive(): Promise<boolean> {
  const state = await getSubscriptionState();
  if (state.tier === 'free') return true; // free is always "active"
  if (!state.expiresAt) return true; // no expiration = active
  return new Date(state.expiresAt) > new Date();
}
