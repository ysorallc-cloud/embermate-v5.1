// ============================================================================
// APP REVIEW PROMPT
// Triggers native App Store review dialog after positive milestones
// ============================================================================

import * as StoreReview from 'expo-store-review';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { devLog, logError } from './devLog';

const REVIEW_PROMPTED_KEY = '@embermate_review_prompted';

/**
 * Request an app review if:
 * 1. The platform supports it
 * 2. We haven't already prompted the user
 *
 * Called from streakStorage when a 7-day streak is reached.
 */
export async function maybeRequestReview(): Promise<void> {
  try {
    const alreadyPrompted = await AsyncStorage.getItem(REVIEW_PROMPTED_KEY);
    if (alreadyPrompted) {
      devLog('[AppReview] Already prompted, skipping');
      return;
    }

    const isAvailable = await StoreReview.isAvailableAsync();
    if (!isAvailable) {
      devLog('[AppReview] Store review not available on this platform');
      return;
    }

    devLog('[AppReview] Requesting store review');
    await StoreReview.requestReview();
    await AsyncStorage.setItem(REVIEW_PROMPTED_KEY, new Date().toISOString());
  } catch (error) {
    logError('appReview.maybeRequestReview', error);
  }
}
