// ============================================================================
// SELF-CARE CONFIGURATION
// Block time for your own rest, meals, and personal appointments
// ============================================================================

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SubScreenHeader } from '../../components/SubScreenHeader';
import { AuroraBackground } from '../../components/aurora/AuroraBackground';
import { useTheme } from '../../contexts/ThemeContext';
import { safeGetItem, safeSetItem } from '../../utils/safeStorage';
import { emitDataUpdate } from '../../lib/events';
import { EVENT } from '../../lib/eventNames';
import { logError } from '../../utils/devLog';
import { Colors } from '../../theme/theme-tokens';

// ============================================================================
// TYPES
// ============================================================================

export interface SelfCareItem {
  id: string;
  name: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening';
}

const SELF_CARE_KEY = '@embermate_self_care_config';

const PRESETS = [
  'Walk or exercise',
  'Nap or rest',
  'Personal meal time',
  'Call a friend',
  'Read or journal',
  'Personal appointment',
];

const TIME_OPTIONS: { value: SelfCareItem['timeOfDay']; label: string }[] = [
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SelfCareConfigScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [items, setItems] = useState<SelfCareItem[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTime, setNewTime] = useState<SelfCareItem['timeOfDay']>('afternoon');

  useEffect(() => { loadItems(); }, []);

  const loadItems = useCallback(async () => {
    try {
      const data = await safeGetItem<SelfCareItem[]>(SELF_CARE_KEY, []);
      setItems(data);
    } catch (err) { logError('SelfCareConfigScreen.loadItems', err); }
  }, []);

  const saveItems = useCallback(async (list: SelfCareItem[]) => {
    await safeSetItem(SELF_CARE_KEY, list);
    setItems(list);
    emitDataUpdate(EVENT.CARE_PLAN);
  }, []);

  const handleAdd = useCallback(async () => {
    if (!newName.trim()) return;
    const item: SelfCareItem = {
      id: `selfcare_${Date.now()}`,
      name: newName.trim(),
      timeOfDay: newTime,
    };
    await saveItems([...items, item]);
    setNewName('');
    setShowAdd(false);
  }, [newName, newTime, items, saveItems]);

  const handlePreset = (preset: string) => {
    setNewName(preset);
    setShowAdd(true);
  };

  const handleDelete = useCallback((id: string) => {
    Alert.alert('Remove self-care block', 'Remove this item?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => saveItems(items.filter(i => i.id !== id)) },
    ]);
  }, [items, saveItems]);

  return (
    <View style={styles.root}>
      <AuroraBackground variant="support" />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <SubScreenHeader title="Self-Care" />
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.headerText}>
            Block time for yourself. These appear as 💛 YOU items on your timeline.
          </Text>

          {items.length === 0 && !showAdd && (
            <>
              <Text style={styles.emptyText}>No self-care blocks yet. Pick a preset or create your own.</Text>
              <Text style={styles.presetLabel}>Quick add</Text>
              <View style={styles.presetGrid}>
                {PRESETS.map(p => (
                  <TouchableOpacity key={p} style={styles.presetChip} onPress={() => handlePreset(p)}>
                    <Text style={styles.presetChipText}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {items.map(item => (
            <View key={item.id} style={styles.itemCard}>
              <Text style={styles.itemEmoji}>💛</Text>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemDetail}>{TIME_OPTIONS.find(t => t.value === item.timeOfDay)?.label}</Text>
              </View>
              <TouchableOpacity onPress={() => handleDelete(item.id)} accessibilityLabel="Remove" accessibilityRole="button">
                <Text style={styles.deleteBtn}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}

          {showAdd && (
            <View style={styles.addForm}>
              <TextInput
                style={styles.input}
                placeholder="What's your self-care block?"
                placeholderTextColor={colors.textMuted}
                value={newName}
                onChangeText={setNewName}
                autoFocus
              />
              <Text style={styles.formLabel}>When</Text>
              <View style={styles.chipRow}>
                {TIME_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.chip, newTime === opt.value && { backgroundColor: colors.accent }]}
                    onPress={() => setNewTime(opt.value)}
                  >
                    <Text style={[styles.chipText, newTime === opt.value && { color: '#fff' }]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.formButtons}>
                <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.accent }]} onPress={handleAdd}>
                  <Text style={styles.saveBtnText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setShowAdd(false); setNewName(''); }}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {!showAdd && items.length > 0 && (
            <TouchableOpacity style={styles.addButton} onPress={() => setShowAdd(true)} accessibilityLabel="Add self-care block" accessibilityRole="button">
              <Text style={styles.addButtonText}>+ Add block</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function createStyles(c: typeof Colors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 16, paddingTop: 8 },
    headerText: { fontSize: 14, color: c.textSecondary, lineHeight: 20, marginBottom: 16 },
    emptyText: { fontSize: 14, color: c.textMuted, textAlign: 'center', paddingVertical: 20 },
    presetLabel: { fontSize: 12, fontWeight: '600', color: c.textMuted, marginBottom: 8, marginTop: 8 },
    presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    presetChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: c.glass, borderWidth: 1, borderColor: c.glassBorder },
    presetChipText: { fontSize: 13, color: c.textPrimary },
    itemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.glass, borderWidth: 1, borderColor: c.glassBorder, borderRadius: 14, padding: 14, marginBottom: 8, gap: 10 },
    itemEmoji: { fontSize: 20 },
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
