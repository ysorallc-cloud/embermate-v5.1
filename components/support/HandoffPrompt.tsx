import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, BorderRadius, Typography } from '../../theme/theme-tokens';
import { useDailyCareInstances } from '../../hooks/useDailyCareInstances';
import { getTodayDateString } from '../../services/carePlanGenerator';

export function HandoffPrompt() {
  const router = useRouter();
  const today = getTodayDateString();
  const { state } = useDailyCareInstances(today);
  const [dismissed, setDismissed] = useState(false);

  const instances = state?.instances ?? [];
  const overdueItems = instances.filter(
    (i) => i.status === 'pending' && i.scheduledTime && i.scheduledTime < new Date().toISOString()
  );

  if (dismissed || overdueItems.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.icon}>🔄</Text>
        <Text style={styles.title}>Handoff Summary</Text>
      </View>
      <Text style={styles.body}>
        {overdueItems.length} item{overdueItems.length !== 1 ? 's' : ''} still need
        {overdueItems.length === 1 ? 's' : ''} attention today.
      </Text>
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.viewButton}
          onPress={() => router.push('/care-brief')}
          activeOpacity={0.7}
        >
          <Text style={styles.viewButtonText}>View Care Brief</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setDismissed(true)} activeOpacity={0.7}>
          <Text style={styles.dismissText}>Dismiss</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.warning || '#F59E0B',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  icon: {
    fontSize: 16,
    marginRight: Spacing.xs,
  },
  title: {
    ...Typography.body,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
  },
  body: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  viewButton: {
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  viewButtonText: {
    ...Typography.bodySmall,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  dismissText: {
    ...Typography.bodySmall,
    color: Colors.textMuted,
  },
});
