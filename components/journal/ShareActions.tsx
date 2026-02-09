import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius } from '../../theme/theme-tokens';

interface Props {
  onShare: () => void;
  onExport: () => void;
}

export function ShareActions({ onShare, onExport }: Props) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={onShare}
        activeOpacity={0.7}
        accessibilityLabel="Share this summary"
        accessibilityRole="button"
      >
        <Text style={styles.primaryButtonText}>{'\uD83D\uDCE4'} Share This Summary</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={onExport}
        activeOpacity={0.7}
        accessibilityLabel="Export full care brief"
        accessibilityRole="button"
      >
        <Text style={styles.secondaryButtonText}>{'\uD83D\uDCCB'} Export Full Care Brief</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  primaryButton: {
    backgroundColor: 'rgba(94, 234, 212, 0.15)',
    borderWidth: 1,
    borderColor: Colors.accentBorder,
    borderRadius: BorderRadius.lg,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.accent,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: BorderRadius.lg,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
});
