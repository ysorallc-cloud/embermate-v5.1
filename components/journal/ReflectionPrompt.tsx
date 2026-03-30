// ============================================================================
// REFLECTION PROMPT — Optional single-prompt daily caregiver reflection
// Section header rendered by parent (journal.tsx SectionLabel)
// ============================================================================

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

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

  const handleTextChange = (newText: string) => {
    setText(newText);
    const isDirty = newText.trim() !== (savedText || '').trim();
    onDirtyChange?.(isDirty);
  };

  const handleSave = async () => {
    if (!text.trim() || saving) return;
    setSaving(true);
    await onSave(text.trim());
    setSaving(false);
    setEditing(false);
    onDirtyChange?.(false);
  };

  const formattedTime = savedAt
    ? new Date(savedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : null;

  return (
    <View style={styles.card}>
      {/* Prompt */}
      <Text style={styles.prompt}>{prompt}</Text>

      {editing ? (
        <>
          <TextInput
            style={[styles.input, { color: colors.textPrimary, borderColor: 'rgba(74,107,93,0.15)' }]}
            placeholder="Write a few words, or skip..."
            placeholderTextColor="rgba(200,195,180,0.3)"
            value={text}
            onChangeText={handleTextChange}
            multiline
            textAlignVertical="top"
          />
          <Text style={styles.storageHint}>
            Your reflection is saved privately on this device and included in shared reports only if you choose.
          </Text>
          <TouchableOpacity
            style={[styles.saveBtn, !text.trim() && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!text.trim() || saving}
            activeOpacity={0.7}
            accessibilityLabel="Save reflection"
            accessibilityRole="button"
          >
            <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save reflection'}</Text>
          </TouchableOpacity>
        </>
      ) : (
        <TouchableOpacity
          onPress={() => setEditing(true)}
          activeOpacity={0.7}
          accessibilityLabel="Tap to edit reflection"
          accessibilityRole="button"
        >
          <Text style={styles.savedText}>{text}</Text>
          <Text style={styles.storageNotice}>
            Saved{formattedTime ? ` at ${formattedTime}` : ''} · Stored privately on this device
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(74,107,93,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(74,107,93,0.1)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
  },
  prompt: {
    fontSize: 14,
    fontStyle: 'italic',
    color: 'rgba(220,216,205,0.5)',
    lineHeight: 20,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    minHeight: 60,
    lineHeight: 20,
    backgroundColor: 'rgba(0,0,0,0.15)',
    marginBottom: 10,
  },
  storageHint: {
    fontSize: 11,
    color: 'rgba(200,195,180,0.3)',
    marginBottom: 10,
    lineHeight: 16,
  },
  saveBtn: {
    backgroundColor: '#5DCAA5',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.35,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  savedText: {
    fontSize: 14,
    color: 'rgba(220,216,205,0.7)',
    lineHeight: 20,
    marginBottom: 6,
  },
  storageNotice: {
    fontSize: 11,
    color: 'rgba(200,195,180,0.3)',
    marginTop: 4,
  },
});
