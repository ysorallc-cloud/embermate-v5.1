// ============================================================================
// REPORTS HUB - Clinical & Wellness Reports
// V3: Centralized reports access
// ============================================================================

import React from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AuroraBackground } from '../../components/aurora/AuroraBackground';
import { GlassCard } from '../../components/aurora/GlassCard';
import { PageHeader } from '../../components/aurora/PageHeader';
import { SectionHeader } from '../../components/aurora/SectionHeader';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme/theme-tokens';

const REPORT_CATEGORIES = [
  {
    title: 'Clinical Reports',
    description: 'For healthcare providers',
    reports: [
      { id: 'medication', icon: '💊', name: 'Medication Adherence', badge: '94%', color: Colors.amber, route: '/hub/reports/medication' },
      { id: 'vitals', icon: '🫀', name: 'Vitals Stability', badge: '14 readings', color: Colors.rose, route: '/hub/reports/vitals' },
      { id: 'symptoms', icon: '🩺', name: 'Symptom Timeline', badge: '3 this week', color: Colors.purple, route: '/hub/reports/symptoms' },
      { id: 'nutrition', icon: '🥗', name: 'Hydration & Nutrition', badge: 'On track', color: Colors.green, route: '/hub/reports/nutrition' },
    ],
  },
  {
    title: 'Wellness Reports',
    description: 'Mood, sleep & patterns',
    reports: [
      { id: 'wellness', icon: '😊', name: 'Sleep, Energy & Mood', badge: '7-day view', color: Colors.purple, route: '/hub/reports/wellness' },
      { id: 'correlation', icon: '🧠', name: 'Correlation Insights', badge: '6 patterns', color: Colors.sky, route: '/hub/reports/correlation' },
    ],
  },
  {
    title: 'Care Reports',
    description: 'For visits & family',
    reports: [
      { id: 'redflags', icon: '🚨', name: 'Red Flags & Alerts', badge: '1 active', color: Colors.red, route: '/hub/reports/redflags' },
      { id: 'visitprep', icon: '📋', name: 'Visit Prep Report', badge: 'Ready', color: Colors.accent, route: '/hub/reports/visitprep' },
    ],
  },
];

export default function ReportsHub() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <AuroraBackground variant="reports" />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <PageHeader
            category="HUB"
            title="Reports"
            onBack={() => router.back()}
            actionIcon="📤"
            onAction={() => {/* Share all reports */}}
          />

          {/* Intro */}
          <GlassCard style={styles.introCard}>
            <Text style={styles.introText}>
              Professional reports for healthcare providers, family updates, and visit preparation.
            </Text>
          </GlassCard>

          {/* Report Categories */}
          {REPORT_CATEGORIES.map((category, ci) => (
            <View key={ci} style={styles.section}>
              <SectionHeader title={category.title} />
              <Text style={styles.categoryDescription}>{category.description}</Text>

              <GlassCard noPadding>
                {category.reports.map((report, i) => (
                  <TouchableOpacity
                    key={report.id}
                    style={[
                      styles.reportRow,
                      i < category.reports.length - 1 && styles.reportRowBorder,
                    ]}
                    onPress={() => router.push(report.route as any)}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.reportIcon,
                      { backgroundColor: `${report.color}15` },
                    ]}>
                      <Text style={styles.reportIconText}>{report.icon}</Text>
                    </View>
                    <View style={styles.reportContent}>
                      <Text style={styles.reportName}>{report.name}</Text>
                      {report.badge && (
                        <View style={[
                          styles.badge,
                          { backgroundColor: `${report.color}20`, borderColor: `${report.color}40` },
                        ]}>
                          <Text style={[styles.badgeText, { color: report.color }]}>
                            {report.badge}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.reportArrow}>›</Text>
                  </TouchableOpacity>
                ))}
              </GlassCard>
            </View>
          ))}

          {/* Export All */}
          <TouchableOpacity style={styles.exportAllButton}>
            <GlassCard style={styles.exportAllCard}>
              <View style={styles.exportAllContent}>
                <Text style={styles.exportAllIcon}>📦</Text>
                <View style={styles.exportAllText}>
                  <Text style={styles.exportAllTitle}>Export All Reports</Text>
                  <Text style={styles.exportAllSubtitle}>PDF package for appointments</Text>
                </View>
              </View>
            </GlassCard>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
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

  // Intro
  introCard: {
    backgroundColor: `${Colors.purple}08`,
    borderColor: `${Colors.purple}20`,
    marginBottom: Spacing.xxl,
  },
  introText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    lineHeight: 22,
  },

  // Sections
  section: {
    marginBottom: Spacing.xxl,
  },
  categoryDescription: {
    ...Typography.bodySmall,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },

  // Report Rows
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  reportRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  reportIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportIconText: {
    fontSize: 22,
  },
  reportContent: {
    flex: 1,
  },
  reportName: {
    ...Typography.body,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    ...Typography.captionSmall,
    fontWeight: '600',
  },
  reportArrow: {
    fontSize: 20,
    color: Colors.textMuted,
  },

  // Export All
  exportAllButton: {
    marginTop: Spacing.lg,
  },
  exportAllCard: {
    backgroundColor: `${Colors.accent}10`,
    borderColor: `${Colors.accent}30`,
  },
  exportAllContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  exportAllIcon: {
    fontSize: 32,
  },
  exportAllText: {
    flex: 1,
  },
  exportAllTitle: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  exportAllSubtitle: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
});
