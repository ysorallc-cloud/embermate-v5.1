// ============================================================================
// REFLECTION PROMPT — Optional single-prompt daily caregiver reflection
// Section header rendered by parent (journal.tsx SectionLabel)
// ============================================================================

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { InlineSaveToast } from '../shared/InlineSaveToast';

// ============================================================================
// TYPES
// ============================================================================

export interface ReflectionPromptProps {
  date: string;
  prompt: string;
  savedText?: string;
  savedAt?: string;
  onSave: (text: string) => Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ReflectionPrompt({ date, prompt, savedText, savedAt, onSave, onDirtyChange }: ReflectionPromptProps) {
  const { colors } = useTheme();
  const [editing, setEditing] = useState(!savedText);
  const [text, setText] = useState(savedText || '');
  const [saving, setSaving] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const handleTextChange = (newText: string) => {
    setText(newText);
    const isDirty = newText.trim() !== (savedText || '').trim();
    onDirtyChange?.(isDirty);
  };

  const handleSave = async () => {
    if (!text.trim() || saving) return;
    setSaving(true);
    const saved = text.trim();
    await onSave(saved);
    setSaving(false);
    setEditing(false);
    onDirtyChange?.(false);
    const preview = saved.length > 30 ? saved.slice(0, 30) + '…' : saved;
    setToastMessage(`Saved · ${preview}`);
    setToastVisible(true);
  };

  const formattedTime = savedAt
    ? new Date(savedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : null;

  // Phase 6 — compact reflection: italic prompt, slim text field, privacy note
  // and right-aligned "Save" link. Save logic / dirty tracking unchanged.
  return (
    <View style={styles.section}>
      <Text style={[styles.prompt, { color: colors.textWarmMuted }]}>{prompt}</Text>

      {editing ? (
        <View>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.warmSurface,
                borderColor: colors.warmSurfaceBorder,
                color: colors.textWarmPrimary,
              },
            ]}
            placeholder="Write a few words, or skip..."
            placeholderTextColor={colors.textWarmDim}
            value={text}
            onChangeText={handleTextChange}
            multiline
            textAlignVertical="top"
          />
          <View style={styles.actions}>
            <Text style={[styles.privacy, { color: colors.textWarmDim }]}>
              Private · on this device only
            </Text>
            <TouchableOpacity
              onPress={handleSave}
              disabled={!text.trim() || saving}
              activeOpacity={0.7}
              accessibilityLabel="Save reflection"
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.save,
                  { color: colors.accent },
                  (!text.trim() || saving) && { opacity: 0.4 },
                ]}
              >
                {saving ? 'Saving…' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          onPress={() => setEditing(true)}
          activeOpacity={0.7}
          accessibilityLabel="Tap to edit reflection"
          accessibilityRole="button"
        >
          <View
            style={[
              styles.savedBox,
              {
                backgroundColor: colors.warmSurface,
                borderColor: colors.warmSurfaceBorder,
              },
            ]}
          >
            <Text style={[styles.savedText, { color: colors.textWarmSecondary }]}>{text}</Text>
          </View>
          <Text style={[styles.timestamp, { color: colors.textWarmDim }]}>
            Saved{formattedTime ? ` at ${formattedTime}` : ''} · private
          </Text>
        </TouchableOpacity>
      )}

      <InlineSaveToast
        visible={toastVisible}
        message={toastMessage}
        onDismiss={() => setToastVisible(false)}
      />
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  section: {
    paddingVertical: 14,
  },
  prompt: {
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 19,
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    minHeight: 44,
    fontSize: 13,
    marginBottom: 8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  privacy: {
    fontSize: 10,
  },
  save: {
    fontSize: 12,
    fontWeight: '500',
  },
  savedBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
  },
  savedText: {
    fontSize: 13,
    lineHeight: 19,
  },
  timestamp: {
    fontSize: 10,
  },
});
