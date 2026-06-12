// ============================================================================
// MORNING MEDS BANNER — batch-confirm affordance for pending medications.
//
// Phase 23.1 Fix 2 — softened from amber-alert to witness-voice lavender
// chrome. Phase 33b Scope 2 — Surface 1 lavender scale reduction: full
// lavender chrome (~80% footprint — border + bg + headline + body + CTA)
// decomposed to a "READY TO LOG" lavender eyebrow + cream serif headline
// + cream body + sage CTA + no border chrome.
//
// UX-2 follow-up (post device walk) — the "READY TO LOG" eyebrow is
// retired. The card speaks for itself: the medication-count headline +
// the "Confirm all →" affordance carry the affordance without a
// section-label hint. The lavender eyebrow garnish was the last piece
// of Phase 33b Scope 2 chrome on this surface; with it gone the banner
// reads as a calm cream-on-bg row with a single sage CTA. Handler logic
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
    <View testID="morning-meds-banner" style={styles.container}>
      <View style={styles.content}>
        <Text style={[styles.emoji]}>💊</Text>
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
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
          <Text style={[styles.buttonText, { color: colors.accent }]}>
            {confirming ? '…' : 'Confirm all →'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Phase 33b Scope 2 — no chrome (border + bg retired). Eyebrow +
  // cream content sit on the page bg directly.
  container: {
    marginBottom: 12,
    gap: 6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
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
