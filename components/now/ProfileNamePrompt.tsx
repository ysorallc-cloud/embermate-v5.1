// ============================================================================
// ProfileNamePrompt — post-onboarding caregiver-name recovery nudge.
//
// Onboarding redesign C4 deferred the caregiver's own name (the new
// 4-screen flow only captures the patient's name). This nudge
// recovers the personalization that downstream surfaces
// (JournalIdentityStrip, JournalNotesCard, handoffs) need to show
// "who wrote what." It's a soft offer, not a blocker — see the
// visibility predicate at utils/profileNamePromptVisibility.ts.
//
// Visual lock per the spec:
//   • cardGlass bg + 1px glassBorder hairline (deliberately NOT the
//     saturated sage call-to-action color used by the louder
//     NudgePrompt — this is a whisper, not a banner)
//   • serif body, 14px message in Fonts.serif
//   • chevron on the right (textTertiary, subtle) — tapping the row
//     opens /settings/profile for name capture
//   • × dismiss affordance on the right, textMuted 16px, NOT a
//     competing CTA shape
//
// Save path:
//   Tapping the row navigates to the existing /settings/profile
//   route. When the user saves there, writePatientName /
//   writeCaregiverName emits EVENT.PATIENT; the nudge re-reads on
//   the next render and auto-hides because CAREGIVER_NAME is no
//   longer null. We do NOT build a new screen here — reuse over
//   build.
//
// Dismiss path:
//   The × button increments
//   @embermate_profile_nudge_dismissed_count. After 3 dismissals the
//   nudge never appears again (respect the no).
// ============================================================================

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors, Fonts, Spacing, BorderRadius } from '../../theme/theme-tokens';
import { safeGetItem, safeSetItem } from '../../utils/safeStorage';
import { StorageKeys } from '../../utils/storageKeys';
import { navigate } from '../../lib/navigate';
import { useDataListener, emitDataUpdate } from '../../lib/events';
import { EVENT } from '../../lib/eventNames';
import { useSampleMode } from '../../hooks/useSampleMode';
import { logError } from '../../utils/devLog';
import {
  computeProfileNamePromptVisibility,
} from '../../utils/profileNamePromptVisibility';

const DISMISS_KEY = '@embermate_profile_nudge_dismissed_count';

export interface ProfileNamePromptProps {
  /** Provided by the Now tab. The nudge gates on hasRealLoggedEvent
   *  to avoid asking before the caregiver has felt the app's value;
   *  the Now tab already computes this signal for its own surfaces
   *  (welcome card, prompts) and threads it here. */
  hasRealLoggedEvent: boolean;
}

export const ProfileNamePrompt: React.FC<ProfileNamePromptProps> = ({
  hasRealLoggedEvent,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { isSampleMode } = useSampleMode();
  const [onboardingComplete, setOnboardingComplete] = useState<boolean>(false);
  const [caregiverName, setCaregiverName] = useState<string | null>(null);
  const [dismissedCount, setDismissedCount] = useState<number>(0);
  const [dismissedThisSession, setDismissedThisSession] = useState<boolean>(false);

  const refresh = useCallback(async () => {
    try {
      const [completeFlag, name, count] = await Promise.all([
        safeGetItem<string | null>(StorageKeys.ONBOARDING_COMPLETE, null),
        safeGetItem<string | null>(StorageKeys.CAREGIVER_NAME, null),
        safeGetItem<number>(DISMISS_KEY, 0),
      ]);
      setOnboardingComplete(completeFlag === 'true');
      setCaregiverName(name && name.trim().length > 0 ? name : null);
      setDismissedCount(typeof count === 'number' ? count : 0);
    } catch (e) {
      logError('ProfileNamePrompt.refresh', e);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Re-read when PATIENT-related state updates fire (caregiver name
  // saved in Settings → Profile emits the same event JournalIdentityStrip
  // already subscribes to).
  useDataListener((category) => {
    if (category === EVENT.PATIENT) refresh();
  });

  const isVisible = computeProfileNamePromptVisibility({
    onboardingComplete,
    caregiverName,
    hasRealLoggedEvent,
    dismissedCount,
    isSampleMode,
  });

  if (!isVisible || dismissedThisSession) return null;

  const handleOpenNameCapture = () => {
    navigate('/settings/profile' as any);
  };

  const handleDismiss = async () => {
    setDismissedThisSession(true);
    try {
      const next = dismissedCount + 1;
      await safeSetItem(DISMISS_KEY, next);
      setDismissedCount(next);
      emitDataUpdate(EVENT.PATIENT);
    } catch (e) {
      logError('ProfileNamePrompt.dismiss', e);
    }
  };

  return (
    <View style={styles.card} accessibilityRole="none">
      <Pressable
        onPress={handleOpenNameCapture}
        accessibilityRole="button"
        accessibilityLabel="Add your name so handoffs show who wrote what"
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      >
        <Text style={styles.message} numberOfLines={2}>
          Add your name so handoffs show who wrote what.
        </Text>
        <Ionicons
          name="chevron-forward"
          size={16}
          color={colors.textTertiary}
          style={styles.chevron}
        />
      </Pressable>
      <Pressable
        onPress={handleDismiss}
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
        hitSlop={8}
        style={({ pressed }) => [styles.dismiss, pressed && styles.dismissPressed]}
      >
        <Text style={styles.dismissText}>×</Text>
      </Pressable>
    </View>
  );
};

const createStyles = (c: typeof Colors) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.glass,
    borderWidth: 1,
    borderColor: c.glassBorder,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12, // allow: nudge card vertical rhythm — whisper not banner
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: Spacing.sm,
  },
  rowPressed: {
    opacity: 0.7,
  },
  message: {
    flex: 1,
    fontFamily: Fonts.serif,
    fontSize: 14, // allow: nudge message — serif gentle copy
    lineHeight: 20, // allow: comfortable serif rhythm
    color: c.textPrimary,
  },
  chevron: {
    marginLeft: Spacing.sm,
  },
  dismiss: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  dismissPressed: {
    opacity: 0.5,
  },
  dismissText: {
    fontSize: 16, // allow: × dismiss affordance per spec — subtle, not competing
    color: c.textMuted,
    fontWeight: '400' as const,
  },
});

export default ProfileNamePrompt;
