// Functional note logging
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '../theme/theme-tokens';
import { saveNote } from '../utils/noteStorage';
import { logError } from '../utils/devLog';
import { emitDataUpdate } from '../lib/events';
import { EVENT } from '../lib/eventNames';
import { getTodayDateString } from '../services/carePlanGenerator';
import { logInstanceCompletion, DEFAULT_PATIENT_ID } from '../storage/carePlanRepo';
import { SubScreenHeader } from '../components/SubScreenHeader';

export default function LogNoteScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!content.trim()) {
      Alert.alert('Required', 'Please enter a note');
      return;
    }

    setSaving(true);
    try {
      const now = new Date();
      await saveNote({
        content: content.trim(),
        timestamp: now.toISOString(),
        date: getTodayDateString(),
      });

      emitDataUpdate(EVENT.NOTES);

      const instanceId = params.instanceId as string | undefined;
      if (instanceId) {
        try {
          await logInstanceCompletion(DEFAULT_PATIENT_ID, getTodayDateString(), instanceId, 'completed',
            { type: 'custom', note: content.trim() },
            { source: 'record' });
          emitDataUpdate(EVENT.DAILY_INSTANCES);
        } catch (err) {
          logError('LogNoteScreen.completeInstance', err);
        }
      }

      router.back();
    } catch (error) {
      Alert.alert('Error', 'Failed to save note');
      logError('LogNoteScreen.handleSave', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]} style={styles.gradient}>
        <ScrollView style={styles.scrollView}>
          <View style={styles.content}>
            <SubScreenHeader title="Log Note" emoji="📝" />

            <View style={styles.form}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Note *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={content}
                  onChangeText={setContent}
                  placeholder="Seemed more energetic today. Appetite was good at lunch. Remember to ask doctor about new medication next visit..."
                  placeholderTextColor={Colors.textMuted}
                  multiline
                  numberOfLines={10}
                  textAlignVertical="top"
                  autoFocus
                  accessibilityLabel="Care note, required"
                />
              </View>

              <TouchableOpacity style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={handleSave} disabled={saving} accessibilityLabel={saving ? 'Saving note' : 'Save note'} accessibilityHint="Saves the care observation note" accessibilityRole="button" accessibilityState={{ disabled: saving }}>
                <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Note'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  gradient: { flex: 1 },
  scrollView: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  form: { gap: 24 },
  formGroup: { gap: 8 },
  label: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary },
  input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: Colors.textPrimary },
  textArea: { minHeight: 200, paddingTop: 14 },
  saveButton: { backgroundColor: Colors.accent, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 12 },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: Colors.textPrimary, fontSize: 15, fontWeight: '600' },
});
