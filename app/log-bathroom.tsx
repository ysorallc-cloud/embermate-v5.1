// ============================================================================
// LOG BATHROOM - Bowel movement and urination tracking
// ============================================================================

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { AuroraBackground } from '../components/aurora/AuroraBackground';
import { ScreenHeader } from '../components/ScreenHeader';
import { Colors, Spacing, BorderRadius } from '../theme/theme-tokens';
import { saveNotesLog } from '../utils/centralStorage';
import { emitDataUpdate } from '../lib/events';
import { getTodayDateString } from '../services/carePlanGenerator';
import { logError } from '../utils/devLog';

const BOWEL_OPTIONS = [
  { id: 'normal', label: 'Normal', icon: '✅' },
  { id: 'loose', label: 'Loose', icon: '💧' },
  { id: 'hard', label: 'Hard/Constipated', icon: '🔴' },
  { id: 'none', label: 'No BM today', icon: '➖' },
];

const URINATION_OPTIONS = [
  { id: 'normal', label: 'Normal', icon: '✅' },
  { id: 'frequent', label: 'Frequent', icon: '🔁' },
  { id: 'reduced', label: 'Reduced', icon: '⬇️' },
  { id: 'difficult', label: 'Difficult/Painful', icon: '⚠️' },
];

export default function LogBathroomScreen() {
  const router = useRouter();
  const [bowel, setBowel] = useState<string | null>(null);
  const [urination, setUrination] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (saved) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      const timer = setTimeout(() => {
        router.canGoBack() ? router.back() : router.replace('/(tabs)/now');
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [saved]);

  const handleSave = async () => {
    if (!bowel && !urination) return;

    try {
      const today = getTodayDateString();
      const parts: string[] = [];
      if (bowel) {
        const bowelLabel = BOWEL_OPTIONS.find(o => o.id === bowel)?.label || bowel;
        parts.push(`Bowel: ${bowelLabel}`);
      }
      if (urination) {
        const urinationLabel = URINATION_OPTIONS.find(o => o.id === urination)?.label || urination;
        parts.push(`Urination: ${urinationLabel}`);
      }
      if (notes.trim()) {
        parts.push(`Notes: ${notes.trim()}`);
      }

      await saveNotesLog(today, `[Bathroom] ${parts.join(' | ')}`);
      emitDataUpdate('notes');
      setSaved(true);
    } catch (error) {
      logError('LogBathroomScreen.handleSave', error);
    }
  };

  if (saved) {
    return (
      <AuroraBackground variant="log">
        <View style={styles.confirmContainer}>
          <Animated.View style={[styles.confirmContent, { opacity: fadeAnim }]}>
            <Text style={styles.confirmIcon}>✅</Text>
            <Text style={styles.confirmTitle}>Logged</Text>
            <Text style={styles.confirmSubtitle}>Bathroom visit recorded</Text>
          </Animated.View>
        </View>
      </AuroraBackground>
    );
  }

  return (
    <AuroraBackground variant="log">
      <ScreenHeader
        title="Bathroom"
        onBack={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/now')}
      />
      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        {/* Bowel Movement */}
        <Text style={styles.sectionTitle}>Bowel Movement</Text>
        <View style={styles.optionsGrid}>
          {BOWEL_OPTIONS.map(option => (
            <TouchableOpacity
              key={option.id}
              style={[styles.optionChip, bowel === option.id && styles.optionChipSelected]}
              onPress={() => setBowel(bowel === option.id ? null : option.id)}
            >
              <Text style={styles.optionIcon}>{option.icon}</Text>
              <Text style={[styles.optionLabel, bowel === option.id && styles.optionLabelSelected]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Urination */}
        <Text style={styles.sectionTitle}>Urination</Text>
        <View style={styles.optionsGrid}>
          {URINATION_OPTIONS.map(option => (
            <TouchableOpacity
              key={option.id}
              style={[styles.optionChip, urination === option.id && styles.optionChipSelected]}
              onPress={() => setUrination(urination === option.id ? null : option.id)}
            >
              <Text style={styles.optionIcon}>{option.icon}</Text>
              <Text style={[styles.optionLabel, urination === option.id && styles.optionLabelSelected]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Notes */}
        <Text style={styles.sectionTitle}>Notes (optional)</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="Any additional details..."
          placeholderTextColor={Colors.textPlaceholder}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, (!bowel && !urination) && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!bowel && !urination}
        >
          <Text style={styles.saveButtonText}>Log Bathroom Visit</Text>
        </TouchableOpacity>
      </ScrollView>
    </AuroraBackground>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1 },
  contentInner: { padding: Spacing.md, paddingBottom: 40 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 10,
    marginTop: 20,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  optionChipSelected: {
    backgroundColor: Colors.accentDim,
    borderColor: Colors.accentBorder,
  },
  optionIcon: { fontSize: 16 },
  optionLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  optionLabelSelected: {
    color: Colors.accent,
    fontWeight: '600',
  },
  notesInput: {
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: BorderRadius.md,
    padding: 12,
    color: Colors.textPrimary,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.lg,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonDisabled: {
    opacity: 0.4,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  confirmContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmContent: {
    alignItems: 'center',
  },
  confirmIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  confirmTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textBright,
    marginBottom: 4,
  },
  confirmSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
