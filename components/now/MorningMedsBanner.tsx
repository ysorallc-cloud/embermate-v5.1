// ============================================================================
// MORNING MEDS BANNER — batch-confirm affordance for pending medications.
//
// Phase 23.1 Fix 2 — softened from amber-alert treatment to witness-voice
// lavender. Pre-23.1 this rendered as a warmSurfaceAlert card with an
// amber-tinted "Confirm All" button and "X meds due now" copy that read
// as urgent/judgmental — fighting the rest of the Now tab's observational
// register. Post-23.1 the card uses the caregiverAccentBg / caregiverAccent
// palette (matches EndOfShiftCard's lavender handoff voice) and the CTA is
// a ghost text link rather than a filled pill. Copy reframed from "due now"
// to "ready to log together" — observational, not commanding. Handler logic
// (onConfirmAll, one-shot dismiss, instanceIds) is unchanged.
// ============================================================================
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface MorningMedsBannerProps {
  pendingCount: number;
  onConfirmAll: (instanceIds: string[]) => Promise<void>;
  pendingInstanceIds: string[];
}

export function MorningMedsBanner({
  pendingCount,
  onConfirmAll,
  pendingInstanceIds,
}: MorningMedsBannerProps) {
  const { colors } = useTheme();
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  if (pendingCount === 0 || confirmed) return null;

  const handleBatchConfirm = async () => {
    setConfirming(true);
    try {
      await onConfirmAll(pendingInstanceIds);
      setConfirmed(true);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <View
      testID="morning-meds-banner"
      style={[styles.container, { backgroundColor: colors.caregiverAccentBg, borderColor: colors.caregiverAccentStrong }]}
    >
      <View style={styles.content}>
        <Text style={[styles.emoji]}>💊</Text>
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: colors.caregiverAccent }]}>
            {pendingCount} medication{pendingCount !== 1 ? 's' : ''} ready
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Tap to log them together
          </Text>
        </View>
        <TouchableOpacity
          style={styles.button}
          onPress={handleBatchConfirm}
          disabled={confirming}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel={`Confirm all ${pendingCount} medications`}
          accessibilityRole="button"
        >
          <Text style={[styles.buttonText, { color: colors.caregiverAccent }]}>
            {confirming ? '…' : 'Confirm all →'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 0.5,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  emoji: {
    fontSize: 22,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  button: {
    alignSelf: 'center',
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
