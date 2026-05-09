// ============================================================================
// ERRANDS & TASKS CONFIGURATION — Phase 10.3.x migrated to
// CarePlanConfigScreen with chrome="aurora-care" (coordination family).
//
// The primitive owns SafeAreaView + AuroraBackground + header chrome.
// This file owns the configuration body: errand list + add form with
// frequency/time chips.
// ============================================================================

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CarePlanConfigScreen } from '../../components/care-plan/CarePlanConfigScreen';
import { useTheme } from '../../contexts/ThemeContext';
import { safeGetItem, safeSetItem } from '../../utils/safeStorage';
import { emitDataUpdate } from '../../lib/events';
import { EVENT } from '../../lib/eventNames';
import { logError } from '../../utils/devLog';
import { Colors } from '../../theme/theme-tokens';

// ============================================================================
// TYPES
// ============================================================================

export interface ErrandItem {
  id: string;
  name: string;
  frequency: 'daily' | 'weekly' | 'as_needed';
  timeOfDay: 'morning' | 'afternoon' | 'evening';
}

const ERRANDS_KEY = '@embermate_errands_config';

const FREQUENCY_OPTIONS: { value: ErrandItem['frequency']; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'as_needed', label: 'As needed' },
];

const TIME_OPTIONS: { value: ErrandItem['timeOfDay']; label: string }[] = [
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ErrandsConfigScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const [errands, setErrands] = useState<ErrandItem[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newFreq, setNewFreq] = useState<ErrandItem['frequency']>('daily');
  const [newTime, setNewTime] = useState<ErrandItem['timeOfDay']>('morning');

  useEffect(() => {
    loadErrands();
  }, []);

  const loadErrands = useCallback(async () => {
    try {
      const data = await safeGetItem<ErrandItem[]>(ERRANDS_KEY, []);
      setErrands(data);
    } catch (err) {
      logError('ErrandsConfigScreen.loadErrands', err);
    }
  }, []);

  const saveErrands = useCallback(async (items: ErrandItem[]) => {
    await safeSetItem(ERRANDS_KEY, items);
    setErrands(items);
    emitDataUpdate(EVENT.CARE_PLAN);
  }, []);

  const handleAdd = useCallback(async () => {
    if (!newName.trim()) return;
    const item: ErrandItem = {
      id: `errand_${Date.now()}`,
      name: newName.trim(),
      frequency: newFreq,
      timeOfDay: newTime,
    };
    await saveErrands([...errands, item]);
    setNewName('');
    setShowAdd(false);
  }, [newName, newFreq, newTime, errands, saveErrands]);

  const handleDelete = useCallback((id: string) => {
    Alert.alert('Delete errand', 'Remove this errand?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => saveErrands(errands.filter(e => e.id !== id)) },
    ]);
  }, [errands, saveErrands]);

  return (
    <CarePlanConfigScreen
      title="Errands & Tasks"
      chrome="aurora-care"
      onBack={() => router.back()}
    >
      {errands.length === 0 && !showAdd && (
        <Text style={styles.emptyText}>No errands configured. Tap + to add one.</Text>
      )}

      {errands.map(item => (
        <View key={item.id} style={styles.itemCard}>
          <View style={styles.itemInfo}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemDetail}>
              {FREQUENCY_OPTIONS.find(f => f.value === item.frequency)?.label} · {TIME_OPTIONS.find(t => t.value === item.timeOfDay)?.label}
            </Text>
          </View>
          <TouchableOpacity onPress={() => handleDelete(item.id)} accessibilityLabel="Delete errand" accessibilityRole="button">
            <Text style={styles.deleteBtn}>✕</Text>
          </TouchableOpacity>
        </View>
      ))}

      {showAdd && (
        <View style={styles.addForm}>
          <TextInput
            style={styles.input}
            placeholder="Errand name (e.g., Rx pickup)"
            placeholderTextColor={colors.textMuted}
            value={newName}
            onChangeText={setNewName}
            autoFocus
          />
          <Text style={styles.formLabel}>Frequency</Text>
          <View style={styles.chipRow}>
            {FREQUENCY_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.chip, newFreq === opt.value && { backgroundColor: colors.accent }]}
                onPress={() => setNewFreq(opt.value)}
                accessibilityRole="button"
                accessibilityLabel={`Frequency: ${opt.label}`}
                accessibilityState={{ selected: newFreq === opt.value }}
              >
                <Text style={[styles.chipText, newFreq === opt.value && { color: '#fff' }]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.formLabel}>Time of day</Text>
          <View style={styles.chipRow}>
            {TIME_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.chip, newTime === opt.value && { backgroundColor: colors.accent }]}
                onPress={() => setNewTime(opt.value)}
                accessibilityRole="button"
                accessibilityLabel={`Time of day: ${opt.label}`}
                accessibilityState={{ selected: newTime === opt.value }}
              >
                <Text style={[styles.chipText, newTime === opt.value && { color: '#fff' }]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.formButtons}>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.accent }]}
              onPress={handleAdd}
              accessibilityRole="button"
              accessibilityLabel="Save errand"
            >
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowAdd(false)}
              accessibilityRole="button"
              accessibilityLabel="Cancel adding errand"
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {!showAdd && (
        <TouchableOpacity style={styles.addButton} onPress={() => setShowAdd(true)} accessibilityLabel="Add errand" accessibilityRole="button">
          <Text style={styles.addButtonText}>+ Add errand</Text>
        </TouchableOpacity>
      )}

      <View style={{ height: 40 }} />
    </CarePlanConfigScreen>
  );
}

// ============================================================================
// STYLES
// ============================================================================

function createStyles(c: typeof Colors) {
  return StyleSheet.create({
    emptyText: { fontSize: 14, color: c.textMuted, textAlign: 'center', paddingVertical: 40 },
    itemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.glass, borderWidth: 1, borderColor: c.glassBorder, borderRadius: 14, padding: 14, marginBottom: 8, gap: 12 },
    itemInfo: { flex: 1 },
    itemName: { fontSize: 15, fontWeight: '600', color: c.textPrimary, marginBottom: 2 },
    itemDetail: { fontSize: 12, color: c.textMuted },
    deleteBtn: { fontSize: 16, color: c.textMuted, padding: 4 },
    addForm: { backgroundColor: c.glass, borderWidth: 1, borderColor: c.glassBorder, borderRadius: 14, padding: 16, marginBottom: 8 },
    input: { borderWidth: 1, borderColor: c.glassBorder, borderRadius: 8, padding: 12, fontSize: 15, color: c.textPrimary, backgroundColor: c.background, marginBottom: 12 },
    formLabel: { fontSize: 12, fontWeight: '600', color: c.textMuted, marginBottom: 6, marginTop: 4 },
    chipRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: c.glassBorder, backgroundColor: c.background },
    chipText: { fontSize: 13, fontWeight: '500', color: c.textSecondary },
    formButtons: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 8 },
    saveBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
    saveBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
    cancelText: { fontSize: 14, color: c.textMuted },
    addButton: { alignItems: 'center', paddingVertical: 14 },
    addButtonText: { fontSize: 15, fontWeight: '600', color: c.accent },
  });
}
