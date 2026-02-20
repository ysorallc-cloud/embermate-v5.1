import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius } from '../../theme/theme-tokens';
import { navigate } from '../../lib/navigate';
import { useDataListener } from '../../lib/events';

const DISMISSED_KEY = '@embermate_checklist_dismissed';

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  route?: string;
  check: () => Promise<boolean>;
}

const items: ChecklistItem[] = [
  {
    id: 'care_plan',
    label: 'Set up a care plan',
    description: 'Define daily care tasks and medications',
    route: '/care-plan',
    check: async () => {
      // Check both legacy and bucket-based care plan keys
      const legacy = await AsyncStorage.getItem('@embermate_care_plan_v1');
      const bucket = await AsyncStorage.getItem('@embermate_careplan_config_v1:default');
      return legacy !== null || bucket !== null;
    },
  },
  {
    id: 'patient_name',
    label: 'Add who you care for',
    description: 'Personalize the app with their name',
    route: '/patient',
    check: async () => {
      const name = await AsyncStorage.getItem('@embermate_patient_name');
      return !!name;
    },
  },
  {
    id: 'first_log',
    label: 'Log your first care task',
    description: 'Track a medication, meal, or wellness check',
    route: '/log-morning-wellness',
    check: async () => {
      // Check if any daily care instance has been completed
      const keys = await AsyncStorage.getAllKeys();
      const instanceKeys = keys.filter(k => k.startsWith('@embermate_daily_instances_'));
      for (const key of instanceKeys) {
        const raw = await AsyncStorage.getItem(key);
        if (!raw) continue;
        try {
          const data = JSON.parse(raw);
          const instances = data.instances || data;
          if (Array.isArray(instances) && instances.some((i: any) => i.status === 'completed')) {
            return true;
          }
        } catch {}
      }
      return false;
    },
  },
];

export function GettingStartedChecklist() {
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [dismissed, setDismissed] = useState(true);
  const checkingRef = useRef(false);

  const runChecks = useCallback(async () => {
    if (checkingRef.current) return;
    checkingRef.current = true;
    try {
      const wasDismissed = await AsyncStorage.getItem(DISMISSED_KEY);
      if (wasDismissed === 'true') {
        setDismissed(true);
        return;
      }

      const results: Record<string, boolean> = {};
      for (const item of items) {
        try {
          results[item.id] = await item.check();
        } catch {
          results[item.id] = false;
        }
      }
      setCompleted(results);

      const allDone = items.every((i) => results[i.id]);
      setDismissed(allDone);
    } finally {
      checkingRef.current = false;
    }
  }, []);

  // Re-check on tab focus
  useFocusEffect(useCallback(() => { runChecks(); }, [runChecks]));

  // Re-check when any data changes (care plan saved, task completed, etc.)
  useDataListener(useCallback(() => { runChecks(); }, [runChecks]));

  if (dismissed) return null;

  const completedCount = items.filter((i) => completed[i.id]).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Getting Started</Text>
        <Text style={styles.progress}>
          {completedCount}/{items.length}
        </Text>
      </View>

      {items.map((item) => {
        const done = completed[item.id];
        return (
          <TouchableOpacity
            key={item.id}
            style={styles.item}
            onPress={() => item.route && navigate(item.route)}
            activeOpacity={item.route ? 0.7 : 1}
            disabled={!item.route || done}
          >
            <Text style={styles.checkmark}>{done ? '\u2705' : '\u2B1C'}</Text>
            <View style={styles.itemText}>
              <Text style={[styles.itemLabel, done && styles.itemDone]}>{item.label}</Text>
              {!done && <Text style={styles.itemDesc}>{item.description}</Text>}
            </View>
          </TouchableOpacity>
        );
      })}

      <TouchableOpacity
        style={styles.dismiss}
        onPress={async () => {
          setDismissed(true);
          await AsyncStorage.setItem(DISMISSED_KEY, 'true');
        }}
      >
        <Text style={styles.dismissText}>Dismiss</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  progress: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 6,
    gap: 10,
  },
  checkmark: {
    fontSize: 16,
    marginTop: 1,
  },
  itemText: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  itemDone: {
    color: Colors.textMuted,
    textDecorationLine: 'line-through',
  },
  itemDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  dismiss: {
    marginTop: Spacing.sm,
    alignItems: 'center',
  },
  dismissText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
});
