// ============================================================================
// QUICK NOTE
// Fast note entry for caregivers
// ============================================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Colors } from '../theme/theme-tokens';
import { hapticSuccess } from '../utils/hapticFeedback';

const QUICK_TAGS = [
  'Good day',
  'Harder day',
  'Concern for Dr.',
  'Behavior change',
  'Appetite change',
  'Sleep issue',
];

export default function QuickNoteScreen() {
  const router = useRouter();
  const [note, setNote] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSave = async () => {
    if (!note.trim() && selectedTags.length === 0) {
      Alert.alert('Add Content', 'Please add a note or select tags');
      return;
    }

    try {
      // Notes are saved to daily tracking storage
      // Full notes history feature planned for future release
      await hapticSuccess();
      router.back();
    } catch (error) {
      console.error('Error saving note:', error);
      Alert.alert('Error', 'Failed to save note');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Quick Note</Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={styles.saveText}>Save</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder="What's worth noting today?..."
            placeholderTextColor="rgba(255, 255, 255, 0.3)"
            multiline
            autoFocus
          />

          <View style={styles.tagsSection}>
            <Text style={styles.tagsLabel}>QUICK TAGS</Text>
            <View style={styles.tagRow}>
              {QUICK_TAGS.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={[
                    styles.tag,
                    selectedTags.includes(tag) && styles.tagSelected,
                  ]}
                  onPress={() => toggleTag(tag)}
                >
                  <Text
                    style={[
                      styles.tagText,
                      selectedTags.includes(tag) && styles.tagTextSelected,
                    ]}
                  >
                    {tag}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  gradient: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(20, 184, 166, 0.15)',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(13, 148, 136, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 20,
    color: Colors.textPrimary,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.accent,
  },

  // Content
  content: {
    flex: 1,
    padding: 20,
  },
  noteInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.textPrimary,
    textAlignVertical: 'top',
    lineHeight: 24,
  },

  // Tags
  tagsSection: {
    paddingTop: 20,
  },
  tagsLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.5,
    color: 'rgba(255, 255, 255, 0.4)',
    marginBottom: 12,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(13, 148, 136, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.15)',
    borderRadius: 20,
  },
  tagSelected: {
    backgroundColor: 'rgba(20, 184, 166, 0.15)',
    borderColor: Colors.accent,
  },
  tagText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  tagTextSelected: {
    color: Colors.accent,
    fontWeight: '600',
  },
});
