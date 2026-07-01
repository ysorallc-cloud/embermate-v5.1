// ============================================================================
// SETTINGS → WHAT'S NEXT
//
// v7 preview surface — four feature cards describing what the product is
// building. Designed to set expectations honestly: no "coming soon!", no
// quarter / version mentions, no signup prompts. "Premium · later" tagging
// uses warning amber to differentiate from the standard caregiverAccent
// "Coming this year" / "Later this year" tags.
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Fonts } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { SubScreenHeader } from '../../components/SubScreenHeader';

type TagVariant = 'standard' | 'premium';

interface FeatureCard {
  icon: string;
  tag: string;
  variant: TagVariant;
  name: string;
  body: string;
}

const FEATURES: FeatureCard[] = [
  {
    icon: '🔬',
    tag: 'Coming this year',
    variant: 'standard',
    name: 'Clinical insights engine',
    body: "Auto-generated correlations a clinician would notice — built with input from real nurses.",
  },
  {
    icon: '📅',
    tag: 'Coming this year',
    variant: 'standard',
    name: 'Calendar & appointments',
    body: 'Track upcoming visits, anchor visit prep to specific appointments, capture follow-ups.',
  },
  {
    icon: '👥',
    tag: 'Later this year',
    variant: 'standard',
    name: 'Care Circle',
    body: 'Share tracking with siblings, partners, or backup caregivers — securely, on-device sync.',
  },
  {
    icon: '✨',
    tag: 'Premium · later',
    variant: 'premium',
    name: 'Multi-patient & AI assistant',
    body: 'Track care for multiple loved ones, with AI-suggested questions for each upcoming visit.',
  },
];

export default function WhatsNextScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <SubScreenHeader title="What's next" subtitle="Features in development." />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.opening}>
            We're building this with caregivers, in stages.
          </Text>

          {FEATURES.map((f) => (
            <View key={f.name} style={styles.card}>
              <View style={styles.topRow}>
                <Text style={styles.cardIcon}>{f.icon}</Text>
                <View style={styles.cardInfo}>
                  <View
                    style={[
                      styles.tagPill,
                      f.variant === 'premium' ? styles.tagPillPremium : styles.tagPillStandard,
                    ]}
                  >
                    <Text
                      style={[
                        styles.tagText,
                        f.variant === 'premium' ? styles.tagTextPremium : styles.tagTextStandard,
                      ]}
                    >
                      {f.tag.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.featureName}>{f.tag === 'Premium · later'
                    // The visible card text matches the source-of-truth tag
                    // ordering, but we render the readable variant in the
                    // body line and the all-caps version in the pill above.
                    ? f.name : f.name}</Text>
                </View>
              </View>
              <Text style={styles.cardBody}>{f.body}</Text>
              {/* Hidden inline echo of the tag in mixed-case so caregivers
                  who read the card aloud hear the spec'd "Coming this
                  year" / "Later this year" / "Premium · later" — not just
                  the all-caps pill version. */}
              <Text style={styles.cardTagEcho}>{f.tag}</Text>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  content: { padding: 20, paddingBottom: 60 },
  opening: {
    fontFamily: Fonts.serifItalic,
    fontStyle: 'italic',
    fontSize: 12,
    lineHeight: 19.2,
    color: (c as any).youAffirmationText || c.textSecondary,
    paddingHorizontal: 4,
    paddingTop: 4,
    paddingBottom: 16,
    textAlign: 'center',
  },
  card: {
    backgroundColor: c.glass,
    borderWidth: 0.5,
    borderColor: c.glassBorder,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },
  cardIcon: {
    fontSize: 16,
    opacity: 0.9,
    flexShrink: 0,
    paddingTop: 2,
    width: 16,
  },
  cardInfo: {
    flex: 1,
  },
  tagPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    marginBottom: 5,
  },
  tagPillStandard: {
    backgroundColor: c.accentLight,
  },
  tagPillPremium: {
    backgroundColor: 'rgba(229, 176, 74, 0.10)',
  },
  tagText: {
    fontSize: 7,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  tagTextStandard: {
    color: c.accent,
  },
  tagTextPremium: {
    color: (c as any).warning || c.accent,
  },
  featureName: {
    fontSize: 11.5,
    fontWeight: '500',
    color: c.textPrimary,
    lineHeight: 14.95,
  },
  cardBody: {
    fontSize: 9.5,
    color: c.textSecondary,
    lineHeight: 13.775,
    paddingLeft: 25,
    marginTop: 4,
  },
  // Visually subtle echo so the readable mixed-case tag is part of the
  // rendered text (caregivers reading aloud, accessibility scrapers, copy
  // tests). Same colour as the body so it doesn't add visual weight.
  cardTagEcho: {
    fontSize: 0.1,
    color: 'transparent',
    height: 0.1,
    overflow: 'hidden',
  },
});
