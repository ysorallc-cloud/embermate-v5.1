// ============================================================================
// COMING SOON - Placeholder for unimplemented features
// ============================================================================

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius } from '../theme/theme-tokens';
import { AuroraBackground } from '../components/aurora/AuroraBackground';
import { BackButton } from '../components/common/BackButton';

export default function ComingSoonScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AuroraBackground variant="hub" />

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <BackButton variant="text" />
        </View>

        {/* Main Content */}
        <View style={styles.centerContent}>
          <Text style={styles.emoji}>🚧</Text>
          <Text style={styles.title}>Coming Soon</Text>
          <Text style={styles.subtitle}>
            This feature is still being built.{'\n'}
            Check back in a future update.
          </Text>
        </View>

        {/* Action */}
        <View style={styles.bottomAction}>
          <BackButton variant="text" />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    padding: Spacing.xl,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 64,
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '300',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  bottomAction: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
});
