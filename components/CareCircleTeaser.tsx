// ============================================================================
// CARE CIRCLE TEASER — Pre-launch card for v7 multi-caregiver feature
// Purple accent, only shown to invested users (14+ days of activity)
// ============================================================================

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

import { Spacing } from '../theme/theme-tokens';
// ============================================================================
// PROPS
// ============================================================================

interface CareCircleTeaserProps {
  onJoin: () => void;
  onDismiss: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function CareCircleTeaser({ onJoin, onDismiss }: CareCircleTeaserProps) {
  return (
    <View style={styles.card}>
      {/* Dismiss affordance */}
      <TouchableOpacity
        style={styles.dismissButton}
        onPress={onDismiss}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        accessibilityLabel="Dismiss Care Circle teaser"
        accessibilityRole="button"
      >
        <Text style={styles.dismissText}>×</Text>
      </TouchableOpacity>

      {/* Eyebrow tag */}
      <View style={styles.eyebrow}>
        <Text style={styles.eyebrowText}>COMING IN V7</Text>
      </View>

      {/* Title */}
      <Text style={styles.title}>Care Circle</Text>

      {/* Body */}
      <Text style={styles.body}>
        Invite siblings and other caregivers to share the load. Privacy-first,
        end-to-end encrypted — your data still never leaves your phones.
      </Text>

      {/* CTA */}
      <TouchableOpacity
        style={styles.cta}
        onPress={onJoin}
        activeOpacity={0.7}
        accessibilityLabel="Join early access for Care Circle"
        accessibilityRole="button"
      >
        <Text style={styles.ctaText}>Join early access →</Text>
      </TouchableOpacity>
    </View>
  );
}

// ============================================================================
// STYLES
// Dark-mode primary set. Light-mode consumers should override via
// useTheme() colors when the light token map is fully wired.
// ============================================================================

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(159, 122, 234, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(159, 122, 234, 0.25)',
    borderRadius: 14,
    padding: 16,
    marginTop: Spacing.md,
    marginBottom: 8,
  },
  dismissButton: {
    position: 'absolute',
    top: 10,
    right: 12,
    zIndex: 1,
  },
  dismissText: {
    fontSize: 18,
    color: 'rgba(159, 122, 234, 0.5)',
    fontWeight: '300',
  },
  eyebrow: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(159, 122, 234, 0.15)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 10,
  },
  eyebrowText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#aa8adc',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#e0d8f0',
    marginBottom: 6,
  },
  body: {
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(183, 148, 244, 0.7)',
    marginBottom: 14, // allow: off-scale gap (intentional)
  },
  cta: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(159, 122, 234, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(159, 122, 234, 0.3)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 18, // allow: tap-target padding (Apple HIG ≥44pt)
  },
  ctaText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#aa8adc',
  },
});
