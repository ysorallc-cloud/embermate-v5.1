// ============================================================================
// QUICK LOG MORE SCREEN - All Quick Log options with Core and More sections
// ============================================================================

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Colors } from '../theme/theme-tokens';
import { CORE_OPTIONS, MORE_OPTIONS, QuickLogOption } from '../constants/quickLogOptions';

export default function QuickLogMoreScreen() {
  const router = useRouter();

  const handleOptionPress = (option: QuickLogOption) => {
    router.push(option.screen as any);
  };

  const handleBack = () => {
    router.back();
  };

  const renderOption = (option: QuickLogOption, isLast: boolean) => (
    <TouchableOpacity
      key={option.id}
      style={[styles.optionRow, !isLast && styles.optionBorder]}
      onPress={() => handleOptionPress(option)}
      activeOpacity={0.7}
    >
      <View style={styles.optionIconContainer}>
        <Text style={styles.optionIcon}>{option.icon}</Text>
      </View>
      <View style={styles.optionContent}>
        <Text style={styles.optionLabel}>{option.label}</Text>
        <Text style={styles.optionDescription}>{option.description}</Text>
      </View>
      <Text style={styles.optionArrow}>→</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Quick Log</Text>
          <View style={styles.backButton} />
        </View>

        <ScrollView style={styles.content}>
          {/* Core Section */}
          <Text style={styles.sectionLabel}>CORE</Text>
          <View style={styles.sectionCard}>
            {CORE_OPTIONS.map((option, index) =>
              renderOption(option, index === CORE_OPTIONS.length - 1)
            )}
          </View>

          {/* More Options Section */}
          <Text style={styles.sectionLabel}>MORE OPTIONS</Text>
          <View style={styles.sectionCard}>
            {MORE_OPTIONS.map((option, index) =>
              renderOption(option, index === MORE_OPTIONS.length - 1)
            )}
          </View>

          {/* Bottom spacing */}
          <View style={{ height: 40 }} />
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    color: Colors.textPrimary,
    fontSize: 18,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: Colors.textMuted,
    marginBottom: 12,
    marginTop: 24,
  },
  sectionCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  optionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  optionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionIcon: {
    fontSize: 18,
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  optionArrow: {
    fontSize: 16,
    color: Colors.textMuted,
  },
});
