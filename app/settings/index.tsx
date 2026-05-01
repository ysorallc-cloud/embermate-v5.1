// ============================================================================
// SETTINGS — v6.7 consolidated.
//
// Four categories, 11 items. Categories render expanded by default; no
// search bar; no last-updated pill. Card surfaces follow the standard
// glass treatment with sub-row dividers between items.
//
// The deprecated Appearance / Care Team / Advanced categories were retired
// in v6.7 along with Care Plan / Medications / Appointments rows that
// duplicated tab surfaces. iOS system settings (high-contrast, 12h/24h
// time) flow through the platform — the app reads from system rather than
// shadowing them with its own toggles.
// ============================================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Constants from 'expo-constants';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { navigate, navigateReplace } from '../../lib/navigate';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { SubScreenHeader } from '../../components/SubScreenHeader';
import { useSampleMode } from '../../hooks/useSampleMode';
import { ManageSampleDataSheet } from '../../components/sample/ManageSampleDataSheet';
import { StorageKeys } from '../../utils/storageKeys';
import { deleteAllUserData } from '../../utils/privacyUtils';
import { logError } from '../../utils/devLog';
import { getMedicalInfo } from '../../utils/medicalInfo';

// ============================================================================
// TYPES
// ============================================================================

interface SettingItem {
  id: string;
  icon: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  danger?: boolean;
}

interface SettingsCategory {
  id: string;
  icon: string;
  title: string;
  items: SettingItem[];
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function SettingsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [patientName, setPatientName] = useState('');
  const [activeConditions, setActiveConditions] = useState<string[]>([]);
  // v6.7 Phase 5 — light unread dot on the watchlist row when the caregiver
  // hasn't visited the screen in 7+ days. Stored timestamp lives in
  // app/settings/what-to-watch-for.tsx.
  const [watchForStale, setWatchForStale] = useState(false);
  const { isSampleMode, sampleStatus } = useSampleMode();
  const [manageSampleSheet, setManageSampleSheet] = useState<{
    open: boolean;
    focus?: 'setup' | 'remove';
  }>({ open: false });

  useEffect(() => {
    AsyncStorage.getItem(StorageKeys.PATIENT_NAME)
      .then((name) => name && setPatientName(name))
      .catch((e) => logError('SettingsScreen.loadPatientName', e));

    // Pull active diagnoses to drive the "What to watch for" row subtitle.
    getMedicalInfo()
      .then((info) => {
        if (!info) return;
        const active = info.diagnoses
          .filter((d) => d.status === 'active')
          .map((d) => d.condition);
        setActiveConditions(active);
      })
      .catch((e) => logError('SettingsScreen.loadDiagnoses', e));

    // Light unread indicator if the watchlist screen hasn't been opened in
    // 7+ days. The screen itself stamps the timestamp on each visit.
    AsyncStorage.getItem('@embermate_watch_for_last_shown')
      .then((iso) => {
        if (!iso) {
          setWatchForStale(true);
          return;
        }
        const last = new Date(iso).getTime();
        if (isNaN(last)) {
          setWatchForStale(true);
          return;
        }
        const days = (Date.now() - last) / (1000 * 60 * 60 * 24);
        setWatchForStale(days >= 7);
      })
      .catch((e) => logError('SettingsScreen.loadWatchForStale', e));
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleResetOnboarding = useCallback(() => {
    Alert.alert(
      'See onboarding again',
      'This will show the welcome screens again the next time you open the app. Your data will not be affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem(StorageKeys.ONBOARDING_COMPLETE);
              await AsyncStorage.removeItem(StorageKeys.SAMPLE_DATA_INITIALIZED);
              navigateReplace('/(onboarding)');
            } catch (error) {
              logError('SettingsScreen.handleResetOnboarding', error);
            }
          },
        },
      ],
    );
  }, []);

  const handleDeleteAllData = useCallback(() => {
    Alert.alert(
      'Delete all data',
      'This permanently removes all your health data from this device. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete all',
          style: 'destructive',
          onPress: () =>
            Alert.alert(
              'Final confirmation',
              'Are you absolutely sure?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, delete everything',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await deleteAllUserData();
                      Alert.alert('Deleted', 'All your data has been permanently removed.', [
                        { text: 'OK', onPress: () => navigateReplace('/(onboarding)') },
                      ]);
                    } catch (error) {
                      logError('SettingsScreen.handleDeleteAllData', error);
                    }
                  },
                },
              ],
            ),
        },
      ],
    );
  }, []);

  // ── 4-category layout ────────────────────────────────────────────────────
  const profileTitle = patientName ? `${patientName}'s profile` : "Mom's profile";

  const categories: SettingsCategory[] = useMemo(() => [
    {
      id: 'profile',
      icon: '👤',
      title: profileTitle,
      items: [
        {
          id: 'medical-history',
          icon: '📋',
          title: 'Medical history',
          subtitle: 'Conditions, allergies, surgeries',
          onPress: () => router.push('/patient'),
        },
        {
          id: 'watch-for',
          icon: '👀',
          title: 'What to watch for',
          subtitle: activeConditions.length > 0
            ? `For ${activeConditions.join(', ')}`
            : 'Add conditions to see what to watch for',
          // v6.7 Phase 5 — surface a light unread dot when stale.
          unread: watchForStale && activeConditions.length > 0,
          onPress: () => navigate('/settings/what-to-watch-for' as any),
        } as any,
        {
          id: 'emergency',
          icon: '🚨',
          title: 'Emergency contacts',
          subtitle: 'Quick dial contacts',
          onPress: () => router.push('/emergency'),
        },
        {
          id: 'vital-ranges',
          icon: '📊',
          title: 'Vital sign ranges',
          subtitle: 'Custom alert thresholds',
          onPress: () => navigate('/vital-thresholds' as any),
        },
      ],
    },
    {
      id: 'reminders',
      icon: '🔔',
      title: 'Reminders',
      items: [
        {
          id: 'reminder-timing',
          icon: '⏰',
          title: 'Reminder timing',
          subtitle: "When you'd like to be nudged",
          onPress: () => navigate('/settings/reminders/timing'),
        },
        {
          id: 'quiet-hours',
          icon: '🌙',
          title: 'Quiet hours',
          subtitle: 'When EmberMate stays quiet',
          onPress: () => navigate('/settings/reminders/quiet-hours'),
        },
        {
          id: 'sound',
          icon: '🔊',
          title: 'Sound and vibration',
          subtitle: 'How reminders feel',
          onPress: () => navigate('/settings/reminders/sound'),
        },
      ],
    },
    {
      id: 'privacy',
      icon: '🔒',
      title: 'Privacy and data',
      items: [
        {
          id: 'security',
          icon: '🔐',
          title: 'Security',
          subtitle: 'App lock, encryption, audit logs',
          onPress: () => router.push('/settings/security'),
        },
        {
          id: 'backup',
          icon: '💾',
          title: 'Backup and restore',
          subtitle: 'Back up before switching devices — data stays local',
          onPress: () => router.push('/settings/backup'),
        },
        {
          id: 'delete-all',
          icon: '🗑️',
          title: 'Delete all data',
          subtitle: 'Permanently remove all health data from this device',
          onPress: handleDeleteAllData,
          danger: true,
        },
      ],
    },
    {
      id: 'about',
      icon: 'ℹ️',
      title: 'About',
      items: [
        {
          id: 'help',
          icon: '❓',
          title: 'Help',
          subtitle: 'How to use EmberMate',
          onPress: () => navigate('/help' as any),
        },
        {
          id: 'privacy-and-terms',
          icon: '📄',
          title: 'Privacy and terms',
          subtitle: 'How we handle your data and the usage terms',
          onPress: () => navigate('/legal/privacy-and-terms' as any),
        },
        {
          id: 'whats-next',
          icon: '✨',
          title: "What's next",
          subtitle: 'Features in development',
          onPress: () => navigate('/settings/whats-next' as any),
        },
      ],
    },
  ], [profileTitle, router, handleDeleteAllData, activeConditions, watchForStale]);

  const versionLabel = Constants.expoConfig?.version ?? '6.7.0';

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[colors.background, colors.background]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <SubScreenHeader title="Settings" />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Sample-mode entry — only when relevant */}
          {isSampleMode && (
            <TouchableOpacity
              testID="sample-mode-entry"
              style={styles.sampleEntry}
              onPress={() => setManageSampleSheet({ open: true })}
              accessibilityRole="button"
              accessibilityLabel="Example data — open the example data sheet"
            >
              <Text style={styles.sampleEntryGlyph}>{'✦'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.sampleEntryTitle}>Example data</Text>
                <Text style={styles.sampleEntrySubtitle}>
                  {sampleStatus
                    ? `${sampleStatus.totalSampleRecords} sample records`
                    : 'Set up your profile or remove the example'}
                </Text>
              </View>
              <Text style={styles.sampleEntryChevron}>{'›'}</Text>
            </TouchableOpacity>
          )}

          {categories.map((cat) => (
            <View key={cat.id} testID={`settings-category-${cat.id}`} style={styles.category}>
              <View style={styles.categoryHeader}>
                <Text style={styles.categoryIcon}>{cat.icon}</Text>
                <Text style={styles.categoryTitle}>{cat.title}</Text>
              </View>
              <View style={styles.categoryCard}>
                {cat.items.map((item, i) => {
                  const isLast = i === cat.items.length - 1;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      testID={`settings-item-${item.id}`}
                      style={[styles.itemRow, !isLast && styles.itemDivider]}
                      onPress={item.onPress}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={`${item.title}${item.subtitle ? `. ${item.subtitle}` : ''}`}
                    >
                      <Text style={styles.itemIcon}>{item.icon}</Text>
                      <View style={styles.itemBody}>
                        <View style={styles.itemTitleRow}>
                          <Text style={[styles.itemTitle, item.danger && styles.itemTitleDanger]}>
                            {item.title}
                          </Text>
                          {(item as any).unread && (
                            <View
                              testID={`settings-item-${item.id}-unread`}
                              style={styles.itemUnreadDot}
                              accessibilityLabel="Unread"
                            />
                          )}
                        </View>
                        {item.subtitle && (
                          <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
                        )}
                      </View>
                      <Text style={styles.itemChevron}>{'›'}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}

          {/* Footer */}
          <Text style={styles.disclaimer}>
            EmberMate is a personal tracking tool — not a substitute for medical advice.
          </Text>
          <Text style={styles.versionLine}>
            {`Version ${versionLabel} · `}
            <Text
              style={styles.versionLink}
              onPress={handleResetOnboarding}
              accessibilityRole="link"
              accessibilityLabel="See onboarding again"
            >
              See onboarding again
            </Text>
          </Text>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>

      <ManageSampleDataSheet
        visible={manageSampleSheet.open}
        focusOn={manageSampleSheet.focus}
        activePatientName={patientName}
        onClose={() => setManageSampleSheet({ open: false })}
      />
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

function createStyles(c: typeof Colors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 16 },
    sampleEntry: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 10,
      backgroundColor: 'rgba(170, 138, 220, 0.06)',
      borderWidth: 0.5,
      borderColor: 'rgba(170, 138, 220, 0.25)',
      borderRadius: 10,
      paddingVertical: 12,
      paddingHorizontal: 14,
      marginBottom: 12,
    },
    sampleEntryGlyph: {
      fontSize: 14,
      color: (c as any).caregiverAccent || c.accent,
    },
    sampleEntryTitle: {
      fontSize: 13,
      fontWeight: '500' as const,
      color: c.textPrimary,
    },
    sampleEntrySubtitle: {
      fontSize: 11,
      color: c.textSecondary,
      marginTop: 2,
    },
    sampleEntryChevron: {
      fontSize: 18,
      color: (c as any).caregiverAccent || c.textTertiary,
    },
    category: { marginBottom: 16 },
    categoryHeader: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 8,
      paddingHorizontal: 4,
      paddingBottom: 8,
    },
    categoryIcon: { fontSize: 16 },
    categoryTitle: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: c.textPrimary,
    },
    categoryCard: {
      backgroundColor: c.glass,
      borderWidth: 0.5,
      borderColor: c.glassBorder,
      borderRadius: 10,
      overflow: 'hidden' as const,
    },
    itemRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      paddingVertical: 14,
      paddingHorizontal: 14,
      gap: 12,
    },
    itemDivider: {
      borderBottomWidth: 0.5,
      borderBottomColor: c.glassBorder,
    },
    itemIcon: { fontSize: 16 },
    itemBody: { flex: 1 },
    itemTitleRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 8,
    },
    itemTitle: {
      fontSize: 14,
      fontWeight: '500' as const,
      color: c.textPrimary,
    },
    itemUnreadDot: {
      width: 7,
      height: 7,
      borderRadius: 3.5,
      backgroundColor: c.accent,
    },
    itemTitleDanger: {
      color: (c as any).criticalAlert || c.error,
      opacity: 0.85,
    },
    itemSubtitle: {
      fontSize: 11,
      color: c.textSecondary,
      marginTop: 2,
      lineHeight: 15,
    },
    itemChevron: {
      fontSize: 18,
      color: c.textTertiary,
    },
    disclaimer: {
      fontSize: 10,
      color: c.textTertiary,
      textAlign: 'center' as const,
      paddingTop: 16,
      paddingBottom: 4,
      paddingHorizontal: 8,
      lineHeight: 14,
    },
    versionLine: {
      fontSize: 9,
      color: c.textTertiary,
      textAlign: 'center' as const,
      paddingTop: 4,
      paddingBottom: 8,
    },
    versionLink: {
      color: c.accent,
      textDecorationLine: 'underline' as const,
    },
  });
}
