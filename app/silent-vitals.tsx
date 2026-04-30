// ============================================================================
// SILENT VITALS — placeholder destination for the wellness checkbox on the
// Now timeline. Real silent-capture flow ships in Prompt 3; this screen
// keeps the navigation contract honest in the meantime so taps don't crash.
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../theme/theme-tokens';
import { useTheme } from '../contexts/ThemeContext';
import { SubScreenHeader } from '../components/SubScreenHeader';

export default function SilentVitalsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <SubScreenHeader title="Wellness check-in" subtitle="A quieter way to log how things are going" />
        <View style={styles.body}>
          <Text style={styles.eyebrow}>{'COMING NEXT'}</Text>
          <Text style={styles.headline}>Silent vitals capture is on its way.</Text>
          <Text style={styles.copy}>
            We're building a low-friction flow that lets you log how the day is going without a
            full vitals reading — mood, pain, energy, and a quick note. For now, taps from the
            Now timeline land here so the path is set up for the next release.
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  body: { flex: 1, padding: 24, gap: 12 },
  eyebrow: {
    fontSize: 10,
    fontWeight: '500' as const,
    letterSpacing: 0.6,
    color: c.textTertiary,
    marginBottom: 4,
  },
  headline: {
    fontSize: 22,
    fontWeight: '500' as const,
    color: c.textPrimary,
    lineHeight: 28,
  },
  copy: {
    fontSize: 14,
    lineHeight: 22,
    color: c.textSecondary,
  },
});
