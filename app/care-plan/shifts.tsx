// ============================================================================
// SHIFT SCHEDULE CONFIGURATION
// Configure who covers care and when handoffs happen
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

export interface ShiftItem {
  id: string;
  caregiverName: string;
  startTime: string;   // HH:MM
  endTime: string;      // HH:MM
  days: string[];       // ['Mon', 'Tue', ...]
}

const SHIFTS_KEY = '@embermate_shifts_config';
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ShiftsConfigScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [shifts, setShifts] = useState<ShiftItem[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newStart, setNewStart] = useState('08:00');
  const [newEnd, setNewEnd] = useState('16:00');
  const [newDays, setNewDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);

  useEffect(() => { loadShifts(); }, []);

  const loadShifts = useCallback(async () => {
    try {
      const data = await safeGetItem<ShiftItem[]>(SHIFTS_KEY, []);
      setShifts(data);
    } catch (err) { logError('ShiftsConfigScreen.loadShifts', err); }
  }, []);

  const saveShifts = useCallback(async (items: ShiftItem[]) => {
    await safeSetItem(SHIFTS_KEY, items);
    setShifts(items);
    emitDataUpdate(EVENT.CARE_PLAN);
  }, []);

  const handleAdd = useCallback(async () => {
    if (!newName.trim()) return;
    const item: ShiftItem = {
      id: `shift_${Date.now()}`,
      caregiverName: newName.trim(),
      startTime: newStart,
      endTime: newEnd,
      days: newDays,
    };
    await saveShifts([...shifts, item]);
    setNewName('');
    setShowAdd(false);
  }, [newName, newStart, newEnd, newDays, shifts, saveShifts]);

  const handleDelete = useCallback((id: string) => {
    Alert.alert('Delete shift', 'Remove this shift?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => saveShifts(shifts.filter(s => s.id !== id)) },
    ]);
  }, [shifts, saveShifts]);

  const toggleDay = (day: string) => {
    setNewDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  return (
    <View style={styles.root}>
      <AuroraBackground variant="care" />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <SubScreenHeader title="Shift Schedule" />
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {shifts.length === 0 && !showAdd && (
            <Text style={styles.emptyText}>No shifts configured. Tap + to add a caregiver shift.</Text>
          )}

          {shifts.map(item => (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.caregiverName}</Text>
                <Text style={styles.itemDetail}>{item.startTime} – {item.endTime} · {item.days.join(', ')}</Text>
              </View>
              <TouchableOpacity onPress={() => handleDelete(item.id)} accessibilityLabel="Delete shift" accessibilityRole="button">
                <Text style={styles.deleteBtn}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}

          {showAdd && (
            <View style={styles.addForm}>
              <TextInput
                style={styles.input}
                placeholder="Caregiver name"
                placeholderTextColor={colors.textMuted}
                value={newName}
                onChangeText={setNewName}
                autoFocus
              />
              <Text style={styles.formLabel}>Days</Text>
              <View style={styles.chipRow}>
                {DAYS.map(day => (
                  <TouchableOpacity
                    key={day}
                    style={[styles.dayChip, newDays.includes(day) && { backgroundColor: colors.accent }]}
                    onPress={() => toggleDay(day)}
                    accessibilityRole="button"
                    accessibilityLabel={`Toggle ${day}`}
                    accessibilityState={{ selected: newDays.includes(day) }}
                  >
                    <Text style={[styles.dayChipText, newDays.includes(day) && { color: '#fff' }]}>{day}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.formButtons}>
                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: colors.accent }]}
                  onPress={handleAdd}
                  accessibilityRole="button"
                  accessibilityLabel="Save shift"
                >
                  <Text style={styles.saveBtnText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowAdd(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel adding shift"
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {!showAdd && (
            <TouchableOpacity style={styles.addButton} onPress={() => setShowAdd(true)} accessibilityLabel="Add shift" accessibilityRole="button">
              <Text style={styles.addButtonText}>+ Add shift</Text>
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
    emptyText: { fontSize: 14, color: c.textMuted, textAlign: 'center', paddingVertical: 40 },
    itemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.glass, borderWidth: 1, borderColor: c.glassBorder, borderRadius: 14, padding: 14, marginBottom: 8, gap: 12 },
    itemInfo: { flex: 1 },
    itemName: { fontSize: 15, fontWeight: '600', color: c.textPrimary, marginBottom: 2 },
    itemDetail: { fontSize: 12, color: c.textMuted },
    deleteBtn: { fontSize: 16, color: c.textMuted, padding: 4 },
    addForm: { backgroundColor: c.glass, borderWidth: 1, borderColor: c.glassBorder, borderRadius: 14, padding: 16, marginBottom: 8 },
    input: { borderWidth: 1, borderColor: c.glassBorder, borderRadius: 8, padding: 12, fontSize: 15, color: c.textPrimary, backgroundColor: c.background, marginBottom: 12 },
    formLabel: { fontSize: 12, fontWeight: '600', color: c.textMuted, marginBottom: 6, marginTop: 4 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
    dayChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: c.glassBorder, backgroundColor: c.background },
    dayChipText: { fontSize: 12, fontWeight: '500', color: c.textSecondary },
    formButtons: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 8 },
    saveBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
    saveBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
    cancelText: { fontSize: 14, color: c.textMuted },
    addButton: { alignItems: 'center', paddingVertical: 14 },
    addButtonText: { fontSize: 15, fontWeight: '600', color: c.accent },
  });
}
