// ============================================================================
// QUICK LOG CARD - Shows 3 core options on TODAY screen
// Links to QuickLogMore screen for all options
// ============================================================================

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { navigate } from '../../lib/navigate';
import { Colors } from '../../theme/theme-tokens';
import { CORE_OPTIONS } from '../../constants/quickLogOptions';

export const QuickLogCard: React.FC = () => {
  const router = useRouter();

  const handleOptionPress = (screen: string) => {
    navigate(screen);
  };

  const handleMorePress = () => {
    navigate('/quick-log-more');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerLabel}>QUICK LOG</Text>
        <TouchableOpacity
          onPress={handleMorePress}
          accessibilityLabel="More quick log options"
          accessibilityRole="link"
        >
          <Text style={styles.moreLink}>More →</Text>
        </TouchableOpacity>
      </View>

      {/* Core Options */}
      <View style={styles.optionsRow}>
        {CORE_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={styles.optionButton}
            onPress={() => handleOptionPress(option.screen)}
            activeOpacity={0.7}
            accessibilityLabel={`Log ${option.label}`}
            accessibilityRole="button"
          >
            <Text style={styles.optionIcon}>{option.icon}</Text>
            <Text style={styles.optionLabel}>{option.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: Colors.textMuted,
  },
  moreLink: {
    fontSize: 12,
    color: Colors.accent,
    fontWeight: '500',
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  optionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 6,
  },
  optionIcon: {
    fontSize: 18,
  },
  optionLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
});
