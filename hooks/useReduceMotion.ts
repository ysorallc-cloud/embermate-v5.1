// ============================================================================
// useReduceMotion — Phase 29 Batch A.2 F4.
//
// First instance of the iOS Reduce Motion accessibility-preference pattern
// in the repo. Returns a live boolean tracking whether the user has
// "Reduce Motion" enabled in Settings → Accessibility → Motion.
//
// Phase 29 Batch A.2 F3 wired the breath-synced orb scale via Reanimated.
// For users who can't tolerate motion (vestibular disorders, motion-
// sensitivity, migraine triggers), the same animation that gives most
// caregivers somatic pacing can cause real discomfort. F4 honors the
// system preference: when reduceMotion is true, the breathing exercise's
// scale animation no-ops; the countdown digit + phase labels become the
// primary pacing cue.
//
// Live updates: subscribes to the `reduceMotionChanged` event so a user
// who toggles the preference mid-flow gets the new behavior on the next
// phase transition, not just at next mount.
//
// Extractable beyond BreathingExercise — any future animation surface
// (Aurora background, onboarding slides, journal animations) can consume
// this hook the same way.
// ============================================================================

import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) setReduceMotion(enabled);
      })
      .catch(() => {
        // Older RN versions or unusual platforms may not expose the API;
        // fall back to motion-enabled (the default behavior) silently.
      });

    const sub = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled: boolean) => {
        if (mounted) setReduceMotion(enabled);
      },
    );

    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);

  return reduceMotion;
}
