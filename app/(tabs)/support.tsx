// ============================================================================
// SUPPORT TAB — Caregiver rest stop
// Three zones: "How are you?" → "Need a reset?" → "Here when you're ready"
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
    await new Promise(r => setTimeout(r, 500));
    setRefreshing(false);
  }, []);

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
            <Text style={styles.subtitle}>This space is yours. Take a moment.</Text>
          </View>

          <View style={styles.zoneSpacer} />

          {/* ═══ Zone 1: Check in ═══ */}
          <Text style={styles.zoneLabel}>How are you right now?</Text>
          <MoodSlider />

          <View style={styles.zoneSpacer} />

          {/* ═══ Zone 2: Breathe ═══ */}
          <View style={styles.breatheZone}>
            <Text style={styles.zoneLabel}>Need a reset?</Text>

            <View style={styles.breatheVisual}>
              <View style={styles.breatheRing3}>
                <View style={styles.breatheRing2}>
                  <View style={styles.breatheRing1}>
                    <Text style={styles.breatheRingLabel}>4:4:4</Text>
                  </View>
                </View>
              </View>
            </View>

            <Text style={styles.breatheTitle}>1-minute guided breathing</Text>
            <Text style={styles.breatheDesc}>Inhale, hold, exhale. Four seconds each.</Text>

            <TouchableOpacity
              style={styles.breathePill}
              onPress={() => setBreathingVisible(true)}
              accessibilityLabel="Start 1-minute breathing exercise"
              accessibilityRole="button"
            >
              <Text style={styles.breathePillText}>Begin</Text>
            </TouchableOpacity>
          </View>

          <BreathingExercise
            visible={breathingVisible}
            onClose={() => setBreathingVisible(false)}
          />

          <View style={styles.zoneDivider} />

          {/* ═══ Zone 3: Talk to someone ═══ */}
          <Text style={styles.zoneLabel}>Talk to someone</Text>
          <TouchableOpacity style={styles.reachRow} activeOpacity={0.7}
            accessibilityLabel="Call Caregiver Helpline. 1-855-227-3640. Free and confidential."
            accessibilityRole="button"
          >
            <Text style={styles.reachIcon}>📞</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.reachTitle}>Caregiver Helpline</Text>
              <Text style={styles.reachDesc}>1-855-227-3640 · Free, confidential</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.reachRow, { borderBottomWidth: 0 }]} activeOpacity={0.7}
            accessibilityLabel="Caregiver community. Connect with people who understand."
            accessibilityRole="button"
          >
            <Text style={styles.reachIcon}>💬</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.reachTitle}>Caregiver community</Text>
              <Text style={styles.reachDesc}>Connect with people who understand</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.zoneDivider} />

          {/* ═══ Zone 4: Resources ═══ */}
          <Text style={styles.zoneLabel}>Resources</Text>
          <ResourcesList />

          <View style={styles.zoneDivider} />

          {/* ═══ Your wellness — single row ═══ */}
          <TouchableOpacity
            style={styles.wellnessLink}
            onPress={() => navigate('/caregiver-wellness')}
            activeOpacity={0.7}
            accessibilityLabel="View your wellness history"
            accessibilityRole="button"
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.wellnessLinkTitle}>Your wellness</Text>
              <Text style={styles.wellnessLinkDesc}>Mood history, breathing sessions, trends</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          {/* ═══ FOOTER ═══ */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>You're doing something{'\n'}most people never see.</Text>
          </View>
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
      paddingBottom: 8,
    },
    title: {
      fontSize: 28,
      fontWeight: '200',
      color: c.textPrimary,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 14,
      color: c.textMuted,
      lineHeight: 20,
    },
    zoneLabel: {
      fontSize: 14,
      fontWeight: '400',
      color: c.textMuted,
      marginBottom: 14,
    },
    zoneSpacer: {
      height: 32,
    },
    zoneDivider: {
      height: 0.5,
      backgroundColor: c.glassHover,
      marginVertical: 24,
    },
    // ── Breathe ──
    breatheZone: {
      alignItems: 'center',
      paddingVertical: 8,
    },
    breatheVisual: {
      marginBottom: 16,
    },
    breatheRing3: {
      width: 80,
      height: 80,
      borderRadius: 40,
      borderWidth: 1.5,
      borderColor: 'rgba(52, 211, 153, 0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    breatheRing2: {
      width: 60,
      height: 60,
      borderRadius: 30,
      borderWidth: 1.5,
      borderColor: 'rgba(52, 211, 153, 0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    breatheRing1: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(52, 211, 153, 0.08)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    breatheRingLabel: {
      fontSize: 12,
      fontWeight: '300',
      color: c.accent,
    },
    breatheTitle: {
      fontSize: 15,
      fontWeight: '500',
      color: c.textSecondary,
      marginBottom: 4,
    },
    breatheDesc: {
      fontSize: 12,
      color: c.textMuted,
      marginBottom: 16,
    },
    breathePill: {
      backgroundColor: 'rgba(52, 211, 153, 0.08)',
      borderWidth: 1,
      borderColor: 'rgba(52, 211, 153, 0.15)',
      borderRadius: 20,
      paddingVertical: 8,
      paddingHorizontal: 24,
    },
    breathePillText: {
      fontSize: 13,
      fontWeight: '500',
      color: c.accent,
    },
    // ── Reach out ──
    reachRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 14,
      borderBottomWidth: 0.5,
      borderBottomColor: c.glassDim,
    },
    reachIcon: {
      fontSize: 20,
    },
    reachTitle: {
      fontSize: 14,
      fontWeight: '500',
      color: c.textSecondary,
      marginBottom: 2,
    },
    reachDesc: {
      fontSize: 12,
      color: c.textMuted,
    },
    // ── Your wellness link ──
    wellnessLink: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
    },
    wellnessLinkTitle: {
      fontSize: 14,
      fontWeight: '500',
      color: c.textSecondary,
    },
    wellnessLinkDesc: {
      fontSize: 12,
      color: c.textMuted,
      marginTop: 2,
    },
    chevron: {
      fontSize: 18,
      color: c.textMuted,
      opacity: 0.3,
    },
    // ── Footer ──
    footer: {
      alignItems: 'center',
      paddingTop: 40,
      paddingBottom: 100,
    },
    footerText: {
      fontSize: 12,
      color: c.textMuted,
      textAlign: 'center',
      lineHeight: 18,
      opacity: 0.4,
    },
  });
}
