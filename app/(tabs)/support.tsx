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
  Linking,
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
          <View style={styles.headerWrap}>
            <Text style={styles.title}>Support</Text>
            <Text style={styles.headerMessage}>
              This page is for{' '}
              <Text style={styles.headerYou}>you</Text>
              {' '}— not your loved one.
            </Text>
            <Text style={styles.headerContext}>
              Caregivers who check in on themselves provide better care. Take a moment.
            </Text>
          </View>

          <View style={styles.zoneSpacer} />

          {/* ═══ Zone 1: Check in ═══ */}
          <View style={styles.warmCard}>
            <Text style={styles.sectionLabel}>Pause and check in</Text>
            <Text style={styles.sectionContext}>
              No one asks caregivers how they're doing. We are.
            </Text>
            <MoodSlider />
            <Text style={styles.privacyHint}>Private · saved to your wellness history</Text>
          </View>

          {/* ═══ Zone 2: Breathe ═══ */}
          <View style={styles.warmCard}>
            <Text style={styles.sectionLabel}>Take a breath</Text>
            <Text style={styles.sectionContext}>
              When everything feels urgent, your body needs a signal that you're safe.
            </Text>

            <View style={styles.breatheCenter}>
              <View style={styles.breatheVisual}>
                <View style={styles.breatheRing3}>
                  <View style={styles.breatheRing2}>
                    <View style={styles.breatheRing1}>
                      <Text style={styles.breatheLabel}>4:4:4</Text>
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
          </View>

          <BreathingExercise
            visible={breathingVisible}
            onClose={() => setBreathingVisible(false)}
          />

          {/* ═══ Zone 3: Connection ═══ */}
          <View style={[styles.warmCard, styles.warmCardPurple]}>
            <Text style={[styles.sectionLabel, { color: '#8a7aBA' }]}>You're not alone</Text>
            <Text style={[styles.sectionContext, { color: '#4a5a7a' }]}>
              53 million Americans are caregivers. These people listen — no judgment, no cost.
            </Text>

            <TouchableOpacity
              style={styles.contactRow}
              activeOpacity={0.7}
              onPress={() => Linking.openURL('tel:18552273640')}
              accessibilityLabel="Call Caregiver Helpline. 1-855-227-3640. Free and confidential."
              accessibilityRole="button"
            >
              <View style={[styles.contactCircle, { backgroundColor: 'rgba(52, 211, 153, 0.08)' }]}>
                <Text style={{ fontSize: 15, color: '#34D399' }}>{'\u260E'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.contactTitle}>Caregiver Helpline</Text>
                <Text style={styles.contactDesc}>1-855-227-3640 · Free, confidential</Text>
              </View>
              <Text style={styles.contactChevron}>{'\u203A'}</Text>
            </TouchableOpacity>

            <View style={styles.contactDivider} />

            <TouchableOpacity
              style={styles.contactRow}
              activeOpacity={0.7}
              accessibilityLabel="Caregiver community. Connect with people who understand."
              accessibilityRole="button"
            >
              <View style={[styles.contactCircle, { backgroundColor: 'rgba(167, 139, 250, 0.08)' }]}>
                <Text style={{ fontSize: 15, color: '#A78BFA' }}>{'\u2661'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.contactTitle}>Caregiver community</Text>
                <Text style={styles.contactDesc}>Connect with people who understand</Text>
              </View>
              <Text style={styles.contactChevron}>{'\u203A'}</Text>
            </TouchableOpacity>
          </View>

          {/* ═══ Zone 4: Resources ═══ */}
          <View style={[styles.warmCard, styles.warmCardQuiet]}>
            <Text style={[styles.sectionLabel, { color: '#6a7a72' }]}>Plan ahead</Text>
            <Text style={[styles.sectionContext, { color: '#3a5a4a' }]}>
              When things are calm, these help you prepare.
            </Text>
            <ResourcesList />
          </View>

          {/* ═══ Your wellness ═══ */}
          <View style={[styles.warmCard, styles.warmCardQuiet, { paddingVertical: 14 }]}>
            <TouchableOpacity
              style={styles.wellnessLink}
              onPress={() => navigate('/caregiver-wellness')}
              activeOpacity={0.7}
              accessibilityLabel="View your wellness history"
              accessibilityRole="button"
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.wellnessTitle}>Your wellness over time</Text>
                <Text style={styles.wellnessDesc}>See how your mood trends week to week</Text>
              </View>
              <Text style={styles.contactChevron}>{'\u203A'}</Text>
            </TouchableOpacity>
          </View>

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
      backgroundColor: '#0c100e',
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingBottom: 20,
    },
    headerWrap: {
      paddingTop: 12,
      paddingBottom: 20,
      paddingHorizontal: 4,
      borderBottomWidth: 0.5,
      borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    },
    title: {
      fontSize: 32,
      fontWeight: '300' as const,
      color: '#d8e8e0',
      letterSpacing: -0.5,
      marginBottom: 10,
    },
    headerMessage: {
      fontSize: 15,
      color: '#6a8a7a',
      lineHeight: 22,
    },
    headerYou: {
      color: '#c0d0c8',
      fontWeight: '500' as const,
    },
    headerContext: {
      fontSize: 13,
      color: '#4a6a5a',
      lineHeight: 19,
      marginTop: 6,
    },
    // ── Warm card surface system ──
    warmCard: {
      backgroundColor: '#131a16',
      borderWidth: 1,
      borderColor: '#1a2a22',
      borderRadius: 16,
      padding: 24,
      paddingHorizontal: 20,
      marginBottom: 12,
    },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '500' as const,
      color: '#5a9a6e',
      marginBottom: 4,
    },
    sectionContext: {
      fontSize: 12,
      color: '#4a6a5a',
      lineHeight: 17,
      marginBottom: 20,
    },
    privacyHint: {
      fontSize: 11,
      color: '#3a5a4a',
      textAlign: 'center' as const,
      marginTop: 10,
    },
    zoneSpacer: {
      height: 32,
    },
    // ── Breathe ──
    breatheCenter: {
      alignItems: 'center' as const,
    },
    breatheVisual: {
      marginBottom: 16,
    },
    breatheRing3: {
      width: 80,
      height: 80,
      borderRadius: 40,
      borderWidth: 1,
      borderColor: '#1a3a2a',
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    breatheRing2: {
      width: 56,
      height: 56,
      borderRadius: 28,
      borderWidth: 1,
      borderColor: '#163024',
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    breatheRing1: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: '#142820',
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    breatheLabel: {
      fontSize: 12,
      fontWeight: '300' as const,
      color: '#4a8a6a',
    },
    breatheTitle: {
      fontSize: 14,
      fontWeight: '500' as const,
      color: '#b0c0b8',
      marginBottom: 4,
    },
    breatheDesc: {
      fontSize: 12,
      color: '#4a6a5a',
      marginBottom: 18,
    },
    breathePill: {
      backgroundColor: 'rgba(52, 211, 153, 0.08)',
      borderWidth: 1,
      borderColor: '#1a3a2a',
      borderRadius: 20,
      paddingVertical: 9,
      paddingHorizontal: 32,
    },
    breathePillText: {
      fontSize: 13,
      fontWeight: '500' as const,
      color: '#34D399',
    },
    // ── Card variants ──
    warmCardPurple: {
      backgroundColor: '#131720',
      borderColor: '#1a2030',
    },
    warmCardQuiet: {
      backgroundColor: '#10140f',
      borderColor: '#1a201a',
    },
    // ── Connection rows ──
    contactRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 12,
      paddingVertical: 12,
    },
    contactCircle: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    contactTitle: {
      fontSize: 14,
      fontWeight: '500' as const,
      color: '#b0b8b4',
      marginBottom: 1,
    },
    contactDesc: {
      fontSize: 11,
      color: '#4a6a5a',
    },
    contactDivider: {
      height: 0.5,
      backgroundColor: '#1a2030',
    },
    contactChevron: {
      fontSize: 16,
      color: '#2a3a32',
    },
    // ── Wellness link ──
    wellnessLink: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
    },
    wellnessTitle: {
      fontSize: 13,
      fontWeight: '500' as const,
      color: '#8a9a92',
      marginBottom: 1,
    },
    wellnessDesc: {
      fontSize: 11,
      color: '#3a5a4a',
    },
    // ── Footer ──
    footer: {
      alignItems: 'center' as const,
      paddingTop: 36,
      paddingBottom: 100,
    },
    footerText: {
      fontSize: 13,
      color: '#2a4a3a',
      textAlign: 'center' as const,
      lineHeight: 21,
      fontStyle: 'italic' as const,
    },
  });
}
