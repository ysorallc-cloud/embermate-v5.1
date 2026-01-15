// ============================================================================
// SETTINGS SCREEN
// Central hub for app configuration, patient management, and data control
// ============================================================================

import React from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Colors } from './_theme/theme-tokens';

interface SettingsItem {
  icon: string;
  label: string;
  description: string;
  route: string;
}

interface SettingsSection {
  title: string;
  items: SettingsItem[];
}

const settingsSections: SettingsSection[] = [
  {
    title: 'PATIENT',
    items: [
      {
        icon: '👤',
        label: 'Patient Profile',
        description: 'Name, conditions, allergies',
        route: '/patient-profile',
      },
      {
        icon: '📊',
        label: 'Baselines & Targets',
        description: 'Pain, BP, glucose thresholds',
        route: '/baselines-targets',
      },
    ],
  },
  {
    title: 'CARE',
    items: [
      {
        icon: '💊',
        label: 'Medications',
        description: 'Manage medication list',
        route: '/medications',
      },
      {
        icon: '📅',
        label: 'Appointments',
        description: 'Upcoming visits and providers',
        route: '/appointments',
      },
      {
        icon: '👥',
        label: 'Care Circle',
        description: 'Members and permissions',
        route: '/caregiver-management',
      },
    ],
  },
  {
    title: 'APP',
    items: [
      {
        icon: '🔔',
        label: 'Notifications',
        description: 'Reminders and alerts',
        route: '/notification-settings',
      },
      {
        icon: '📤',
        label: 'Export Data',
        description: 'Download health records',
        route: '/care-summary-export',
      },
      {
        icon: '🔒',
        label: 'Privacy & Security',
        description: 'PIN, biometrics, data sharing',
        route: '/privacy-settings',
      },
    ],
  },
  {
    title: 'SUPPORT',
    items: [
      {
        icon: '❓',
        label: 'Help & FAQ',
        description: '',
        route: '/help',
      },
      {
        icon: '💬',
        label: 'Contact Support',
        description: '',
        route: '/support',
      },
      {
        icon: '⭐',
        label: 'Rate EmberMate',
        description: '',
        route: '/rate',
      },
    ],
  },
];

export default function SettingsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scroll}>
          {settingsSections.map((section, sectionIndex) => (
            <View key={sectionIndex} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <View style={styles.sectionCard}>
                {section.items.map((item, itemIndex) => (
                  <TouchableOpacity
                    key={itemIndex}
                    style={[
                      styles.item,
                      itemIndex < section.items.length - 1 && styles.itemBorder,
                    ]}
                    onPress={() => router.push(item.route)}
                  >
                    <Text style={styles.itemIcon}>{item.icon}</Text>
                    <View style={styles.itemContent}>
                      <Text style={styles.itemLabel}>{item.label}</Text>
                      {item.description && (
                        <Text style={styles.itemDescription}>
                          {item.description}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.itemArrow}>→</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>EmberMate v5.0.0</Text>
            <Text style={styles.footerText}>Made with 💜 for caregivers</Text>
          </View>
        </ScrollView>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 22,
    fontWeight: '300',
    color: Colors.textPrimary,
  },
  closeButton: {
    fontSize: 20,
    color: Colors.textMuted,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  scroll: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  itemIcon: {
    fontSize: 20,
    marginRight: 14,
  },
  itemContent: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 15,
    color: Colors.textPrimary,
  },
  itemDescription: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  itemArrow: {
    fontSize: 16,
    color: Colors.textMuted,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  footerText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 4,
  },
});
