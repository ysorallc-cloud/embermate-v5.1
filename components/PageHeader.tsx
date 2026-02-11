import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing } from '../theme/theme-tokens';

interface PageHeaderProps {
  emoji: string;
  label: string;
  title: string;
  showSettings?: boolean;
  onBack?: () => void;
}

export default function PageHeader({ 
  emoji, 
  label, 
  title, 
  showSettings = false,
  onBack 
}: PageHeaderProps) {
  const router = useRouter();

  return (
    <View style={styles.headerWrapper}>
      {onBack && (
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
      )}
      
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.titleRow}>
          <Text style={styles.titleIcon}>{emoji}</Text>
          <Text style={styles.title}>{title}</Text>
        </View>
      </View>

      {showSettings && (
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => router.push('/settings')}
          accessibilityLabel="Open settings"
          accessibilityRole="button"
        >
          <Text style={styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerWrapper: {
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 24,
    width: 44,
    height: 44,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  backIcon: {
    fontSize: 20,
    color: Colors.textPrimary,
  },
  settingsButton: {
    position: 'absolute',
    top: 16,
    right: 24,
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  settingsIcon: {
    fontSize: 20,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  label: {
    fontSize: 11,
    letterSpacing: 2,
    color: Colors.accent,
    marginBottom: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  titleIcon: {
    fontSize: 42,
  },
  title: {
    fontSize: 36,
    fontWeight: '200',
    color: Colors.textPrimary,
  },
});
