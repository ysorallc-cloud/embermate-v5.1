// ============================================================================
// SUPPORT TAB — Caregiver rest stop
// Mood check-in, breathing exercise, resources, wellness tracking
// ============================================================================

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuroraBackground } from '../../components/aurora/AuroraBackground';
import { useTheme } from '../../contexts/ThemeContext';
import { navigate } from '../../lib/navigate';
import { MoodSlider } from '../../components/support/MoodSlider';
import { BreathingExercise } from '../../components/support/BreathingExercise';
import { ResourcesList } from '../../components/support/ResourcesList';
import { Colors } from '../../theme/theme-tokens';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SupportScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [refreshing, setRefreshing] = useState(false);
  const [breathingVisible, setBreathingVisible] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    // Brief delay for pull-to-refresh feel
    await new Promise(r => setTimeout(r, 500));
    setRefreshing(false);
  }, []);

  // Format today's date
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <View style={styles.root}>
      <AuroraBackground variant="support" />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.accent}
            />
          }
        >
          {/* ═══ HEADER ═══ */}
          <View style={styles.header}>
            <Text style={styles.title}>Support</Text>
            <Text style={styles.date}>{dateStr}</Text>
            <Text style={styles.subtitle}>This space is yours.</Text>
          </View>

          {/* ═══ CHECK IN ═══ */}
          <Text style={styles.sectionLabel}>CHECK IN</Text>
          <MoodSlider />

          {/* ═══ BREATHE ═══ */}
          <Text style={styles.sectionLabel}>BREATHE</Text>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Guided breathing</Text>
            <Text style={styles.cardDesc}>
              A 1-minute 4-4-4 breathing exercise to help you reset.
            </Text>
            <TouchableOpacity
              style={[styles.startButton, { backgroundColor: colors.accent }]}
              onPress={() => setBreathingVisible(true)}
              accessibilityLabel="Start breathing exercise"
              accessibilityRole="button"
            >
              <Text style={styles.startButtonText}>Start</Text>
            </TouchableOpacity>
          </View>

          <BreathingExercise
            visible={breathingVisible}
            onClose={() => setBreathingVisible(false)}
          />

          {/* ═══ REACH OUT ═══ */}
          <Text style={styles.sectionLabel}>REACH OUT</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.reachRow} activeOpacity={0.7}>
              <Text style={styles.reachIcon}>📞</Text>
              <View style={styles.reachInfo}>
                <Text style={styles.reachTitle}>Caregiver Helpline</Text>
                <Text style={styles.reachDesc}>1-855-227-3640 · Free, confidential</Text>
              </View>
            </TouchableOpacity>
            <View style={styles.reachDivider} />
            <TouchableOpacity style={styles.reachRow} activeOpacity={0.7}>
              <Text style={styles.reachIcon}>💬</Text>
              <View style={styles.reachInfo}>
                <Text style={styles.reachTitle}>Caregiver community</Text>
                <Text style={styles.reachDesc}>Connect with people who understand</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* ═══ YOUR WELLNESS ═══ */}
          <Text style={styles.sectionLabel}>YOUR WELLNESS</Text>
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigate('/caregiver-wellness')}
            activeOpacity={0.7}
            accessibilityLabel="View your wellness"
            accessibilityRole="button"
          >
            <View style={styles.wellnessRow}>
              <View>
                <Text style={styles.cardTitle}>Your wellness</Text>
                <Text style={styles.cardDesc}>Mood history, breathing sessions, self-care trends</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </View>
          </TouchableOpacity>

          {/* ═══ RESOURCES ═══ */}
          <Text style={styles.sectionLabel}>RESOURCES</Text>
          <ResourcesList />

          {/* Bottom padding for tab bar */}
          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

function createStyles(c: typeof Colors) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: c.background,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingBottom: 20,
    },
    header: {
      paddingTop: 8,
      paddingBottom: 16,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: c.textPrimary,
      marginBottom: 2,
    },
    date: {
      fontSize: 13,
      color: c.textMuted,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 14,
      color: c.textSecondary,
      fontStyle: 'italic',
    },
    sectionLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: c.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 1.4,
      marginTop: 24,
      marginBottom: 10,
    },
    card: {
      backgroundColor: c.glass,
      borderWidth: 1,
      borderColor: c.glassBorder,
      borderRadius: 14,
      padding: 16,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: c.textPrimary,
      marginBottom: 4,
    },
    cardDesc: {
      fontSize: 13,
      color: c.textSecondary,
      marginBottom: 12,
      lineHeight: 18,
    },
    startButton: {
      paddingVertical: 10,
      borderRadius: 10,
      alignItems: 'center',
    },
    startButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#fff',
    },
    reachRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 4,
    },
    reachIcon: {
      fontSize: 24,
    },
    reachInfo: {
      flex: 1,
    },
    reachTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: c.textPrimary,
      marginBottom: 2,
    },
    reachDesc: {
      fontSize: 12,
      color: c.textMuted,
    },
    reachDivider: {
      height: 1,
      backgroundColor: c.glassFaint,
      marginVertical: 8,
    },
    wellnessRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    chevron: {
      fontSize: 22,
      color: c.textMuted,
    },
  });
}
