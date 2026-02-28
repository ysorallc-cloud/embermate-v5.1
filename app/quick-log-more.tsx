// ============================================================================
// QUICK LOG MORE SCREEN - All Quick Log options filtered by enabled buckets
// Disabled categories shown at bottom with 'Enable' hint
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
import { navigate } from '../lib/navigate';
import { Colors } from '../theme/theme-tokens';
import { getFilteredOptions, QuickLogOption } from '../constants/quickLogOptions';
import { useEnabledBuckets } from '../hooks/useCarePlanConfig';

export default function QuickLogMoreScreen() {
  const router = useRouter();
  const { enabledBuckets } = useEnabledBuckets();
  const { core, more, disabled } = getFilteredOptions(enabledBuckets);

  const handleOptionPress = (option: QuickLogOption) => {
    // Wellness: route to morning or evening screen based on time of day
    if (option.id === 'wellness') {
      const hour = new Date().getHours();
      const route = hour >= 15 ? '/log-evening-wellness' : '/log-morning-wellness';
      navigate(route);
      return;
    }
    navigate(option.screen);
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
      accessibilityLabel={`${option.label}: ${option.description}`}
      accessibilityRole="button"
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
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Quick Log</Text>
          <View style={styles.backButton} />
        </View>

        <ScrollView style={styles.content}>
          {/* Core Section */}
          {core.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>CORE</Text>
              <View style={styles.sectionCard}>
                {core.map((option, index) =>
                  renderOption(option, index === core.length - 1)
                )}
              </View>
            </>
          )}

          {/* More Options Section */}
          {more.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>MORE OPTIONS</Text>
              <View style={styles.sectionCard}>
                {more.map((option, index) =>
                  renderOption(option, index === more.length - 1)
                )}
              </View>
            </>
          )}

          {/* Disabled Categories Section */}
          {disabled.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>NOT IN YOUR CARE PLAN</Text>
              <View style={styles.sectionCard}>
                {disabled.map((option, index) => (
                  <View
                    key={option.id}
                    style={[styles.disabledRow, index < disabled.length - 1 && styles.optionBorder]}
                  >
                    <View style={styles.disabledIconContainer}>
                      <Text style={styles.optionIcon}>{option.icon}</Text>
                    </View>
                    <View style={styles.optionContent}>
                      <Text style={styles.disabledLabel}>{option.label}</Text>
                      <Text style={styles.optionDescription}>{option.description}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => navigate('/care-plan')}
                      accessibilityLabel={`Enable ${option.label} in care plan`}
                      accessibilityRole="button"
                    >
                      <Text style={styles.enableLink}>Enable →</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </>
          )}

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
  // Disabled section styles
  disabledRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    opacity: 0.6,
  },
  disabledIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.glassDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  disabledLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textMuted,
    marginBottom: 2,
  },
  enableLink: {
    fontSize: 13,
    color: Colors.accent,
    fontWeight: '500',
  },
});
