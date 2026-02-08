// ============================================================================
// JOURNAL PAGE - Recent Care Activity Feed
// Shows chronological feed of logged events from the last 48 hours.
// ============================================================================

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { AuroraBackground } from '../../components/aurora/AuroraBackground';
import { ScreenHeader } from '../../components/ScreenHeader';
import { RecentEntriesFeed } from '../../components/journal/RecentEntriesFeed';
import { Colors } from '../../theme/theme-tokens';
import { MICROCOPY } from '../../constants/microcopy';
import { useRecentEntries } from '../../hooks/useRecentEntries';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function JournalTab() {
  const router = useRouter();
  const { entries, loading: entriesLoading, refresh } = useRecentEntries();

  // ============================================================================
  // RENDER
  // ============================================================================

  if (entriesLoading && entries.length === 0) {
    return (
      <View style={styles.container}>
        <AuroraBackground variant="log" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AuroraBackground variant="log" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={entriesLoading}
            onRefresh={refresh}
            tintColor={Colors.accent}
          />
        }
      >
        <ScreenHeader
          title="Journal"
          subtitle={MICROCOPY.JOURNAL_SUBTITLE}
          rightAction={
            <TouchableOpacity
              onPress={() => router.push('/care-plan' as any)}
              style={styles.headerGear}
              accessibilityLabel="Manage Care Plan"
            >
              <Text style={styles.headerGearIcon}>{'\u2699\uFE0F'}</Text>
            </TouchableOpacity>
          }
        />

        {/* ============================================================ */}
        {/* RECENT ENTRIES FEED */}
        {/* ============================================================ */}
        <RecentEntriesFeed entries={entries} loading={entriesLoading} />

        {/* ============================================================ */}
        {/* FOOTER - Manage Care Plan link */}
        {/* ============================================================ */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.manageLink}
            onPress={() => router.push('/care-plan' as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.manageLinkText}>Manage Care Plan</Text>
          </TouchableOpacity>
        </View>

        {/* Encouragement */}
        <View style={styles.encouragement}>
          <Text style={styles.encouragementTitle}>{MICROCOPY.ONE_STEP}</Text>
          <Text style={styles.encouragementSubtitle}>{MICROCOPY.YOU_GOT_THIS}</Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 16,
    marginTop: 10,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 80,
  },

  // Header Gear
  headerGear: {
    padding: 8,
    marginRight: -8,
  },
  headerGearIcon: {
    fontSize: 20,
    opacity: 0.7,
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  manageLink: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  manageLinkText: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(94, 234, 212, 0.7)',
  },

  // Encouragement
  encouragement: {
    alignItems: 'center',
    paddingVertical: 24,
    marginTop: 8,
  },
  encouragementTitle: {
    fontSize: 18,
    fontWeight: '300',
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 4,
  },
  encouragementSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.4)',
    fontWeight: '400',
  },
});
