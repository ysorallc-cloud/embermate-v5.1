// ============================================================================
// AS YOU USE EMBERMATE
//
// v7 preview surface in onboarding. Three milestones — two describe what
// happens as the caregiver's data accumulates, the third describes what's
// being built. No specific dates, no version numbers, no quarter mentions.
// Care Circle is intentionally not surfaced here (Settings → What's next is
// where that lives).
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface AsYouUseScreenProps {
  onContinue: () => void;
}

interface Milestone {
  icon: string;
  when: string;
  title: string;
  body: string;
}

const MILESTONES: Milestone[] = [
  {
    icon: '📈',
    when: 'WITHIN 2 WEEKS',
    title: 'Patterns start showing',
    body: 'Insights begins to surface trends — sleep affecting BP, missed doses correlating with mood.',
  },
  {
    icon: '📋',
    when: 'WITHIN 30 DAYS',
    title: 'Visit prep gets smarter',
    body: 'Doctor reports include symptom changes, medication impact, and what to ask.',
  },
  {
    icon: '🔬',
    when: 'COMING THIS YEAR',
    title: 'Clinical insights engine',
    body: 'Auto-generated correlations a clinician would notice. Built with input from real nurses.',
  },
];

export function AsYouUseScreen({ onContinue }: AsYouUseScreenProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.root}>
      <Text style={styles.title}>As you use EmberMate</Text>

      <Text style={styles.opening}>
        The longer you track, the more this app can do.
      </Text>

      <View style={styles.list}>
        {MILESTONES.map((m, i) => {
          const isLast = i === MILESTONES.length - 1;
          return (
            <View
              key={m.title}
              testID={`as-you-use-row-${i}`}
              style={[styles.row, !isLast && styles.rowDivider]}
            >
              <View style={styles.iconCol}>
                <Text style={styles.icon}>{m.icon}</Text>
              </View>
              <View style={styles.infoCol}>
                <Text style={styles.when}>{m.when}</Text>
                <Text style={styles.rowTitle}>{m.title}</Text>
                <Text style={styles.rowBody}>{m.body}</Text>
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          testID="as-you-use-continue"
          style={styles.continueButton}
          onPress={onContinue}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Got it"
        >
          <Text style={styles.continueText}>{'Got it →'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (c: any) => StyleSheet.create({
  root: {
    flex: 1,
    width: SCREEN_WIDTH,
    backgroundColor: c.background,
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '300',
    color: c.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  opening: {
    fontFamily: 'Georgia',
    fontStyle: 'italic',
    fontSize: 12,
    lineHeight: 19.2,
    color: c.youAffirmationText,
    paddingTop: 8,
    paddingHorizontal: 6,
    paddingBottom: 16,
    textAlign: 'center',
  },
  list: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 16,
    gap: 14,
  },
  rowDivider: {
    borderBottomWidth: 0.5,
    borderBottomColor: c.glassBorder,
  },
  iconCol: {
    width: 28,
    paddingTop: 1,
    alignItems: 'center',
  },
  icon: {
    fontSize: 18,
    opacity: 0.85,
  },
  infoCol: {
    flex: 1,
  },
  when: {
    fontSize: 8,
    fontWeight: '500',
    letterSpacing: 0.5,
    color: c.accent,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  rowTitle: {
    fontSize: 11.5,
    fontWeight: '500',
    color: c.textPrimary,
    lineHeight: 14.95,
    marginBottom: 3,
  },
  rowBody: {
    fontSize: 10,
    color: c.textSecondary,
    lineHeight: 14,
  },
  footer: {
    paddingTop: 16,
    borderTopWidth: 0.5,
    borderTopColor: c.glassHover,
  },
  continueButton: {
    backgroundColor: c.accent,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueText: {
    fontSize: 14,
    fontWeight: '600',
    color: c.textPrimary,
  },
});

export default AsYouUseScreen;
