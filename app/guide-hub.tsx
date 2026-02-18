// ============================================================================
// GUIDE HUB - Caregiver tips, guides, and resources
// ============================================================================

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Colors, Spacing, BorderRadius } from '../theme/theme-tokens';

const GUIDES = [
  {
    icon: '\u{1F4CA}',
    title: 'Understanding Vitals',
    description: 'What blood pressure, glucose, and heart rate readings mean',
    category: 'Health Basics',
  },
  {
    icon: '\u{1F48A}',
    title: 'Medication Management',
    description: 'Tips for keeping track of multiple medications safely',
    category: 'Health Basics',
  },
  {
    icon: '\u{1F372}',
    title: 'Nutrition & Hydration',
    description: 'Ensuring proper nutrition and fluid intake for your loved one',
    category: 'Daily Care',
  },
  {
    icon: '\u{1F4A4}',
    title: 'Sleep & Rest',
    description: 'Creating better sleep routines and understanding sleep patterns',
    category: 'Daily Care',
  },
  {
    icon: '\u{1F9D8}',
    title: 'Caregiver Self-Care',
    description: 'Taking care of yourself while caring for others',
    category: 'Wellbeing',
  },
  {
    icon: '\u{1F91D}',
    title: 'Care Transitions',
    description: 'How to hand off care and communicate with other caregivers',
    category: 'Coordination',
  },
  {
    icon: '\u{1F4CB}',
    title: 'Preparing for Appointments',
    description: 'What to bring and ask at doctor visits',
    category: 'Coordination',
  },
  {
    icon: '\u{26A0}\uFE0F',
    title: 'When to Seek Help',
    description: 'Warning signs that need immediate medical attention',
    category: 'Safety',
  },
];

export default function GuideHubScreen() {
  const router = useRouter();

  const categories = [...new Set(GUIDES.map(g => g.category))];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/now')}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Text style={styles.backButtonText}>{'\u2190'}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Care Guides</Text>
          <View style={styles.backButton} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.subtitle}>
            Helpful resources for everyday caregiving
          </Text>

          {categories.map(category => (
            <View key={category} style={styles.categorySection}>
              <Text style={styles.categoryTitle}>{category}</Text>
              {GUIDES.filter(g => g.category === category).map((guide, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.guideCard}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                >
                  <Text style={styles.guideIcon}>{guide.icon}</Text>
                  <View style={styles.guideText}>
                    <Text style={styles.guideTitle}>{guide.title}</Text>
                    <Text style={styles.guideDescription}>{guide.description}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ))}

          <View style={{ height: 40 }} />
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    color: Colors.textPrimary,
    fontSize: 18,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  guideCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: 16,
    marginBottom: 8,
    gap: 14,
  },
  guideIcon: {
    fontSize: 28,
  },
  guideText: {
    flex: 1,
  },
  guideTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  guideDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
});
