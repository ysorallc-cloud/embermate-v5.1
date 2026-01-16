// ============================================================================
// LOG TAB - Quick Capture
// V3: Centralized logging interface
// ============================================================================

import React from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AuroraBackground } from '../../components/aurora/AuroraBackground';
import { GlassCard } from '../../components/aurora/GlassCard';
import { Colors, Spacing, Typography, BorderRadius } from '../_theme/theme-tokens';

const QUICK_LOGS = [
  { id: 'meds', icon: '💊', label: 'Medications', color: Colors.amber, route: '/medication-confirm' },
  { id: 'vitals', icon: '🫀', label: 'Vitals', color: Colors.rose, route: '/log-vitals' },
  { id: 'symptoms', icon: '🩺', label: 'Symptoms', color: Colors.purple, route: '/log-symptom' },
  { id: 'mood', icon: '😊', label: 'Mood', color: Colors.sky, route: '/log-mood' },
  { id: 'sleep', icon: '😴', label: 'Sleep', color: Colors.purple, route: '/log-sleep' },
  { id: 'nutrition', icon: '🥗', label: 'Nutrition', color: Colors.green, route: '/log-meal' },
  { id: 'hydration', icon: '💧', label: 'Hydration', color: Colors.sky, route: '/log-hydration' },
  { id: 'notes', icon: '📝', label: 'Notes', color: Colors.accent, route: '/log-note' },
];

export default function LogTab() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <AuroraBackground variant="log" />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.subtitle}>QUICK CAPTURE</Text>
            <Text style={styles.title}>Log</Text>
          </View>

          {/* Quick Log Grid */}
          <View style={styles.grid}>
            {QUICK_LOGS.map((log) => (
              <TouchableOpacity
                key={log.id}
                style={styles.gridItem}
                onPress={() => router.push(log.route as any)}
                activeOpacity={0.7}
              >
                <GlassCard style={styles.logCard}>
                  <View style={[styles.iconCircle, { backgroundColor: `${log.color}15` }]}>
                    <Text style={styles.icon}>{log.icon}</Text>
                  </View>
                  <Text style={styles.logLabel}>{log.label}</Text>
                </GlassCard>
              </TouchableOpacity>
            ))}
          </View>

          {/* Voice Note CTA */}
          <TouchableOpacity onPress={() => router.push('/log-note')}>
            <GlassCard style={styles.voiceCard}>
              <View style={styles.voiceContent}>
                <View style={styles.micCircle}>
                  <Text style={styles.micIcon}>🎤</Text>
                </View>
                <View style={styles.voiceText}>
                  <Text style={styles.voiceTitle}>Voice Note</Text>
                  <Text style={styles.voiceSubtitle}>Tap to record a quick observation</Text>
                </View>
              </View>
            </GlassCard>
          </TouchableOpacity>

          {/* Quick Tip */}
          <GlassCard style={styles.tipCard}>
            <View style={styles.tipContent}>
              <Text style={styles.tipIcon}>💡</Text>
              <View style={styles.tipText}>
                <Text style={styles.tipTitle}>Log what matters</Text>
                <Text style={styles.tipDescription}>
                  Even small notes help reveal patterns over time.
                </Text>
              </View>
            </View>
          </GlassCard>

          {/* Bottom spacing for tab bar */}
          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeArea: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: Spacing.xl,
  },

  // Header
  header: {
    marginBottom: Spacing.xxl,
    paddingTop: Spacing.sm,
  },
  subtitle: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  title: {
    ...Typography.displayLarge,
    color: Colors.textPrimary,
  },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.xxl,
  },
  gridItem: {
    width: '23%',
  },
  logCard: {
    padding: Spacing.md,
    alignItems: 'center',
    minHeight: 90,
    justifyContent: 'center',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  icon: {
    fontSize: 24,
  },
  logLabel: {
    ...Typography.captionSmall,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  // Voice Card
  voiceCard: {
    marginBottom: Spacing.xxl,
    backgroundColor: `${Colors.accent}10`,
    borderColor: `${Colors.accent}30`,
  },
  voiceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  micCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micIcon: {
    fontSize: 24,
  },
  voiceText: {
    flex: 1,
  },
  voiceTitle: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  voiceSubtitle: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },

  // Tip Card
  tipCard: {
    backgroundColor: `${Colors.amber}08`,
    borderColor: `${Colors.amber}20`,
  },
  tipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  tipIcon: {
    fontSize: 20,
  },
  tipText: {
    flex: 1,
  },
  tipTitle: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  tipDescription: {
    ...Typography.captionSmall,
    color: Colors.textMuted,
  },
});
