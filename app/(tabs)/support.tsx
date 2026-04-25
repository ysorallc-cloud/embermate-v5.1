// ============================================================================
// YOU TAB — Caregiver self-care hub
// Dual-primary layout: Mood check-in + Breathing side by side
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
import { MOOD_POSITIONS, AFFIRMATIONS } from '../../components/support/MoodSlider';
import { BreathingExercise } from '../../components/support/BreathingExercise';
import { ResourcesList } from '../../components/support/ResourcesList';
import { emitMoodEvent } from '../../utils/eventEmitter';
import { saveDailyCheck } from '../../utils/caregiverWellnessStorage';
import { updateStreak } from '../../utils/streakStorage';
import { logError } from '../../utils/devLog';
import { Colors } from '../../theme/theme-tokens';

// Inline emoji set for the compact mood row
const MOOD_EMOJIS = ['\u{1F614}', '\u{1F615}', '\u{1F610}', '\u{1F642}', '\u{1F60A}'];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SupportScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [refreshing, setRefreshing] = useState(false);
  const [breathingVisible, setBreathingVisible] = useState(false);

  // Inline mood state (replaces MoodSlider component)
  const [selectedMoodIndex, setSelectedMoodIndex] = useState(2);
  const [moodLogged, setMoodLogged] = useState(false);
  const [moodSaving, setMoodSaving] = useState(false);

  const selectedMood = MOOD_POSITIONS[selectedMoodIndex];

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise(r => setTimeout(r, 500));
    setRefreshing(false);
  }, []);

  const handleLogMood = useCallback(async () => {
    if (moodSaving || moodLogged) return;
    setMoodSaving(true);
    try {
      await emitMoodEvent(selectedMood.score, selectedMood.label, { source: 'dedicated_screen' });
      const today = new Date().toISOString().split('T')[0];
      await saveDailyCheck({
        date: today,
        sleep: selectedMood.score,
        stress: 6 - selectedMood.score,
        meals: selectedMood.score,
      });
      await updateStreak('wellnessCheck');
      setMoodLogged(true);
    } catch (err) {
      logError('SupportScreen.handleLogMood', err);
    } finally {
      setMoodSaving(false);
    }
  }, [selectedMood, moodSaving, moodLogged]);

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
            <Text style={styles.title}>You</Text>
            <Text style={styles.headerMessage}>
              This page is for{' '}
              <Text style={styles.headerYou}>you</Text>
              {' '}{'\u2014'} not your loved one.
            </Text>
            <Text style={styles.headerContext}>
              Caregivers who check in on themselves provide better care. Take a moment.
            </Text>
          </View>

          <View style={styles.zoneSpacer} />

          {/* ═══ PRIMARY ROW: Mood + Breathing side by side ═══ */}
          <View style={styles.primaryRow}>
            {/* ── Mood check-in card (LEFT) ── */}
            <View style={[styles.primaryCard, styles.primaryCardLeft]}>
              {!moodLogged ? (
                <>
                  <View style={styles.emojiRow}>
                    {MOOD_EMOJIS.map((emoji, i) => (
                      <TouchableOpacity
                        key={i}
                        style={[
                          styles.emojiCircle,
                          selectedMoodIndex === i && styles.emojiCircleSelected,
                        ]}
                        onPress={() => setSelectedMoodIndex(i)}
                        accessibilityLabel={MOOD_POSITIONS[i].label}
                        accessibilityRole="button"
                      >
                        <Text
                          style={[
                            styles.emojiText,
                            selectedMoodIndex === i && styles.emojiTextSelected,
                          ]}
                        >
                          {emoji}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.moodLabel}>{selectedMood.label}</Text>
                  <TouchableOpacity
                    style={styles.logButton}
                    onPress={handleLogMood}
                    disabled={moodSaving}
                    accessibilityLabel="Log this"
                    accessibilityRole="button"
                  >
                    <Text style={styles.logButtonText}>
                      {moodSaving ? 'Saving...' : 'Log this'}
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.privacyText}>
                    Private {'\u00B7'} saved to your wellness
                  </Text>
                </>
              ) : (
                <View style={styles.affirmationWrap}>
                  <Text style={styles.affirmationText}>
                    {AFFIRMATIONS[selectedMood.score]}
                  </Text>
                </View>
              )}
            </View>

            {/* ── Breathing card (RIGHT) ── */}
            <TouchableOpacity
              style={[styles.primaryCard, styles.primaryCardRight]}
              onPress={() => setBreathingVisible(true)}
              activeOpacity={0.7}
              accessibilityLabel="Take a breath. 1-minute guided breathing exercise."
              accessibilityRole="button"
            >
              <View style={styles.breatheVisual}>
                <View style={styles.breatheRing3}>
                  <View style={styles.breatheRing2}>
                    <View style={styles.breatheRing1}>
                      <View style={styles.breathePlayTriangle} />
                    </View>
                  </View>
                </View>
              </View>
              <Text style={styles.breatheTitle}>Take a breath</Text>
              <Text style={styles.breatheDesc}>1 min {'\u00B7'} 4-4-4</Text>
            </TouchableOpacity>
          </View>

          <BreathingExercise
            visible={breathingVisible}
            onClose={() => setBreathingVisible(false)}
          />

          {/* ═══ CONTACT TILES: Helpline + Community ═══ */}
          <View style={styles.contactTilesRow}>
            <TouchableOpacity
              style={styles.contactTile}
              activeOpacity={0.7}
              onPress={() => Linking.openURL('tel:18552273640')}
              accessibilityLabel="Call Caregiver Helpline. 1-855-227-3640. Free and confidential."
              accessibilityRole="button"
            >
              <View style={[styles.contactCircle, { backgroundColor: 'rgba(52, 211, 153, 0.08)' }]}>
                <Text style={{ fontSize: 15, color: '#34D399' }}>{'\u260E'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.contactTitle}>Helpline</Text>
                <Text style={styles.contactDesc}>1-855-227-3640</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.contactTile}
              activeOpacity={0.7}
              accessibilityLabel="Caregiver community. Connect with people who understand."
              accessibilityRole="button"
            >
              <View style={[styles.contactCircle, { backgroundColor: 'rgba(167, 139, 250, 0.08)' }]}>
                <Text style={{ fontSize: 15, color: '#A78BFA' }}>{'\u2661'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.contactTitle}>Community</Text>
                <Text style={styles.contactDesc}>People who understand</Text>
              </View>
            </TouchableOpacity>
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

          {/* ═══ Resources ═══ */}
          <View style={[styles.warmCard, styles.warmCardQuiet]}>
            <Text style={[styles.sectionLabel, { color: '#6a7a72' }]}>Plan ahead</Text>
            <Text style={[styles.sectionContext, { color: '#3a5a4a' }]}>
              When things are calm, these help you prepare.
            </Text>
            <ResourcesList />
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
      paddingTop: 56,
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
    zoneSpacer: {
      height: 8,
    },
    // ── Primary row: two equal cards ──
    primaryRow: {
      flexDirection: 'row' as const,
      gap: 10,
      marginBottom: 12,
    },
    primaryCard: {
      flex: 1,
      backgroundColor: c.warmSurface,
      borderWidth: 1,
      borderColor: c.warmSurfaceBorder,
      borderRadius: 14,
      padding: 14,
      alignItems: 'center' as const,
    },
    primaryCardLeft: {},
    primaryCardRight: {
      justifyContent: 'center' as const,
    },
    // ── Mood emoji row ──
    emojiRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      width: '100%' as const,
      marginBottom: 8,
    },
    emojiCircle: {
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    emojiCircleSelected: {
      borderWidth: 1.5,
      borderColor: 'rgba(52, 211, 153, 0.4)',
    },
    emojiText: {
      fontSize: 18,
    },
    emojiTextSelected: {
      fontSize: 20,
    },
    moodLabel: {
      fontSize: 12,
      color: c.textWarmSecondary,
      marginBottom: 10,
      textAlign: 'center' as const,
    },
    logButton: {
      // Uses accentSoftBg in light mode (#ecfdf5), accentLight in dark mode.
      // The token resolves via the active palette from useTheme().
      backgroundColor: c.accentLight,
      borderRadius: 20,
      paddingVertical: 8,
      alignSelf: 'stretch' as const,
      alignItems: 'center' as const,
      marginBottom: 6,
    },
    logButtonText: {
      fontSize: 12,
      fontWeight: '500' as const,
      color: c.accent,
    },
    privacyText: {
      fontSize: 9,
      color: c.textWarmDim,
      textAlign: 'center' as const,
    },
    affirmationWrap: {
      paddingVertical: 8,
    },
    affirmationText: {
      fontSize: 13,
      color: c.textWarmSecondary,
      fontStyle: 'italic' as const,
      lineHeight: 19,
      textAlign: 'center' as const,
    },
    // ── Breathe (compact in primary card) ──
    breatheVisual: {
      marginBottom: 10,
    },
    breatheRing3: {
      width: 64,
      height: 64,
      borderRadius: 32,
      borderWidth: 1.5,
      borderColor: 'rgba(52, 211, 153, 0.15)',
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    breatheRing2: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 1.5,
      borderColor: c.accentLight,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    breatheRing1: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: 'rgba(52, 211, 153, 0.08)',
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    breathePlayTriangle: {
      width: 0,
      height: 0,
      borderTopWidth: 6,
      borderBottomWidth: 6,
      borderLeftWidth: 10,
      borderTopColor: 'transparent' as const,
      borderBottomColor: 'transparent' as const,
      borderLeftColor: 'rgba(52, 211, 153, 0.6)',
      marginLeft: 2,
    },
    breatheTitle: {
      fontSize: 14,
      fontWeight: '500' as const,
      color: '#b0c0b8',
      marginBottom: 2,
      marginTop: 10,
    },
    breatheDesc: {
      fontSize: 12,
      color: '#4a6a5a',
    },
    // ── Contact tiles ──
    contactTilesRow: {
      flexDirection: 'row' as const,
      gap: 10,
      marginBottom: 12,
    },
    contactTile: {
      flex: 1,
      backgroundColor: c.warmSurfacePurple,
      borderWidth: 1,
      borderColor: c.warmSurfacePurpleBorder,
      borderRadius: 12,
      padding: 12,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 10,
    },
    contactCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    contactTitle: {
      fontSize: 13,
      fontWeight: '500' as const,
      color: '#b0b8b4',
      marginBottom: 1,
    },
    contactDesc: {
      fontSize: 11,
      color: '#4a6a5a',
    },
    contactChevron: {
      fontSize: 16,
      color: '#2a3a32',
    },
    // ── Warm card surface system (for resources + wellness) ──
    warmCard: {
      backgroundColor: '#131a16',
      borderWidth: 1,
      borderColor: '#1a2a22',
      borderRadius: 16,
      padding: 18,
      paddingHorizontal: 20,
      marginBottom: 12,
    },
    warmCardQuiet: {
      backgroundColor: '#10140f',
      borderColor: '#1a201a',
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
