// ============================================================================
// LOG TAB - Quick Capture
// V3: Centralized logging interface
// ============================================================================

import React, { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';
import { AuroraBackground } from '../../components/aurora/AuroraBackground';
import { GlassCard } from '../../components/aurora/GlassCard';
import { Colors, Spacing, Typography, BorderRadius } from '../_theme/theme-tokens';
import { getMedications } from '../../utils/medicationStorage';
import { getVitals } from '../../utils/vitalsStorage';
import { getNotes } from '../../utils/noteStorage';
import { getDailyTracking } from '../../utils/dailyTrackingStorage';

const QUICK_LOGS = [
  { id: 'meds', icon: '💊', label: 'Meds', color: Colors.amber, route: '/medication-confirm' },
  { id: 'vitals', icon: '🫀', label: 'Vitals', color: Colors.rose, route: '/log-vitals' },
  { id: 'symptoms', icon: '🩺', label: 'Symptoms', color: Colors.purple, route: '/log-symptom' },
  { id: 'mood', icon: '😊', label: 'Mood', color: Colors.sky, route: '/log-mood' },
  { id: 'sleep', icon: '😴', label: 'Sleep', color: Colors.purple, route: '/log-sleep' },
  { id: 'nutrition', icon: '🥗', label: 'Food', color: Colors.green, route: '/log-meal' },
  { id: 'hydration', icon: '💧', label: 'Water', color: Colors.sky, route: '/log-hydration' },
  { id: 'notes', icon: '📝', label: 'Notes', color: Colors.accent, route: '/log-note' },
];

interface LogEntry {
  id: string;
  icon: string;
  type: string;
  value: string;
  time: string;
}

export default function LogTab() {
  const router = useRouter();
  const [recentLogs, setRecentLogs] = useState<LogEntry[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadRecentLogs();
    }, [])
  );

  const loadRecentLogs = async () => {
    const today = new Date().toISOString().split('T')[0];
    const logs: LogEntry[] = [];

    try {
      // Get medications taken today
      const meds = await getMedications();
      const takenMeds = meds.filter((m) => {
        if (!m.lastTaken) return false;
        const takenDate = new Date(m.lastTaken).toISOString().split('T')[0];
        return takenDate === today && m.taken;
      });
      takenMeds.forEach((med) => {
        logs.push({
          id: `med-${med.id}`,
          icon: '💊',
          type: 'Medication',
          value: med.name,
          time: format(new Date(med.lastTaken!), 'h:mm a'),
        });
      });

      // Get vitals logged today
      const vitals = await getVitals();
      const todayVitals = vitals.filter((v) => {
        const vitalDate = new Date(v.timestamp).toISOString().split('T')[0];
        return vitalDate === today;
      });
      todayVitals.forEach((vital) => {
        logs.push({
          id: `vital-${vital.timestamp}`,
          icon: '🫀',
          type: 'Vitals',
          value: `${vital.type}: ${vital.value}${vital.unit || ''}`,
          time: format(new Date(vital.timestamp), 'h:mm a'),
        });
      });

      // Get notes logged today
      const notes = await getNotes();
      const todayNotes = notes.filter((n) => n.date === today);
      todayNotes.forEach((note) => {
        logs.push({
          id: `note-${note.id}`,
          icon: '📝',
          type: 'Note',
          value: note.content.substring(0, 40) + (note.content.length > 40 ? '...' : ''),
          time: format(new Date(note.timestamp), 'h:mm a'),
        });
      });

      // Get daily tracking (mood, etc.)
      const tracking = await getDailyTracking(today);
      if (tracking?.mood) {
        logs.push({
          id: 'mood',
          icon: '😊',
          type: 'Mood',
          value: `${tracking.mood}/10`,
          time: format(new Date(), 'h:mm a'),
        });
      }

      // Sort by time (most recent first)
      logs.sort((a, b) => {
        const timeA = new Date(`${today} ${a.time}`);
        const timeB = new Date(`${today} ${b.time}`);
        return timeB.getTime() - timeA.getTime();
      });

      setRecentLogs(logs.slice(0, 5)); // Show only last 5 entries
    } catch (error) {
      console.error('Error loading recent logs:', error);
    }
  };

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
                  <Text
                    style={styles.logLabel}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                  >
                    {log.label}
                  </Text>
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

          {/* Logged Today Section */}
          <Text style={styles.sectionLabel}>LOGGED TODAY</Text>
          <GlassCard noPadding>
            {recentLogs.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No logs yet today</Text>
              </View>
            ) : (
              recentLogs.map((log, index) => (
                <View
                  key={log.id}
                  style={[
                    styles.logRow,
                    index < recentLogs.length - 1 && styles.logRowBorder,
                  ]}
                >
                  <Text style={styles.logIcon}>{log.icon}</Text>
                  <View style={styles.logContent}>
                    <Text style={styles.logType}>{log.type}</Text>
                    <Text style={styles.logValue}>{log.value}</Text>
                  </View>
                  <Text style={styles.logTime}>{log.time}</Text>
                </View>
              ))
            )}
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
    gap: 12,  // Consistent gap for even spacing
    justifyContent: 'flex-start',
    marginBottom: Spacing.xxl,
    paddingHorizontal: 0,  // Ensure no extra padding
  },
  gridItem: {
    width: '23%',  // 4 columns with gap
    aspectRatio: 1,  // Keep tiles square
  },
  logCard: {
    padding: Spacing.md,
    alignItems: 'center',
    minHeight: 90,
    justifyContent: 'center',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  icon: {
    fontSize: 28,
    textAlign: 'center',
    includeFontPadding: false,  // Android: removes extra font padding
    textAlignVertical: 'center',  // Android: vertical center
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
    marginBottom: Spacing.xxl,
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

  // Logged Today Section
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 2,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: Spacing.md,
  },
  logRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
  },
  logIcon: {
    fontSize: 20,
  },
  logContent: {
    flex: 1,
  },
  logType: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  logValue: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  logTime: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
});
