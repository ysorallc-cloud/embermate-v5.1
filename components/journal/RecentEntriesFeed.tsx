// ============================================================================
// RecentEntriesFeed — Grouped list of recent log entries for the Journal tab
// ============================================================================

import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { RecentEntry } from '../../hooks/useRecentEntries';
import { RecentEntryCard } from './RecentEntryCard';
import { Colors } from '../../theme/theme-tokens';

interface Props {
  entries: RecentEntry[];
  loading: boolean;
}

export function RecentEntriesFeed({ entries, loading }: Props) {
  const router = useRouter();

  const handlePress = (entry: RecentEntry) => {
    router.push(entry.route as any);
  };

  if (loading && entries.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={Colors.accent} />
      </View>
    );
  }

  if (entries.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyEmoji}>{'\u{1F4D6}'}</Text>
        <Text style={styles.emptyTitle}>Nothing logged yet</Text>
        <Text style={styles.emptySubtitle}>
          Your recent care activities will appear here
        </Text>
      </View>
    );
  }

  const todayEntries = entries.filter(e => e.dateGroup === 'Today');
  const yesterdayEntries = entries.filter(e => e.dateGroup === 'Yesterday');

  return (
    <View style={styles.container}>
      {todayEntries.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>TODAY</Text>
          {todayEntries.map(entry => (
            <RecentEntryCard key={entry.id} entry={entry} onPress={handlePress} />
          ))}
        </View>
      )}
      {yesterdayEntries.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>YESTERDAY</Text>
          {yesterdayEntries.map(entry => (
            <RecentEntryCard key={entry.id} entry={entry} onPress={handlePress} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  section: {
    marginBottom: 12,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 1,
    marginBottom: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
  },
});
