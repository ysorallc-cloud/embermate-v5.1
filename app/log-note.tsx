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
import { getTodayDateString } from '../services/carePlanGenerator';
import { logInstanceCompletion, DEFAULT_PATIENT_ID } from '../storage/carePlanRepo';
import { BackButton } from '../components/common/BackButton';

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

      emitDataUpdate('notes');

      const instanceId = params.instanceId as string | undefined;
      if (instanceId) {
        try {
          await logInstanceCompletion(DEFAULT_PATIENT_ID, getTodayDateString(), instanceId, 'completed',
            { type: 'custom', note: content.trim() },
            { source: 'record' });
          emitDataUpdate('dailyInstances');
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
            <View style={styles.header}>
              <BackButton variant="text" />
              <Text style={styles.icon}>{params.instanceId ? '\uD83D\uDCCB' : '\uD83D\uDCDD'}</Text>
              <Text style={styles.title}>{params.itemName ? String(params.itemName) : 'Add Note'}</Text>
              <Text style={styles.subtitle}>
                {params.itemName
                  ? 'Add a note to complete this task'
                  : 'Capture observations, reminders, or important information'}
              </Text>
            </View>

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
  header: { alignItems: 'center', marginBottom: 32 },
  backButton: { alignSelf: 'flex-start', marginBottom: 16 },
  backText: { fontSize: 14, color: Colors.accent, fontWeight: '500' },
  icon: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '300', color: Colors.textPrimary, marginBottom: 8 },
  subtitle: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },
  form: { gap: 24 },
  formGroup: { gap: 8 },
  label: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary },
  input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: Colors.textPrimary },
  textArea: { minHeight: 200, paddingTop: 14 },
  saveButton: { backgroundColor: Colors.accent, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 12 },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: Colors.textPrimary, fontSize: 15, fontWeight: '600' },
});
